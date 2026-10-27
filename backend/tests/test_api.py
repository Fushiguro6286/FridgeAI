"""API tests: auth, ownership isolation, image validation, AI error handling and the full mock-mode journey."""

import io
import os
from types import SimpleNamespace

import openai
import httpx2
import pytest
from PIL import Image

from app.schemas import DetectedIngredient, DetectionResult
from app.services import llm
from tests.conftest import make_user


def _png(size=(64, 64), fmt="PNG", exif=None, noise=False) -> bytes:
    buf = io.BytesIO()
    img = Image.frombytes("RGB", size, os.urandom(size[0] * size[1] * 3)) if noise else Image.new("RGB", size, (200, 30, 30))
    kwargs = {"exif": exif} if exif else {}
    img.save(buf, format=fmt, **kwargs)
    return buf.getvalue()


def _upload(client, auth, data: bytes, name="fridge.jpg", mime="image/jpeg"):
    return client.post("/api/ingredients/detect", headers=auth, files={"image": (name, data, mime)})


# ---------- auth ----------


def test_register_login_me(client):
    auth = make_user(client)
    assert client.get("/api/auth/me", headers=auth).json()["email"] == "asha@example.com"
    ok = client.post("/api/auth/login", json={"email": "ASHA@example.com", "password": "correct horse 1"})
    assert ok.status_code == 200 and ok.json()["access_token"]
    bad = client.post("/api/auth/login", json={"email": "asha@example.com", "password": "wrong-password"})
    assert bad.status_code == 401 and bad.json()["error"]["code"] == "invalid_credentials"
    dup = client.post("/api/auth/register", json={"email": "asha@example.com", "password": "another pass", "display_name": "A"})
    assert dup.status_code == 409


def test_protected_routes_require_token(client):
    for path in ("/api/inventory", "/api/recipes", "/api/meal-plans", "/api/shopping-list", "/api/preferences"):
        assert client.get(path).status_code == 401
    assert client.get("/api/inventory", headers={"Authorization": "Bearer garbage"}).status_code == 401


def test_short_password_rejected(client):
    r = client.post("/api/auth/register", json={"email": "b@example.com", "password": "short", "display_name": "B"})
    assert r.status_code == 422 and r.json()["error"]["code"] == "validation_error"


# ---------- inventory + isolation ----------


def test_inventory_crud_search_and_consume(client, auth):
    r = client.post("/api/inventory", headers=auth, json={"name": "Tomatoes", "category": "vegetables", "quantity": 4, "unit": "pcs"})
    assert r.status_code == 201
    item = r.json()
    client.post("/api/inventory/bulk", headers=auth, json={"items": [{"name": "paneer", "category": "dairy", "source": "scan"}]})
    assert client.get("/api/inventory?q=tomato", headers=auth).json()["total"] == 1
    assert client.get("/api/inventory?category=dairy", headers=auth).json()["items"][0]["name"] == "paneer"
    patched = client.patch(f"/api/inventory/{item['id']}", headers=auth, json={"quantity": None, "priority": "use_soon"}).json()
    assert patched["quantity"] is None and patched["priority"] == "use_soon"
    client.patch(f"/api/inventory/{item['id']}", headers=auth, json={"status": "consumed"})
    assert client.get("/api/inventory", headers=auth).json()["total"] == 1
    assert client.get("/api/inventory?status=consumed", headers=auth).json()["total"] == 1
    assert client.delete(f"/api/inventory/{item['id']}", headers=auth).status_code == 204


def test_users_cannot_touch_each_others_data(client, auth, mock_ai):
    other = make_user(client, "ravi@example.com")
    item = client.post("/api/inventory", headers=auth, json={"name": "onion"}).json()
    recipe = client.post("/api/recipes/generate", headers=auth, json={"count": 1}).json()["recipes"][0]
    plan = client.post("/api/meal-plans/generate", headers=auth, json={"start_date": "2026-01-05", "days": 1}).json()
    entry = plan["entries"][0]
    shop_item = client.post("/api/shopping-list/items", headers=auth, json={"name": "soap"}).json()

    assert client.get("/api/inventory", headers=other).json()["total"] == 0
    assert client.patch(f"/api/inventory/{item['id']}", headers=other, json={"name": "x"}).status_code == 404
    assert client.delete(f"/api/inventory/{item['id']}", headers=other).status_code == 404
    assert client.get(f"/api/recipes/{recipe['id']}", headers=other).status_code == 404
    assert client.post(f"/api/recipes/{recipe['id']}/save", headers=other).status_code == 404
    assert client.get(f"/api/meal-plans/{plan['id']}", headers=other).status_code == 404
    assert client.patch(f"/api/meal-plans/{plan['id']}/entries/{entry['id']}", headers=other, json={"servings": 9}).status_code == 404
    assert client.delete(f"/api/shopping-list/items/{shop_item['id']}", headers=other).status_code == 404
    assert client.patch(f"/api/shopping-list/items/{shop_item['id']}", headers=other, json={"checked": True}).status_code == 404
    # cannot put someone else's recipe into your own plan
    other_plan = client.post("/api/meal-plans/generate", headers=other, json={"start_date": "2026-01-05", "days": 1}).json()
    r = client.post(
        f"/api/meal-plans/{other_plan['id']}/entries", headers=other,
        json={"day_date": "2026-01-05", "slot": "lunch", "recipe_id": recipe["id"], "servings": 2},
    )
    assert r.status_code == 404


# ---------- detection ----------


def test_detect_without_api_key_is_a_clear_config_error(client, auth):
    r = _upload(client, auth, _png())
    assert r.status_code == 503 and r.json()["error"]["code"] == "ai_not_configured"


@pytest.mark.parametrize(
    ("data", "code"),
    [
        (b"not an image at all", "invalid_image"),
        (b"", "empty_file"),
        (_png(fmt="GIF"), "unsupported_format"),
        (_png()[:60], "corrupt_image"),
    ],
)
def test_detect_rejects_bad_files_by_content(client, auth, mock_ai, data, code):
    r = _upload(client, auth, data)  # browser says image/jpeg; we check the bytes
    assert r.status_code in (400, 415) and r.json()["error"]["code"] == code


def test_detect_rejects_oversized_files(client, auth, mock_ai, settings, monkeypatch):
    monkeypatch.setattr(settings, "max_upload_mb", 0.001)
    r = _upload(client, auth, _png((300, 300), noise=True))  # noise doesn't compress
    assert r.status_code == 413


def test_detect_mock_mode_is_labelled_and_not_saved(client, auth, mock_ai):
    r = _upload(client, auth, _png(fmt="WEBP"), "f.webp", "image/webp")
    body = r.json()
    assert r.status_code == 200 and body["mock"] is True and body["ingredients"]
    assert client.get("/api/inventory", headers=auth).json()["total"] == 0  # provisional until confirmed


def test_detect_calls_ai_with_stripped_jpeg(client, auth, settings, monkeypatch):
    monkeypatch.setattr(settings, "ai_api_key", "sk-test")
    seen = {}

    def fake_parse(instructions, content, schema):
        seen["content"] = content
        return DetectionResult(
            image_quality="clear",
            message=None,
            ingredients=[
                DetectedIngredient(name=" tomato ", category="vegetables", estimated_quantity=3, unit="pcs", confidence="high", notes=None),
                DetectedIngredient(name="Tomato", category="vegetables", estimated_quantity=None, unit=None, confidence="low", notes=None),
                DetectedIngredient(name="milk", category="dairy", estimated_quantity=-2, unit=None, confidence="medium", notes=None),
            ],
        )

    monkeypatch.setattr(llm, "parse_structured", fake_parse)
    exif = Image.Exif()
    exif[0x010F] = "SecretCam"
    r = _upload(client, auth, _png(fmt="JPEG", exif=exif))
    body = r.json()
    assert r.status_code == 200 and body["mock"] is False
    assert [i["name"] for i in body["ingredients"]] == ["tomato", "milk"]  # trimmed + de-duplicated
    assert body["ingredients"][1]["estimated_quantity"] is None  # nonsense quantity dropped
    url = seen["content"][0]["image_url"]["url"]
    assert url.startswith("data:image/jpeg;base64,")
    import base64

    sent = Image.open(io.BytesIO(base64.b64decode(url.split(",", 1)[1])))
    assert not sent.getexif()  # metadata removed before leaving the server


def test_detect_empty_result(client, auth, settings, monkeypatch):
    monkeypatch.setattr(settings, "ai_api_key", "sk-test")
    monkeypatch.setattr(
        llm, "parse_structured",
        lambda *a: DetectionResult(image_quality="clear", ingredients=[], message="No food visible."),
    )
    body = _upload(client, auth, _png()).json()
    assert body["ingredients"] == [] and body["image_quality"] == "no_food"


def _fake_client(parse):
    return SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(parse=parse)))


def _raises(exc):
    def parse(**kwargs):
        raise exc

    return _fake_client(parse)


def _replies(choices):
    return _fake_client(lambda **k: SimpleNamespace(choices=choices))


def _choice(parsed=None, refusal=None):
    return SimpleNamespace(message=SimpleNamespace(parsed=parsed, refusal=refusal))


_REQ = httpx2.Request("POST", "https://openrouter.ai/api/v1/chat/completions")


def _status_error(cls, status, message):
    return cls(message, response=httpx2.Response(status, request=_REQ), body=None)


@pytest.mark.parametrize(
    ("exc", "status", "code"),
    [
        (openai.APITimeoutError(request=_REQ), 504, "ai_timeout"),
        (_status_error(openai.RateLimitError, 429, "slow down"), 429, "ai_rate_limited"),
        (openai.APIConnectionError(request=_REQ), 503, "ai_unavailable"),
        (_status_error(openai.InternalServerError, 500, "boom"), 502, "ai_error"),
        (_status_error(openai.AuthenticationError, 401, "bad key"), 503, "ai_not_configured"),
        (_status_error(openai.NotFoundError, 404, "no endpoints found"), 503, "ai_not_configured"),
        (_status_error(openai.APIStatusError, 402, "Insufficient credits"), 503, "ai_no_credits"),
        (_status_error(openai.BadRequestError, 400, "bad"), 422, "ai_bad_request"),
        (openai.LengthFinishReasonError(completion=SimpleNamespace(usage=None)), 502, "ai_bad_output"),
        (TypeError("'NoneType' object is not iterable"), 502, "ai_error"),  # 200 with error body, no choices
    ],
)
def test_ai_errors_are_mapped(client, auth, settings, monkeypatch, exc, status, code):
    monkeypatch.setattr(settings, "ai_api_key", "sk-test")
    monkeypatch.setattr(llm, "_client", lambda *a: _raises(exc))
    r = _upload(client, auth, _png())
    assert r.status_code == status and r.json()["error"]["code"] == code
    assert "sk-test" not in r.text


@pytest.mark.parametrize(
    ("choices", "status", "code"),
    [
        ([_choice(refusal="no")], 422, "ai_refused"),
        ([_choice()], 502, "ai_bad_output"),
        ([], 502, "ai_error"),
    ],
)
def test_unusable_replies_are_reported(client, auth, settings, monkeypatch, choices, status, code):
    monkeypatch.setattr(settings, "ai_api_key", "sk-test")
    monkeypatch.setattr(llm, "_client", lambda *a: _replies(choices))
    r = _upload(client, auth, _png())
    assert r.status_code == status and r.json()["error"]["code"] == code


def test_structured_request_and_reply(client, auth, settings, monkeypatch):
    monkeypatch.setattr(settings, "ai_api_key", "sk-test")
    seen = {}
    egg = DetectedIngredient(name="egg", category="eggs", estimated_quantity=6, unit="pcs", confidence="high", notes=None)

    def parse(**kwargs):
        seen.update(kwargs)
        return SimpleNamespace(choices=[_choice(parsed=DetectionResult(image_quality="clear", message=None, ingredients=[egg]))])

    monkeypatch.setattr(llm, "_client", lambda *a: _fake_client(parse))
    body = _upload(client, auth, _png()).json()
    assert [i["name"] for i in body["ingredients"]] == ["egg"] and body["model"] == settings.ai_model
    assert seen["model"] == settings.ai_model and seen["response_format"] is DetectionResult
    assert seen["messages"][0]["role"] == "system" and seen["messages"][0]["content"].startswith("You identify food")
    assert seen["extra_body"] == {"provider": {"require_parameters": True}, "reasoning": {"enabled": False}}
    monkeypatch.setattr(settings, "ai_disable_reasoning", False)
    _upload(client, auth, _png())
    assert seen["extra_body"] == {"provider": {"require_parameters": True}}


def test_ai_rate_limit(client, auth, mock_ai, settings, monkeypatch):
    monkeypatch.setattr(settings, "ai_rate_limit_per_minute", 2)
    codes = [_upload(client, auth, _png()).status_code for _ in range(3)]
    assert codes == [200, 200, 429]


# ---------- full journey (mock mode) ----------


def test_end_to_end_journey(client, auth, mock_ai):
    client.patch("/api/preferences", headers=auth, json={"diet": "vegetarian", "allergies": ["peanut"], "servings": 2})
    client.post("/api/inventory/bulk", headers=auth, json={"items": [
        {"name": "tomato", "quantity": 4, "unit": "pcs", "category": "vegetables"},
        {"name": "onion", "quantity": 3, "unit": "pcs", "category": "vegetables"},
        {"name": "paneer", "category": "dairy", "priority": "use_soon"},
    ]})

    gen = client.post("/api/recipes/generate", headers=auth, json={"count": 8}).json()
    titles = [r["title"] for r in gen["recipes"]]
    excluded = {e["title"]: e["reason"] for e in gen["excluded"]}
    assert gen["mock"] is True
    assert "Masala Omelette" in excluded and "vegetarian" in excluded["Masala Omelette"]
    assert "Kanda Poha" in excluded and "peanut" in excluded["Kanda Poha"]
    bhurji = next(r for r in gen["recipes"] if r["title"] == "Paneer Bhurji")
    assert set(bhurji["available"]) == {"paneer", "onion", "tomato"}
    assert bhurji["missing"] == ["green chilli"]  # never assumed available
    assert titles[0] == "Paneer Bhurji"  # uses the use-soon paneer and has the best coverage

    saved = client.post(f"/api/recipes/{bhurji['id']}/save", headers=auth).json()
    assert saved["is_saved"]
    assert client.get("/api/recipes?saved=true", headers=auth).json()["total"] == 1

    plan = client.post("/api/meal-plans/generate", headers=auth, json={"start_date": "2026-01-05", "days": 7}).json()
    assert len(plan["entries"]) > 0
    assert all(not any(w in e["recipe"]["title"] for w in ("Omelette", "Egg", "Poha")) for e in plan["entries"])
    per_day = {}
    for e in plan["entries"]:
        per_day.setdefault(e["day_date"], []).append(e["recipe"]["id"])
    assert all(len(v) == len(set(v)) for v in per_day.values())
    assert plan["missing"]

    shop = client.get("/api/shopping-list", headers=auth).json()
    assert shop["meal_plan_id"] == plan["id"] and shop["items"]
    assert shop["estimated_total"] is None  # no price data -> no invented total
    custom = client.post("/api/shopping-list/items", headers=auth, json={"name": "dish soap", "estimated_price": 50}).json()
    first_auto = next(i for i in shop["items"] if not i["is_custom"])
    client.patch(f"/api/shopping-list/items/{first_auto['id']}", headers=auth, json={"checked": True})

    # replacing / removing one meal keeps the rest of the plan and custom items
    entry = next(e for e in plan["entries"] if e["slot"] == "lunch")
    others_before = {e["id"]: e["recipe"]["id"] for e in plan["entries"] if e["id"] != entry["id"]}
    r = client.post(f"/api/meal-plans/{plan['id']}/entries/{entry['id']}/regenerate", headers=auth)
    assert r.status_code == 200, r.text
    regen = r.json()
    others_after = {e["id"]: e["recipe"]["id"] for e in regen["entries"] if e["id"] != entry["id"]}
    assert others_after == others_before
    new_entry = next(e for e in regen["entries"] if e["id"] == entry["id"])
    assert new_entry["recipe"]["id"] != entry["recipe"]["id"]

    breakfast = next(e for e in plan["entries"] if e["slot"] == "breakfast")
    no_alt = client.post(f"/api/meal-plans/{plan['id']}/entries/{breakfast['id']}/regenerate", headers=auth)
    assert no_alt.status_code == 422 and no_alt.json()["error"]["code"] == "no_alternative"  # only one veg, peanut-free breakfast exists
    removed = client.delete(f"/api/meal-plans/{plan['id']}/entries/{entry['id']}", headers=auth).json()
    assert len(removed["entries"]) == len(plan["entries"]) - 1
    client.patch(f"/api/meal-plans/{plan['id']}/entries/{removed['entries'][0]['id']}", headers=auth, json={"servings": 4})

    shop2 = client.get("/api/shopping-list", headers=auth).json()
    names = {i["name"] for i in shop2["items"]}
    assert "dish soap" in names
    assert shop2["estimated_total"] == 50 and shop2["priced_items"] == 1
    still = [i for i in shop2["items"] if i["name"] == first_auto["name"] and not i["is_custom"]]
    if still:
        assert still[0]["checked"] is True  # completion status preserved through recalculation
    client.delete(f"/api/shopping-list/items/{custom['id']}", headers=auth)
    assert "dish soap" not in {i["name"] for i in client.get("/api/shopping-list", headers=auth).json()["items"]}


def test_manual_slot_assignment_and_range_check(client, auth, mock_ai):
    recipe = client.post("/api/recipes/generate", headers=auth, json={"count": 1, "meal_type": "snack"}).json()["recipes"][0]
    plan = client.post("/api/meal-plans/generate", headers=auth, json={"start_date": "2026-01-05", "days": 1}).json()
    bad = client.post(f"/api/meal-plans/{plan['id']}/entries", headers=auth,
                      json={"day_date": "2026-02-01", "slot": "snack", "recipe_id": recipe["id"], "servings": 2})
    assert bad.status_code == 422
    ok = client.post(f"/api/meal-plans/{plan['id']}/entries", headers=auth,
                     json={"day_date": "2026-01-05", "slot": "snack", "recipe_id": recipe["id"], "servings": 3}).json()
    snack = [e for e in ok["entries"] if e["slot"] == "snack"]
    assert len(snack) == 1 and snack[0]["servings"] == 3


def test_preferences_roundtrip(client, auth):
    r = client.patch("/api/preferences", headers=auth, json={"cuisines": ["Indian", " indian ", "Italian"], "weekly_budget": 1500, "max_cook_minutes": None})
    body = r.json()
    assert body["cuisines"] == ["Indian", "Italian"] and body["weekly_budget"] == 1500
    assert client.patch("/api/preferences", headers=auth, json={"diet": None}).status_code == 422


def test_health(client):
    body = client.get("/api/health").json()
    assert body["status"] == "ok" and "ai_api_key" not in body


def test_repeated_generation_does_not_duplicate_dishes(client, auth, mock_ai):
    first = client.post("/api/recipes/generate", headers=auth, json={"count": 8}).json()["recipes"]
    second = client.post("/api/recipes/generate", headers=auth, json={"count": 8}).json()["recipes"]
    assert {r["id"] for r in first} == {r["id"] for r in second}
    plan = client.post("/api/meal-plans/generate", headers=auth, json={"start_date": "2026-01-05", "days": 3}).json()
    per_day = {}
    for e in plan["entries"]:
        per_day.setdefault(e["day_date"], []).append(e["recipe"]["title"])
    assert all(len(v) == len(set(v)) for v in per_day.values()), per_day


def test_rebuild_removes_every_stale_generated_row(client):
    from app.models import ShoppingListItem, User
    from app.services.meal_plans import get_shopping_list, recalc
    from tests.conftest import TestSession

    make_user(client)
    with TestSession() as db:
        user = db.query(User).one()
        sl = get_shopping_list(db, user)
        for custom in (False, False, True):  # two generated rows with the same key, plus one of the user's own
            sl.items.append(ShoppingListItem(name="tomato", normalized_name="tomato", status="check", is_custom=custom))
        db.commit()
        recalc(db, user, sl)
        assert [(i.name, i.is_custom) for i in get_shopping_list(db, user).items] == [("tomato", True)]
