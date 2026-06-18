from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    BOT_TOKEN: str
    TELNYX_API_KEY: str
    TELNYX_MESSAGING_PROFILE_ID: str = ""
    TELNYX_VOICE_CONNECTION_ID: str = ""
    WEBHOOK_BASE_URL: str = "http://localhost:8000"
    PORT: int = 8000
    DB_PATH: str = "data/anon_comms.db"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
