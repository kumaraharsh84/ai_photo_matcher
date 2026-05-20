import os
import re
import uuid
import logging
import tempfile
import urllib.request
from contextlib import contextmanager
from pathlib import Path
from urllib.parse import urlparse

from fastapi import UploadFile

from .config import settings


logger = logging.getLogger(__name__)

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}


class StorageError(RuntimeError):
    pass


def ensure_upload_root() -> Path:
    root = Path(settings.upload_dir)
    root.mkdir(parents=True, exist_ok=True)
    return root


def public_upload_path(relative_path: str) -> str:
    return f"/uploads/{relative_path.replace(os.sep, '/')}"


def local_path_from_public(public_path: str) -> Path:
    relative = public_path.removeprefix("/uploads/").replace("/", os.sep)
    return ensure_upload_root() / relative


def is_s3_url(path: str) -> bool:
    return (path.startswith("https://") and ".s3." in path) or (path.startswith("https://") and ".s3.amazonaws.com" in path)


def validate_image_upload(file: UploadFile):
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_IMAGE_EXTENSIONS:
        raise StorageError("Only JPG, PNG, and WEBP image uploads are allowed.")
    if file.content_type and file.content_type not in ALLOWED_IMAGE_TYPES:
        raise StorageError("Only JPG, PNG, and WEBP image uploads are allowed.")


def safe_filename(filename: str) -> str:
    stem = Path(filename).stem
    suffix = Path(filename).suffix.lower()
    clean_stem = re.sub(r"[^a-zA-Z0-9_-]+", "-", stem).strip("-") or "image"
    return f"{clean_stem}-{uuid.uuid4().hex[:10]}{suffix}"


def storage_backend() -> str:
    backend = settings.storage_backend.lower().strip()
    if backend == "auto":
        has_s3_config = all(
            [
                settings.aws_access_key_id,
                settings.aws_secret_access_key,
                settings.aws_region,
                settings.aws_s3_bucket_name,
            ]
        )
        return "s3" if has_s3_config else "local"
    return backend


def s3_client():
    missing = [
        name
        for name, value in {
            "AWS_ACCESS_KEY_ID": settings.aws_access_key_id,
            "AWS_SECRET_ACCESS_KEY": settings.aws_secret_access_key,
            "AWS_REGION": settings.aws_region,
            "AWS_S3_BUCKET_NAME": settings.aws_s3_bucket_name,
        }.items()
        if not value
    ]
    if missing:
        raise StorageError(f"AWS S3 is not configured. Missing: {', '.join(missing)}")

    try:
        import boto3
        from botocore.config import Config
        from botocore.exceptions import BotoCoreError, ClientError
    except ImportError as exc:
        raise StorageError("boto3 is not installed. Run pip install -r requirements.txt.") from exc

    try:
        return boto3.client(
            "s3",
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
            region_name=settings.aws_region,
            config=Config(connect_timeout=8, read_timeout=30, retries={"max_attempts": 2}),
        )
    except (BotoCoreError, ClientError) as exc:
        logger.exception("Failed creating S3 client")
        raise StorageError("Could not connect to AWS S3. Check credentials and region.") from exc


def s3_public_url(key: str) -> str:
    bucket = settings.aws_s3_bucket_name
    region = settings.aws_region
    if region == "us-east-1":
        return f"https://{bucket}.s3.amazonaws.com/{key}"
    return f"https://{bucket}.s3.{region}.amazonaws.com/{key}"


def s3_key_from_url(url: str) -> str | None:
    if not settings.aws_s3_bucket_name:
        return None

    parsed = urlparse(url)
    host = parsed.netloc
    bucket = settings.aws_s3_bucket_name

    if host.startswith(f"{bucket}.s3"):
        return parsed.path.lstrip("/")

    path_parts = parsed.path.lstrip("/").split("/", 1)
    if host.startswith("s3") and len(path_parts) == 2 and path_parts[0] == bucket:
        return path_parts[1]

    return None


def delete_stored_image(image_reference: str | None):
    if not image_reference:
        return

    try:
        if image_reference.startswith("/uploads/"):
            local_path_from_public(image_reference).unlink(missing_ok=True)
            return

        s3_key = s3_key_from_url(image_reference)
        if s3_key and storage_backend() == "s3":
            s3_client().delete_object(Bucket=settings.aws_s3_bucket_name, Key=s3_key)
    except Exception:
        logger.exception("Failed deleting stored image: %s", image_reference)


def delete_guest_selfies(event_id: str):
    selfie_dir = ensure_upload_root() / "guest_selfies" / event_id
    if not selfie_dir.exists():
        return

    for path in selfie_dir.glob("*"):
        if path.is_file():
            path.unlink(missing_ok=True)
    try:
        selfie_dir.rmdir()
    except OSError:
        logger.warning("Guest selfie directory is not empty after cleanup: %s", selfie_dir)


async def save_upload_to_s3(file: UploadFile, event_id: str, prefix: str = "") -> str:
    import asyncio

    validate_image_upload(file)
    filename = safe_filename(f"{prefix}{file.filename}")
    key = f"event-images/{event_id}/{filename}"
    client = s3_client()

    try:
        file.file.seek(0)
        await asyncio.to_thread(
            client.upload_fileobj,
            file.file,
            settings.aws_s3_bucket_name,
            key,
            ExtraArgs={
                "ContentType": file.content_type or "application/octet-stream",
                "CacheControl": "public, max-age=31536000",
            },
        )
    except Exception as exc:
        logger.exception("Failed S3 upload event_id=%s key=%s filename=%s", event_id, key, file.filename)
        raise StorageError("S3 upload failed. Check bucket name, credentials, region, and permissions.") from exc

    logger.info("Uploaded image to S3 event_id=%s key=%s", event_id, key)
    return s3_public_url(key)


async def save_upload(file: UploadFile, event_id: str, prefix: str = "") -> str:
    if storage_backend() == "s3":
        return await save_upload_to_s3(file, event_id, prefix)

    validate_image_upload(file)
    # Keep every event's images isolated under uploads/event_id/.
    event_dir = ensure_upload_root() / event_id
    event_dir.mkdir(parents=True, exist_ok=True)

    filename = safe_filename(f"{prefix}{file.filename}")
    destination = event_dir / filename
    try:
        with destination.open("wb") as buffer:
            while chunk := await file.read(1024 * 1024):
                buffer.write(chunk)
    except Exception:
        logger.exception("Failed saving upload event_id=%s filename=%s", event_id, file.filename)
        raise

    relative = Path(event_id) / filename
    logger.info("Saved upload event_id=%s path=%s", event_id, relative)
    return public_upload_path(str(relative))


async def save_guest_selfie(file: UploadFile, event_id: str) -> str:
    validate_image_upload(file)
    selfie_dir = ensure_upload_root() / "guest_selfies" / event_id
    selfie_dir.mkdir(parents=True, exist_ok=True)

    filename = safe_filename(f"selfie-{file.filename}")
    destination = selfie_dir / filename
    try:
        with destination.open("wb") as buffer:
            while chunk := await file.read(1024 * 1024):
                buffer.write(chunk)
    except Exception:
        logger.exception("Failed saving guest selfie event_id=%s filename=%s", event_id, file.filename)
        raise

    relative = Path("guest_selfies") / event_id / filename
    logger.info("Saved guest selfie event_id=%s path=%s", event_id, relative)
    return public_upload_path(str(relative))


@contextmanager
def readable_image_file(image_reference: str):
    if image_reference.startswith("/uploads/"):
        yield local_path_from_public(image_reference)
        return

    if image_reference.startswith("http://") or image_reference.startswith("https://"):
        suffix = Path(urlparse(image_reference).path).suffix or ".jpg"
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
        temp_path = Path(temp_file.name)
        temp_file.close()
        try:
            s3_key = s3_key_from_url(image_reference)
            if s3_key and storage_backend() == "s3":
                s3_client().download_file(settings.aws_s3_bucket_name, s3_key, str(temp_path))
            else:
                urllib.request.urlretrieve(image_reference, temp_path)
            yield temp_path
        except Exception as exc:
            logger.exception("Failed downloading image for AI processing: %s", image_reference)
            raise StorageError("Could not download image from S3 for AI processing.") from exc
        finally:
            temp_path.unlink(missing_ok=True)
        return

    yield Path(image_reference)
