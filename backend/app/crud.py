"""
CRUD 操作：封裝所有對 events 資料表的資料庫存取邏輯。
"""
import json
from typing import Optional

from sqlalchemy.orm import Session

from . import models, schemas


def _to_orm_kwargs(event_in: schemas.EventBase) -> dict:
    """把 Pydantic schema 轉成可以塞進 ORM model 的 dict（image_params 序列化成 JSON 字串）。"""
    data = event_in.model_dump(exclude={"image_params"})
    data["image_params"] = json.dumps(event_in.image_params.model_dump())
    return data


def get_event(db: Session, event_id: int) -> Optional[models.Event]:
    return db.query(models.Event).filter(models.Event.id == event_id).first()


def get_events_by_month(db: Session, month: str) -> list[models.Event]:
    """month 格式為 YYYY-MM，回傳當月所有事件（依日期、時間排序）。"""
    return (
        db.query(models.Event)
        .filter(models.Event.date.like(f"{month}-%"))
        .order_by(models.Event.date, models.Event.time)
        .all()
    )


def create_event(db: Session, event_in: schemas.EventCreate) -> models.Event:
    event = models.Event(**_to_orm_kwargs(event_in))
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def update_event(
    db: Session, event: models.Event, event_in: schemas.EventUpdate
) -> models.Event:
    for key, value in _to_orm_kwargs(event_in).items():
        setattr(event, key, value)
    db.commit()
    db.refresh(event)
    return event


def delete_event(db: Session, event: models.Event) -> None:
    db.delete(event)
    db.commit()
