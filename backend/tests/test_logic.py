"""Unit tests for the deterministic core: matching, units, diet/allergy, ranking, planning, shopping."""

from datetime import date, timedelta

from app.services.ingredients import (
    StockItem,
    allergy_conflicts,
    diet_conflicts,
    names_match,
    normalize_name,
    unit_info,
)
from app.services.planner import PlanCandidate, PlanIngredient, build_plan
from app.services.ranking import RankIngredient, RankInput, RankPrefs, rank_recipe
from app.services.shopping import Need, aggregate_needs, compute_shopping

# ---------- matching ----------


def test_normalize_plurals_and_aliases():
    assert normalize_name("Tomatoes") == "tomato"
    assert normalize_name("Green Chillies") == "green chilli"
    assert normalize_name("Curd") == "yogurt"
    assert normalize_name("eggs") == "egg"
    assert normalize_name("Hummus") == "hummus"


def test_names_match_is_directional():
    assert names_match("onion", "red onion")  # specific stock satisfies generic need
    assert not names_match("red onion", "onion")
    assert names_match("tomatoes", "tomato")
    assert not names_match("paneer", "potato")


def test_units():
    assert unit_info("kg") == ("mass", 1000)
    assert unit_info("Tbsp") == ("volume", 15)
    assert unit_info(None) == ("count", 1)
    assert unit_info("cloves")[0] == "other:cloves"


# ---------- diet & allergy ----------


def test_diet_conflicts():
    assert diet_conflicts(["paneer", "egg"], "vegetarian") == ["egg"]
    assert diet_conflicts(["egg", "onion"], "eggetarian") == []
    assert diet_conflicts(["chicken"], "eggetarian") == ["chicken"]
    assert diet_conflicts(["coconut milk", "tofu"], "vegan") == []
    assert diet_conflicts(["ghee", "rice"], "vegan") == ["ghee"]
    assert diet_conflicts(["fish"], "none") == []


def test_allergy_groups_and_plant_milk():
    assert allergy_conflicts(["roasted peanuts", "rice"], ["nuts"])
    assert allergy_conflicts(["paneer"], ["dairy"])
    assert not allergy_conflicts(["coconut milk"], ["dairy"])
    assert allergy_conflicts(["prawns"], ["shellfish"])
    assert allergy_conflicts(["mushroom"], ["Mushroom"])  # explicit exclusion
    assert not allergy_conflicts(["tomato"], ["nuts"])


# ---------- ranking ----------

STOCK = [StockItem("tomato", 4, "pcs"), StockItem("onion", 3, "pcs"), StockItem("paneer", None, None, "use_soon")]


def _recipe(names, minutes=20, cuisine="Indian", optional=()):
    return RankInput(
        title="x",
        cuisine=cuisine,
        total_minutes=minutes,
        ingredients=[RankIngredient(n) for n in names] + [RankIngredient(n, True) for n in optional],
    )


def test_full_coverage_ranks_above_missing_items():
    full = rank_recipe(_recipe(["tomato", "onion"]), STOCK, RankPrefs())
    partial = rank_recipe(_recipe(["tomato", "chicken", "cream"]), STOCK, RankPrefs())
    assert full.coverage == 1.0 and full.missing == 0
    assert partial.missing == 2
    assert full.score > partial.score


def test_optional_ingredients_do_not_count_as_missing():
    r = rank_recipe(_recipe(["tomato"], optional=["coriander"]), STOCK, RankPrefs())
    assert r.missing == 0 and r.coverage == 1.0


def test_time_limit_penalises_long_recipes():
    p = RankPrefs(max_minutes=30)
    quick = rank_recipe(_recipe(["tomato"], minutes=25), STOCK, p)
    slow = rank_recipe(_recipe(["tomato"], minutes=60), STOCK, p)
    assert quick.breakdown["time"] == 15 and slow.breakdown["time"] == 0
    assert quick.score > slow.score


def test_priority_and_cuisine_bonus():
    p = RankPrefs(cuisines=["Indian"])
    uses_paneer = rank_recipe(_recipe(["paneer", "tomato"]), STOCK, p)
    no_paneer = rank_recipe(_recipe(["onion", "tomato"], cuisine="Italian"), STOCK, p)
    assert uses_paneer.breakdown["priority"] > 0
    assert uses_paneer.breakdown["cuisine"] == 10 and no_paneer.breakdown["cuisine"] == 0
    assert uses_paneer.score > no_paneer.score


def test_diet_incompatible_scores_zero():
    r = rank_recipe(_recipe(["egg", "onion"]), STOCK, RankPrefs(diet="vegetarian"))
    assert not r.diet_compatible and r.score == 0


def test_missing_cost_penalty_only_with_price_data():
    p = RankPrefs(budget_per_meal=100)
    cheap = rank_recipe(RankInput("a", "", 10, [RankIngredient("tomato")], missing_cost=10), STOCK, p)
    pricey = rank_recipe(RankInput("b", "", 10, [RankIngredient("tomato")], missing_cost=100), STOCK, p)
    unknown = rank_recipe(RankInput("c", "", 10, [RankIngredient("tomato")]), STOCK, p)
    assert cheap.score > pricey.score
    assert unknown.breakdown["cost"] == 0


# ---------- planner ----------

D0 = date(2026, 1, 5)


def _cand(i, meals, ings, score=50.0):
    return PlanCandidate(i, f"R{i}", meals, 2, [PlanIngredient(*x) for x in ings], score)


def test_planner_rotates_and_avoids_same_day_repeats():
    cands = [_cand(1, ["lunch", "dinner"], [("tomato", 1, "pcs")]), _cand(2, ["lunch", "dinner"], [("onion", 1, "pcs")])]
    slots = [(D0 + timedelta(days=d), s) for d in range(2) for s in ("lunch", "dinner")]
    res = build_plan(cands, slots, 2, STOCK)
    by_day = {}
    for d, _, rid in res.assignments:
        by_day.setdefault(d, []).append(rid)
    assert all(len(set(v)) == len(v) for v in by_day.values())
    assert len(res.assignments) == 4
    assert any("repeat" in n for n in res.notes)


def test_planner_reports_empty_slots_and_unknown_quantities():
    cands = [_cand(1, ["lunch"], [("paneer", 100, "g")])]
    res = build_plan(cands, [(D0, "breakfast"), (D0, "lunch")], 2, STOCK)
    assert [s for _, s, _ in res.assignments] == ["lunch"]
    assert any("breakfast" in n for n in res.notes)
    assert any("Quantity unknown for paneer" in n for n in res.notes)


def test_planner_tracks_stock_running_out():
    cands = [_cand(1, ["lunch"], [("tomato", 3, "pcs")]), _cand(2, ["lunch"], [("tomato", 3, "pcs")])]
    res = build_plan(cands, [(D0, "lunch"), (D0 + timedelta(days=1), "lunch")], 2, STOCK)
    assert any("tomato is expected to run out" in n for n in res.notes)


def test_planner_prefers_recipes_using_stock():
    cands = [_cand(1, ["dinner"], [("chicken", 1, "kg")]), _cand(2, ["dinner"], [("tomato", 1, "pcs")])]
    res = build_plan(cands, [(D0, "dinner")], 2, STOCK)
    assert res.assignments[0][2] == 2


# ---------- shopping ----------


def test_aggregates_compatible_units_only():
    groups = aggregate_needs([
        Need("rice", 500, "g", "Pulao"),
        Need("Rice", 1, "kg", "Biryani"),
        Need("rice", 2, "pcs", "Odd"),
    ])
    by_dim = {g.dimension: g for g in groups}
    assert by_dim["mass"].amount == 1500 and by_dim["mass"].recipes == ["Pulao", "Biryani"]
    assert by_dim["count"].amount == 2  # never merged with kg


def test_shopping_subtracts_stock_and_flags_unknowns():
    needs = [
        Need("tomato", 6, "pcs", "Curry"),
        Need("onion", 2, None, "Curry"),
        Need("paneer", 200, "g", "Bhurji"),
        Need("rice", 1, "kg", "Pulao"),
    ]
    rows = {r.normalized_name: r for r in compute_shopping(needs, STOCK)}
    assert rows["tomato"].quantity == 2 and rows["tomato"].status == "buy"
    assert "onion" not in rows  # 3 in stock covers 2
    assert rows["paneer"].status == "check"  # in stock, quantity unknown
    assert rows["rice"].quantity == 1 and rows["rice"].unit == "kg"
