from datetime import date, datetime
from typing import Generic, Literal, TypeVar

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

T = TypeVar("T")

Category = Literal[
    "vegetables", "fruits", "dairy", "eggs", "meat_seafood", "grains", "pulses",
    "spices", "sauces", "frozen", "other",
]
Confidence = Literal["low", "medium", "high"]
Slot = Literal["breakfast", "lunch", "dinner", "snack"]
Diet = Literal["none", "vegetarian", "vegan", "eggetarian", "non_vegetarian"]
Difficulty = Literal["easy", "medium", "hard"]
Priority = Literal["normal", "use_soon", "low"]

ShortText = Field(min_length=1, max_length=120)


def _clean_list(values: list[str]) -> list[str]:
    seen, out = set(), []
    for v in values:
        v = v.strip()[:60]
        if v and v.lower() not in seen:
            seen.add(v.lower())
            out.append(v)
    return out[:30]


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    limit: int
    offset: int


# ---------- auth ----------

class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    display_name: str = Field(min_length=1, max_length=80)


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: str
    display_name: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------- preferences ----------

class PreferencesOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    diet: Diet
    allergies: list[str]
    exclusions: list[str]
    cuisines: list[str]
    household_size: int
    servings: int
    max_cook_minutes: int | None
    weekly_budget: float | None
    currency: str
    measurement_system: Literal["metric", "us"]
    theme: Literal["light", "dark", "system"]


class PreferencesPatch(BaseModel):
    diet: Diet | None = None
    allergies: list[str] | None = None
    exclusions: list[str] | None = None
    cuisines: list[str] | None = None
    household_size: int | None = Field(None, ge=1, le=20)
    servings: int | None = Field(None, ge=1, le=20)
    max_cook_minutes: int | None = Field(None, ge=5, le=600)
    weekly_budget: float | None = Field(None, ge=0, le=10_000_000)
    currency: str | None = Field(None, min_length=3, max_length=3)
    measurement_system: Literal["metric", "us"] | None = None
    theme: Literal["light", "dark", "system"] | None = None

    _lists = field_validator("allergies", "exclusions", "cuisines")(
        lambda v: None if v is None else _clean_list(v)
    )


# ---------- detection (LLM schema + API response) ----------

class DetectedIngredient(BaseModel):
    name: str
    category: Category
    estimated_quantity: float | None
    unit: str | None
    confidence: Confidence
    notes: str | None


class DetectionResult(BaseModel):
    image_quality: Literal["clear", "unclear", "no_food"]
    ingredients: list[DetectedIngredient]
    message: str | None


class DetectionOut(DetectionResult):
    mock: bool = False
    model: str | None = None


# ---------- inventory ----------

class InventoryIn(BaseModel):
    name: str = ShortText
    category: Category = "other"
    quantity: float | None = Field(None, ge=0, le=1_000_000)
    unit: str | None = Field(None, max_length=20)
    purchase_date: date | None = None
    expiry_date: date | None = None
    storage_notes: str | None = Field(None, max_length=500)
    priority: Priority = "normal"
    source: Literal["manual", "scan"] = "manual"


class InventoryBulkIn(BaseModel):
    items: list[InventoryIn] = Field(min_length=1, max_length=100)


class InventoryPatch(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=120)
    category: Category | None = None
    quantity: float | None = Field(None, ge=0, le=1_000_000)
    unit: str | None = Field(None, max_length=20)
    purchase_date: date | None = None
    expiry_date: date | None = None
    storage_notes: str | None = Field(None, max_length=500)
    priority: Priority | None = None
    status: Literal["available", "consumed"] | None = None


class InventoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    category: str
    quantity: float | None
    unit: str | None
    purchase_date: date | None
    expiry_date: date | None
    storage_notes: str | None
    priority: str
    status: str
    source: str
    created_at: datetime
    updated_at: datetime


# ---------- recipes (LLM schema) ----------

class LLMIngredient(BaseModel):
    name: str
    quantity: float | None
    unit: str | None
    optional: bool


class Substitution(BaseModel):
    ingredient: str
    substitute: str


class LLMRecipe(BaseModel):
    title: str
    description: str
    cuisine: str
    meal_types: list[Slot]
    diet_tags: list[str]
    prep_minutes: int
    cook_minutes: int
    servings: int
    difficulty: Difficulty
    ingredients: list[LLMIngredient]
    steps: list[str]
    substitutions: list[Substitution]
    warnings: list[str]
    nutrition_note: str | None


class LLMRecipeBatch(BaseModel):
    recipes: list[LLMRecipe]


# ---------- recipes (API) ----------

class RecipeGenerateIn(BaseModel):
    count: int = Field(4, ge=1, le=8)
    cuisine: str | None = Field(None, max_length=60)
    diet: Diet | None = None  # may only be stricter in effect; allergies/exclusions always apply
    max_minutes: int | None = Field(None, ge=5, le=600)
    servings: int | None = Field(None, ge=1, le=20)
    difficulty: Difficulty | None = None
    meal_type: Slot | None = None
    prioritize: list[str] = Field(default_factory=list, max_length=20)

    _p = field_validator("prioritize")(_clean_list)


class RecipeIngredientOut(BaseModel):
    name: str
    quantity: float | None
    unit: str | None
    optional: bool
    status: Literal["available", "missing", "optional"]


class ScoreOut(BaseModel):
    score: float
    coverage: float
    breakdown: dict[str, float]


class RecipeOut(BaseModel):
    id: int
    title: str
    description: str
    cuisine: str
    meal_types: list[str]
    diet_tags: list[str]
    prep_minutes: int
    cook_minutes: int
    total_minutes: int
    servings: int
    difficulty: str
    ingredients: list[RecipeIngredientOut]
    available: list[str]
    missing: list[str]
    optional: list[str]
    steps: list[str]
    substitutions: list[Substitution]
    warnings: list[str]
    nutrition_note: str | None
    source: str
    is_saved: bool
    rank: ScoreOut | None = None
    created_at: datetime


class ExcludedRecipe(BaseModel):
    title: str
    reason: str


class RecipeGenerateOut(BaseModel):
    recipes: list[RecipeOut]
    excluded: list[ExcludedRecipe]
    mock: bool


# ---------- meal plans ----------

class MealPlanGenerateIn(BaseModel):
    start_date: date
    days: int = Field(7, ge=1, le=7)
    include_snacks: bool = False
    servings: int | None = Field(None, ge=1, le=20)
    use_existing_recipes: bool = True
    name: str | None = Field(None, max_length=120)


class MealPlanPatch(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class EntryIn(BaseModel):
    day_date: date
    slot: Slot
    recipe_id: int
    servings: int = Field(2, ge=1, le=20)


class EntryPatch(BaseModel):
    recipe_id: int | None = None
    servings: int | None = Field(None, ge=1, le=20)


class EntryOut(BaseModel):
    id: int
    day_date: date
    slot: str
    servings: int
    recipe: RecipeOut


class MealPlanSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    start_date: date
    days: int
    include_snacks: bool
    created_at: datetime


class MissingIngredient(BaseModel):
    name: str
    quantity: float | None
    unit: str | None
    recipes: list[str]
    status: str


class MealPlanOut(MealPlanSummary):
    notes: list[str]
    entries: list[EntryOut]
    missing: list[MissingIngredient]
    mock: bool = False


# ---------- shopping ----------

class ShoppingItemIn(BaseModel):
    name: str = ShortText
    quantity: float | None = Field(None, ge=0, le=1_000_000)
    unit: str | None = Field(None, max_length=20)
    estimated_price: float | None = Field(None, ge=0, le=10_000_000)


class ShoppingItemPatch(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=120)
    quantity: float | None = Field(None, ge=0, le=1_000_000)
    unit: str | None = Field(None, max_length=20)
    checked: bool | None = None
    estimated_price: float | None = Field(None, ge=0, le=10_000_000)


class ShoppingItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    quantity: float | None
    unit: str | None
    recipes: list[str]
    checked: bool
    is_custom: bool
    status: str
    estimated_price: float | None


class ShoppingListOut(BaseModel):
    id: int
    meal_plan_id: int | None
    meal_plan_name: str | None
    items: list[ShoppingItemOut]
    estimated_total: float | None
    priced_items: int
    currency: str


class ShoppingGenerateIn(BaseModel):
    meal_plan_id: int
