# Documentation Audit & Cleanup Plan

**Date**: 2026-02-10  
**Auditor**: docs-agent  
**Status**: In Progress

## Executive Summary

Comprehensive audit of all BareTrack documentation revealed significant gaps and legacy content. The project has evolved from early prototyping (Streamlit mentions) to a production-ready FastAPI + React stack, but documentation hasn't kept pace. **49 API endpoints** exist (not 34 as documented). Recent features (Round Presets expansion, CSV export, Point-On calculator, arrow heatmaps with centroids, arrow precision tiers) are missing from all documentation.

---

## Findings by File

### 1. `README.md` (ROOT) — **Needs Update**

| Issue | Severity | Detail |
|-------|----------|--------|
| **Endpoint count wrong** | Medium | Says "34 endpoints" — actual count is **49 endpoints** |
| **Missing recent features** | High | No mention of: Round Presets (17 presets), CSV export, Point-On distance calculator, arrow heatmaps with centroids/heatmap toggle, arrow precision tiers (Primary/Secondary/Reserve) |
| **Feature list incomplete** | Medium | "Tuning Wizard" mentioned but not fully implemented |
| **Architecture section accurate** | ✅ Good | Monorepo structure, FastAPI + React stack correctly described |

**Recommended Actions:**
- Update endpoint count to 49
- Add "Recent Features" section listing CSV export, Point-On calculator, expanded round presets, per-arrow heatmaps, precision grouping
- Update feature descriptions to match actual implementation
- Add direct links to key pages (e.g., `/analytics`, `/crawls`, `/history`)

---

### 2. `docs/reference.md` — **LEGACY / ARCHIVE**

| Issue | Severity | Detail |
|-------|----------|--------|
| **Mentions Streamlit** | Critical | Talks about "Streamlit (Python)" which was **never used** in this project |
| **Wrong architecture** | Critical | Describes a project that doesn't exist |
| **Future-tense language** | High | Written as requirements doc, not actual documentation |

**Status**: **LEGACY ARTIFACT**

**Recommended Actions:**
- **Option A**: Archive to `artifacts/legacy/reference-original.md` with disclaimer
- **Option B**: Delete entirely and create new `docs/API_REFERENCE.md` from actual codebase
- Preference: **Option A** (preserve history)

---

### 3. `docs/research_findings.md` — **LEGACY / ARCHIVE**

| Issue | Severity | Detail |
|-------|----------|--------|
| **Mentions Streamlit pivot** | Critical | "The Pivot to Python / Streamlit" section describes an architecture that doesn't exist |
| **Wrong tech stack** | Critical | Says "Initial Attempt: React/Node.js" → "Solution: Streamlit" — actual solution is FastAPI + React |
| **Valuable context buried** | Medium | Contains good WHY rationale (Park Model, crawl regression, data schema decisions) but mixed with wrong implementation details |

**Status**: **LEGACY ARTIFACT**

**Recommended Actions:**
- Archive to `artifacts/legacy/research-findings-original.md`
- Extract valid "WHY" content (Park Model rationale, crawl interpolation reasoning, data points table) into new `docs/ARCHITECTURE.md`
- Delete sections about Streamlit entirely

---

### 4. `frontend/README.md` — **Needs Minor Update**

| Issue | Severity | Detail |
|-------|----------|--------|
| **Missing analytics route** | Low | Routes list doesn't include `/analytics` page |
| **Outdated install command** | Low | Says `npm install --legacy-peer-deps` — no longer needed |
| **Otherwise accurate** | ✅ Good | Tech stack, structure, proxy config all correct |

**Recommended Actions:**
- Add `/analytics` to routes list
- Remove `--legacy-peer-deps` from install command
- Add note about recent features (heatmaps, precision tiers)

---

### 5. `artifacts/research/*.md` — **Mislabeled as Implementation Docs**

**Files:**
- `advanced-analytics-metrics.md` (28 new metric proposals)
- `competitive-landscape.md` (competitor analysis)
- `barebow-archer-needs.md` (feature requests from community)

| Issue | Severity | Detail |
|-------|----------|--------|
| **Confusion: research vs implementation** | Medium | These read like implementation docs but are actually research artifacts/roadmaps |
| **Missing implementation status** | High | No indication which features are implemented vs planned |

**Recommended Actions:**
- Add disclaimer banner to each file:
  ```markdown
  > **Note**: This is a research artifact documenting potential features and competitive analysis as of [date]. It does NOT reflect current implementation. See `README.md` and `CHANGELOG.md` for actual features.
  ```
- Create `docs/ROADMAP.md` that references these artifacts and shows implementation status

---

### 6. `.github/copilot-instructions.md` — **Current & Accurate** ✅

| Status | Detail |
|--------|--------|
| ✅ **Accurate** | Correctly describes monorepo, 49-endpoint API (implies correct count via domain logic description), React frontend |
| ✅ **Good patterns documented** | SQLModel conventions, API router patterns, frontend patterns, testing |

**No changes needed.**

---

## Missing Documentation

### Critical Gaps

1. **CHANGELOG.md** — No change history exists. Implementation timeline is lost.
2. **ARCHITECTURE.md** — No authoritative architecture doc (reference.md is wrong)
3. **API_REFERENCE.md** — No comprehensive endpoint documentation
4. **FEATURES.md** — No single-source list of what's actually implemented

### Medium Priority Gaps

5. **CONTRIBUTING.md** — No contributor guidelines
6. **DEPLOYMENT.md** — No production deployment guide
7. **TESTING.md** — Test strategy not documented (93 tests exist but no explanation)

---

## Implementation Plan

### Phase 1: Cleanup & Archive (Today)

- [ ] 1.1 Update `README.md` (endpoint count, recent features, accurate descriptions)
- [ ] 1.2 Archive `docs/reference.md` → `artifacts/legacy/`
- [ ] 1.3 Archive `docs/research_findings.md` → `artifacts/legacy/`
- [ ] 1.4 Update `frontend/README.md` (routes, install command)
- [ ] 1.5 Add research disclaimers to `artifacts/research/*.md`

### Phase 2: New Documentation (Next)

- [ ] 2.1 Create `CHANGELOG.md` with full feature timeline
- [ ] 2.2 Create `docs/ARCHITECTURE.md` (accurate, current)
- [ ] 2.3 Create `docs/FEATURES.md` (flat list of implemented features)
- [ ] 2.4 Create `docs/API_REFERENCE.md` (all 49 endpoints documented)

### Phase 3: Polish (Future)

- [ ] 3.1 Create `CONTRIBUTING.md`
- [ ] 3.2 Create `docs/DEPLOYMENT.md`
- [ ] 3.3 Create `docs/TESTING.md`

---

## Endpoint Inventory (Actual Count: 49)

### By Router:

| Router | Endpoints | Routes |
|--------|-----------|--------|
| **analysis** | 4 | POST /virtual-coach, /predict-score, /setup-efficiency, /safety-check |
| **arrows** | 7 | CRUD + POST /{id}/shafts, GET /{id}/shafts, DELETE /{id}/shafts |
| **bows** | 5 | CRUD |
| **crawls** | 2 | POST /calculate, /predict |
| **rounds** | 2 | GET /presets, /presets/{name} |
| **scoring** | 1 | GET /ring |
| **sessions** | 5 | CRUD + POST /{id}/ends |
| **tabs** | 8 | CRUD + POST /{id}/image, GET /{id}/image, DELETE /{id}/image |
| **analytics** | 15 | GET /summary, /shots, /personal-bests, /park-model, /score-context, /bias-analysis, /advanced-precision, /trends, /within-end, /hit-probability, /equipment-comparison, /dashboard, /score-goal, /arrow-performance |
| **TOTAL** | **49** | |

---

## Recent Features Not Documented Anywhere

1. **Round Presets Expansion** (2026-02-10): Expanded from 7 to 17 presets (Portsmouth, Bray I/II, WA 30m/40m/60m, Half WA 50m, National, Short National, Practice 30)
2. **CSV Export** (2026-02-10): Client-side CSV download from History page
3. **Point-On Distance Calculator** (2026-02-10): Polynomial root-finding for zero-crawl distance, displayed in Crawl Manager
4. **Arrow Heatmaps with Centroids** (2026-02-10): Alpha 0.2 shot dots, centre-of-mass × markers per arrow
5. **Heatmap Toggle** (2026-02-10): Per-arrow density heatmaps (histogram2dcontour) in Analysis Lab
6. **Arrow Precision Tiers** (earlier): Primary/Secondary/Reserve groupings based on composite precision score
7. **Dashboard Home** (earlier): Summary stats, recent sessions, personal bests
8. **Session Notes** (earlier): Free-text notes per session
9. **Print Crawl Card** (earlier): Printable crawl chart
10. **Session Replay** (earlier): End-by-end animation in History
11. **Score Goal Simulator** (earlier): Reverse Park Model to calculate required sigma for target score

---

## Validation Checklist

Before marking docs as "current":
- [ ] All endpoint counts verified against actual code
- [ ] All feature descriptions tested in running application
- [ ] All file paths verified to exist
- [ ] All code examples tested for syntax correctness
- [ ] All external links checked (return 200 OK)
- [ ] All internal cross-references validated
- [ ] No mentions of Streamlit remain
- [ ] No mentions of wrong tech stacks remain
- [ ] All research artifacts clearly labeled as non-implementation

---

## Sign-Off

**Next Actions**: Execute Phase 1 cleanup, then create new core documentation in Phase 2.

