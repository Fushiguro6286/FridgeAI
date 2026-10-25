import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import get_settings
from app.errors import AppError
from app.routers import auth, detect, inventory, meal_plans, preferences, recipes, shopping

log = logging.getLogger("fridgeai")
settings = get_settings()

app = FastAPI(
    title="FridgeAI API",
    description="Smart AI meal planner: fridge-photo ingredient detection, recipes, meal plans and shopping lists.",
    version="1.0.0",
    docs_url=None if settings.environment == "production" else "/docs",
    redoc_url=None,
)

@app.middleware("http")
async def limit_body_size(request: Request, call_next):
    """Reject oversized requests before reading them. Upload endpoints also cap what they read."""
    length = request.headers.get("content-length")
    limit = settings.max_upload_bytes + 512 * 1024
    if length and length.isdigit() and int(length) > limit:
        return _error(413, "request_too_large", f"Request is too large (max {settings.max_upload_mb:g} MB).")
    return await call_next(request)


# Added after the size check so CORS is outermost and even 413 responses carry CORS headers.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=False,  # bearer tokens, no cookies
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)


def _error(status: int, code: str, message: str, details=None) -> JSONResponse:
    body = {"error": {"code": code, "message": message}}
    if details is not None:
        body["error"]["details"] = details
    return JSONResponse(body, status_code=status)


@app.exception_handler(AppError)
async def app_error(_: Request, exc: AppError):
    return _error(exc.status, exc.code, exc.message)


@app.exception_handler(StarletteHTTPException)
async def http_error(_: Request, exc: StarletteHTTPException):
    codes = {401: "unauthorized", 403: "forbidden", 404: "not_found", 405: "method_not_allowed"}
    resp = _error(exc.status_code, codes.get(exc.status_code, "http_error"), str(exc.detail))
    if exc.headers:
        resp.headers.update(exc.headers)
    return resp


@app.exception_handler(RequestValidationError)
async def validation_error(_: Request, exc: RequestValidationError):
    details = [{"field": ".".join(str(p) for p in e["loc"][1:]), "message": e["msg"]} for e in exc.errors()]
    return _error(422, "validation_error", "Some fields are invalid.", details)


@app.exception_handler(Exception)
async def unhandled(_: Request, exc: Exception):
    log.exception("Unhandled error")
    return _error(500, "server_error", "Something went wrong on our side. Please try again.")


@app.get("/api/health", tags=["health"])
def health():
    s = get_settings()
    return {
        "status": "ok",
        "ai_configured": bool(s.ai_api_key) or s.ai_mock_mode,
        "ai_mock_mode": s.ai_mock_mode,
        "max_upload_mb": s.max_upload_mb,
    }


for r in (auth, detect, inventory, recipes, meal_plans, shopping, preferences):
    app.include_router(r.router, prefix="/api")
