"""
資料庫連線設定：使用 SQLite + SQLAlchemy。
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# SQLite 檔案位置：backend/events.db
SQLALCHEMY_DATABASE_URL = "sqlite:///./events.db"

# check_same_thread=False：允許 FastAPI 在不同 thread 間共用同一個 SQLite 連線
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency：每個請求建立一個 DB session，用完即關閉。"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
