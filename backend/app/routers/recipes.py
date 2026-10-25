from typing import Literal

from fastapi import APIRouter, Query, Response, status
from sqlalchemy import delete, func, select

from app.auth import DB, CurrentUser
from app.config import get_settings
from app.models import Recipe, SavedRecipe
from app.ratelimit import limiter
from app.schemas import Page, RecipeGenerateIn, RecipeGenerateOut, RecipeOut
from app.services import llm
from app.services import recipes as rs
from app.services.meal_plans import owned_recipe

router = APIRouter(prefix="/recipes", tags=["recipes"])


@router.post("/generate", response_model=RecipeGenerateOut)
def generate(body: RecipeGenerateIn, user: CurrentUser, db: DB) -> RecipeGenerateOut:
    llm.ensure_configured()
    limiter.check(f"ai:{user.id}", get_settings().ai_rate_limit_per_minute)
    prefs = rs.get_prefs(db, user)
    o = rs.options_from_prefs(
        prefs,
        count=body.count,
        cuisines=[body.cuisine] if body.cuisine else None,
        diet=body.diet,
        max_minutes=body.max_minutes,
        servings=body.servings,
        difficulty=body.difficulty,
        meal_type=body.meal_type,
        prioritize=body.prioritize or None,
    )
    recipes, excluded, mock = rs.generate(db, user, o)
    stock = rs.load_stock(db, user)
    rp = rs.rank_prefs(o)
    ranked = sorted(((r, rs.rank(r, stock, rp)) for r in recipes), key=lambda x: -x[1].score)
    return RecipeGenerateOut(recipes=[rs.to_out(r, stock, set(), k) for r, k in ranked], excluded=excluded, mock=mock)


@router.get("", response_model=Page[RecipeOut])
def list_recipes(
    user: CurrentUser,
    db: DB,
    saved: bool = False,
    sort: Literal["newest", "best_match"] = "newest",
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    stmt = select(Recipe).where(Recipe.user_id == user.id)
    if saved:
        stmt = stmt.join(SavedRecipe, SavedRecipe.recipe_id == Recipe.id).where(SavedRecipe.user_id == user.id)
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    stock = rs.load_stock(db, user)
    saved_set = rs.saved_ids(db, user)
    if sort == "best_match":
        # shortcut: ranks the newest 200 in memory; move scoring to SQL if users keep thousands of recipes
        rows = db.scalars(stmt.order_by(Recipe.created_at.desc()).limit(200)).all()
        prefs = rs.rank_prefs(rs.options_from_prefs(rs.get_prefs(db, user)))
        scored = sorted(((r, rs.rank(r, stock, prefs)) for r in rows), key=lambda x: -x[1].score)
        page = [rs.to_out(r, stock, saved_set, k) for r, k in scored[offset : offset + limit]]
    else:
        rows = db.scalars(stmt.order_by(Recipe.created_at.desc(), Recipe.id.desc()).limit(limit).offset(offset)).all()
        page = [rs.to_out(r, stock, saved_set) for r in rows]
    return Page(items=page, total=total, limit=limit, offset=offset)


@router.get("/{recipe_id}", response_model=RecipeOut)
def get_recipe(recipe_id: int, user: CurrentUser, db: DB) -> RecipeOut:
    r = owned_recipe(db, user, recipe_id)
    return rs.to_out(r, rs.load_stock(db, user), rs.saved_ids(db, user))


@router.post("/{recipe_id}/save", response_model=RecipeOut)
def save_recipe(recipe_id: int, user: CurrentUser, db: DB) -> RecipeOut:
    r = owned_recipe(db, user, recipe_id)
    if recipe_id not in rs.saved_ids(db, user):
        db.add(SavedRecipe(user_id=user.id, recipe_id=r.id))
        db.commit()
    return rs.to_out(r, rs.load_stock(db, user), rs.saved_ids(db, user))


@router.delete("/{recipe_id}/save", status_code=status.HTTP_204_NO_CONTENT)
def unsave_recipe(recipe_id: int, user: CurrentUser, db: DB):
    owned_recipe(db, user, recipe_id)
    db.execute(delete(SavedRecipe).where(SavedRecipe.user_id == user.id, SavedRecipe.recipe_id == recipe_id))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
