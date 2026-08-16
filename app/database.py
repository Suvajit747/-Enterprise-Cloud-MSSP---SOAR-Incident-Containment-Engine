from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker

from .config import DATABASE_URL

SQLALCHEMY_DATABASE_URL = DATABASE_URL
connect_args = {"check_same_thread": False} if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args=connect_args,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def create_missing_indexes():
    for table in Base.metadata.sorted_tables:
        for index in table.indexes:
            index.create(bind=engine, checkfirst=True)


def sync_database_schema():
    """Apply additive SQLite schema updates needed by older local databases."""
    if engine.dialect.name != "sqlite":
        return

    inspector = inspect(engine)
    if "alerts" not in inspector.get_table_names():
        return

    existing_alert_columns = {
        column["name"]
        for column in inspector.get_columns("alerts")
    }
    additive_columns = {
        "updated_at": "DATETIME",
        "fingerprint": "VARCHAR",
        "duplicate_of_alert_id": "INTEGER",
        "incident_id": "INTEGER",
    }

    with engine.begin() as connection:
        for column_name, column_type in additive_columns.items():
            if column_name not in existing_alert_columns:
                connection.execute(
                    text(f"ALTER TABLE alerts ADD COLUMN {column_name} {column_type}")
                )
