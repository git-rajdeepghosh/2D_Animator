# Alembic environment.
#
# The database URL is read from Settings rather than alembic.ini so migrations
# always target whatever the app itself is pointed at, with no second copy of
# the connection string to keep in sync.
from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine, pool

from app.core.config import settings
from app.core.database import Base

# Importing the models package registers every table on Base.metadata. Without
# this, autogenerate sees an empty schema and cheerfully writes a migration
# that drops everything.
from app import models  # noqa: F401

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Emit SQL to stdout without connecting (`alembic upgrade --sql`)."""
    context.configure(
        url=settings.database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations against a live connection."""
    # The engine is built directly from the URL rather than going through
    # config.set_main_option: that path runs the value through configparser
    # interpolation, so a '%' in a password would raise or silently corrupt.
    connectable = create_engine(settings.database_url, poolclass=pool.NullPool)

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            # Without this, autogenerate ignores column type changes — the
            # exact class of drift that is easiest to miss by eye.
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
