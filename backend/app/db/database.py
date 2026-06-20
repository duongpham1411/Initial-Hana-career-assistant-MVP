from app.core.config import settings


def get_database_url() -> str:
    """SQLite connection setup will be added when persistence is implemented."""
    return settings.database_url

