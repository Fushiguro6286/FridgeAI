# FridgeAI — Smart AI Meal Planner

> Your fridge. Your ingredients. Smarter meals.

Upload a fridge photo → an AI vision model (via OpenRouter) suggests the visible ingredients → you review and confirm them → get ranked recipes → generate a daily or weekly meal plan → get a shopping list for only what's missing.

- **Frontend:** React 19, Vite, TypeScript, Tailwind CSS 4, shadcn/ui (Radix), TanStack Query, React Router, React Hook Form + Zod, Lucide icons
- **Backend:** FastAPI, Pydantic, SQLAlchemy 2, Alembic, PostgreSQL, official OpenAI Python SDK pointed at OpenRouter (Chat Completions + structured outputs), Argon2 password hashing, JWT
- **Tests:** Pytest (50 tests) and Vitest + React Testing Library (18 tests). Every AI call is mocked.

---

## Quick start

Prerequisites: Python 3.12+, Node 20+, Docker (for PostgreSQL).

### 1. Database

```bash
docker compose up -d          # PostgreSQL 17 on localhost:5432
```

No Docker? For local development you can use SQLite instead: set `DATABASE_URL=sqlite:///./fridgeai.db` in `backend/.env`.

### 2. Backend

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate     macOS/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env           # then edit .env (see below)
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

In `backend/.env` set at least:

| Variable | Notes |
|---|---|
| `SECRET_KEY` | Long random string: `python -c "import secrets; print(secrets.token_urlsafe(48))"`. Required in production. |
| `AI_API_KEY` | Your OpenRouter API key (from openrouter.ai). Stays on the server and is never sent to the browser. |
| `AI_MODEL` | Default `nvidia/nemotron-3.5-super-vl:free`, the fastest good free model we tested (50 requests/day on the free tier). Paid option: `anthropic/claude-haiku-5.5`. The model must support image input and structured outputs. |
| `AI_DISABLE_REASONING` | Default `true`. Turns off the model's hidden "thinking", which makes scans about 3x faster (≈7 s instead of ≈23 s) with the same results. Set `false` if a model rejects the setting. |
| `AI_BASE_URL` | Default `https://openrouter.ai/api/v1`. Any OpenAI-compatible server works. |

API docs: http://localhost:8000/docs

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env           # VITE_API_URL=http://localhost:8000
npm run dev                    # http://localhost:5173
```

Create an account, then go to **Scan Fridge**.

### Trying it without an API key (mock mode)

Set `AI_MOCK_MODE=true` in `backend/.env`. Scans and recipes then return **clearly labelled sample data** (a yellow banner appears on every page, and recipes are tagged "Sample"). Mock mode is refused at startup when `ENVIRONMENT=production`. With mock mode off and no key, AI features return a clear "AI isn't configured" error and manual ingredient entry still works. Fake results are never substituted silently.

---

## Running tests

```bash
cd backend  && python -m pytest        # 50 tests, SQLite in memory, AI mocked
cd frontend && npm test                # 17 tests
cd frontend && npm run build           # type-check + production build
```

Backend tests cover ingredient matching, unit conversion, diet and allergy filtering, the ranking function, the planner, shopping aggregation, image validation (real bytes, not MIME type), mapping of AI API errors (including out-of-credit) and refusals, rate limits, keeping each user's data private, and the whole scan → recipes → plan → shopping journey.

---

## How it works

**The AI suggests; normal code decides.**

| Step | AI does | Deterministic code does |
|---|---|---|
| Scan | Lists visible food with a confidence level (structured output, Pydantic-validated) | Validates and re-encodes the image, strips EXIF/GPS, de-duplicates results, drops nonsense quantities. **Nothing is saved until you confirm.** |
| Recipes | Proposes recipes from your confirmed inventory | Validates the output. Rejects recipes that break your diet, allergies or exclusions (and tells you which and why). **Works out available, missing and optional itself, from your current inventory, never from the AI's claims.** Ranks the recipes. |
| Meal plan | Fills gaps with new recipe ideas only when your saved recipes aren't enough | Assigns meals to slots, avoids same-day repeats, rotates dishes, prefers recipes that use your stock and "use soon" items, and tracks estimated stock use. Unknown quantities are flagged, never treated as unlimited. |
| Shopping | Nothing | Merges needs across meals, converts compatible units (g↔kg, ml↔l↔tsp), **never mixes kg with pieces**, subtracts stock, and puts items with unknown stock under "Check your stock". Your custom items, ticks and prices survive recalculation. |

Ranking (`backend/app/services/ranking.py`) scores out of 100: share of required ingredients you have (40), few missing items (20), fits your time limit (15), matches your cuisines (10), uses priority ingredients (15), and a missing-cost penalty (−10), which only applies when real price data exists. Recipes that break your diet score 0.

---

## Project layout

```
backend/
  app/
    main.py            app, CORS, size limit, error envelope
    config.py          env-based settings with production safety checks
    auth.py            Argon2 hashing, JWT, current-user dependency
    models.py          SQLAlchemy models (users, preferences, inventory, recipes, plans, shopping)
    schemas.py         Pydantic request/response + LLM output schemas
    routers/           auth, detect, inventory, recipes, meal_plans, shopping, preferences
    services/
      llm.py           OpenRouter / OpenAI-compatible wrapper (timeouts, errors, refusals, structured output)
      vision.py        fridge-photo detection
      images.py        byte-level image validation + metadata stripping
      recipes.py       recipe generation, validation, filtering, availability
      ranking.py       deterministic ranking
      planner.py       deterministic meal planner
      shopping.py      unit-safe aggregation
      ingredients.py   name matching, units, diet/allergen rules
      meal_plans.py    plan + shopping-list orchestration
  alembic/             migrations
  tests/
frontend/
  src/
    pages/             Landing, Auth, Dashboard, Scan, Ingredients, Recipes, RecipeDetail, Planner, Shopping, Settings
    components/        RecipeCard, IngredientReview, dialogs, shared states; ui/ = shadcn
    layouts/           AppLayout (sidebar on desktop, bottom tabs on mobile)
    hooks/             TanStack Query hooks per feature
    lib/               api client, auth, theme, formatting
    schemas/           Zod form schemas
    types/             API types
docker-compose.yml     local PostgreSQL
```

## API summary

All routes are under `/api`, return JSON, and report errors as `{"error": {"code", "message", "details?"}}`. Every route except health and auth requires `Authorization: Bearer <token>`, and every resource is scoped to its owner (another user's IDs return 404).

| Area | Endpoints |
|---|---|
| Health | `GET /health` |
| Auth | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` |
| Detection | `POST /ingredients/detect` (multipart `image`) |
| Inventory | `GET /inventory` (search, category, status, sort, pagination), `POST /inventory`, `POST /inventory/bulk`, `PATCH /inventory/{id}`, `DELETE /inventory/{id}` |
| Recipes | `POST /recipes/generate`, `GET /recipes` (`saved`, `sort=best_match`), `GET /recipes/{id}`, `POST /recipes/{id}/save`, `DELETE /recipes/{id}/save` |
| Meal plans | `POST /meal-plans/generate`, `GET /meal-plans`, `GET /meal-plans/{id}`, `PATCH /meal-plans/{id}`, `DELETE /meal-plans/{id}`, `POST /meal-plans/{id}/entries`, `PATCH/DELETE /meal-plans/{id}/entries/{entry_id}`, `POST /meal-plans/{id}/entries/{entry_id}/regenerate` |
| Shopping | `GET /shopping-list`, `POST /shopping-list/generate`, `POST /shopping-list/items`, `PATCH/DELETE /shopping-list/items/{id}` |
| Preferences | `GET /preferences`, `PATCH /preferences` |

---

## Security and privacy

- Secrets come only from environment variables. `.env` is git-ignored, and `.env.example` holds placeholders only.
- The AI API key never leaves the backend.
- Images are validated by their actual bytes with Pillow (JPEG/PNG/WEBP only, decompression-bomb guard, 8 MB limit by default), then re-encoded so EXIF and GPS data is stripped before anything is sent to the AI provider. **Images are never written to disk or the database.**
- Prompts tell the model that text in images and user data is information only, never instructions.
- Passwords are hashed with Argon2id, login timing is equalised for unknown emails, and JWTs carry an expiry.
- Rate limits apply to AI endpoints (per user) and auth endpoints (per IP). Request bodies have a size cap.
- CORS uses an explicit origin list, and `*` is refused in production. API docs are disabled in production.
- Error messages are safe to show. Raw images, passwords and keys are never logged.

## Deploying

The frontend and backend deploy separately.

- **Backend:** set `ENVIRONMENT=production`, a strong `SECRET_KEY`, `DATABASE_URL` (PostgreSQL), `AI_API_KEY`, and `CORS_ORIGINS=https://your-frontend`. Run `alembic upgrade head`, then `uvicorn app.main:app --host 0.0.0.0 --port 8000` behind HTTPS.
- **Frontend:** `VITE_API_URL=https://your-api npm run build`, then serve `dist/` as a single-page app (route all paths to `index.html`).

## Known limitations

- **Not tested against a running PostgreSQL yet.** Docker wasn't running on the build machine, so the tests and migration checks ran on SQLite. The models and migration avoid SQLite-only features, but run `docker compose up -d && alembic upgrade head` once before relying on PostgreSQL.
- **Free models are slower and less accurate.** Photo scans on the free model may miss items; users review every result before it is saved.
- Rate limiting is in-process memory: limits apply per server process. Use Redis if you run several workers.
- The session token is stored in `localStorage` (readable by any XSS). If the frontend and API share a site, an httpOnly cookie is safer.
- No password reset or email verification yet.
- Ingredient matching is rule-based (plurals, common Indian/English aliases, "red onion" satisfies "onion"). Unusual names may not match. Users can rename items.
- Prices exist only when users enter them, so FridgeAI never invents a cost estimate.
- Nutrition notes are rough and AI-written, and are labelled that way. Recipes are filtered against your allergies but **not guaranteed allergen-free**.
- Recipe images are generated artwork, not photos. Drop real photos into `frontend/public/` if you have licensed ones.
