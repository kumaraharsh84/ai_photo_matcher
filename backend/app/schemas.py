from datetime import date, datetime
import re

from pydantic import BaseModel, EmailStr, field_validator


def normalize_email_value(value):
    if not isinstance(value, str):
        return value
    cleaned = re.sub(r"[\s\u200B\u200C\u200D\uFEFF]+", "", value).replace("＠", "@").strip().lower()
    if "@" not in cleaned:
        raise ValueError("Please enter a valid email address.")
    return cleaned


class UserCreate(BaseModel):
    name: str
    email: str
    password: str

    @field_validator("name", mode="before")
    @classmethod
    def strip_name(cls, value):
        return value.strip() if isinstance(value, str) else value

    @field_validator("email", mode="before")
    @classmethod
    def strip_create_email(cls, value):
        return normalize_email_value(value)


class UserLogin(BaseModel):
    email: str
    password: str

    @field_validator("email", mode="before")
    @classmethod
    def strip_email(cls, value):
        return normalize_email_value(value)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr

    class Config:
        from_attributes = True


class PhotoOut(BaseModel):
    id: str
    event_id: str
    image_path: str
    upload_date: datetime | None = None
    processing_status: str
    processing_error: str | None = None
    processed_at: datetime | None = None

    class Config:
        from_attributes = True


class FaceOut(BaseModel):
    id: str
    photo_id: str
    event_id: str
    image_path: str
    face_coordinates: dict
    confidence_score: float
    created_at: datetime | None = None


class ProcessingStatus(BaseModel):
    total_uploaded_images: int
    total_detected_faces: int
    pending_images: int
    processing_images: int
    processed_images: int
    failed_images: int
    status: str


class EventOut(BaseModel):
    id: str
    event_name: str
    description: str | None = None
    event_date: date
    instagram_username: str | None = None
    cover_image: str | None = None
    event_link: str
    total_photos: int
    payment_amount_paise: int
    payment_required: bool

    class Config:
        from_attributes = True


class EventPublicOut(BaseModel):
    id: str
    event_name: str
    description: str | None = None
    event_date: date
    instagram_username: str | None = None
    cover_image: str | None = None
    payment_amount_paise: int
    payment_required: bool

    class Config:
        from_attributes = True


class GuestMatchPhoto(BaseModel):
    photo_id: str
    image_path: str
    best_similarity: float


class GuestMatchResponse(BaseModel):
    match_session_id: str
    event_id: str
    status: str
    message: str | None = None
    threshold: float
    matches: list[GuestMatchPhoto]


class GuestMatchResultsOut(BaseModel):
    match_session_id: str
    event_id: str
    status: str
    error_message: str | None = None
    matches: list[GuestMatchPhoto]


class PaymentOrderOut(BaseModel):
    key_id: str
    order_id: str
    amount_paise: int
    currency: str = "INR"
    event_name: str
    demo_mode: bool = False


class PaymentVerifyIn(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class PaymentVerifyOut(BaseModel):
    status: str
    event_id: str
    payment_id: str


class DashboardStats(BaseModel):
    total_events: int
    recent_events: list[EventOut]
