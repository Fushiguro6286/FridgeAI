"""Deterministic meal planner: assigns candidate recipes to slots and tracks estimated stock use."""

from collections import Counter
from dataclasses import dataclass, field
from datetime import date

from app.services.ingredients import StockItem, find_stock, to_base

SLOT_ORDER = ("breakfast", "lunch", "dinner", "snack")


@dataclass
class PlanIngredient:
    name: str
    quantity: float | None
    unit: str | None
    optional: bool = False


@dataclass
class PlanCandidate:
    id: int
    title: str
    meal_types: list[str]
    servings: int
    ingredients: list[PlanIngredient]
    base_score: float = 0.0


@dataclass
class PlanResult:
    assignments: list[tuple[date, str, int]] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)


class _Stock:
    """Remaining estimated stock. Items with unknown quantity are never treated as unlimited:
    they are reported back so the user knows the plan assumes they have enough."""

    def __init__(self, stock: list[StockItem]):
        self.items = stock
        self.left: dict[int, tuple[str, float]] = {}
        for idx, s in enumerate(stock):
            if s.quantity is not None:
                self.left[idx] = to_base(s.quantity, s.unit)
        self.unknown_used: set[str] = set()
        self.ran_out: dict[str, date] = {}

    def _index(self, name: str) -> int | None:
        item = find_stock(name, self.items)
        return None if item is None else self.items.index(item)

    def has(self, name: str) -> bool:
        idx = self._index(name)
        if idx is None:
            return False
        return idx not in self.left or self.left[idx][1] > 0

    def consume(self, ing: PlanIngredient, scale: float, day: date) -> None:
        idx = self._index(ing.name)
        if idx is None:
            return
        item = self.items[idx]
        if idx not in self.left or ing.quantity is None:
            self.unknown_used.add(item.name)
            return
        dim, have = self.left[idx]
        need_dim, need = to_base(ing.quantity * scale, ing.unit)
        if need_dim != dim:
            self.unknown_used.add(item.name)  # units can't be compared, so we can't track it
            return
        remaining = have - need
        self.left[idx] = (dim, remaining)
        if remaining <= 0 and item.name not in self.ran_out:
            self.ran_out[item.name] = day


def _eligible(candidates: list[PlanCandidate], slot: str) -> list[PlanCandidate]:
    exact = [c for c in candidates if slot in c.meal_types]
    if exact or slot == "snack":
        return exact
    # Lunch and dinner dishes are interchangeable when one side is short.
    swap = {"lunch": "dinner", "dinner": "lunch"}.get(slot)
    return [c for c in candidates if swap and swap in c.meal_types]


def build_plan(
    candidates: list[PlanCandidate],
    slots: list[tuple[date, str]],
    servings: int,
    stock: list[StockItem],
) -> PlanResult:
    result = PlanResult()
    uses: Counter[int] = Counter()
    used_on_day: dict[date, set[int]] = {}
    short_slots: dict[str, int] = {}
    empty_slots: list[str] = []
    st = _Stock(stock)

    for day, slot in slots:
        pool = _eligible(candidates, slot)
        if not pool:
            empty_slots.append(f"{day.isoformat()} {slot}")
            continue
        today = used_on_day.setdefault(day, set())
        fresh = [c for c in pool if c.id not in today] or pool

        def key(c: PlanCandidate) -> tuple[int, float]:
            req = [i for i in c.ingredients if not i.optional]
            in_stock = sum(1 for i in req if st.has(i.name)) / len(req) if req else 1.0
            return (uses[c.id], -(c.base_score + 25 * in_stock))

        choice = min(fresh, key=key)
        if uses[choice.id] > 0:
            short_slots[slot] = len(pool)
        uses[choice.id] += 1
        today.add(choice.id)
        result.assignments.append((day, slot, choice.id))
        scale = servings / max(choice.servings, 1)
        for ing in choice.ingredients:
            if not ing.optional:
                st.consume(ing, scale, day)

    for slot, count in short_slots.items():
        result.notes.append(
            f"Only {count} suitable {slot} recipe{'s' if count != 1 else ''} were available, so some {slot} meals repeat."
        )
    if empty_slots:
        result.notes.append("No suitable recipe was found for: " + ", ".join(empty_slots) + ".")
    for name, day in st.ran_out.items():
        result.notes.append(f"Your {name} is expected to run out by {day.strftime('%a %d %b')}.")
    if st.unknown_used:
        result.notes.append(
            "Quantity unknown for " + ", ".join(sorted(st.unknown_used))
            + ". The plan assumes you have enough; check before cooking or add quantities in My Ingredients."
        )
    return result
