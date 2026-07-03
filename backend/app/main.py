"""
FastAPI 進入點：註冊路由、CORS、靜態檔案服務。
"""
import os
import re
import uuid

from fastapi import Depends, FastAPI, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from . import crud, models, schemas
from .database import Base, engine, get_db

# 啟動時建立資料表（若不存在）
Base.metadata.create_all(bind=engine)

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

MONTH_PATTERN = re.compile(r"^\d{4}-\d{2}$")

app = FastAPI(title="月曆 To-do 編輯器 API")

# 開放給前端 dev server（Vite 預設 port 5173）
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 靜態圖片服務：GET /uploads/{filename}
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


def _get_event_or_404(db: Session, event_id: int) -> models.Event:
    event = crud.get_event(db, event_id)
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="事件不存在")
    return event


@app.post("/events", response_model=schemas.EventOut, status_code=status.HTTP_201_CREATED)
def create_event(event_in: schemas.EventCreate, db: Session = Depends(get_db)):
    """建立事件。"""
    return crud.create_event(db, event_in)


@app.get("/events", response_model=list[schemas.EventOut])
def list_events(month: str, db: Session = Depends(get_db)):
    """查詢指定月份（YYYY-MM）的所有事件。"""
    if not MONTH_PATTERN.match(month):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="month 格式必須為 YYYY-MM"
        )
    return crud.get_events_by_month(db, month)


@app.put("/events/{event_id}", response_model=schemas.EventOut)
def update_event(event_id: int, event_in: schemas.EventUpdate, db: Session = Depends(get_db)):
    """更新事件（整筆覆寫）。"""
    event = _get_event_or_404(db, event_id)
    return crud.update_event(db, event, event_in)


@app.delete("/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(event_id: int, db: Session = Depends(get_db)):
    """刪除事件。"""
    event = _get_event_or_404(db, event_id)
    crud.delete_event(db, event)


@app.post("/upload")
def upload_image(file: UploadFile):
    """上傳圖片，儲存至 backend/uploads/，回傳可供 image_source 使用的檔名。"""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="僅接受圖片檔案"
        )

    ext = os.path.splitext(file.filename or "")[1]
    filename = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    with open(file_path, "wb") as f:
        f.write(file.file.read())

    return {"filename": filename}
