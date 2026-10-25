# Graph Report - FridgeAi  (2026-10-23)

## Corpus Check
- Corpus is ~38,043 words - fits in a single context window. You may not need a graph.

## Summary
- 941 nodes · 3052 edges · 42 communities (36 shown, 6 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 132 edges (avg confidence: 0.94)
- Token cost: 119,835 input · 0 output

## Community Hubs (Navigation)
- Shared UI Components & Routing
- App Dialogs & Forms
- Backend Core & Migrations
- Backend API Tests
- Recipe Generation & Saving
- Sheet, Toast & Tooltip UI
- Meal Plan API
- Pydantic Schemas & Preferences
- Python Deps & Postgres Infra
- Shopping List Models & API
- Errors, Rate Limit & Image Checks
- shadcn Config
- Frontend Build Tooling
- Stock Tracking & Shopping Math
- TS App Config
- Diet, Allergy & Name Matching
- API Client & Auth (Frontend)
- Inventory API
- Planner & Ingredients Pages
- Frontend Types & Shopping Grouping
- Meal Planner Engine
- Frontend Runtime Deps
- TS Node Config
- Auth Endpoints & Passwords
- Error Handlers & Size Limit
- Frontend Dev Deps
- Recipe Ranking
- Meal Plan Hooks
- Test Environment Shims
- Session & Token Auth
- Inventory Hooks
- Frontend Component Tests
- NPM Scripts
- Settings & Config Validation
- Lint Config
- Shopping Hooks
- TS Root Config
- Favicon & Brand Palette
- Current User Endpoint
- API Error Envelope

## God Nodes (most connected - your core abstractions)
1. `Button()` - 53 edges
2. `errorMessage()` - 43 edges
3. `api()` - 39 edges
4. `Planner()` - 38 edges
5. `react` - 36 edges
6. `AppError` - 35 edges
7. `get_settings()` - 28 edges
8. `User` - 28 edges
9. `Dashboard()` - 28 edges
10. `AddToPlanDialog()` - 27 edges

## Surprising Connections (you probably didn't know these)
- `frontend index.html SPA shell (#root)` --conceptually_related_to--> `FridgeAI — Smart AI Meal Planner`  [INFERRED]
  frontend/index.html → README.md
- `Fridge photo scan (vision detection, confirm before save)` --references--> `python-multipart==0.0.32`  [INFERRED]
  README.md → backend/requirements.txt
- `OpenAI Responses API with structured outputs (store=False)` --references--> `openai==3.37.0`  [INFERRED]
  README.md → backend/requirements.txt
- `Argon2id password hashing + JWT auth` --references--> `pwdlib[argon2]==0.3.1`  [INFERRED]
  README.md → backend/requirements.txt
- `Argon2id password hashing + JWT auth` --references--> `pyjwt==2.15.1`  [INFERRED]
  README.md → backend/requirements.txt

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Scan → recipes → plan → shopping journey** — readme_scan_flow, readme_recipe_generation, readme_ranking_function, readme_meal_planner, readme_shopping_aggregation [EXTRACTED 1.00]
- **Security and privacy controls** — readme_image_validation, readme_auth_jwt_argon2, readme_rate_limiting, readme_owner_scoping, readme_openai_responses_api [EXTRACTED 1.00]

## Communities (42 total, 6 thin omitted)

### Community 0 - "Shared UI Components & Routing"
Cohesion: 0.07
Nodes (84): router, AllergyDisclaimer(), CardGridSkeleton(), EmptyState(), ErrorState(), ListSkeleton(), Logo(), MockBadge() (+76 more)

### Community 1 - "App Dialogs & Forms"
Cohesion: 0.06
Nodes (86): AddToPlanDialog(), submit(), ConfirmDialog(), empty, fromItem(), IngredientFormDialog(), blank(), CONFIDENCE (+78 more)

### Community 2 - "Backend Core & Migrations"
Cohesion: 0.08
Nodes (8): upgrade(), get_settings(), health(), detect(), DetectionOut, DetectionResult, _client(), detect_ingredients()

### Community 3 - "Backend API Tests"
Cohesion: 0.08
Nodes (22): DetectedIngredient, auth(), client(), fresh_db(), make_user(), mock_ai(), settings(), _fake_client() (+14 more)

### Community 4 - "Recipe Generation & Saving"
Cohesion: 0.14
Nodes (30): Recipe, SavedRecipe, User, generate(), get_recipe(), list_recipes(), save_recipe(), unsave_recipe() (+22 more)

### Community 5 - "Sheet, Toast & Tooltip UI"
Cohesion: 0.09
Nodes (23): Sheet(), SheetContent(), SheetHeader(), SheetOverlay(), SheetPortal(), SheetTitle(), SheetTrigger(), Toaster() (+15 more)

### Community 6 - "Meal Plan API"
Cohesion: 0.17
Nodes (21): MealPlanEntry, delete_entry(), delete_plan(), generate(), get_plan(), list_plans(), put_entry(), regenerate_entry() (+13 more)

### Community 7 - "Pydantic Schemas & Preferences"
Cohesion: 0.11
Nodes (24): read(), update(), EntryIn, EntryOut, EntryPatch, InventoryOut, LLMIngredient, LLMRecipeBatch (+16 more)

### Community 8 - "Python Deps & Postgres Infra"
Cohesion: 0.09
Nodes (28): alembic==1.20.1, backend/requirements-dev.txt (pytest, httpx), fastapi==0.161.1, openai==3.37.0, pillow==13.0.0, psycopg[binary]==3.3.6, pwdlib[argon2]==0.3.1, pydantic==2.14.1 / pydantic-settings==2.16.1 (+20 more)

### Community 9 - "Shopping List Models & API"
Cohesion: 0.18
Nodes (16): Base, MealPlan, RecipeIngredient, ShoppingList, ShoppingListItem, TimestampMixin, UserPreferences, add_item() (+8 more)

### Community 10 - "Errors, Rate Limit & Image Checks"
Cohesion: 0.11
Nodes (5): AppError, RateLimiter, validate_and_prepare(), ensure_configured(), parse_structured()

### Community 11 - "shadcn Config"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 12 - "Frontend Build Tooling"
Cohesion: 0.10
Nodes (19): name, private, type, version, @fontsource-variable/fraunces, @fontsource-variable/geist, jsdom, oxlint (+11 more)

### Community 13 - "Stock Tracking & Shopping Math"
Cohesion: 0.19
Nodes (12): find_stock(), from_base(), StockItem, to_base(), _Stock, aggregate_needs(), compute_shopping(), _Group (+4 more)

### Community 14 - "TS App Config"
Cohesion: 0.10
Nodes (20): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+12 more)

### Community 15 - "Diet, Allergy & Name Matching"
Cohesion: 0.16
Nodes (11): allergy_conflicts(), _contains_animal(), diet_conflicts(), names_match(), normalize_name(), _singular(), _tokens(), test_allergy_groups_and_plant_milk() (+3 more)

### Community 16 - "API Client & Auth (Frontend)"
Cohesion: 0.15
Nodes (15): Root(), API_URL, ApiError, handle401(), Options, toError(), tokenStore, UNAUTHORIZED_EVENT (+7 more)

### Community 17 - "Inventory API"
Cohesion: 0.22
Nodes (11): InventoryItem, create_bulk(), create_item(), delete_item(), list_inventory(), _new(), _owned(), update_item() (+3 more)

### Community 18 - "Planner & Ingredients Pages"
Cohesion: 0.23
Nodes (18): DropdownMenu(), DropdownMenuContent(), DropdownMenuItem(), DropdownMenuSeparator(), DropdownMenuTrigger(), useHealth(), useShoppingList(), addDays() (+10 more)

### Community 19 - "Frontend Types & Shopping Grouping"
Cohesion: 0.14
Nodes (15): groupShopping(), Confidence, DetectedIngredient, Detection, Health, MealPlan, MealPlanGenerateInput, MealPlanSummary (+7 more)

### Community 20 - "Meal Planner Engine"
Cohesion: 0.23
Nodes (12): unit_info(), build_plan(), _eligible(), PlanCandidate, PlanIngredient, PlanResult, _cand(), test_planner_prefers_recipes_using_stock() (+4 more)

### Community 21 - "Frontend Runtime Deps"
Cohesion: 0.11
Nodes (18): dependencies, class-variance-authority, cn, @fontsource-variable/fraunces, @fontsource-variable/geist, @hookform/resolvers, lucide-react, radix-ui (+10 more)

### Community 22 - "TS Node Config"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 23 - "Auth Endpoints & Passwords"
Cohesion: 0.32
Nodes (10): create_access_token(), hash_password(), verify_password(), _limit(), login(), register(), LoginIn, RegisterIn (+2 more)

### Community 24 - "Error Handlers & Size Limit"
Cohesion: 0.22
Nodes (6): app_error(), _error(), http_error(), limit_body_size(), unhandled(), validation_error()

### Community 25 - "Frontend Dev Deps"
Cohesion: 0.14
Nodes (14): devDependencies, jsdom, oxlint, shadcn, @testing-library/jest-dom, @testing-library/react, @testing-library/user-event, @types/node (+6 more)

### Community 26 - "Recipe Ranking"
Cohesion: 0.37
Nodes (13): rank_recipe(), RankIngredient, RankInput, RankPrefs, RankResult, rank(), _recipe(), test_diet_incompatible_scores_zero() (+5 more)

### Community 27 - "Meal Plan Hooks"
Cohesion: 0.39
Nodes (11): useDeletePlan(), useGeneratePlan(), useMealPlan(), useMealPlans(), usePlanMutation(), useRegenerateEntry(), useRemoveEntry(), useRenamePlan() (+3 more)

### Community 30 - "Session & Token Auth"
Cohesion: 0.20
Nodes (3): get_current_user(), _unauthorized(), get_db()

### Community 31 - "Inventory Hooks"
Cohesion: 0.29
Nodes (9): invalidateKitchen(), InventoryParams, useAddIngredient(), useAddIngredientsBulk(), useDeleteIngredient(), useUpdateIngredient(), InventoryInput, InventoryItem (+1 more)

### Community 32 - "Frontend Component Tests"
Cohesion: 0.39
Nodes (6): detected, renderWithProviders(), sampleRecipe, @testing-library/react, @testing-library/user-event, vitest

### Community 33 - "NPM Scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, lint, preview, test, test:watch

### Community 35 - "Lint Config"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 36 - "Shopping Hooks"
Cohesion: 0.53
Nodes (5): useAddShoppingItem(), useBuildShoppingList(), useDeleteShoppingItem(), useShoppingMutation(), ShoppingList

### Community 37 - "TS Root Config"
Cohesion: 0.40
Nodes (4): compilerOptions, paths, files, references

### Community 38 - "Favicon & Brand Palette"
Cohesion: 0.67
Nodes (4): FridgeAi Favicon (fridge icon), Brand Palette (deep green #1f4d3a, cream #faf7f0, sage #a9c4a0), Sage Status/Freshness Dot, Refrigerator Outline Glyph

## Ambiguous Edges - Review These
- `Refrigerator Outline Glyph` → `Sage Status/Freshness Dot`  [AMBIGUOUS]
  frontend/public/favicon.svg · relation: conceptually_related_to

## Knowledge Gaps
- **21 isolated node(s):** `@fontsource-variable/fraunces`, `@fontsource-variable/geist`, `tailwindcss`, `tw-animate-css`, `@types/node` (+16 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 298 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Shared UI Components & Routing` to `Frontend Component Tests`, `App Dialogs & Forms`, `Sheet, Toast & Tooltip UI`, `Frontend Build Tooling`, `API Client & Auth (Frontend)`, `Planner & Ingredients Pages`, `Dropdown Menu UI`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **What connects `@fontsource-variable/fraunces`, `@fontsource-variable/geist`, `tailwindcss` to the rest of the system?**
  _21 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Shared UI Components & Routing` be split into smaller, more focused modules?**
  _Cohesion score 0.06611694152923538 - nodes in this community are weakly interconnected._
- **Why does `AppError` connect `Errors, Rate Limit & Image Checks` to `Backend Core & Migrations`, `Recipe Generation & Saving`, `Meal Plan API`, `Pydantic Schemas & Preferences`, `Shopping List Models & API`, `Inventory API`, `Auth Endpoints & Passwords`, `Error Handlers & Size Limit`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Should `App Dialogs & Forms` be split into smaller, more focused modules?**
  _Cohesion score 0.0599728168535508 - nodes in this community are weakly interconnected._
- **Why does `dependencies` connect `Frontend Runtime Deps` to `Frontend Build Tooling`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Refrigerator Outline Glyph` and `Sage Status/Freshness Dot`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._