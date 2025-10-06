from pydantic_settings import BaseSettings

class Settings(BaseSettings):

    MINIO_ENDPOINT: str = "minio:9000"
    MINIO_ACCESS_KEY: str = "admin"
    MINIO_SECRET_KEY: str = "admin123"
    MINIO_BUCKET_NAME: str = "raw-logs"
    MINIO_SECURE: bool = False
    
settings = Settings()

    