from fastapi import APIRouter, File, UploadFile

from app.auth import CurrentUser
from app.config import get_settings
from app.errors import AppError
from app.ratelimit import limiter
from app.schemas import DetectionOut
from app.services import llm, vision

router = APIRouter(prefix="/ingredients", tags=["ingredients"])


@router.post("/detect", response_model=DetectionOut)
def detect(user: CurrentUser, image: UploadFile = File(...)) -> DetectionOut:
    """Detect likely ingredients in a fridge photo. Results are suggestions only and are NOT saved.
    The image is processed in memory and never stored."""
    s = get_settings()
    llm.ensure_configured()
    limiter.check(f"ai:{user.id}", s.ai_rate_limit_per_minute)
    data = image.file.read(s.max_upload_bytes + 1)
    if len(data) > s.max_upload_bytes:
        raise AppError(413, "file_too_large", f"Images must be {s.max_upload_mb:g} MB or smaller.")
    return vision.detect_ingredients(data)
