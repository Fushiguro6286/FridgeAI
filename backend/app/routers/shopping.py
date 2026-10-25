from fastapi import APIRouter, Response, status

from app.auth import DB, CurrentUser
from app.errors import AppError
from app.models import MealPlan, ShoppingList, ShoppingListItem, User
from app.schemas import ShoppingGenerateIn, ShoppingItemIn, ShoppingItemOut, ShoppingItemPatch, ShoppingListOut
from app.services import meal_plans as mp
from app.services import recipes as rs
from app.services.ingredients import normalize_name

router = APIRouter(prefix="/shopping-list", tags=["shopping list"])


def _out(db, user: User, sl: ShoppingList) -> ShoppingListOut:
    db.expire_all()
    plan = db.get(MealPlan, sl.meal_plan_id) if sl.meal_plan_id else None
    priced = [float(i.estimated_price) for i in sl.items if i.estimated_price is not None]
    return ShoppingListOut(
        id=sl.id,
        meal_plan_id=sl.meal_plan_id,
        meal_plan_name=plan.name if plan else None,
        items=[ShoppingItemOut.model_validate(i) for i in sl.items],
        estimated_total=round(sum(priced), 2) if priced else None,
        priced_items=len(priced),
        currency=rs.get_prefs(db, user).currency,
    )


def _owned_item(sl: ShoppingList, item_id: int) -> ShoppingListItem:
    for i in sl.items:
        if i.id == item_id:
            return i
    raise AppError(404, "not_found", "Shopping item not found.")


@router.get("", response_model=ShoppingListOut)
def get_list(user: CurrentUser, db: DB) -> ShoppingListOut:
    return _out(db, user, mp.get_shopping_list(db, user))


@router.post("/generate", response_model=ShoppingListOut)
def generate(body: ShoppingGenerateIn, user: CurrentUser, db: DB) -> ShoppingListOut:
    """Build the list from a meal plan. Custom items are kept."""
    plan = mp.get_plan(db, user, body.meal_plan_id)
    return _out(db, user, mp.link_shopping_list(db, user, plan.id))


@router.post("/items", response_model=ShoppingItemOut, status_code=status.HTTP_201_CREATED)
def add_item(body: ShoppingItemIn, user: CurrentUser, db: DB):
    sl = mp.get_shopping_list(db, user)
    item = ShoppingListItem(
        name=body.name.strip(),
        normalized_name=normalize_name(body.name),
        quantity=body.quantity,
        unit=body.unit,
        estimated_price=body.estimated_price,
        recipes=[],
        is_custom=True,
        status="buy",
    )
    sl.items.append(item)
    db.commit()
    return item


@router.patch("/items/{item_id}", response_model=ShoppingItemOut)
def update_item(item_id: int, body: ShoppingItemPatch, user: CurrentUser, db: DB):
    item = _owned_item(mp.get_shopping_list(db, user), item_id)
    changes = body.model_dump(exclude_unset=True)
    if changes.get("name", "") is None or changes.get("checked", False) is None:
        raise AppError(422, "invalid", "name and checked cannot be empty.")
    for key, value in changes.items():
        setattr(item, key, value.strip() if key == "name" else value)
    if "name" in changes:
        item.normalized_name = normalize_name(item.name)
    db.commit()
    return item


@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(item_id: int, user: CurrentUser, db: DB):
    sl = mp.get_shopping_list(db, user)
    sl.items.remove(_owned_item(sl, item_id))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
