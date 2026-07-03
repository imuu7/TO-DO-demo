"""
Pydantic schemas：API 請求/回應資料驗證與序列化。
"""
import json
import re
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from .models import ImageType

DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")
TIME_PATTERN = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")


class CropParams(BaseModel):
    """裁切區域，數值皆為相對原圖的比例（0~1）。"""

    x: float = 0.0
    y: float = 0.0
    width: float = 1.0
    height: float = 1.0


class ImageParams(BaseModel):
    """
    圖片編輯參數，前端 Canvas 依此參數即時渲染，後端只負責儲存/還原，
    不做任何圖片烘焙處理。
    """

    scale: float = 1.0
    rotation: float = 0.0
    offsetX: float = 0.0
    offsetY: float = 0.0
    crop: CropParams = Field(default_factory=CropParams)
    opacity: float = 1.0
    brightness: float = 1.0
    contrast: float = 1.0


class EventBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    date: str
    time: Optional[str] = None

    image_source: Optional[str] = None
    image_type: ImageType = ImageType.NONE
    image_params: ImageParams = Field(default_factory=ImageParams)

    @field_validator("image_params", mode="before")
    @classmethod
    def parse_image_params(cls, v):
        """ORM 物件的 image_params 是 JSON 字串，讀取時需先轉成 dict。"""
        if isinstance(v, str):
            return json.loads(v)
        return v

    @field_validator("date")
    @classmethod
    def validate_date(cls, v: str) -> str:
        if not DATE_PATTERN.match(v):
            raise ValueError("date 格式必須為 YYYY-MM-DD")
        return v

    @field_validator("time")
    @classmethod
    def validate_time(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not TIME_PATTERN.match(v):
            raise ValueError("time 格式必須為 HH:MM")
        return v

    @model_validator(mode="after")
    def validate_image_consistency(self) -> "EventBase":
        """image_type 為 none 時不應帶 image_source；upload/url 時應帶 image_source。"""
        if self.image_type == ImageType.NONE:
            self.image_source = None
        elif not self.image_source:
            raise ValueError("image_type 為 upload 或 url 時，image_source 為必填")
        return self


class EventCreate(EventBase):
    """POST /events 的請求 body。"""

    pass


class EventUpdate(EventBase):
    """PUT /events/{id} 的請求 body（整筆覆寫）。"""

    pass


class EventOut(EventBase):
    """API 回應格式，image_params 會還原成物件而非 JSON 字串。"""

    model_config = ConfigDict(from_attributes=True)

    id: int
