from typing import Literal

from fastapi import APIRouter, Query, Response, status
from sqlalchemy import func, or_, select

from app.auth import DB, CurrentUser
from app.errors import AppError
from app.models import InventoryItem
from app.schemas import InventoryBulkIn, InventoryIn, InventoryOut, InventoryPatch, Page
from app.services.ingredients import normalize_name

router = APIRouter(prefix="/inventory", tags=["inventory"])

_SORTS = {
    "name": (InventoryItem.normalized_name.asc(),),
    "newest": (InventoryItem.created_at.desc(), InventoryItem.id.desc()),
    # nulls last on both PostgreSQL and SQLite
    "expiry": (InventoryItem.expiry_date.is_(None), InventoryItem.expiry_date.asc()),
    "priority": (
        (InventoryItem.priority != "use_soon"),
        InventoryItem.expiry_date.is_(None),
        InventoryItem.expiry_date.asc(),
    ),
}


def _owned(db, user, item_id: int) -> InventoryItem:
    item = db.get(InventoryItem, item_id)
    if item is None or item.user_id != user.id:
        raise AppError(404, "not_found", "Ingredient not found.")
    return item


@router.get("", response_model=Page[InventoryOut])
def list_inventory(
    user: CurrentUser,
    db: DB,
    q: str | None = Query(None, max_length=60),
    category: str | None = None,
    status_: Literal["available", "consumed", "all"] = Query("available", alias="status"),
    priority: str | None = None,
    sort: Literal["name", "newest", "expiry", "priority"] = "priority",
    limit: int = Query(100, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    stmt = select(InventoryItem).where(InventoryItem.user_id == user.id)
    if status_ != "all":
        stmt = stmt.where(InventoryItem.status == status_)
    if category:
        stmt = stmt.where(InventoryItem.category == category)
    if priority:
        stmt = stmt.where(InventoryItem.priority == priority)
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(or_(func.lower(InventoryItem.name).like(like), InventoryItem.normalized_name.like(like)))
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    items = db.scalars(stmt.order_by(*_SORTS[sort], InventoryItem.id).limit(limit).offset(offset)).all()
    return Page(items=items, total=total, limit=limit, offset=offset)


def _new(user, body: InventoryIn) -> InventoryItem:
    data = body.model_dump()
    data["name"] = data["name"].strip()
    return InventoryItem(user_id=user.id, normalized_name=normalize_name(data["name"]), status="available", **data)


@router.post("", response_model=InventoryOut, status_code=status.HTTP_201_CREATED)
def create_item(body: InventoryIn, user: CurrentUser, db: DB):
    item = _new(user, body)
    db.add(item)
    db.commit()
    return item


@router.post("/bulk", response_model=list[InventoryOut], status_code=status.HTTP_201_CREATED)
def create_bulk(body: InventoryBulkIn, user: CurrentUser, db: DB):
    """Used when the user confirms reviewed scan results."""
    items = [_new(user, i) for i in body.items]
    db.add_all(items)
    db.commit()
    return items


@router.patch("/{item_id}", response_model=InventoryOut)
def update_item(item_id: int, body: InventoryPatch, user: CurrentUser, db: DB):
    item = _owned(db, user, item_id)
    changes = body.model_dump(exclude_unset=True)
    for required in ("name", "category", "priority", "status"):
        if required in changes and changes[required] is None:
            raise AppError(422, "invalid", f"{required} cannot be empty.")
    for key, value in changes.items():
        setattr(item, key, value.strip() if key == "name" else value)
    if "name" in changes:
        item.normalized_name = normalize_name(item.name)
    db.commit()
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(item_id: int, user: CurrentUser, db: DB):
    db.delete(_owned(db, user, item_id))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
