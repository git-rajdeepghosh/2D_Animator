# SQLAlchemy engine + session factory shared by the API and the worker.
from collections.abc import Iterator
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from app.core.config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True, future=True)

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False, future=True)

Base = declarative_base()


def get_db() -> Iterator[Session]:
    """FastAPI dependency that yields a session and always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Bring the database schema up to date by running Alembic migrations.

    This used to call `Base.metadata.create_all()`, which only ever creates
    *missing tables* — it silently ignores new columns on tables that already
    exist. A model change therefore looked fine on a fresh database and then
    failed at runtime against any database created before it, which is exactly
    how the `jobs.voiceover` column came to need a hand-written ALTER TABLE.

    Running `upgrade head` on startup is safe to repeat: applied revisions are
    recorded in `alembic_version` and skipped.
    """
    from alembic import command
    from alembic.config import Config

    backend_root = Path(__file__).resolve().parents[2]
    cfg = Config(str(backend_root / "alembic.ini"))
    # script_location in the ini is relative, and would otherwise resolve
    # against the caller's working directory rather than the backend package.
    cfg.set_main_option("script_location", str(backend_root / "alembic"))
    command.upgrade(cfg, "head")
