from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "data" / "aicloset.db"
DB_PATH.parent.mkdir(exist_ok=True)

DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(DATABASE_URL, echo=False, connect_args={"check_same_thread": False})

# Enable WAL mode and foreign keys for SQLite
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def init_db():
    Base.metadata.create_all(bind=engine)
    _migrate_user_profiles()
    _migrate_users_token_version()
    _migrate_user_api_keys()
    _migrate_clothing_name()


def _migrate_user_profiles():
    """为已存在的 user_profiles 表添加新列（SQLite 不支持 IF NOT EXISTS for ADD COLUMN，用 try/except）。"""
    new_columns = [
        ("short_term_styles", "TEXT DEFAULT '{}'"),
        ("short_term_colors", "TEXT DEFAULT '{}'"),
        ("short_term_categories", "TEXT DEFAULT '{}'"),
        ("short_term_updated", "DATETIME"),
        ("seasonal_styles", "TEXT DEFAULT '{}'"),
        ("seasonal_colors", "TEXT DEFAULT '{}'"),
        ("seasonal_categories", "TEXT DEFAULT '{}'"),
        ("seasonal_temp", "TEXT DEFAULT '{}'"),
        ("seasonal_updated", "TEXT DEFAULT '{}'"),
        ("occasion_prefs", "TEXT DEFAULT '{}'"),
        ("item_pairs", "TEXT DEFAULT '{}'"),
        ("category_pairs", "TEXT DEFAULT '{}'"),
        ("l2_event_count", "INTEGER DEFAULT 0"),
        ("l3_event_count", "INTEGER DEFAULT 0"),
        ("l4_event_count", "INTEGER DEFAULT 0"),
        ("last_decay_at", "DATETIME"),
    ]
    from sqlalchemy import text
    with engine.connect() as conn:
        for col_name, col_type in new_columns:
            try:
                conn.execute(text(f"ALTER TABLE user_profiles ADD COLUMN {col_name} {col_type}"))
                conn.commit()
            except Exception:
                pass  # column already exists


def _migrate_users_token_version():
    """为已存在的 users 表添加 token_version 列。"""
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN token_version INTEGER DEFAULT 0"))
            conn.commit()
        except Exception:
            pass


def _migrate_clothing_name():
    """为已存在的 clothing_items 表添加 name 列。"""
    from sqlalchemy import text
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE clothing_items ADD COLUMN name VARCHAR(100) DEFAULT ''"))
            conn.commit()
        except Exception:
            pass


def _migrate_user_api_keys():
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE user_profiles ADD COLUMN user_api_keys JSON DEFAULT '{}'"))
            conn.commit()
        except Exception:
            pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
