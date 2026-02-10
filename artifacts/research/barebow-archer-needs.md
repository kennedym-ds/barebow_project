# Research: What Barebow Archers Want in Training & Analysis Tools

> **📋 RESEARCH ARTIFACT**  
> This document is a **research artifact** capturing analysis and recommendations as of the date listed. It does NOT reflect current implementation status. Many proposed features remain unimplemented.  
> **For actual implemented features**, see root `README.md` and `CHANGELOG.md`.

---

**Date**: 2026-02-10T12:00:00Z  
**Researcher**: researcher-agent  
**Confidence**: High (primary community data + competitive analysis + domain coaching knowledge)  
**Tools Used**: fetch_webpage (Reddit r/Archery, old.reddit.com), read_file (existing research artifacts, BareTrack codebase), semantic_search

---

## Summary

Barebow string-walking archers have specific needs that no existing app serves. Community research reveals six high-priority gaps in BareTrack: (1) crawl mark lifecycle management (drift, re-calibration triggers, tab wear correlation), (2) structured training plans with shot routine timers, (3) competition simulation and round presets, (4) physical conditioning tracking (SPT/draw weight progression), (5) mental game logging, and (6) multi-distance session support for field archery. BareTrack's physics-based analysis (Park Model, GPP/FOC, crawl regression) constitutes a unique competitive moat — no other tool comes close. The biggest gap between BareTrack and community expectations is mobile/offline access, followed by standard round presets and data export.

---

## Sources

| Source | URL | Accessed | Relevance | Method |
|--------|-----|----------|-----------|--------|
| Reddit: "My barebow crawl seems to have changed for no reason" | old.reddit.com/r/Archery/comments/1kbd79f/ | 2026-02-10 | **Critical** | fetch |
| Reddit: "How viable is intuitive aiming for barebow?" | old.reddit.com/r/Archery/comments/1jyswca/ | 2026-02-10 | High | fetch |
| Reddit: Barebow training search (past year) | old.reddit.com/r/Archery/search?q=barebow+training | 2026-02-10 | High | fetch |
| Reddit: "Tiller setting help" for barebow | old.reddit.com/r/Archery/comments/1kxzki8/ | 2026-02-10 | High | fetch |
| Reddit: "Advice on switching limbs for barebow" | old.reddit.com/r/Archery/comments/1mngbz7/ | 2026-02-10 | Medium | fetch |
| Reddit: "First Competition Experience" | old.reddit.com/r/Archery/comments/1jdc9mk/ | 2026-02-10 | Medium | fetch |
| BareTrack competitive landscape artifact | artifacts/research/competitive-landscape.md | 2026-02-10 | **Critical** | read_file |
| BareTrack advanced analytics artifact | artifacts/research/advanced-analytics-metrics.md | 2026-02-10 | **Critical** | read_file |
| BareTrack codebase | Local workspace | 2026-02-10 | **Critical** | read_file |

---

## Part 1: Features We're Missing (Ranked by Impact)

### Tier A — High Impact, Highly Requested

#### A1. Crawl Mark Lifecycle Management
**Impact: Critical | Effort: 1-2 weeks**

The single most barebow-specific gap. Reddit thread r/Archery/1kbd79f confirms the problem: "My barebow crawl seems to have changed for no particular reason." Community responses identified four causes: serving loosening/nock point shift, string stretch reducing draw weight, tiller drift, and brace height changes.

**What to build:**
- **Crawl mark versioning**: When an archer recalibrates crawls, store the old set with a timestamp. Show crawl drift over time as a chart (crawl value at 18m plotted across months).
- **Re-calibration triggers**: Alert when brace height, tiller, or string age have changed enough to invalidate current crawls. "Your brace height has changed 3mm since last crawl calibration — consider rechecking crawls."
- **Tab wear tracking**: Log tab replacement/conditioning dates. Correlate crawl shifts with tab age. Tab face condition (hair direction, compression) directly affects string-walking consistency. Fields: `tab_material`, `date_installed`, `shots_fired_estimate`, `notes`.
- **String age tracking**: Track string installation date and estimated shot count. String stretch shifts nock point and brace height, invalidating crawls. Alert: "~2000 shots on current string — crawls may need rechecking."
- **Crawl delta report**: After recalibrating, show "your 18m crawl moved 1.5mm from last calibration 6 weeks ago" with possible causes ranked by likelihood.

**Why this is unique**: No archery app tracks crawl mark drift or correlates it with equipment changes. This is the kind of deep domain feature that only a barebow-specific tool would build.

---

#### A2. Standard Round Presets Library
**Impact: Critical | Effort: 1-2 days**

Every competitor has this; BareTrack does not. Users expect to select a preset like "WA 18m Indoor (60 arrows)" and have distance, face size, arrows-per-end, and end count pre-populated.

**Required presets (barebow-relevant):**
| Round | Distance | Face | Arrows/End | Ends | Notes |
|-------|----------|------|-----------|------|-------|
| WA 18m Indoor | 18m | 40cm | 3 | 20 | Primary barebow indoor |
| WA 25m Indoor | 25m | 60cm | 3 | 20 | Some federations |
| WA 50m Outdoor | 50m | 122cm | 3 | 24 | Primary barebow outdoor |
| WA 1440 (barebow) | 50/30m | 122/80cm | 6 | 36x2 | Multi-distance |
| WA Field (unmarked) | 5-55m varies | Various | 3 | 24 | Variable distances |
| WA 3D | 5-45m varies | 3D animal | 2 | 24 | Animal targets |
| Portsmouth | 18.288m (20yd) | 60cm | 3 | 20 | UK popular indoor |
| Worcester | 18.288m (20yd) | 40.64cm face | 5 | 12 | NFAA |
| NFAA Indoor 300 | 18.288m (20yd) | Blue/white face | 5 | 12 | US popular indoor |
| NFAA Field/Hunter | 20-80yd | Various | 4 | 28 | US field archery |
| IFAA Field | 5-60m | Various | 3 | 28 | International field |
| Flint (existing) | Various | Flint face | varies | varies | Already supported |
| AGB National | 60/50m | 122cm | 6 | 36x2 | UK Archery GB |
| AGB Windsor | 50/40/30m | 122/122/122cm | 6 | 36x3 | UK Archery GB |
| Bray I | 18.288m (20yd) | 40cm | 3 | 10 | Short indoor |
| Bray II | 22.86m (25yd) | 40cm | 3 | 10 | Short indoor |
| Vegas 300 | 18m | Vegas 3-spot | 3 | 10 | Premier indoor event |

Store as JSON seed data. Custom round creation should still be available.

---

#### A3. Multi-Distance Session Support
**Impact: High | Effort: 1-2 weeks**

Field archery is the #1 competition format for barebow archers. WA Field rounds have **24 targets at different distances** (5m-55m unmarked, up to 60m marked). The current single-distance session model cannot represent this.

**What to build:**
- Session can contain multiple "stages" or "targets" with different distances
- Each stage has its own distance, face size/type, and number of arrows
- Field round mode: sequential target entry (Target 1: 32m, Target 2: 18m, etc.)
- Score breakdown per distance band (short/medium/long)
- Sigma analysis per distance bucket — critical for barebow, since precision varies dramatically with distance
- This directly feeds into the Multi-Distance Skill Profile (metric 7.3 from analytics research)

---

#### A4. Structured Training Plans & Drills
**Impact: High | Effort: 2-3 weeks**

CapTarget differentiates with training drills. BareTrack should have barebow-specific drills that no generic app offers:

**Barebow-specific drills:**
- **Blind bale**: Shoot at blank target from 3m, eyes closed. Focus on shot execution feel. Log: number of shots, subjective form rating (1-5).
- **Bridge-to-30 (or any distance)**: Progressively increase distance across a session. Tracks at what distance groups start to degrade — identifies the archer's "comfort ceiling."
- **Crawl verification drill**: Shoot 6 arrows at each key distance, record MPI offset. Purpose: validate crawl marks are current. BareTrack can automate: "Your 30m crawl shows 2.3cm left bias — adjust 0.5mm."
- **Pivot drill / one-arrow ends**: Shoot single arrows with full shot routine, scoring only. Develops competition mindset (every arrow matters).
- **Distance ladder**: Same face, increasing distance each end. Measures distance-dependent precision degradation.
- **10-ring challenge**: Keep shooting until you hit X number of 10s. Tracks completion time and total arrows needed.
- **Pressure simulation**: Last end counts double. Timer adds psychological pressure.

**Training plan templates:**
- **Pre-competition week**: Reduced volume, focus on crawl verification + competition rounds
- **Off-season building**: Higher volume, blind bale + form drills, strength progression
- **Peaking cycle**: Taper with scored rounds, mental rehearsal

---

#### A5. Shot Routine Timer
**Impact: High | Effort: 2-3 days**

Top coaches (John Demmer III, Naomi Folkard, USA Archery NTS methodology) emphasize consistent shot timing. A shot routine should take 8-15 seconds from raise to release (most competitive barebow archers target 7-12 seconds).

**What to build:**
- Visual/audio metronome for shot timing (configurable target time)
- Track actual shot-to-shot interval from the logger (timestamp each shot)
- Report: "Your average shot cycle is 11.3s, σ=2.1s. Shots taken in under 7s average 1.2 points lower."
- Correlate shot timing with score: "Are rushed shots worse? Are long holds worse?"
- End timer (WA competition: 2 minutes for 3 arrows, 4 minutes for 6 arrows) with visual countdown
- This is particularly relevant for barebow because string-walking adds time to the shot setup (finding the crawl position) — tracking crawl-finding time vs. execution time would be unique

---

#### A6. Data Export (CSV/PDF/Scoresheet)
**Impact: High | Effort: 1-2 days**

The #1 community request across all archery app forums. MyTargets' broken backup is its most-cited complaint. BareTrack needs:

- CSV export of session data (all shots with x,y,score,arrow_number,end,date)
- PDF scoresheet generation (official WA-format scoring grid)
- Equipment profile export (JSON for backup/sharing)
- Crawl chart PDF for printing (already has print crawl card — verify it exports properly)
- Full database backup/restore (SQLite file download)

---

### Tier B — Medium Impact, Differentiation Features

#### B1. Mental Game Log / Session Journal
**Impact: Medium-High | Effort: 1-2 days**

Top coaching resources (Lanny Bassham's "With Winning in Mind", USA Archery mental performance curriculum) emphasize tracking mental state. Barebow archers are especially vulnerable to target panic (the Reddit thread about barebow target panic — "my arrow tip just floats higher and higher" — is a common complaint).

**What to build:**
- Pre-session mood/energy/focus rating (1-5 scale per dimension)
- Post-session reflection: free text + structured tags (e.g., "target panic episode", "good rhythm", "distracted", "cold hands")
- Per-end mental state logging (optional — for detailed coach review)
- Target panic tracker: log episodes, correlate with shot sequence position and score. "Target panic episodes occur 73% more in ends 8-12 (mid-session fatigue zone)."
- Visualization/mental rehearsal log: "Did you rehearse today? How many minutes?"
- Session notes already partially exist — extend the model

---

#### B2. SPT (Specific Physical Training) & Draw Weight Progression Log
**Impact: Medium-High | Effort: 1 week**

Draw weight progression is critical for barebow archers — they typically shoot heavier than Olympic recurve (32-42 lbs for competitive barebow vs. 28-36 lbs for OR women / 36-48 lbs OR men). The Reddit thread about "struggling with current setup" (Uukha SX80 32# limbs being too stiff) illustrates this.

**What to build:**
- **Draw weight progression chart**: Track actual draw weight at draw length over time (BowSetup already stores `draw_weight_lbs` — allow historical entries with dates)
- **SPT exercises log**: Specific exercises for archery fitness
  - Stretch band holding drills (hold time in seconds, reps)
  - Rrev (reversals): number of draw cycles without shooting
  - Push-up/pull-up/row counts for back strength
  - Plank holds for core stability
  - Draw-hold exercises (draw and hold for X seconds at full draw)
- **Body metrics**: Bodyweight (affects anchor/form), grip strength (correlates with consistency)
- **Injury/fatigue log**: Shoulder discomfort, finger soreness, back fatigue — correlate with training volume to prevent overtraining
- **Volume load metric**: Total arrows × draw weight × session count per week with overtraining threshold warnings

---

#### B3. Competition Simulation & Handicap System
**Impact: Medium-High | Effort: 1-2 weeks**

From the advanced analytics research, multiple metrics support this:

- **Archery GB Handicap System**: A single number normalizing performance across round types. The handicap tables are publicly available. "Your handicap dropped from 52 to 48 this month" is immediately meaningful to UK archers.
- **Classification tracker**: Maps scores to Archery GB tiers (3rd Class → Grand Master Bowman) or WA Star awards.
- **Pre-competition predictor**: "Based on your recent form, you should score 480-520 (80% CI) in Sunday's WA 18m."
- **Monte Carlo round simulation**: Use fitted bivariate normal to simulate 1000 rounds — show full score distribution.

---

#### B4. Weather & Wind Conditions Logging
**Impact: Medium | Effort: 1 day**

Outdoor barebow is significantly wind-affected (no sights for windage correction). Logging wind speed/direction, temperature, light conditions per session enables:

- Correlation: "Your sigma degrades 15% when wind exceeds 15 km/h"
- Wind drift estimation from arrow specs (already have physics engine — natural extension)
- Temperature impact on arrow flight (cold limbs = lower draw weight)
- "Best conditions" vs "worst conditions" performance comparison

---

#### B5. Face-Walking & Gap Shooting Support
**Impact: Medium | Effort: 1 week**

Not all barebow archers string-walk. Some use face-walking (different anchor points for different distances) or gap shooting (using the arrow tip as a reference against the target face). From the Reddit thread on aiming methods, the community consensus is that string-walking dominates competitive barebow, but a significant minority use gap shooting at club level.

**What to build:**
- Support for multiple aiming methods per archer profile
- Gap shooting reference chart: for a given setup and distance, calculate where the arrow tip should appear relative to the target center
- Point-on distance calculator: the distance at which the arrow tip aligns directly with the target center (no gap, no crawl). This is a function of arrow speed, brace height, and anchor position.
- Face-walking reference: suggested anchor points for different distance brackets

---

#### B6. Arrow Lifecycle & Cross-Session Tracking
**Impact: Medium | Effort: 1-2 weeks**

BareTrack already tracks arrows per shot and has arrow tier analysis. Missing pieces:

- **Arrow retirement tracking**: Mark arrows as damaged/retired with date and reason
- **Cross-session arrow performance**: "Arrow #3 has σ=1.8cm across 14 sessions vs. arrow #5 at σ=2.4cm — consider retiring #5"
- **Arrow rotation logging**: Track which arrows are in the active quiver vs. reserve
- **Component history**: Track fletching replacements, point changes, nock replacements per arrow
- **Arrow mileage**: Estimated total shots per arrow shaft — alert near end-of-life (fletching wear, hairline crack risk)

---

#### B7. Coach-Student Sharing & Read-Only Views
**Impact: Medium | Effort: 2-3 weeks**

From the self-coaching Reddit thread and community feedback: coaches want to review student data remotely. Start simple:

- Shareable session URL (read-only, no login required)
- Coach dashboard: view multiple students' trend data
- Session annotation by coach: "Your 3rd end shows anchor drift — check jaw position"
- Export session report as PDF for coach review

---

### Tier C — Nice-to-Haves for Differentiation

#### C1. Target Panic Detection & Management Tools
**Impact: Medium | Unique potential**

Target panic is mentioned in multiple Reddit threads as a major barebow issue. The user in the aiming thread described: "my arrow tip just floats higher and higher and it takes so much time and force to bring it back down." BareTrack could detect this from shot data:

- **Pattern detection**: If shots consistently cluster above center (high bias) and the archer reports difficulty settling aim, flag potential target panic.
- **Snap shooting detection**: If shot timing (timestamp delta between shots) consistently drops below 5 seconds, warn about rushing.
- **Progressive desensitization drill**: Bridge shooting protocol (start at 5 yards, gradually increase distance, only move back when group size meets threshold). Track progress automatically.
- **Hold time analysis**: If the app tracks shot timestamps, can estimate hold time and correlate with accuracy.

---

#### C2. Tiller & Tuning Notebook with Change Tracking
**Impact: Medium | Unique potential**

The Reddit thread on tiller settings reveals ongoing confusion about barebow tiller setup. BareTrack already stores tiller values but could do more:

- **Tuning change log**: Record tiller, brace height, nocking point, plunger settings with dates. Show configuration history timeline.
- **A/B testing framework for tuning changes**: "You changed tiller from -8mm to +6mm on May 15. Your sigma improved from 4.2cm to 3.1cm over the next 3 sessions."
- **Tuning recommendation engine**: Based on group patterns (vertical spread suggests tiller issue, horizontal spread suggests plunger).
- **Community benchmarks**: "Most barebow archers with your riser shoot tiller of -2 to -6mm."

---

#### C3. 3D & Animal Target Face Support
**Impact: Medium for field/3D archers | Effort: 1-2 days per face**

MyTargets has 25+ faces. BareTrack has WA + Flint. Barebow is popular in 3D and field archery. Need:

- IFAA/WA Field faces (standard field, hunter, marked/unmarked)
- 3D animal target scoring zones (vital zones for bear, deer, turkey, etc.)
- 3D-specific scoring (11-14-10-8-5 zones for WA 3D, or IFAA 20-18-16-14-10)

---

#### C4. Session Replay with Shot Timing
**Impact: Low-Medium | Already partially implemented**

Enhance the existing session replay:
- Show shot timing (interval between arrows)
- Highlight group evolution (how the group tightens or widens end-by-end)
- Overlay crawl mark changes within session (if the archer adjusts mid-session)
- Side-by-side replay comparison between two sessions

---

#### C5. Wind Drift Calculator & Outdoor Aiming Aids
**Impact: Low-Medium | Natural extension of physics engine**

Barebow archers have no sights for windage. Knowing expected drift is valuable:
- Input: arrow weight, arrow diameter, fletching profile, wind speed/direction, distance
- Output: estimated horizontal drift in cm
- Pre-positioning recommendation: "In 15km/h crosswind at 50m, aim 12cm into the wind"
- This extends `src/physics.py` naturally

---

#### C6. Dark Mode
**Impact: Low | Effort: 0.5-1 day**

Standard UX expectation. Useful outdoors (reduce glare on sunny days) and indoors (range lighting often dim).

---

## Part 2: Features We Already Have That Are Rare (Our Moat)

### Category: UNIQUE — No Competitor Has These

| Feature | What It Does | Why It's a Moat |
|---------|-------------|----------------|
| **James Park Model** | Separates archer skill (σ) from equipment drag loss by comparing scores at two distances | Published academic-level sports science. No other app even attempts this. Answers the fundamental question: "Is my problem form or gear?" |
| **Crawl Mark Polynomial Regression** | Predicts crawl marks for untested distances from measured data points | Completely novel in the app space. Barebow archers currently maintain handwritten charts. |
| **GPP/FOC Calculations** | Grains Per Pound and Front of Center arrow efficiency metrics integrated into equipment profile | Archers currently use separate spreadsheets or web calculators. |
| **Virtual Coach (physics-based)** | Synthesizes Park Model + physics into actionable recommendations | ArcherSense has generic AI chat; BareTrack's is grounded in actual ballistics. |
| **Score Goal Simulator** | Reverse Park Model — "what σ do I need to reach 500 at WA 18m?" | No competitor calculates this. |
| **Arrow Performance Tiers** | Per-arrow precision-based grouping into Primary/Secondary/Reserve | No app does per-arrow statistical grouping. |
| **Per-Arrow Shot Heatmap** | Individual arrow heatmap overlaid on target | Even scatter plots are rare; per-arrow heatmaps are unique. |
| **Tab Image Overlay** | Upload tab photo, overlay calibrated crawl lines for string-walking reference | Completely unique. |

### Category: RARE — Very Few Competitors Have These

| Feature | Rarity |
|---------|--------|
| **CEP50 tracking** | No archery app uses military precision metrics |
| **Sigma (angular deviation) progression** | Only BareTrack tracks angular deviation over time |
| **Session heatmaps** | Most apps show scatter; heatmaps are rare |
| **Shaft data CSV upload** | No app imports arrow spine test data |
| **Deep bow setup fields** (tiller, plunger center shot, nocking point, string material, strand count) | Deepest equipment modeling in the market |
| **Bias analysis with MPI** | No competitor separates accuracy from precision this formally |
| **Within-end fatigue tracking** | No competitor tracks shot-position-in-end effects |
| **Equipment A/B comparison** | Only CapTarget has vague equipment tracking; none do statistical comparison |
| **Tuning wizard (barebow-specific)** | No competitor has a barebow tuning workflow |

### Protect the Moat
- **Park Model + crawl regression = scientifically defensible advantage**. These require deep domain expertise that general app teams won't invest in.
- **String-walking specificity is the lock-in**: Once an archer enters their crawl data, tab configuration, and equipment specs, switching apps means losing all that calibrated data.

---

## Part 3: Domain-Specific Insights Unique to Barebow String-Walking

### Insight 1: Crawl Marks Are Living Data, Not Static Settings
The Reddit thread on unexplained crawl drift reveals that barebow archers treat crawl marks as fragile, volatile data. Causes of crawl drift include:
- **Serving compression**: The string serving where fingers grip compresses over time, shifting the effective nocking point
- **Tab wear**: Hair tabs compress and wear, changing the effective string position relative to fingers
- **String stretch**: New strings stretch for ~200-500 shots, lowering brace height and draw weight
- **Tiller drift**: Limb bolts can loosen from vibration, changing tiller settings
- **Temperature**: Cold limbs = lower draw weight = different crawl marks
- **Archer fatigue/form drift**: Shortened draw at end of session shifts effective crawl

**Implication**: BareTrack should treat crawl marks as time-series data, not static configuration. Every crawl calibration should be a "snapshot" with date, conditions, and the ability to compare against previous snapshots.

### Insight 2: Tiller Is More Complex for Barebow Than Olympic Recurve
The Reddit tiller thread reveals significant confusion. Key points:
- Standard advice: barebow with string-walking uses **negative tiller** (lower limb stiffer)
- But one archer found **positive tiller** worked better on their specific bow (old KAP Winstar II)
- Community response: "this might be a quirk of that specific bow — limbs may have built-in tiller"
- String-walking changes the effective tiller because moving the fingers down the string shifts load to the lower limb
- **The optimal tiller changes with crawl distance**: Maximum crawl (long distance) needs different tiller than zero crawl (short distance, or point-on)

**Implication**: BareTrack's tuning wizard should recommend tiller as a function of the archer's primary competition distance, not just a fixed value. "For your WA 50m crawl of 38mm, recommend tiller of -4 to -6mm."

### Insight 3: Point-On Distance Is the Barebow Rosetta Stone
The "point-on distance" is where the arrow tip, when placed directly on the target center (zero crawl), hits the center. Below point-on, you crawl down; above point-on, you aim low (face-walk or use under-the-target aim).

- Point-on is unique to each setup (bow weight, arrow speed, brace height, anchor position)
- It's typically 25-40m for competitive barebow setups
- **All crawl marks are relative to point-on** — knowing point-on precisely enables better crawl prediction
- BareTrack can calculate theoretical point-on from arrow ballistics (already has physics engine)
- Should be prominently displayed in equipment profile: "Your estimated point-on: 32m"

### Insight 4: Face Size Transitions Are a Barebow-Specific Challenge
When switching between face sizes (40cm indoor → 80cm outdoor → 122cm outdoor), barebow archers experience:
- Different visual reference for the arrow tip ("the gold looks bigger, my aim point feels different")
- Different crawl marks may be needed (face size changes the visual reference plane)
- Score expectations shift dramatically
- The Park Model inherently handles this, but the UX should make face-size transitions explicit: "Compare your sigma at 18m/40cm face vs. 50m/122cm face — your angular precision is consistent at 2.1 mrad"

### Insight 5: Barebow Competition Psychology Differs from Other Disciplines
From the first competition experience post and aiming method thread:
- Barebow archers at competitions are often a smaller, tight-knit group (fewer competitors than recurve/compound)
- String-walking adds a cognitive step (finding the crawl mark) that compound/recurve archers don't have
- Target panic is especially common in barebow because the aiming reference (arrow tip) moves during the draw and settle — unlike a fixed sight pin
- "Warm-up ends" are critical because the crawl reference needs to be visually calibrated each session
- Mixed disciplines at competitions (same bale as compound archers) can create time pressure for barebow archers who need longer setup

### Insight 6: The Indoor vs. Outdoor Barebow Divide
Indoor (18m) and outdoor (50m) barebow require meaningfully different approaches:

| Aspect | Indoor 18m | Outdoor 50m |
|--------|-----------|-------------|
| Crawl range | Small (0-10mm typically) | Large (20-45mm) |
| Arrow speed impact | Minimal — flat trajectory | Critical — drag loss matters |
| Wind | None | Major factor, no windage correction available |
| Face size | 40cm (small gold) | 122cm (large gold, but far away) |
| Typical arrow selection | Thick shafts (X10, Protour) for line-cutting | Thin shafts (ACE, Carbon One) for wind resistance |
| Optimal GPP | Higher (8-10+ GPP) for forgiveness | Lower (7-9 GPP) for speed |
| Park Model relevance | Less (single distance) | Critical (drag loss dominates) |
| Practice frequency | Weekly club sessions | Often seasonal (weather-dependent) |

**Implication**: BareTrack should make it easy to maintain separate equipment profiles/configs for indoor vs. outdoor seasons, with season-switching workflow.

---

## Part 4: Competition-Specific Needs by Format

### WA Indoor (18m)
- 60 arrows, 3-arrow ends, 40cm face
- Barebow-specific: X-count tiebreaker tracking
- Line-cutters are crucial (ring boundary calls) — BareTrack's scoring from (x,y) coordinates handles this inherently
- Common variant: triple vertical 3-spot face (one arrow per face, no robin-hoods)

### WA Outdoor Target (50m)
- 72 arrows, 6-arrow ends (qualification), 3-arrow ends (match play), 122cm face
- Wind tracking per end (direction changes within a session)
- Match play simulation: head-to-head set scoring (2 points for winning set, 1 for tie)
- Match play strategy tracking: "2-arrow shoot-off history"

### WA Field (Marked & Unmarked)
- 24 targets, 3-arrow ends, variable distances (5-55m unmarked, up to 60m marked)
- Unknown distances in unmarked — distance estimation skill is key
- Uphill/downhill angle compensation matters
- Different scoring faces at different distances (20cm for shortest, 80cm for longest)
- Course walk features: "I estimated Target 7 at 35m, actual was 41m" — tracks estimation skill over time
- Multi-distance session support is **mandatory** for field

### WA 3D
- 24 animal targets, variable distances (5-45m), unknown distances
- 3D-specific scoring: 11 (kill zone center), 14 (kill zone), 10 (vital), 8 (body), 5 (wound), 0 (miss)
- No coordinate-based scoring — need zone-based entry
- Equipment considerations: often use heavier arrows for penetration sound

### IFAA Field/Hunter
- 28 targets, 4-arrow ends (field) or 4-arrow ends (hunter — one walk-up)
- Fan positions (different shooting positions per target)
- IFAA uses different scoring rings than WA
- Imperial distances (yards instead of meters for US events)

### National Federation Rounds (AGB, NFAA)
- Portsmouth (20yd, 60cm face, 60 arrows)
- Worcester (20yd, 16-inch face, 60 arrows)
- National round (60/50m, 122cm)
- Handicap tracking against AGB tables

---

## Part 5: Physical & Biomechanical Tracking

### SPT (Specific Physical Training) Exercises Archers Track

| Exercise | What It Trains | How to Track |
|----------|---------------|-------------|
| **Stretch band holds** (SPT1) | Back tension endurance | Hold time (seconds), reps, band resistance |
| **Reversals** | Draw cycle consistency | Number of full draw cycles without release |
| **Bow raise-and-hold** | Shoulder stability | Hold time at full draw |
| **Closed-eye execution** | Proprioceptive shooting | Reps, subjective quality rating |
| **Wall drills** | Back engagement pattern | Reps, time |
| **Plank holds** | Core stability | Time |
| **Scapular push-ups** | Shoulder stability | Reps |
| **Resistance band pull-aparts** | Upper back strength | Reps × resistance |

### Draw Weight Progression Tracking

Barebow archers typically progress draw weight over 1-3 years:
- Beginner: 20-26 lbs
- Intermediate: 28-34 lbs
- Competitive: 34-42 lbs (women typically 30-38 lbs)
- Elite: 38-44+ lbs

Track: Actual draw weight at draw length, date, and comfort rating. Chart progression. Alert if jumping too aggressively (>2 lbs increase in <4 weeks = injury risk).

### Fatigue & Injury Prevention

- **Daily arrow count** with weekly rolling total
- **Fatigue score**: End-of-session self-report (1-5)
- **Pain log**: Location (shoulder, fingers, elbow, back), severity, date
- **Rest day compliance**: Track days off between sessions
- Threshold warnings: "You've shot 450 arrows this week, up 30% from your 4-week average — consider a rest day"

---

## Part 6: Mental Game & Training Plans

### What Top Coaches Recommend Tracking

**From coaching methodology (USA Archery NTS, Lanny Bassham, John Demmer III):**

| Tracking Area | What to Log | Why |
|---------------|------------|-----|
| **Pre-shot routine consistency** | Did you complete full routine Y/N per end | Identifies when routine breaks down under pressure |
| **Shot feel rating** | 1-5 per arrow or per end | Correlates subjective feel with objective score |
| **Attention focus** | What were you thinking about? (process vs outcome) | Outcome focus → worse scores |
| **Energy level** | Pre-session 1-5 | Correlates energy with performance |
| **Confidence level** | Pre-session 1-5 | Low confidence often predicts wider groups |
| **Visualization practice** | Minutes of mental rehearsal outside range | Proven to improve competition performance |
| **Shot process adherence** | % of shots where full process was followed | The core metric of process-focused coaching |

### Training Plan Generator Ideas

**Periodization structure for a competition cycle:**

| Phase | Duration | Focus | Session Mix |
|-------|----------|-------|-------------|
| **General Preparation** | 6-8 weeks | Volume, SPT, form drills | 70% blank bale + drills, 30% scored |
| **Specific Preparation** | 4-6 weeks | Scored rounds, crawl calibration | 40% drills, 60% scored rounds |
| **Pre-Competition** | 1-2 weeks | Competition simulation, mental rehearsal | 20% drills, 80% scored (reduced volume) |
| **Competition** | Event week | Minimal practice, routine maintenance | Light practice, mental focus |
| **Recovery** | 1-2 weeks | Rest, fun shooting, equipment maintenance | Optional, low pressure |

---

## Part 7: Feature Priority Matrix — What to Build Next

### Immediate (Ship This Week)
| Feature | Effort | Impact |
|---------|--------|--------|
| Standard round presets library | 1-2 days | Critical — removes friction |
| CSV/PDF data export | 1-2 days | Critical — most-requested in community |
| Session notes expansion (mood/energy fields) | 0.5 day | Quick win, coaching-aligned |

### Soon (This Month)
| Feature | Effort | Impact |
|---------|--------|--------|
| Crawl mark versioning & drift tracking | 1 week | Our unique differentiator, deepened |
| Shot timing tracking (timestamp per shot) | 1-2 days | Enables shot cycle analysis |
| Weather/conditions per session | 1 day | Outdoor analysis |
| String/tab age tracking with alerts | 1-2 days | Barebow-specific maintenance |
| Point-on distance calculator | 1-2 days | Natural physics extension |

### Medium-Term (This Quarter)
| Feature | Effort | Impact |
|---------|--------|--------|
| Multi-distance session support | 2 weeks | Unlocks field archery |
| Training drills library (barebow-specific) | 2 weeks | Differentiation from CapTarget |
| SPT / physical training log | 1 week | Serious athlete feature |
| Mental game log | 1 week | Coaching methodology aligned |
| Handicap system (AGB tables) | 1-2 weeks | Cross-round normalization |
| 3D / field target faces | 1-2 weeks | Expands competition coverage |

### Strategic (Later)
| Feature | Effort | Impact |
|---------|--------|--------|
| PWA / offline capability | 3-4 weeks | Mandatory for range use |
| Coach-student sharing | 3 weeks | Club adoption driver |
| Shot routine timer / metronome | 3 days | Nice to have |
| Target panic detection | 1 week | Unique and valuable |
| Competition simulation (Monte Carlo) | 1 week | Compelling visualization |

---

## Contradictions / Gaps in Research

1. **Tiller advice is contradictory**: Most sources say negative tiller for barebow, but one user found positive tiller better. BareTrack's tuning wizard should present both options with experimental methodology rather than dogmatic advice.
2. **Instinctive vs. string-walking debate**: Community consensus is that string-walking dominates competitive barebow, but a vocal minority swears by intuitive shooting. BareTrack should support both but optimize for string-walking (the primary use case).
3. **Field archery data model**: Supporting variable-distance sessions is architecturally non-trivial given the current Session→End→Shot model assumes a single distance. This needs careful schema design.
4. **AGB Handicap tables**: These are publicly available but extensive. Need manual data entry or scraping from Archery GB publications. Could start with barebow-relevant rounds only.
5. **3D scoring**: BareTrack's scoring is based on (x,y) ring-boundary calculation. 3D scoring uses discrete zones that can't be mapped to coordinates — needs a different scoring mode (dropdown: 11/14/10/8/5/M).

## Open Questions

- [ ] Is multi-distance session support achievable without a schema migration? (Adding `distance` per End rather than per Session?)
- [ ] Should crawl mark versioning use a separate `CrawlMarkSnapshot` table, or soft-versioning within the existing crawl data?
- [ ] AGB handicap tables: source from archerygeek.com (JavaScript-heavy) or digitize from official PDF?
- [ ] Should SPT/physical training be inside BareTrack or better served by integration with fitness apps (Apple Health, Strava)?
- [ ] PWA offline architecture: Service Worker + IndexedDB, or Capacitor wrapper for mobile stores?

---

## Recommendations

1. **Immediately ship round presets + data export** — these are table-stakes features blocking adoption. Minimal effort, maximum friction reduction.
2. **Deepen the moat with crawl lifecycle management** — this is the single most barebow-specific feature possible. Nobody else will build this because it requires deep understanding of string-walking dynamics.
3. **Position BareTrack as "the coaching tool" not just "the scoring app"** — training drills, mental game logs, and shot timing analysis move BareTrack from "data recording" to "active coaching." This justifies a premium tier.
4. **Multi-distance sessions are the key to field archery** — field archery is where barebow archers spend most of their time. Without variable-distance support, BareTrack misses the larger segment of its target audience.
5. **Resist generic features** that dilute barebow focus. Social features, AI auto-scoring, and smartwatch support are expensive and don't leverage BareTrack's unique position. Better to be the best barebow tool than a mediocre everything-tool.

---

*Next steps: `#runSubagent planner "Research complete: barebow archer needs analysis. Key deliverable: artifacts/research/barebow-archer-needs.md. High-priority features: round presets, data export, crawl lifecycle management, multi-distance sessions, training drills. Unique moat confirmed: Park Model, crawl regression, physics-based coaching. Schema change needed for multi-distance sessions."`*
