# Research: Competitive Landscape — Archery Scoring & Analysis Apps

> **📋 RESEARCH ARTIFACT**  
> This document is a **research artifact** capturing analysis and recommendations as of the date listed. It does NOT reflect current implementation status. Many proposed features remain unimplemented.  
> **For actual implemented features**, see root `README.md` and `CHANGELOG.md`.

---

**Date**: 2026-02-09T14:00:00Z  
**Researcher**: researcher-agent  
**Confidence**: High (primary competitor data), Medium (pricing — some apps have evolved since last store snapshot)  
**Tools Used**: fetch_webpage (Google Play, Reddit r/Archery), read_file (BareTrack codebase), semantic_search

---

## Summary

The archery app market is fragmented, dominated by mobile-first scoring apps that favour simplicity and broad bow-type support. No existing app targets barebow archers specifically with physics-based analysis (Park Model, GPP/FOC, crawl mark regression). BareTrack's unique advantage is deep analytical depth, but it currently lacks mobile-native UX, offline capability, social features, and standard-round presets — all of which competitors treat as table stakes.

---

## Sources

| Source | URL | Accessed | Relevance | Method |
|--------|-----|----------|-----------|--------|
| MyTargets — Google Play | play.google.com/store/apps/details?id=de.dreier.mytargets | 2026-02-09 | High | fetch |
| Reddit r/Archery — App recommendations | reddit.com/r/Archery/comments/1psd7c8/ | 2026-02-09 | High | fetch |
| Reddit r/Archery — Beginner app search | reddit.com/r/Archery/comments/1pkadvt/ | 2026-02-09 | High | fetch |
| Reddit r/Archery — Scoring app thread | reddit.com/r/Archery/comments/1mh8n8o/ | 2026-02-09 | High | fetch |
| Arcoly — Reddit launch + feedback | reddit.com/r/Archery/comments/1p5ckal/ | 2026-02-09 | Medium | fetch |
| ArcherSense — Reddit launch + feedback | reddit.com/r/Archery/comments/1nf3y03/ | 2026-02-09 | Medium | fetch |
| Ianseo — Official site | ianseo.net | 2026-02-09 | Medium | fetch |
| BareTrack codebase | Local workspace | 2026-02-09 | High | read_file |

---

## 1. Competitor Profiles

### 1.1 MyTargets Archery (by Mantis Tech)

| Attribute | Details |
|-----------|---------|
| **Platform** | Android (100K+ downloads, 4.4★, 3.3K reviews) |
| **Pricing** | Free, open-source |
| **Key Features** | • Material Design UI • Equipment tracking (bows, arrows) • Scoresheet with print • 25+ target faces (WA, Field, 3D) • Per-arrow tracking • Weather conditions logging • Saved sight marks • Standard round presets • Android Wear support • 20+ language translations • Statistics & progress tracking |
| **Strengths** | Most-recommended app on Reddit. Clean UI. Open-source, no accounts needed. Wide target face support. Trusted long-term project (7+ years). |
| **Weaknesses** | Android-only (no iOS). Backup/export broken (Google Drive backup fails, local backup inaccessible — top complaint). No cloud sync. No multi-archer scoring. No analysis beyond basic stats. Miss colors blend into some target faces. No barebow-specific features. |
| **Barebow Gap** | No crawl marks, no string-walking references, no tab configuration, no FOC/GPP, no Park Model. Generic across all bow types. |

### 1.2 Artemis / ArtemisLite

| Attribute | Details |
|-----------|---------|
| **Platform** | Android (ArtemisLite), possibly iOS (Artemis) |
| **Pricing** | Free (lite version); full version pricing unclear |
| **Key Features** | • Multiple round formats (WA, IFAA, indoor/outdoor) • Configurable arrow count per end • Target plotting • Score history • Multiple scoring styles |
| **Strengths** | Good round format variety. Mentioned positively for field archery support. |
| **Weaknesses** | Android-only per user reports. Limited online presence. No cloud sync. No advanced analytics. |
| **Barebow Gap** | No barebow-specific tools. No crawl/gap shooting features. |

### 1.3 FalconEye Archery

| Attribute | Details |
|-----------|---------|
| **Platform** | iOS and Android |
| **Pricing** | Subscription: ~£40/year (widely criticized) |
| **Key Features** | • Arrow plotting on target face • Progress tracking over time, grouped by round type • Smart watch compatibility (Apple Watch, Wear OS) • Multiple target faces • Data analysis and plotting |
| **Strengths** | Best-in-class progress visualization (grouped by round type). Smartwatch support for hands-free scoring at the line. Cross-platform. |
| **Weaknesses** | Expensive subscription model ($40+/year). Locks basic features (data analysis, plotting) behind paywall. Multiple Reddit users cite price as deal-breaker ("No way am I paying £40 a year for a scoresheet"). |
| **Barebow Gap** | No barebow-specific features. General-purpose archery app. |

### 1.4 CapTarget Archery

| Attribute | Details |
|-----------|---------|
| **Platform** | iOS and Android |
| **Pricing** | Free tier + Monthly/yearly subscription for premium |
| **Key Features** | • Graphs and statistics • Exercises and training drills • Tuning guides • Equipment tracking • Social features (add friends, set up matches) • Bot matches for solo practice • Free plotting • Multiple target face support |
| **Strengths** | Most feature-complete mainstream app. Social/competitive features (friend matches, bot matches). Training exercises beyond just scoring. Tuning guides included. Community feel. Beginner-friendly UX. |
| **Weaknesses** | Subscription for premium features. Some features feel generic/not deep. |
| **Barebow Gap** | Tuning guides are generic, not barebow-specific. No crawl marks, no string-walking, no Park Model analysis. |

### 1.5 Ianseo

| Attribute | Details |
|-----------|---------|
| **Platform** | Web + downloadable desktop software; mobile scorekeeper app |
| **Pricing** | Free (donation-supported) |
| **Key Features** | • Official tournament management (used worldwide by 100+ national federations) • Live scoring and results • Scorekeeper mobile app • Full competition management (registration, scheduling, bracketing, results) • Integration with World Archery infrastructure |
| **Strengths** | De facto standard for tournament scoring globally. Trusted by World Archery. Massive adoption (90+ countries). Free/open. |
| **Weaknesses** | Not designed for individual practice tracking. Complex UI geared toward tournament directors, not individual archers. No personal analytics. No equipment tracking. No training tools. Legacy web interface. |
| **Barebow Gap** | Not a personal training tool. No overlap with BareTrack's use case beyond ring-scoring standards. |

### 1.6 Archery Scoresheets

| Attribute | Details |
|-----------|---------|
| **Platform** | Android (and via web) |
| **Pricing** | Free with optional account for extra features |
| **Key Features** | • Custom round configuration (distance, target face, # arrows, # ends) • Score history • Basic statistics • Print-ready scoresheets |
| **Strengths** | Highly configurable round setup. Mentioned frequently as reliable and straightforward. Free account model. |
| **Weaknesses** | Basic — no plotting, no advanced analysis. Limited UI polish. |
| **Barebow Gap** | No barebow features. Data entry only. |

### 1.7 ArcherSense (AI-powered)

| Attribute | Details |
|-----------|---------|
| **Platform** | iOS and Android |
| **Pricing** | Freemium (presumed subscription for AI features) |
| **Key Features** | • AI form analysis (7 areas: stance, alignment, draw, anchor, aim, release, follow-through, scored on 16-point scale) • Virtual AI coach (chat-based for shooting/gear advice) • Score tracking with arrow plotting • Cloud sync across devices • Multiple target faces (WA, Field, Vegas, 3-spot variants) |
| **Strengths** | First-mover on AI coaching in archery apps. Cloud sync is rare in this market. Cross-platform. |
| **Weaknesses** | Many UX bugs reported (plotting accuracy, saving issues, poor session management). Multiple bows not supported at launch. Line-cutter scoring inaccurate. Notes feature hard to find. No export. |
| **Barebow Gap** | Generic AI coaching, not barebow-specific physics. No crawl marks. No Park Model. No FOC/GPP. |

### 1.8 Arcoly

| Attribute | Details |
|-----------|---------|
| **Platform** | Android and iOS |
| **Pricing** | 100% Free (hobby project by developer, no monetization intent) |
| **Key Features** | • Session logging (distance, score, arrows) • Stats and improvement charts • NFAA 5-spot scoring • Field vs Target formats • Saved round presets/favorites • Equipment setup tracking (bow + arrows) • Metric/Imperial toggle |
| **Strengths** | Extremely responsive developer (shipped 3 major feature requests in 48 hours). Clean, simple UI. Truly free. Active development. iOS + Android. |
| **Weaknesses** | Very early stage (MVP). No arrow plotting on target face. No advanced analytics. "Feels like a web app." Limited feature depth. |
| **Barebow Gap** | No barebow features. Basic score logging only. |

### 1.9 Other Notable Apps

| App | Platform | Notes |
|-----|----------|-------|
| **ArcheryBuddy** | iOS | Simple session logging, form notes, progress view. Praised by beginners for simplicity. |
| **Rise Archery** | iOS | Simple, clean. Paid (no free trial — criticized). Score history. |
| **Ishi Archery** | iOS/Android | Free version + £5/year for analysis features. Field archery-oriented. |
| **JayArchery** | iOS | Indie app, target face zoom, analysis graphs, multi-round. Still in Korean UI (localization WIP). |
| **Codex Archery Aide** | Android only | Created by a club member. Supports many event types. Free, no account needed. |
| **MantisX Archery** | iOS/Android | Hardware sensor-based (separate purchase ~$150+). Tracks bow movement during shot cycle. Not a scoring app. |

---

## 2. Market-Wide Feature Matrix

| Feature | MyTargets | FalconEye | CapTarget | ArcherSense | Arcoly | **BareTrack** |
|---------|-----------|-----------|-----------|-------------|--------|---------------|
| Arrow plotting on target | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Equipment profiles | ✅ | ❌ | ✅ | Partial | ✅ | ✅ |
| Standard round presets | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Multiple target faces | ✅ (25+) | ✅ | ✅ | ✅ | ❌ | ✅ (WA + Flint) |
| Statistics / progress | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Heatmaps | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Cloud sync | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Smartwatch support | ✅ (Wear) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Social / friend matches | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| AI coaching | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Training drills / exercises | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Weather tracking | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Sight mark tracking | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ (has crawl marks) |
| Print scoresheet | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Data export (CSV/PDF) | ❌ (broken) | ❌ | ❌ | ❌ | ❌ | ❌ |
| Offline-first | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Mobile-native | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ (web SPA) |
| **Barebow-specific** | | | | | | |
| Crawl mark regression | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| String-walking tools | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Tab configuration | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| GPP / FOC calculations | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Park Model analysis | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Virtual Coach (physics) | ❌ | ❌ | ❌ | Generic AI | ❌ | ✅ |
| CEP50 / sigma tracking | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Shaft data CSV upload | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Tuning wizard (barebow) | ❌ | ❌ | Generic | ❌ | ❌ | ✅ |

---

## 3. Gap Analysis: What Competitors Have That BareTrack Lacks

### Critical Gaps (widely expected by users)

| Gap | Who Has It | Impact | Notes |
|-----|------------|--------|-------|
| **Mobile-native experience** | All competitors | Very High | BareTrack is a web SPA. Every competitor is mobile-first. Reddit users want to score at the range from their pocket / smartwatch. |
| **Offline capability** | MyTargets, FalconEye, CapTarget, Arcoly | Very High | Archery ranges often have no connectivity. BareTrack requires a running API server. |
| **Standard round presets** | MyTargets, FalconEye, CapTarget, Arcoly | High | Users expect to select "WA 720", "NFAA Indoor", "Portsmouth", etc. and have ends/arrows/distances preconfigured. BareTrack requires manual session setup. |
| **Data export (CSV/PDF/scoresheet)** | MyTargets (partial), desired by all users | High | Printable scoresheets for club records, CSV export for personal analysis. Top community request. |
| **Weather / conditions logging** | MyTargets | Medium | Wind speed/direction, temperature. Useful for outdoor barebow analysis. |

### Moderate Gaps

| Gap | Who Has It | Impact |
|-----|------------|--------|
| **Social features** | CapTarget | Medium — Remote matches, friend leaderboards, club integration. |
| **Training drills library** | CapTarget | Medium — Structured practice exercises beyond free shooting. |
| **Smartwatch support** | MyTargets, FalconEye | Medium — Score from the line without pulling out phone. |
| **Sight mark tracking** | MyTargets | Low for barebow (crawl marks serve this role). |
| **Multi-archer scoring** | Desired but not in any app | Medium — Useful for club coaches scoring multiple students. |
| **AI-powered auto-scoring from photo** | ArcherSense (WIP), community demand | Medium-High — Most-requested "dream feature" on Reddit. |

---

## 4. Unique Advantage Analysis: What BareTrack Does That No Competitor Has

### Category: Physics-Based Barebow Analysis (Exclusive)

| Feature | Competitive Uniqueness | Value |
|---------|----------------------|-------|
| **James Park Model** — Separates archer skill (sigma) from equipment drag loss by comparing scores at two distances | **No competitor has this.** This is published academic-level archery science. | Extremely high for serious barebow archers who want to objectively answer: "Is my problem form or equipment?" |
| **GPP/FOC calculations** — Grains Per Pound and Front of Center arrow efficiency metrics | **No app calculates this.** Archers currently use spreadsheets or online calculators. | High. Integrating this into the equipment profile eliminates external tools. |
| **Setup efficiency scoring** with safety analysis | **Unique.** No competitor warns about dangerous setups or scores efficiency. | High. Safety + optimization in one tool. |
| **Virtual Coach** — Physics + Park Model synthesis into actionable recommendations | **No competitor has physics-based coaching.** ArcherSense has generic AI chat, but no mathematical foundation. | Very high. This is the "killer feature" — data-driven coaching, not vibes. |

### Category: String-Walking & Crawl Mark Tools (Exclusive)

| Feature | Competitive Uniqueness | Value |
|---------|----------------------|-------|
| **Crawl mark polynomial regression** — Predicts crawl marks for untested distances using measured data points | **Completely unique.** No app or online tool does this. | Very high for string-walking barebow archers. Currently uses hand-written charts or guesswork. |
| **Tab configuration management** | **Unique.** No competitor tracks tab setup (material, thickness, layers). | Medium-High. Tab setup affects string-walking precision significantly. |

### Category: Statistical Analysis (Rare)

| Feature | Competitive Uniqueness | Value |
|---------|----------------------|-------|
| **CEP50 tracking** — Circular Error Probable at 50th percentile | **Unique in archery apps.** Military/precision shooting metric applied to archery. | High for data-driven archers. |
| **Sigma (angular deviation) tracking over time** | **Unique.** Only BareTrack tracks this. | High. Shows skill improvement independent of distance/face size. |
| **Session heatmaps** | **Rare.** Most apps show scatter plots, not heatmaps. | Medium. Better visualization of shot distribution patterns. |

### Category: Equipment Management (Strong)

| Feature | Competitive Uniqueness | Value |
|---------|----------------------|-------|
| **Shaft data CSV upload** | **Unique.** No app imports arrow spine test data. | Medium. Power user feature for archers who spine-test their shafts. |
| **Deep bow setup fields** (tiller, plunger center shot, nocking point, string material, strand count) | **Deepest in market.** MyTargets/CapTarget track basics (make/model/weight). | High. Barebow tuning depends on these exact parameters. |

---

## 5. Prioritized Upgrade Recommendations

### Tier 1: High Impact / Low Effort (Quick Wins)

| # | Recommendation | Rationale | Effort Est. |
|---|---------------|-----------|-------------|
| 1 | **Standard round presets library** — Preconfigured WA, IFAA, NFAA rounds (distance, face, arrows/end, end count) | Every competitor has this. Top friction point for new users. Store as JSON seed data, surface in session config dropdown. | 1-2 days |
| 2 | **Session notes / form journal** — Free-text notes per session and per end | Requested by beginners and coaches alike across all Reddit threads. Simple text field addition to Session/End models. | 0.5 day |
| 3 | **CSV/JSON data export** — Download session history, equipment profiles, and crawl mark data | Most-requested feature across all archery app communities. MyTargets backup being broken is the #1 complaint. | 1 day |
| 4 | **PDF scoresheet generation** — Printable official-format score cards | MyTargets has this. Needed for club submissions. Use a Python PDF library (reportlab/weasyprint). | 1-2 days |
| 5 | **Imperial/Metric toggle** — Support yards alongside meters | All major apps support this. Essential for US/UK archers shooting NFAA/IFAA. | 0.5 day |
| 6 | **Weather/conditions logging** — Wind speed/direction, temperature, light conditions per session | Valuable for outdoor barebow analysis. Correlate weather with sigma/CEP50 changes. | 0.5-1 day |
| 7 | **Personal bests tracking with notifications** — Highlight when a score beats a PB for that round type | Simple db query against historical data. High motivational value. | 0.5 day |

### Tier 2: High Impact / High Effort (Strategic Features)

| # | Recommendation | Rationale | Effort Est. |
|---|---------------|-----------|-------------|
| 8 | **PWA / Mobile-responsive overhaul** — Convert the web SPA into an installable Progressive Web App with service worker for offline | Every competitor is mobile-native. Archers score at the range. Offline is mandatory. Service worker caching + IndexedDB for local storage with sync-on-reconnect. | 2-3 weeks |
| 9 | **Camera-based auto-scoring** — Point camera at target face, AI detects arrow positions | Top "dream feature" in the archery community (multiple Reddit threads). ArcherSense is working on this. Would be a massive differentiator if BareTrack ships it first with physics integration. | 4-8 weeks (ML model + integration) |
| 10 | **Multi-distance session logging** — Support sessions with mixed distances (e.g., WA 1440: 90m, 70m, 50m, 30m in one session) | Current model appears to be single-distance sessions. Field archery has variable distances per target. | 1 week |
| 11 | **Social / Club features** — Share sessions, club leaderboards, coach-student linking | CapTarget's social features are highly praised. Coaches want to monitor students. Start with shareable session links. | 2-4 weeks |
| 12 | **Training drill library** — Structured practice exercises (blind bale, bridge-to-30, gold challenge, etc.) | CapTarget differentiates with this. Barebow-specific drills (gap shooting drill, crawl verification drill) would be unique. | 1-2 weeks |
| 13 | **Arrow lifecycle tracking** — Track individual arrows across sessions, mark arrows as damaged/retired, identify which arrows group poorly | MyTargets partially supports this. BareTrack's quiver panel + per-arrow tracking is a foundation. Extend to cross-session arrow performance analytics. | 1-2 weeks |
| 14 | **Smartwatch companion** — Simple end scoring from Apple Watch / Wear OS | FalconEye's best feature per Reddit. Archers don't want to pull out phones between ends. | 3-4 weeks |

### Tier 3: Medium Impact (Nice-to-Haves)

| # | Recommendation | Rationale | Effort Est. |
|---|---------------|-----------|-------------|
| 15 | **3D / Field target face support** — Add 3D animal scoring zones and IFAA field faces beyond Flint | MyTargets has 25+ faces. BareTrack has WA + Flint. Field archery is popular with barebow archers. | 1-2 days per face |
| 16 | **Goal setting** — Set target scores for specific rounds, track progress toward goals | Motivational feature. "Beat 500 in a WA 720 by March." | 1-2 days |
| 17 | **Dark mode** | Standard UX expectation for apps used outdoors (reduces glare). | 0.5-1 day |
| 18 | **Localization / i18n** — Support multiple languages | MyTargets has 20+ languages. Essential for international reach. | 1-2 weeks (ongoing) |
| 19 | **Backup / restore** | MyTargets' #1 complaint is broken backup. BareTrack should nail this from the start. SQLite file export + JSON config export. | 1 day |
| 20 | **Wind drift calculator** — Given arrow specs + wind speed, estimate drift at distance | Natural extension of the physics engine. Useful for outdoor barebow. | 1-2 days |
| 21 | **Sight mark tracker** (for recurve/compound users) | Broadens market beyond barebow-only. BareTrack could serve as a "serious archer's app" for all disciplines. | 1 day |

---

## 6. Strategic Positioning

### Market Position Map

```
                    Deep Analysis
                         ▲
                         │
                    BareTrack ★
                         │
                         │
          ArcherSense ·  │
                         │
Simple ◄─────────────────┼──────────────────► Feature-Rich
                         │
         Arcoly ·        │         · CapTarget
                         │
         MyTargets ·     │    · FalconEye
                         │
                    Ianseo ·
                         │
                         ▼
                    Basic Scoring
```

### Recommended Positioning Statement

> **BareTrack**: The only archery analysis platform built specifically for barebow. While other apps track scores, BareTrack understands the physics — separating your skill from your equipment, predicting crawl marks from 3 data points, and coaching you with mathematics, not guesswork.

### Key Differentiators to Protect & Amplify

1. **Park Model integration** — No competitor is close to replicating this
2. **Crawl mark regression** — Completely novel in the app space
3. **Physics-based Virtual Coach** — ArcherSense has AI chat, but BareTrack's is grounded in actual ballistics
4. **Deep equipment modeling** — Plunger center shot, tiller measurements, tab configuration — no competitor tracks these

### Risks & Threats

| Threat | Severity | Mitigation |
|--------|----------|------------|
| Mobile-native apps continuing to dominate while BareTrack remains web-only | High | PWA conversion is urgent. Offline capability is non-negotiable for range use. |
| ArcherSense shipping AI auto-scoring before BareTrack | Medium | Focus on physics-based analysis depth rather than trying to compete on AI image recognition. BareTrack's moat is domain-specific math, not generic ML. |
| CapTarget adding barebow-specific features | Medium | Ship crawl mark + Park Model features prominently. These require deep domain expertise that a general app team won't invest in. |
| Arcoly's rapid iteration speed (shipped 3 features in 48 hours) | Low | Different target market — Arcoly aims at simplicity, BareTrack aims at depth. |

---

## 7. Community Sentiment Insights (from Reddit Research)

### What Archers Want Most (recurring themes)

1. **Simplicity first** — Beginners are overwhelmed by complex apps. Onboarding must be gentle.
2. **No mandatory accounts** — Strong pushback against mandatory sign-up to use basic features.
3. **No expensive subscriptions** — £40/year (FalconEye) is widely rejected. £5/year (Ishi) is accepted. Free with optional donation is most welcomed.
4. **Reliable backup/export** — MyTargets' #1 complaint. Data loss is unforgivable.
5. **AI auto-scoring from photos** — The "dream feature." Multiple threads ask for this. Some willing to pay a lump sum for it.
6. **Coach/club integration** — Coaches want to see student data. Club features drive adoption.

### Pricing Sentiment

| Model | Community Reaction |
|-------|--------------------|
| Free (MyTargets, Arcoly) | Loved, but users worry about sustainability |
| Free + £5/year (Ishi) | Accepted. "Fair for what you get." |
| £40/year subscription (FalconEye) | Rejected. "No way am I paying £40/year for a scoresheet." |
| Freemium with AI features (ArcherSense) | Mild interest, but distrust of AI accuracy |
| One-time purchase | Requested — "I will be willing to pay lump sum if working" |

### Recommended Pricing Model for BareTrack

- **Free tier**: Core scoring, session history, basic stats, equipment profiles
- **One-time purchase or low annual** ($5-10/year): Park Model analysis, Virtual Coach, crawl regression, PDF export, advanced analytics (CEP50, sigma tracking)
- **Never paywall**: Basic scoring, data export, backup/restore

---

## 8. Barebow-Specific Opportunity Analysis

BareTrack occupies a unique niche. Barebow archery is the fastest-growing discipline in target archery (per World Archery participation data), yet **zero apps serve this audience specifically**. Key opportunities:

| Opportunity | Why It Matters for Barebow |
|-------------|---------------------------|
| **String-walking crawl chart generator** | Barebow archers maintain hand-written crawl charts. Digital prediction with polynomial fit is transformative. |
| **Tab wear tracking** | Tab face condition directly affects string-walking consistency. No tool tracks this. |
| **Point-on distance calculator** | Critical distance where arrow trajectory doesn't require crawl adjustment. BareTrack can calculate this from bow/arrow specs. |
| **Barebow-specific tuning workflow** | Tiller, plunger center shot, nocking point height — all interact differently in barebow vs. recurve/compound. BareTrack's tuning wizard should become the definitive digital guide. |
| **Wind drift from arrow specs** | Barebow archers have no sights for windage adjustment. Knowing expected drift at distance enables pre-positioning aim. |
| **Face-walking reference** | Some barebow archers use face-walking (different anchor points) instead of string-walking. Support both methods. |

---

## Open Questions

- [ ] Is there appetite for a BareTrack mobile app (React Native wrapper) vs. PWA approach?
- [ ] Would a Raspberry Pi / self-hosted mode appeal to club use cases (always-on kiosk at range)?
- [ ] Is the Park Model IP defensible, or should it be published openly to build community credibility?
- [ ] What is the realistic timeline for PWA offline capability given the current SQLite + FastAPI architecture?

---

## Recommendations for Next Steps

1. **Immediate** (#runSubagent planner): Priority-rank the Tier 1 quick wins and add to sprint backlog. Standard round presets + data export + PWA offline should be the first milestone.
2. **Short-term**: Validate barebow-specific features with the Reddit r/Archery community (post asking barebow archers what they want in a dedicated app).
3. **Medium-term**: Evaluate PWA service worker architecture for offline-first session logging with sync-on-reconnect.
4. **Strategic**: Consider open-sourcing the Park Model and crawl regression code to build community trust and position BareTrack as the authoritative barebow analysis platform.
