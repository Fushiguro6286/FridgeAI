"""Sample recipes used ONLY when AI_MOCK_MODE=true (development/tests). Stored with source="mock"."""

from app.schemas import LLMIngredient, LLMRecipe, Substitution


def _i(name: str, qty: float | None = None, unit: str | None = None, optional: bool = False) -> LLMIngredient:
    return LLMIngredient(name=name, quantity=qty, unit=unit, optional=optional)


def _r(title, desc, cuisine, meals, tags, prep, cook, diff, ings, steps, subs=(), warns=()) -> LLMRecipe:
    return LLMRecipe(
        title=title, description=desc, cuisine=cuisine, meal_types=meals, diet_tags=tags,
        prep_minutes=prep, cook_minutes=cook, servings=2, difficulty=diff, ingredients=ings,
        steps=steps, substitutions=[Substitution(ingredient=a, substitute=b) for a, b in subs],
        warnings=list(warns), nutrition_note=None,
    )


_STAPLES = [_i("salt", None, None, True), _i("cooking oil", 1, "tbsp", True)]

MOCK_RECIPES: list[LLMRecipe] = [
    _r("Kanda Poha", "Light flattened-rice breakfast with onion and peanuts.", "Indian", ["breakfast"], ["vegetarian", "vegan"],
       10, 10, "easy",
       [_i("poha", 150, "g"), _i("onion", 1, "pcs"), _i("green chilli", 1, "pcs"), _i("peanut", 2, "tbsp", True),
        _i("turmeric", 0.25, "tsp", True), _i("lemon", 0.5, "pcs", True), *_STAPLES],
       ["Rinse poha in a sieve and let it soften for 5 minutes.", "Heat oil, add peanuts and fry until golden.",
        "Add chopped onion and chilli; cook until soft.", "Add turmeric, salt and poha; mix gently and heat for 3 minutes.",
        "Finish with lemon juice."],
       [("peanut", "roasted cashews")], ["Contains peanuts if used"]),
    _r("Masala Omelette", "Fluffy eggs with onion, tomato and chilli.", "Indian", ["breakfast"], ["eggetarian"],
       5, 5, "easy",
       [_i("egg", 3, "pcs"), _i("onion", 0.5, "pcs"), _i("tomato", 1, "pcs"), _i("green chilli", 1, "pcs", True), *_STAPLES],
       ["Whisk eggs with salt.", "Stir in finely chopped onion, tomato and chilli.",
        "Cook in a hot oiled pan until set and cooked through; fold and serve."],
       warns=["Cook eggs until fully set"]),
    _r("Vegetable Sandwich", "Quick grilled sandwich with fresh vegetables.", "Indian street food", ["breakfast", "snack"], ["vegetarian"],
       10, 5, "easy",
       [_i("bread", 4, "slices"), _i("tomato", 1, "pcs"), _i("onion", 0.5, "pcs"), _i("cucumber", 0.5, "pcs"),
        _i("butter", 1, "tbsp", True), _i("chaat masala", None, None, True)],
       ["Slice the vegetables thinly.", "Butter the bread and layer the vegetables.", "Sprinkle chaat masala and grill until golden."],
       [("butter", "oil")], ["Contains gluten and dairy"]),
    _r("Paneer Bhurji", "Scrambled paneer with onion, tomato and spices.", "North Indian", ["lunch", "dinner"], ["vegetarian"],
       10, 15, "easy",
       [_i("paneer", 200, "g"), _i("onion", 1, "pcs"), _i("tomato", 2, "pcs"), _i("green chilli", 1, "pcs"),
        _i("turmeric", 0.25, "tsp", True), _i("garam masala", 0.5, "tsp", True), _i("coriander", None, None, True), *_STAPLES],
       ["Crumble the paneer.", "Sauté chopped onion and chilli in oil until golden.",
        "Add tomato, turmeric and salt; cook until soft.", "Add paneer and garam masala; cook 3–4 minutes.", "Garnish with coriander."],
       [("paneer", "tofu")], ["Contains dairy"]),
    _r("Dal Tadka", "Comforting yellow lentils tempered with garlic and cumin.", "North Indian", ["lunch", "dinner"], ["vegetarian", "vegan"],
       10, 25, "easy",
       [_i("toor dal", 150, "g"), _i("tomato", 1, "pcs"), _i("onion", 1, "pcs"), _i("garlic", 3, "cloves"),
        _i("cumin seeds", 1, "tsp", True), _i("turmeric", 0.5, "tsp", True), *_STAPLES],
       ["Rinse dal and pressure-cook with turmeric and water until soft.", "Sauté onion, garlic and tomato in oil.",
        "Add cumin, then pour the tempering into the dal.", "Simmer 5 minutes and season with salt."]),
    _r("Vegetable Pulao", "One-pot spiced rice with mixed vegetables.", "Indian", ["lunch", "dinner"], ["vegetarian", "vegan"],
       15, 20, "medium",
       [_i("basmati rice", 200, "g"), _i("onion", 1, "pcs"), _i("carrot", 1, "pcs"), _i("green peas", 100, "g"),
        _i("whole spices", None, None, True), *_STAPLES],
       ["Soak rice for 20 minutes.", "Fry onion and whole spices in oil.", "Add vegetables and rice; stir 2 minutes.",
        "Add 400 ml water and salt; cover and cook until rice is done."],
       [("green peas", "beans or corn")]),
    _r("Egg Curry", "Boiled eggs simmered in an onion-tomato gravy.", "Indian", ["lunch", "dinner"], ["eggetarian"],
       10, 25, "medium",
       [_i("egg", 4, "pcs"), _i("onion", 2, "pcs"), _i("tomato", 2, "pcs"), _i("ginger garlic paste", 1, "tbsp"),
        _i("chilli powder", 1, "tsp", True), _i("garam masala", 0.5, "tsp", True), *_STAPLES],
       ["Hard-boil the eggs, peel and set aside.", "Cook onion until brown, then add ginger-garlic paste.",
        "Add tomato and spices; cook to a thick gravy.", "Add water and eggs; simmer 8 minutes."],
       warns=["Boil eggs fully (10 minutes)"]),
    _r("Tomato Garlic Pasta", "Simple pasta in a fresh tomato sauce.", "Italian", ["lunch", "dinner"], ["vegetarian", "vegan"],
       10, 15, "easy",
       [_i("pasta", 200, "g"), _i("tomato", 3, "pcs"), _i("garlic", 3, "cloves"), _i("chilli flakes", None, None, True),
        _i("cheese", 30, "g", True), *_STAPLES],
       ["Boil pasta in salted water until al dente.", "Sauté garlic in oil, add chopped tomato and cook into a sauce.",
        "Toss pasta with sauce; top with cheese if using."],
       warns=["Contains gluten"]),
    _r("Fruit Chaat", "Tangy fruit salad with chaat masala.", "Indian street food", ["snack"], ["vegetarian", "vegan"],
       10, 0, "easy",
       [_i("banana", 1, "pcs"), _i("apple", 1, "pcs"), _i("chaat masala", 0.5, "tsp", True), _i("lemon", 0.5, "pcs", True)],
       ["Wash and chop the fruit.", "Toss with chaat masala and lemon juice; serve immediately."]),
]
