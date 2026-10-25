from fastapi import APIRouter, Request, status
from sqlalchemy import func, select

from app.auth import DB, CurrentUser, create_access_token, hash_password, verify_password
from app.config import get_settings
from app.errors import AppError
from app.models import User, UserPreferences
from app.ratelimit import limiter
from app.schemas import LoginIn, RegisterIn, TokenOut, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


def _limit(request: Request) -> None:
    ip = request.client.host if request.client else "unknown"
    limiter.check(f"auth:{ip}", get_settings().auth_rate_limit_per_minute)


@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def register(body: RegisterIn, db: DB, request: Request) -> TokenOut:
    _limit(request)
    email = body.email.lower()
    if db.scalar(select(User).where(func.lower(User.email) == email)):
        raise AppError(409, "email_taken", "An account with this email already exists.")
    user = User(email=email, password_hash=hash_password(body.password), display_name=body.display_name.strip())
    user.preferences = UserPreferences(allergies=[], exclusions=[], cuisines=[])
    db.add(user)
    db.commit()
    return TokenOut(access_token=create_access_token(user.id), user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenOut)
def login(body: LoginIn, db: DB, request: Request) -> TokenOut:
    _limit(request)
    user = db.scalar(select(User).where(func.lower(User.email) == body.email.lower()))
    if not verify_password(body.password, user.password_hash if user else None):
        raise AppError(401, "invalid_credentials", "Incorrect email or password.")
    return TokenOut(access_token=create_access_token(user.id), user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser) -> User:
    return user
