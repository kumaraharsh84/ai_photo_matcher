import io
import zipfile
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from decimal import Decimal, InvalidOperation
import base64
import hashlib
import hmac
import json
import logging
from pathlib import Path
import urllib.error
import urllib.request
import uuid

import qrcode
from fastapi import Depends, FastAPI, File, Form, HTTPException, Query, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, StreamingResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from .auth import create_access_token, get_current_user, hash_password, verify_password
from .config import settings
from .database import Base, engine, get_db
from .face_processing import process_photo_faces
from .matching import match_guest_selfie, session_matches
from .models import Event, Face, GuestMatchSession, PaymentSession, Photo, User
from .schemas import (
    DashboardStats,
    EventOut,
    EventPublicOut,
    FaceOut,
    GuestMatchPhoto,
    GuestMatchResponse,
    GuestMatchResultsOut,
    PaymentOrderOut,
    PaymentVerifyIn,
    PaymentVerifyOut,
    PhotoOut,
    ProcessingStatus,
    Token,
    UserCreate,
    UserLogin,
    UserOut,
)
from .storage import StorageError, ensure_upload_root, readable_image_file, save_guest_selfie, save_upload, storage_backend


logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="AI Face-Based Wedding/Event Photo Finder API")
ensure_upload_root()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    # Beginner-friendly foundation: create tables automatically for local development.
    Base.metadata.create_all(bind=engine)
    ensure_photo_processing_columns()
    ensure_event_payment_columns()
    ensure_upload_root()


app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")


def event_link(event_id: str) -> str:
    return f"{settings.frontend_url}/event/{event_id}"


def serialize_event(event: Event) -> EventOut:
    return EventOut(
        id=event.id,
        event_name=event.event_name,
        description=event.description,
        event_date=event.event_date,
        instagram_username=event.instagram_username,
        cover_image=event.cover_image,
        event_link=event_link(event.id),
        total_photos=len(event.photos),
        payment_amount_paise=event.payment_amount_paise or 0,
        payment_required=(event.payment_amount_paise or 0) > 0,
    )


def serialize_public_event(event: Event) -> EventPublicOut:
    return EventPublicOut(
        id=event.id,
        event_name=event.event_name,
        description=event.description,
        event_date=event.event_date,
        instagram_username=event.instagram_username,
        cover_image=event.cover_image,
        payment_amount_paise=event.payment_amount_paise or 0,
        payment_required=(event.payment_amount_paise or 0) > 0,
    )


def serialize_match_results(session: GuestMatchSession, rows: list[tuple]) -> GuestMatchResultsOut:
    return GuestMatchResultsOut(
        match_session_id=session.id,
        event_id=session.event_id,
        status=session.status,
        error_message=session.error_message,
        matches=[
            GuestMatchPhoto(
                photo_id=photo.id,
                image_path=photo.image_path,
                best_similarity=result.best_similarity,
            )
            for result, photo in rows
        ],
    )


def ensure_photo_processing_columns():
    # create_all does not alter existing tables, so this keeps older local databases usable.
    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE photos ADD COLUMN IF NOT EXISTS processing_status VARCHAR(30) NOT NULL DEFAULT 'pending'"))
        connection.execute(text("ALTER TABLE photos ADD COLUMN IF NOT EXISTS processing_error TEXT"))
        connection.execute(text("ALTER TABLE photos ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE"))


def ensure_event_payment_columns():
    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE events ADD COLUMN IF NOT EXISTS payment_amount_paise INTEGER NOT NULL DEFAULT 0"))


def parse_payment_amount_paise(value: str) -> int:
    try:
        amount_rupees = Decimal(value or "0")
    except InvalidOperation as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid payment amount") from exc
    if amount_rupees < 0:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Payment amount cannot be negative")
    return int(amount_rupees * 100)


def require_razorpay_keys():
    if not settings.razorpay_key_id or not settings.razorpay_key_secret:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Razorpay test keys are not configured")


def create_razorpay_order(amount_paise: int, receipt: str, notes: dict) -> dict:
    require_razorpay_keys()
    payload = json.dumps({"amount": amount_paise, "currency": "INR", "receipt": receipt, "notes": notes}).encode()
    credentials = f"{settings.razorpay_key_id}:{settings.razorpay_key_secret}".encode()
    request = urllib.request.Request(
        "https://api.razorpay.com/v1/orders",
        data=payload,
        headers={
            "Authorization": f"Basic {base64.b64encode(credentials).decode()}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            return json.loads(response.read().decode())
    except urllib.error.HTTPError as exc:
        logger.exception("Razorpay order creation failed status=%s", exc.code)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Could not create Razorpay order") from exc
    except Exception as exc:
        logger.exception("Razorpay order creation failed")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Could not connect to Razorpay") from exc


def verify_razorpay_signature(order_id: str, payment_id: str, signature: str) -> bool:
    require_razorpay_keys()
    message = f"{order_id}|{payment_id}".encode()
    expected = hmac.new(settings.razorpay_key_secret.encode(), message, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


def event_processing_status(event_id: str, db: Session) -> ProcessingStatus:
    photos = db.query(Photo).filter(Photo.event_id == event_id).all()
    total_faces = db.query(Face).filter(Face.event_id == event_id).count()
    pending = sum(1 for photo in photos if photo.processing_status == "pending")
    processing = sum(1 for photo in photos if photo.processing_status == "processing")
    processed = sum(1 for photo in photos if photo.processing_status == "processed")
    failed = sum(1 for photo in photos if photo.processing_status == "failed")

    if processing:
        status_value = "processing"
    elif pending:
        status_value = "pending"
    elif failed and processed:
        status_value = "completed_with_errors"
    elif failed:
        status_value = "failed"
    elif photos:
        status_value = "completed"
    else:
        status_value = "no_images"

    return ProcessingStatus(
        total_uploaded_images=len(photos),
        total_detected_faces=total_faces,
        pending_images=pending,
        processing_images=processing,
        processed_images=processed,
        failed_images=failed,
        status=status_value,
    )


@app.get("/health")
def health():
    return {
        "status": "ok",
        "api": app.title,
        "storage_backend": storage_backend(),
        "s3_configured": storage_backend() == "s3",
        "razorpay_configured": bool(settings.razorpay_key_id and settings.razorpay_key_secret),
        "face_match_threshold": settings.face_match_threshold,
        "selfie_min_face_confidence": settings.selfie_min_face_confidence,
    }


@app.get("/public/events/{event_id}", response_model=EventPublicOut)
def get_public_event(event_id: str, db: Session = Depends(get_db)):
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return serialize_public_event(event)


@app.post("/public/events/{event_id}/payment/order", response_model=PaymentOrderOut)
def create_payment_order(event_id: str, db: Session = Depends(get_db)):
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    if (event.payment_amount_paise or 0) <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment is not required for this event")

    if not settings.razorpay_key_id or not settings.razorpay_key_secret:
        # Demo fallback keeps the payment gate testable until real Razorpay test keys are added.
        demo_order_id = f"demo_order_{uuid.uuid4().hex}"
        payment_session = PaymentSession(
            event_id=event.id,
            razorpay_order_id=demo_order_id,
            amount_paise=event.payment_amount_paise,
            status="demo_created",
        )
        db.add(payment_session)
        db.commit()
        return PaymentOrderOut(
            key_id="demo",
            order_id=demo_order_id,
            amount_paise=event.payment_amount_paise,
            event_name=event.event_name,
            demo_mode=True,
        )

    order = create_razorpay_order(
        amount_paise=event.payment_amount_paise,
        receipt=f"event-{event.id[:24]}",
        notes={"event_id": event.id, "event_name": event.event_name},
    )
    payment_session = PaymentSession(
        event_id=event.id,
        razorpay_order_id=order["id"],
        amount_paise=event.payment_amount_paise,
        status="created",
    )
    db.add(payment_session)
    db.commit()

    return PaymentOrderOut(
        key_id=settings.razorpay_key_id or "",
        order_id=order["id"],
        amount_paise=event.payment_amount_paise,
        event_name=event.event_name,
    )


@app.post("/public/events/{event_id}/payment/verify", response_model=PaymentVerifyOut)
def verify_payment(event_id: str, payload: PaymentVerifyIn, db: Session = Depends(get_db)):
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    payment_session = db.query(PaymentSession).filter(PaymentSession.razorpay_order_id == payload.razorpay_order_id).first()
    if not payment_session or payment_session.event_id != event_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment session not found")

    if payment_session.razorpay_order_id.startswith("demo_order_"):
        payment_session.status = "demo_paid"
        payment_session.razorpay_payment_id = payload.razorpay_payment_id or f"demo_pay_{uuid.uuid4().hex}"
        db.commit()
        return PaymentVerifyOut(status="paid", event_id=event_id, payment_id=payment_session.razorpay_payment_id)

    if not verify_razorpay_signature(payload.razorpay_order_id, payload.razorpay_payment_id, payload.razorpay_signature):
        payment_session.status = "failed"
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment verification failed")

    payment_session.status = "paid"
    payment_session.razorpay_payment_id = payload.razorpay_payment_id
    db.commit()
    return PaymentVerifyOut(status="paid", event_id=event_id, payment_id=payload.razorpay_payment_id)


@app.post("/auth/register", response_model=Token)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(func.lower(User.email) == payload.email.lower()).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered")

    user = User(name=payload.name, email=payload.email.lower(), password_hash=hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return Token(access_token=create_access_token(user.id))


@app.post("/auth/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(func.lower(User.email) == payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    return Token(access_token=create_access_token(user.id))


@app.get("/auth/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@app.get("/dashboard", response_model=DashboardStats)
def dashboard(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    events = db.query(Event).filter(Event.user_id == current_user.id).order_by(Event.created_at.desc()).all()
    return DashboardStats(
        total_events=len(events),
        recent_events=[serialize_event(event) for event in events[:4]],
    )


@app.post("/events", response_model=EventOut)
async def create_event(
    event_name: str = Form(...),
    description: str = Form(""),
    event_date: str = Form(...),
    instagram_username: str = Form(""),
    payment_amount: str = Form("0"),
    cover_image: UploadFile | None = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        parsed_event_date = date.fromisoformat(event_date)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid event date") from exc

    event = Event(
        user_id=current_user.id,
        event_name=event_name,
        description=description,
        event_date=parsed_event_date,
        instagram_username=instagram_username,
        payment_amount_paise=parse_payment_amount_paise(payment_amount),
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    if cover_image and cover_image.filename:
        try:
            event.cover_image = await save_upload(cover_image, event.id, "cover-")
        except StorageError as exc:
            logger.exception("Cover image upload failed event_id=%s", event.id)
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
        db.commit()
        db.refresh(event)

    return serialize_event(event)


@app.get("/events", response_model=list[EventOut])
def list_events(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    events = db.query(Event).filter(Event.user_id == current_user.id).order_by(Event.created_at.desc()).all()
    return [serialize_event(event) for event in events]


@app.get("/events/{event_id}", response_model=EventOut)
def get_event(event_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    event = db.get(Event, event_id)
    if not event or event.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return serialize_event(event)


@app.get("/events/{event_id}/photos", response_model=list[PhotoOut])
def get_photos(event_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    event = db.get(Event, event_id)
    if not event or event.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return db.query(Photo).filter(Photo.event_id == event_id).order_by(Photo.upload_date.desc()).all()


@app.post("/events/{event_id}/photos", response_model=list[PhotoOut])
async def upload_photos(
    event_id: str,
    files: list[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    event = db.get(Event, event_id)
    if not event or event.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    saved_photos = []
    for file in files:
        try:
            path = await save_upload(file, event_id)
        except StorageError as exc:
            logger.exception("Event photo upload failed event_id=%s filename=%s", event_id, file.filename)
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
        photo = Photo(event_id=event_id, image_path=path)
        db.add(photo)
        saved_photos.append(photo)

    db.commit()
    for photo in saved_photos:
        db.refresh(photo)

    for photo in saved_photos:
        try:
            process_photo_faces(db, photo)
        except Exception:
            logger.exception("Unexpected AI processing error for photo_id=%s event_id=%s", photo.id, event_id)
            photo.processing_status = "failed"
            photo.processing_error = "Unexpected AI processing error. This image was skipped."
            db.commit()
        db.refresh(photo)
    return saved_photos


@app.get("/events/{event_id}/faces", response_model=list[FaceOut])
def get_event_faces(event_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    event = db.get(Event, event_id)
    if not event or event.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    faces = (
        db.query(Face, Photo.image_path)
        .join(Photo, Face.photo_id == Photo.id)
        .filter(Face.event_id == event_id)
        .order_by(Face.created_at.desc())
        .all()
    )
    return [
        FaceOut(
            id=face.id,
            photo_id=face.photo_id,
            event_id=face.event_id,
            image_path=image_path,
            face_coordinates=face.face_coordinates,
            confidence_score=face.confidence_score,
            created_at=face.created_at,
        )
        for face, image_path in faces
    ]


@app.get("/events/{event_id}/faces/count")
def get_event_face_count(event_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    event = db.get(Event, event_id)
    if not event or event.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return {"total_faces": db.query(Face).filter(Face.event_id == event_id).count()}


@app.get("/events/{event_id}/processing-status", response_model=ProcessingStatus)
def get_processing_status(event_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    event = db.get(Event, event_id)
    if not event or event.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return event_processing_status(event_id, db)


@app.get("/events/{event_id}/qr")
def event_qr(event_id: str, db: Session = Depends(get_db)):
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    qr = qrcode.make(event_link(event_id))
    buffer = io.BytesIO()
    qr.save(buffer, format="PNG")
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="image/png")


@app.post("/public/events/{event_id}/selfie-match", response_model=GuestMatchResponse)
async def upload_selfie_and_match(event_id: str, selfie: UploadFile = File(...), db: Session = Depends(get_db)):
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    try:
        selfie_path = await save_guest_selfie(selfie, event_id)
    except StorageError as exc:
        logger.exception("Guest selfie upload failed event_id=%s filename=%s", event_id, selfie.filename)
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    match_session = GuestMatchSession(event_id=event_id, selfie_path=selfie_path, status="processing")
    db.add(match_session)
    db.commit()
    db.refresh(match_session)

    try:
        match_guest_selfie(db, match_session)
    except ValueError as exc:
        match_session.status = "failed"
        match_session.error_message = str(exc)
        db.commit()
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except Exception as exc:
        match_session.status = "failed"
        match_session.error_message = f"Selfie matching failed: {exc}"
        db.commit()
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=match_session.error_message) from exc

    rows = session_matches(db, match_session)
    if not rows:
        logger.info("No matching photos found for match_session_id=%s event_id=%s", match_session.id, event_id)
    return GuestMatchResponse(
        match_session_id=match_session.id,
        event_id=event_id,
        status=match_session.status,
        message=None if rows else "We could not find clear matches for this selfie.",
        threshold=settings.face_match_threshold,
        matches=[
            GuestMatchPhoto(
                photo_id=photo.id,
                image_path=photo.image_path,
                best_similarity=result.best_similarity,
            )
            for result, photo in rows
        ],
    )


@app.get("/public/matches/{match_session_id}", response_model=GuestMatchResultsOut)
def get_match_results(match_session_id: str, db: Session = Depends(get_db)):
    match_session = db.get(GuestMatchSession, match_session_id)
    if not match_session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Match session not found")
    return serialize_match_results(match_session, session_matches(db, match_session))


@app.get("/public/matches/{match_session_id}/download-zip")
def download_match_zip(match_session_id: str, photo_ids: str | None = Query(default=None), db: Session = Depends(get_db)):
    match_session = db.get(GuestMatchSession, match_session_id)
    if not match_session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Match session not found")

    allowed_photo_ids = {photo_id.strip() for photo_id in photo_ids.split(",")} if photo_ids else set()
    rows = session_matches(db, match_session)
    selected_rows = [(result, photo) for result, photo in rows if not allowed_photo_ids or photo.id in allowed_photo_ids]
    if not selected_rows:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No matching photos selected")

    def read_photo(photo: Photo, index: int) -> tuple[str, bytes] | None:
        filename = Path(photo.image_path.split("?")[0]).name or f"photo-{index}.jpg"
        try:
            with readable_image_file(photo.image_path) as image_path:
                return filename, Path(image_path).read_bytes()
        except Exception:
            logger.exception("Skipping photo during zip download photo_id=%s", photo.id)
            return None

    with ThreadPoolExecutor(max_workers=4) as executor:
        files = list(executor.map(lambda item: read_photo(item[1][1], item[0]), enumerate(selected_rows, start=1)))

    archive = io.BytesIO()
    with zipfile.ZipFile(archive, mode="w", compression=zipfile.ZIP_STORED) as zip_file:
        used_names: set[str] = set()
        for file_item in files:
            if not file_item:
                continue
            filename, data = file_item
            if filename in used_names:
                filename = f"{len(used_names) + 1}-{filename}"
            used_names.add(filename)
            zip_file.writestr(filename, data)

    archive.seek(0)
    if archive.getbuffer().nbytes == 0:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Could not prepare selected photos.")

    return StreamingResponse(
        archive,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="matched-photos-{match_session_id}.zip"'},
    )


@app.get("/public/photos/{photo_id}/download")
def download_public_photo(photo_id: str, db: Session = Depends(get_db)):
    photo = db.get(Photo, photo_id)
    if not photo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo not found")

    filename = Path(photo.image_path.split("?")[0]).name or f"{photo_id}.jpg"
    try:
        with readable_image_file(photo.image_path) as image_path:
            data = Path(image_path).read_bytes()
            return Response(
                content=data,
                media_type="application/octet-stream",
                headers={"Content-Disposition": f'attachment; filename="{filename}"'},
            )
    except Exception as exc:
        logger.exception("Failed downloading public photo photo_id=%s", photo_id)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Could not download this photo right now.") from exc
