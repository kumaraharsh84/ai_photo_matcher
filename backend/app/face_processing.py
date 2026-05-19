from datetime import datetime, timezone
import logging

from sqlalchemy.orm import Session

from .models import Face, Photo
from .storage import readable_image_file


logger = logging.getLogger(__name__)
_face_app = None


def get_face_app():
    global _face_app
    if _face_app is None:
        from insightface.app import FaceAnalysis

        logger.info("Loading InsightFace model buffalo_l on CPU")
        _face_app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
        # ctx_id=-1 forces CPU mode. The model is prepared once and reused across requests.
        _face_app.prepare(ctx_id=-1, det_size=(640, 640))
        logger.info("InsightFace model loaded")
    return _face_app


def detect_faces_in_public_image(public_image_path: str) -> list[dict]:
    try:
        import cv2
        import numpy as np
    except ImportError as exc:
        raise RuntimeError(f"AI dependency is not installed: {exc}") from exc

    with readable_image_file(public_image_path) as image_path:
        image = cv2.imread(str(image_path))
        if image is None:
            logger.warning("OpenCV could not read image: %s", image_path)
            raise ValueError("OpenCV could not read this image. It may be corrupted or unsupported.")

        height, width = image.shape[:2]

    app = get_face_app()
    detected_faces = app.get(image)
    faces = []

    for detected in detected_faces:
        embedding = getattr(detected, "embedding", None)
        bbox = getattr(detected, "bbox", None)
        if embedding is None or bbox is None:
            logger.warning("Skipping detected face with missing bbox or embedding in %s", public_image_path)
            continue

        embedding_values = np.asarray(embedding, dtype=float).tolist()
        if not embedding_values:
            logger.warning("Skipping detected face with empty embedding in %s", public_image_path)
            continue

        x1, y1, x2, y2 = np.asarray(bbox, dtype=float).tolist()
        faces.append(
            {
                "embedding": embedding_values,
                "coordinates": {
                    "x": max(0, x1),
                    "y": max(0, y1),
                    "width": max(0, x2 - x1),
                    "height": max(0, y2 - y1),
                    "image_width": width,
                    "image_height": height,
                },
                "confidence": float(getattr(detected, "det_score", 0.0) or 0.0),
            }
        )

    return faces


def process_photo_faces(db: Session, photo: Photo) -> int:
    photo.processing_status = "processing"
    photo.processing_error = None
    db.commit()

    try:
        detected_faces = detect_faces_in_public_image(photo.image_path)
    except Exception as exc:
        logger.exception("Failed face detection for photo_id=%s image=%s", photo.id, photo.image_path)
        photo.processing_status = "failed"
        photo.processing_error = f"Face processing failed: {exc}"
        photo.processed_at = datetime.now(timezone.utc)
        db.commit()
        return 0

    saved_count = 0
    for detected in detected_faces:
        db.add(
            Face(
                photo_id=photo.id,
                event_id=photo.event_id,
                embedding_vector=detected["embedding"],
                face_coordinates=detected["coordinates"],
                confidence_score=detected["confidence"],
            )
        )
        saved_count += 1

    photo.processing_status = "processed"
    photo.processing_error = None
    photo.processed_at = datetime.now(timezone.utc)
    db.commit()
    logger.info("Processed photo_id=%s event_id=%s faces_detected=%s", photo.id, photo.event_id, saved_count)
    return saved_count
