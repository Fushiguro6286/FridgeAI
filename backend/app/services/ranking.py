"""Deterministic recipe ranking. The LLM proposes recipes; this code decides the order."""

from dataclasses import dataclass, field

from app.services.ingredients import StockItem, diet_conflicts, find_stock, names_match


@dataclass
class RankIngredient:
    name: str
    optional: bool = False


@dataclass
class RankInput:
    title: str
    cuisine: str
    total_minutes: int
    ingredients: list[RankIngredient]
    missing_cost: float | None = None  # only when real price data exists


@dataclass
class RankPrefs:
    diet: str = "none"
    cuisines: list[str] = field(default_factory=list)
    max_minutes: int | None = None
    prioritize: list[str] = field(default_factory=list)
    budget_per_meal: float | None = None


@dataclass
class RankResult:
    score: float
    coverage: float
    available: int
    missing: int
    diet_compatible: bool
    breakdown: dict[str, float]


WEIGHTS = {"coverage": 40, "few_missing": 20, "time": 15, "cuisine": 10, "priority": 15, "cost": 10}


def rank_recipe(recipe: RankInput, stock: list[StockItem], prefs: RankPrefs) -> RankResult:
    required = [i for i in recipe.ingredients if not i.optional]
    available = sum(1 for i in required if find_stock(i.name, stock))
    missing = len(required) - available
    coverage = available / len(required) if required else 1.0

    few_missing = 1 - min(missing, 6) / 6

    if prefs.max_minutes and prefs.max_minutes > 0:
        over = recipe.total_minutes - prefs.max_minutes
        time_fit = 1.0 if over <= 0 else max(0.0, 1 - over / prefs.max_minutes)
    else:
        time_fit = 1.0

    if prefs.cuisines:
        c = recipe.cuisine.lower()
        cuisine_fit = 1.0 if any(p.lower() in c or c in p.lower() for p in prefs.cuisines if p) else 0.0
    else:
        cuisine_fit = 0.5

    # Priority = ingredients the user wants to use up (explicit list + inventory marked use_soon).
    priority_names = list(prefs.prioritize) + [s.name for s in stock if s.priority == "use_soon"]
    priority_names = list(dict.fromkeys(priority_names))
    if priority_names:
        used = sum(1 for p in priority_names if any(names_match(i.name, p) for i in recipe.ingredients))
        priority_fit = min(1.0, used / min(len(priority_names), 3))
    else:
        priority_fit = 0.0

    cost_penalty = 0.0
    if recipe.missing_cost is not None and prefs.budget_per_meal:
        cost_penalty = min(1.0, recipe.missing_cost / prefs.budget_per_meal)

    breakdown = {
        "coverage": WEIGHTS["coverage"] * coverage,
        "few_missing": WEIGHTS["few_missing"] * few_missing,
        "time": WEIGHTS["time"] * time_fit,
        "cuisine": WEIGHTS["cuisine"] * cuisine_fit,
        "priority": WEIGHTS["priority"] * priority_fit,
        "cost": -WEIGHTS["cost"] * cost_penalty,
    }
    diet_ok = not diet_conflicts([i.name for i in recipe.ingredients], prefs.diet)
    score = max(0.0, sum(breakdown.values())) if diet_ok else 0.0
    return RankResult(
        score=round(score, 1),
        coverage=round(coverage, 3),
        available=available,
        missing=missing,
        diet_compatible=diet_ok,
        breakdown={k: round(v, 1) for k, v in breakdown.items()},
    )
