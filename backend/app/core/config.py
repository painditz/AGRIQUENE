import os
from typing import List

class Settings:
    PROJECT_NAME: str = "AGRIQUENE - Smart Procurement Queue & ETA System"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Secret Key for JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "agriquene_sih2026_super_secure_jwt_secret_key_gov_portal")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./agriquene.db")
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "*"
    ]
    
    # Mock OTP settings
    MOCK_OTP_MODE: bool = os.getenv("MOCK_OTP_MODE", "true").lower() == "true"
    DEFAULT_DEV_OTP: str = os.getenv("DEFAULT_DEV_OTP", "123456")
    
    # SMS Service
    SMS_GATEWAY_PROVIDER: str = os.getenv("SMS_GATEWAY_PROVIDER", "mock")
    SMS_API_KEY: str = os.getenv("SMS_API_KEY", "")
    
    # Payment Gateway
    PAYMENT_GATEWAY_PROVIDER: str = os.getenv("PAYMENT_GATEWAY_PROVIDER", "mock_pfms_dbt")
    
    # Map API
    MAPS_API_KEY: str = os.getenv("MAPS_API_KEY", "")

settings = Settings()
