from datetime import datetime, timezone
import uuid
from sqlalchemy import String, Integer, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.db.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class HistoryRecordORM(Base):
    __tablename__ = "history_records"
    
    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    user_story_preview: Mapped[str] = mapped_column(String(500), default="")
    test_case_count: Mapped[int] = mapped_column(Integer, default=0)
    
    request_payload_json: Mapped[str] = mapped_column(Text)
    response_payload_json: Mapped[str] = mapped_column(Text)
