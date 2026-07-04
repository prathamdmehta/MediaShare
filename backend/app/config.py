from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

class Settings(BaseSettings):
    # Model config - tells Pydantic to read from .env file
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    #App
    app_env: str="development"
    app_secret_key: str
    debug: bool=False

    #Database
    database_url: str

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # AWS / S3
    aws_access_key_id: str = "test"
    aws_secret_access_key: str = "test"
    aws_default_region: str = "us-east-1"
    s3_bucket_name: str
    s3_endpoint_url: str | None = None  # None = real AWS, set = LocalStack

    #CORS
    frontend_url: str = "http://localhost:5173"

    # JWT
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30

    @property
    def is_development(self) -> bool:
        return self.app_env == "development"
    
# lru_cache means this is only instantiated once for the entire app lifetime
# Every module that calls get_settings() gets the same object
@lru_cache
def get_settings() -> Settings:
    return Settings()

# Why @lru_cache? Settings() reads from disk (the .env file) every time it's called. lru_cache caches the result after the first call. Every get_settings() call in every module returns the same already-computed object. This is the standard FastAPI pattern.