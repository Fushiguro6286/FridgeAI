from fastapi import APIRouter

from app.auth import DB, CurrentUser
from app.errors import AppError
from app.schemas import PreferencesOut, PreferencesPatch
from app.services.recipes import get_prefs

router = APIRouter(prefix="/preferences", tags=["preferences"])

_NULLABLE = {"max_cook_minutes", "weekly_budget"}


@router.get("", response_model=PreferencesOut)
def read(user: CurrentUser, db: DB):
    return get_prefs(db, user)


@router.patch("", response_model=PreferencesOut)
def update(body: PreferencesPatch, user: CurrentUser, db: DB):
    prefs = get_prefs(db, user)
    for key, value in body.model_dump(exclude_unset=True).items():
        if value is None and key not in _NULLABLE:
            raise AppError(422, "invalid", f"{key} cannot be empty.")
        setattr(prefs, key, value.upper() if key == "currency" else value)
    db.commit()
    return prefs
