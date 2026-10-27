"""Meal-plan orchestration: gather/generate candidates, run the deterministic planner, persist, recalc shopping."""

from collections import Counter
from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.errors import AppError
from app.models import MealPlan, MealPlanEntry, Recipe, ShoppingList, ShoppingListItem, User
from app.schemas import EntryOut, MealPlanGenerateIn, MealPlanOut, MissingIngredient
from app.services import recipes as rs
from app.services.ingredients import allergy_conflicts, diet_conflicts
from app.services.planner import SLOT_ORDER, PlanCandidate, PlanIngredient, build_plan
from app.services.shopping import Need, compute_shopping

MAX_CANDIDATES = 60


def _slots(start: date, days: int, snacks: bool) -> list[tuple[date, str]]:
    names = SLOT_ORDER if snacks else SLOT_ORDER[:3]
    return [(start + timedelta(days=d), s) for d in range(days) for s in names]


def _usable_recipes(db: Session, user: User, o: rs.GenerateOptions) -> list[Recipe]:
    """User's existing recipes that still satisfy CURRENT diet/allergy/exclusion settings."""
    rows = db.scalars(
        select(Recipe).where(Recipe.user_id == user.id).order_by(Recipe.created_at.desc(), Recipe.id.desc()).limit(MAX_CANDIDATES)
    ).all()
    return [r for r in rows if not _conflict(r, o)]


def _conflict(recipe: Recipe, o: rs.GenerateOptions) -> str | None:
    names = [i.name for i in recipe.ingredients] + [recipe.title]
    if diet_conflicts(names, o.diet) or allergy_conflicts(names, o.avoid):
        return "conflicts with your preferences"
    if o.max_minutes and recipe.prep_minutes + recipe.cook_minutes > o.max_minutes * 1.5:
        return "too long"
    return None


def _candidates(recipes: list[Recipe], stock, o: rs.GenerateOptions) -> list[PlanCandidate]:
    prefs = rs.rank_prefs(o)
    return [
        PlanCandidate(
            id=r.id,
            title=r.title,
            meal_types=r.meal_types,
            servings=r.servings,
            ingredients=[PlanIngredient(i.name, i.quantity, i.unit, i.optional) for i in r.ingredients],
            base_score=rs.rank(r, stock, prefs).score,
        )
        for r in recipes
    ]


def generate_plan(db: Session, user: User, req: MealPlanGenerateIn) -> tuple[MealPlan, bool]:
    prefs = rs.get_prefs(db, user)
    o = rs.options_from_prefs(prefs, servings=req.servings)
    servings = req.servings or prefs.servings
    slots = _slots(req.start_date, req.days, req.include_snacks)
    stock = rs.load_stock(db, user)

    pool = _usable_recipes(db, user, o) if req.use_existing_recipes else []
    have = Counter(m for r in pool for m in set(r.meal_types))
    target = min(req.days, 5)
    wanted = {s: max(0, target - have[s]) for s in {s for _, s in slots}}
    notes: list[str] = []
    mock = False
    if sum(wanted.values()):
        ask = ", ".join(f"{n} {s}" for s, n in wanted.items() if n)
        o.count = min(16, sum(wanted.values()))
        o.extra = (
            f"Suggest these recipes: {ask}. Each recipe's meal_types must include its meal. "
            "Use a variety of main dishes; do not repeat the same main dish."
        )
        new, excluded, mock = rs.generate(db, user, o)
        pool = list({r.id: r for r in new + pool}.values())
        if excluded:
            notes.append(f"{len(excluded)} suggested recipe(s) were removed because they conflicted with your diet, allergies or exclusions.")
    if not stock:
        notes.append("Your inventory is empty, so every ingredient will need to be bought. Add ingredients for a better plan.")

    result = build_plan(_candidates(pool, stock, o), slots, servings, stock)
    plan = MealPlan(
        user_id=user.id,
        name=req.name or ("Plan for " + req.start_date.strftime("%d %b") if req.days == 1 else "Week of " + req.start_date.strftime("%d %b")),
        start_date=req.start_date,
        days=req.days,
        include_snacks=req.include_snacks,
        notes=notes + result.notes,
        entries=[MealPlanEntry(day_date=d, slot=s, recipe_id=rid, servings=servings) for d, s, rid in result.assignments],
    )
    db.add(plan)
    db.commit()
    link_shopping_list(db, user, plan.id)
    return plan, mock


def get_plan(db: Session, user: User, plan_id: int) -> MealPlan:
    plan = db.get(MealPlan, plan_id)
    if plan is None or plan.user_id != user.id:
        raise AppError(404, "not_found", "Meal plan not found.")
    return plan


def get_entry(plan: MealPlan, entry_id: int) -> MealPlanEntry:
    for e in plan.entries:
        if e.id == entry_id:
            return e
    raise AppError(404, "not_found", "Meal not found in this plan.")


def owned_recipe(db: Session, user: User, recipe_id: int) -> Recipe:
    r = db.get(Recipe, recipe_id)
    if r is None or r.user_id != user.id:
        raise AppError(404, "not_found", "Recipe not found.")
    return r


def check_in_range(plan: MealPlan, day: date) -> None:
    if not plan.start_date <= day < plan.start_date + timedelta(days=plan.days):
        raise AppError(422, "out_of_range", "That date is outside this meal plan.")


def regenerate_entry(db: Session, user: User, plan: MealPlan, entry: MealPlanEntry) -> bool:
    """Replace one meal with the best alternative; everything else in the plan is untouched."""
    prefs = rs.get_prefs(db, user)
    o = rs.options_from_prefs(prefs)
    stock = rs.load_stock(db, user)
    uses = Counter(e.recipe_id for e in plan.entries)
    same_day = {e.recipe_id for e in plan.entries if e.day_date == entry.day_date}
    options = [
        r for r in _usable_recipes(db, user, o)
        if entry.slot in r.meal_types and r.id != entry.recipe_id and r.id not in same_day
    ]
    mock = False
    if not [r for r in options if uses[r.id] == 0]:
        o.count, o.meal_type = 3, entry.slot
        o.extra = f"Suggest 3 different {entry.slot} recipes. Avoid these dishes: " + ", ".join(
            sorted({e.recipe.title for e in plan.entries})[:20]
        )
        new, _, mock = rs.generate(db, user, o)
        options = [r for r in new if r.id not in same_day] + options
    if not options:
        raise AppError(422, "no_alternative", "No alternative recipe fits your preferences for this meal.")
    prefs_r = rs.rank_prefs(o)
    best = min(options, key=lambda r: (uses[r.id], -rs.rank(r, stock, prefs_r).score))
    entry.recipe_id = best.id
    db.commit()
    recalc_if_linked(db, user, plan.id)
    return mock


def needs_for_plan(plan: MealPlan) -> list[Need]:
    needs = []
    for e in plan.entries:
        scale = e.servings / max(e.recipe.servings, 1)
        for i in e.recipe.ingredients:
            if not i.optional:
                needs.append(Need(i.name, None if i.quantity is None else i.quantity * scale, i.unit, e.recipe.title))
    return needs


def plan_out(db: Session, user: User, plan: MealPlan, mock: bool = False) -> MealPlanOut:
    db.expire_all()  # sessions don't expire on commit; reload entries/recipes after edits
    stock = rs.load_stock(db, user)
    saved = rs.saved_ids(db, user)
    slot_idx = {s: i for i, s in enumerate(SLOT_ORDER)}
    entries = sorted(plan.entries, key=lambda e: (e.day_date, slot_idx.get(e.slot, 9)))
    missing = compute_shopping(needs_for_plan(plan), stock)
    return MealPlanOut(
        id=plan.id,
        name=plan.name,
        start_date=plan.start_date,
        days=plan.days,
        include_snacks=plan.include_snacks,
        created_at=plan.created_at,
        notes=plan.notes,
        entries=[
            EntryOut(id=e.id, day_date=e.day_date, slot=e.slot, servings=e.servings, recipe=rs.to_out(e.recipe, stock, saved))
            for e in entries
        ],
        missing=[MissingIngredient(name=m.name, quantity=m.quantity, unit=m.unit, recipes=m.recipes, status=m.status) for m in missing],
        mock=mock,
    )


# ---------- shopping list ----------

def get_shopping_list(db: Session, user: User) -> ShoppingList:
    sl = db.scalar(select(ShoppingList).where(ShoppingList.user_id == user.id))
    if sl is None:
        sl = ShoppingList(user_id=user.id)
        db.add(sl)
        db.commit()
    return sl


def link_shopping_list(db: Session, user: User, plan_id: int) -> ShoppingList:
    sl = get_shopping_list(db, user)
    sl.meal_plan_id = plan_id
    recalc(db, user, sl)
    return sl


def recalc_if_linked(db: Session, user: User, plan_id: int) -> None:
    sl = get_shopping_list(db, user)
    if sl.meal_plan_id == plan_id:
        recalc(db, user, sl)


def recalc(db: Session, user: User, sl: ShoppingList) -> None:
    """Rebuild the generated part of the list. Custom items are never touched; checked state and
    prices of generated items survive when the same ingredient is still needed."""
    db.flush()  # keep pending changes (e.g. a new meal_plan_id) before reloading
    db.expire_all()
    plan = db.get(MealPlan, sl.meal_plan_id) if sl.meal_plan_id else None
    rows = compute_shopping(needs_for_plan(plan), rs.load_stock(db, user)) if plan else []
    generated = [i for i in sl.items if not i.is_custom]
    old = {(i.normalized_name, i.unit or ""): i for i in generated}
    for item in generated:  # all of them: the dict above drops rows that share a key
        sl.items.remove(item)
    db.flush()
    for row in rows:
        prev = old.get((row.normalized_name, row.unit or ""))
        sl.items.append(
            ShoppingListItem(
                name=row.name,
                normalized_name=row.normalized_name,
                quantity=row.quantity,
                unit=row.unit,
                recipes=row.recipes,
                status=row.status,
                checked=prev.checked if prev else False,
                estimated_price=prev.estimated_price if prev else None,
                is_custom=False,
            )
        )
    db.commit()
