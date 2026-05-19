from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/photo_finder"
    jwt_secret: str = "change-this-secret-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440
    frontend_url: str = "http://localhost:3000"
    upload_dir: str = "uploads"
    storage_backend: str = "auto"
    aws_access_key_id: str | None = None
    aws_secret_access_key: str | None = None
    aws_region: str | None = None
    aws_s3_bucket_name: str | None = None
    razorpay_key_id: str | None = None
    razorpay_key_secret: str | None = None
    face_match_threshold: float = 0.45
    selfie_min_face_confidence: float = 0.55

    class Config:
        env_file = ".env"


settings = Settings()
