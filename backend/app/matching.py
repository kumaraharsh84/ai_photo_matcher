import math
import logging

from sqlalchemy.orm import Session

from .config import settings
from .face_processing import detect_faces_in_public_image
from .models import Face, GuestMatchResult, GuestMatchSession, Photo


logger = logging.getLogger(__name__)


def cosine_similarity(left: list[float], right: list[float]) -> float:
    if len(left) != len(right) or not left:
        return -1.0

    try:
        left_values = [float(value) for value in left]
        right_values = [float(value) for value in right]
    except (TypeError, ValueError):
        return -1.0

    if not all(math.isfinite(value) for value in left_values + right_values):
        return -1.0

    dot = sum(a * b for a, b in zip(left_values, right_values))
    left_norm = math.sqrt(sum(a * a for a in left_values))
    right_norm = math.sqrt(sum(b * b for b in right_values))
    if left_norm == 0 or right_norm == 0:
        return -1.0
    return dot / (left_norm * right_norm)


def match_guest_selfie(db: Session, session: GuestMatchSession) -> list[GuestMatchResult]:
    # The selfie must contain exactly one face so a guest never receives another person's gallery.
    selfie_faces = detect_faces_in_public_image(session.selfie_path)
    if len(selfie_faces) == 0:
        logger.warning("No face detected for match_session_id=%s", session.id)
        raise ValueError("No face detected. Please upload a clear front-facing selfie.")
    if len(selfie_faces) > 1:
        logger.warning("Multiple faces detected for match_session_id=%s count=%s", session.id, len(selfie_faces))
        raise ValueError("Multiple faces detected. Please upload a selfie with only one person.")

    selfie_confidence = float(selfie_faces[0]["confidence"])
    if selfie_confidence < settings.selfie_min_face_confidence:
        logger.warning(
            "Selfie confidence too low for match_session_id=%s confidence=%s",
            session.id,
            selfie_confidence,
        )
        raise ValueError("Face match confidence too low. Please try a brighter, sharper selfie.")

    guest_embedding = selfie_faces[0]["embedding"]
    event_faces = db.query(Face).filter(Face.event_id == session.event_id).all()
    if not event_faces:
        logger.warning("No processed event embeddings for event_id=%s", session.event_id)
        raise ValueError("This event is still processing photos. Please try again shortly.")

    best_by_photo: dict[str, float] = {}
    for event_face in event_faces:
        score = cosine_similarity(guest_embedding, event_face.embedding_vector)
        if score < settings.face_match_threshold:
            continue
        current_best = best_by_photo.get(event_face.photo_id)
        if current_best is None or score > current_best:
            best_by_photo[event_face.photo_id] = score

    # Store each matching photo once, sorted by strongest face similarity.
    results = []
    for photo_id, score in sorted(best_by_photo.items(), key=lambda item: item[1], reverse=True):
        result = GuestMatchResult(
            session_id=session.id,
            event_id=session.event_id,
            photo_id=photo_id,
            best_similarity=score,
        )
        db.add(result)
        results.append(result)

    session.status = "completed"
    session.error_message = None
    db.commit()
    for result in results:
        db.refresh(result)
    logger.info(
        "Matched selfie session_id=%s event_id=%s event_faces=%s matching_photos=%s threshold=%s",
        session.id,
        session.event_id,
        len(event_faces),
        len(results),
        settings.face_match_threshold,
    )
    return results


def session_matches(db: Session, session: GuestMatchSession) -> list[tuple[GuestMatchResult, Photo]]:
    return (
        db.query(GuestMatchResult, Photo)
        .join(Photo, GuestMatchResult.photo_id == Photo.id)
        .filter(GuestMatchResult.session_id == session.id)
        .order_by(GuestMatchResult.best_similarity.desc())
        .all()
    )
