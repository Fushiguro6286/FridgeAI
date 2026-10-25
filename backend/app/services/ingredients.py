"""Deterministic ingredient helpers: name normalisation, matching, units, diet/allergy checks."""

import re
from dataclasses import dataclass

# ---------- names ----------

_ALIASES = {
    "tomatoes": "tomato",
    "potatoes": "potato",
    "chillies": "chilli",
    "chilies": "chilli",
    "chili": "chilli",
    "chile": "chilli",
    "leaves": "leaf",
    "curd": "yogurt",
    "dahi": "yogurt",
    "yoghurt": "yogurt",
    "capsicum": "bell pepper",
    "coriander leaf": "coriander",
    "cilantro": "coriander",
    "aubergine": "brinjal",
    "eggplant": "brinjal",
    "atta": "wheat flour",
    "maida": "all purpose flour",
    "suji": "semolina",
    "rava": "semolina",
    "lady finger": "okra",
    "bhindi": "okra",
}


def _singular(word: str) -> str:
    if word in _ALIASES:
        return _ALIASES[word]
    if len(word) > 4 and word.endswith("oes"):
        return word[:-2]
    if len(word) > 3 and word.endswith("s") and not word.endswith(("ss", "us", "is")):
        return word[:-1]
    return word


def normalize_name(name: str) -> str:
    text = re.sub(r"[^a-z0-9\s]", " ", name.lower())
    words = [_singular(w) for w in text.split()]
    joined = " ".join(words)
    return _ALIASES.get(joined, joined)


def names_match(recipe_name: str, inventory_name: str) -> bool:
    """True if the inventory item satisfies the recipe ingredient.

    Exact match, or the inventory item is a more specific form (inventory "red onion"
    satisfies recipe "onion"). The reverse is not allowed: recipe "red onion" is not
    satisfied by a generic "onion" being assumed.
    """
    r, i = normalize_name(recipe_name), normalize_name(inventory_name)
    if not r or not i:
        return False
    return r == i or set(r.split()) <= set(i.split())


# ---------- units ----------

_UNITS: dict[str, tuple[str, float]] = {
    "mg": ("mass", 0.001),
    "g": ("mass", 1),
    "gm": ("mass", 1),
    "gram": ("mass", 1),
    "kg": ("mass", 1000),
    "kilogram": ("mass", 1000),
    "ml": ("volume", 1),
    "millilitre": ("volume", 1),
    "milliliter": ("volume", 1),
    "l": ("volume", 1000),
    "litre": ("volume", 1000),
    "liter": ("volume", 1000),
    "tsp": ("volume", 5),
    "teaspoon": ("volume", 5),
    "tbsp": ("volume", 15),
    "tablespoon": ("volume", 15),
    "cup": ("volume", 240),
    "piece": ("count", 1),
    "pc": ("count", 1),
    "pcs": ("count", 1),
    "whole": ("count", 1),
    "unit": ("count", 1),
    "dozen": ("count", 12),
}
_BASE_UNIT = {"mass": "g", "volume": "ml", "count": "pcs"}


def unit_info(unit: str | None) -> tuple[str, float]:
    """Return (dimension, factor-to-base). Unknown units only combine with themselves."""
    if not unit or not unit.strip():
        return ("count", 1)
    u = unit.strip().lower().rstrip(".")
    if u in _UNITS:
        return _UNITS[u]
    if u.endswith("s") and u[:-1] in _UNITS:
        return _UNITS[u[:-1]]
    return (f"other:{u}", 1)


def to_base(quantity: float, unit: str | None) -> tuple[str, float]:
    dim, factor = unit_info(unit)
    return dim, quantity * factor


def from_base(dimension: str, amount: float) -> tuple[float, str | None]:
    if dimension == "mass" and amount >= 1000:
        return round(amount / 1000, 2), "kg"
    if dimension == "volume" and amount >= 1000:
        return round(amount / 1000, 2), "l"
    if dimension.startswith("other:"):
        return round(amount, 2), dimension.split(":", 1)[1]
    return round(amount, 2), _BASE_UNIT[dimension]


# ---------- diet & allergy ----------

DIETS = ("none", "vegetarian", "vegan", "eggetarian", "non_vegetarian")

_MEAT = {
    "chicken", "mutton", "lamb", "goat", "beef", "pork", "fish", "prawn", "shrimp", "crab",
    "lobster", "bacon", "ham", "sausage", "salami", "pepperoni", "tuna", "salmon", "sardine",
    "mackerel", "meat", "keema", "gelatin", "anchovy", "squid", "octopus", "turkey", "duck",
}
_EGG = {"egg"}
_ANIMAL_DAIRY = {
    "milk", "paneer", "ghee", "butter", "cheese", "yogurt", "cream", "honey", "khoa", "khoya",
    "buttermilk", "malai", "mayonnaise", "whey",
}
_PLANT_PREFIX = {"coconut", "almond", "soy", "oat", "peanut", "vegan", "cashew", "rice", "plant"}

ALLERGEN_GROUPS = {
    "nut": {"peanut", "cashew", "almond", "walnut", "pistachio", "hazelnut", "pecan", "nut"},
    "peanut": {"peanut", "groundnut"},
    "tree nut": {"cashew", "almond", "walnut", "pistachio", "hazelnut", "pecan"},
    "dairy": _ANIMAL_DAIRY - {"honey"},
    "lactose": _ANIMAL_DAIRY - {"honey"},
    "milk": _ANIMAL_DAIRY - {"honey"},
    "gluten": {"wheat", "flour", "bread", "pasta", "semolina", "barley", "noodle", "roti", "naan", "couscous"},
    "wheat": {"wheat", "flour", "bread", "pasta", "semolina", "noodle", "roti", "naan"},
    "shellfish": {"prawn", "shrimp", "crab", "lobster", "squid", "octopus"},
    "fish": {"fish", "tuna", "salmon", "sardine", "mackerel", "anchovy"},
    "egg": {"egg", "mayonnaise"},
    "soy": {"soy", "tofu", "soya", "edamame"},
    "sesame": {"sesame", "til", "tahini"},
}


def _tokens(name: str) -> list[str]:
    return normalize_name(name).split()


def _contains_animal(tokens: list[str], group: set[str]) -> bool:
    for idx, tok in enumerate(tokens):
        if tok in group and not (idx > 0 and tokens[idx - 1] in _PLANT_PREFIX):
            return True
    return False


def diet_conflicts(ingredient_names: list[str], diet: str) -> list[str]:
    """Ingredient names that break the diet. Empty list = compatible."""
    if diet in ("none", "non_vegetarian"):
        return []
    banned = set(_MEAT)
    if diet in ("vegetarian", "vegan"):
        banned |= _EGG
    out = []
    for name in ingredient_names:
        toks = _tokens(name)
        if any(t in banned for t in toks) or (diet == "vegan" and _contains_animal(toks, _ANIMAL_DAIRY)):
            out.append(name)
    return out


def allergy_conflicts(ingredient_names: list[str], terms: list[str]) -> list[tuple[str, str]]:
    """(ingredient, term) pairs where an ingredient matches an allergy/exclusion term."""
    hits = []
    for term in terms:
        t = normalize_name(term)
        if not t:
            continue
        group = ALLERGEN_GROUPS.get(t, set()) | {t}
        for name in ingredient_names:
            n = normalize_name(name)
            toks = set(n.split())
            if any((" " in g and g in n) or g in toks for g in group):
                if t in ("dairy", "lactose", "milk") and not _contains_animal(n.split(), group):
                    continue  # "coconut milk" is not dairy
                hits.append((name, term))
    return hits


@dataclass
class StockItem:
    name: str
    quantity: float | None
    unit: str | None
    priority: str = "normal"


def find_stock(name: str, stock: list[StockItem]) -> StockItem | None:
    for item in stock:
        if names_match(name, item.name):
            return item
    return None
