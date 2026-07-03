"""
SQLAlchemy ORM 模型：events 資料表。
"""
import enum

from sqlalchemy import Column, Enum, Integer, String, Text

from .database import Base


class ImageType(str, enum.Enum):
    """圖片來源類型：本機上傳 / 外部網址 / 無圖片。"""

    UPLOAD = "upload"
    URL = "url"
    NONE = "none"


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    date = Column(String, nullable=False, index=True)  # YYYY-MM-DD
    time = Column(String, nullable=True)  # HH:MM

    image_source = Column(String, nullable=True)  # 本機檔名或外部 URL
    image_type = Column(Enum(ImageType), nullable=False, default=ImageType.NONE)

    # image_params 以 JSON 字串儲存，前端渲染時依此參數即時繪製，
    # 絕不儲存烘焙後的圖片，確保縮圖/預覽/編輯器三處渲染邏輯一致。
    image_params = Column(Text, nullable=False)
