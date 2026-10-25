from fastapi import APIRouter, Query, Response, status
from sqlalchemy import func, select

from app.auth import DB, CurrentUser
from app.config import get_settings
from app.errors import AppError
from app.models import MealPlan, MealPlanEntry
from app.ratelimit import limiter
from app.schemas import EntryIn, EntryPatch, MealPlanGenerateIn, MealPlanOut, MealPlanPatch, MealPlanSummary, Page
from app.services import llm
from app.services import meal_plans as mp

router = APIRouter(prefix="/meal-plans", tags=["meal plans"])


@router.post("/generate", response_model=MealPlanOut, status_code=status.HTTP_201_CREATED)
def generate(body: MealPlanGenerateIn, user: CurrentUser, db: DB) -> MealPlanOut:
    """Generate a 1–7 day plan. Becomes the shopping list's active plan."""
    llm.ensure_configured()
    limiter.check(f"ai:{user.id}", get_settings().ai_rate_limit_per_minute)
    plan, mock = mp.generate_plan(db, user, body)
    return mp.plan_out(db, user, plan, mock)


@router.get("", response_model=Page[MealPlanSummary])
def list_plans(user: CurrentUser, db: DB, limit: int = Query(20, ge=1, le=100), offset: int = Query(0, ge=0)):
    stmt = select(MealPlan).where(MealPlan.user_id == user.id)
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = db.scalars(stmt.order_by(MealPlan.start_date.desc(), MealPlan.id.desc()).limit(limit).offset(offset)).all()
    return Page(items=rows, total=total, limit=limit, offset=offset)


@router.get("/{plan_id}", response_model=MealPlanOut)
def get_plan(plan_id: int, user: CurrentUser, db: DB) -> MealPlanOut:
    return mp.plan_out(db, user, mp.get_plan(db, user, plan_id))


@router.patch("/{plan_id}", response_model=MealPlanOut)
def rename_plan(plan_id: int, body: MealPlanPatch, user: CurrentUser, db: DB) -> MealPlanOut:
    plan = mp.get_plan(db, user, plan_id)
    plan.name = body.name.strip()
    db.commit()
    return mp.plan_out(db, user, plan)


@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_plan(plan_id: int, user: CurrentUser, db: DB):
    plan = mp.get_plan(db, user, plan_id)
    sl = mp.get_shopping_list(db, user)
    linked = sl.meal_plan_id == plan.id
    db.delete(plan)
    db.commit()
    if linked:
        sl.meal_plan_id = None
        mp.recalc(db, user, sl)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{plan_id}/entries", response_model=MealPlanOut)
def put_entry(plan_id: int, body: EntryIn, user: CurrentUser, db: DB) -> MealPlanOut:
    """Add a recipe to a slot, replacing whatever was there. Other meals are untouched."""
    plan = mp.get_plan(db, user, plan_id)
    mp.check_in_range(plan, body.day_date)
    mp.owned_recipe(db, user, body.recipe_id)
    existing = next((e for e in plan.entries if e.day_date == body.day_date and e.slot == body.slot), None)
    if existing:
        existing.recipe_id, existing.servings = body.recipe_id, body.servings
    else:
        plan.entries.append(MealPlanEntry(**body.model_dump()))
    db.commit()
    mp.recalc_if_linked(db, user, plan.id)
    return mp.plan_out(db, user, plan)


@router.patch("/{plan_id}/entries/{entry_id}", response_model=MealPlanOut)
def update_entry(plan_id: int, entry_id: int, body: EntryPatch, user: CurrentUser, db: DB) -> MealPlanOut:
    plan = mp.get_plan(db, user, plan_id)
    entry = mp.get_entry(plan, entry_id)
    if body.recipe_id is not None:
        mp.owned_recipe(db, user, body.recipe_id)
        entry.recipe_id = body.recipe_id
    if body.servings is not None:
        entry.servings = body.servings
    db.commit()
    mp.recalc_if_linked(db, user, plan.id)
    return mp.plan_out(db, user, plan)


@router.delete("/{plan_id}/entries/{entry_id}", response_model=MealPlanOut)
def delete_entry(plan_id: int, entry_id: int, user: CurrentUser, db: DB) -> MealPlanOut:
    plan = mp.get_plan(db, user, plan_id)
    plan.entries.remove(mp.get_entry(plan, entry_id))
    db.commit()
    mp.recalc_if_linked(db, user, plan.id)
    return mp.plan_out(db, user, plan)


@router.post("/{plan_id}/entries/{entry_id}/regenerate", response_model=MealPlanOut)
def regenerate_entry(plan_id: int, entry_id: int, user: CurrentUser, db: DB) -> MealPlanOut:
    plan = mp.get_plan(db, user, plan_id)
    entry = mp.get_entry(plan, entry_id)
    limiter.check(f"ai:{user.id}", get_settings().ai_rate_limit_per_minute)
    try:
        mock = mp.regenerate_entry(db, user, plan, entry)
    except AppError as e:
        if e.code == "ai_not_configured":
            raise AppError(503, e.code, "No other saved recipe fits this meal, and AI is not configured to suggest new ones.") from None
        raise
    return mp.plan_out(db, user, plan, mock)
