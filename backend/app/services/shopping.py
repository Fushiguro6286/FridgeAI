"""Deterministic shopping-list aggregation with safe unit handling."""

from dataclasses import dataclass, field

from app.services.ingredients import StockItem, find_stock, from_base, normalize_name, to_base


@dataclass
class Need:
    name: str
    quantity: float | None
    unit: str | None
    recipe: str


@dataclass
class ShoppingRow:
    name: str
    normalized_name: str
    quantity: float | None
    unit: str | None
    recipes: list[str]
    status: str  # buy | check


@dataclass
class _Group:
    name: str
    dimension: str
    amount: float = 0.0
    has_unknown: bool = False
    recipes: list[str] = field(default_factory=list)


def aggregate_needs(needs: list[Need]) -> list[_Group]:
    """Combine needs that share a name and a convertible unit; never mix kg with pieces."""
    groups: dict[tuple[str, str], _Group] = {}
    for n in needs:
        norm = normalize_name(n.name)
        if not norm:
            continue
        if n.quantity is None:
            dim, amount = to_base(0, n.unit)
        else:
            dim, amount = to_base(n.quantity, n.unit)
        g = groups.setdefault((norm, dim), _Group(name=n.name.strip(), dimension=dim))
        g.amount += amount
        g.has_unknown |= n.quantity is None
        if n.recipe not in g.recipes:
            g.recipes.append(n.recipe)
    return list(groups.values())


def compute_shopping(needs: list[Need], stock: list[StockItem]) -> list[ShoppingRow]:
    left: dict[int, tuple[str, float]] = {
        i: to_base(s.quantity, s.unit) for i, s in enumerate(stock) if s.quantity is not None
    }
    rows: list[ShoppingRow] = []
    for g in aggregate_needs(needs):
        qty, unit = from_base(g.dimension, g.amount) if g.amount > 0 else (None, None)
        if g.dimension == "count" and unit == "pcs":
            unit = None  # "3 tomato" reads better than "3 pcs tomato"
        norm = normalize_name(g.name)
        item = find_stock(g.name, stock)
        if item is None:
            rows.append(ShoppingRow(g.name, norm, qty, unit, g.recipes, "buy"))
            continue
        idx = stock.index(item)
        known = left.get(idx)
        if known is None or known[0] != g.dimension or g.has_unknown:
            # In stock, but we can't tell whether there is enough. Ask the user to check.
            rows.append(ShoppingRow(g.name, norm, qty, unit, g.recipes, "check"))
            continue
        shortfall = g.amount - known[1]
        left[idx] = (known[0], max(0.0, known[1] - g.amount))
        if shortfall > 1e-9:
            q, u = from_base(g.dimension, shortfall)
            if g.dimension == "count" and u == "pcs":
                u = None
            rows.append(ShoppingRow(g.name, norm, q, u, g.recipes, "buy"))
    return rows
