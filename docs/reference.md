# Barebow Analysis & Data Architecture Reference

This report outlines the data architecture and analytical logic required for a barebow-specific archery application. Based on the provided sources, barebow archery (particularly with string walking) introduces unique variables that standard archery apps often overlook, such as crawl distances, negative tiller, and dynamic spine shifts.

## Part 1: Data Tracking Requirements & Reasoning

To provide meaningful analysis, the app must track specific variables that influence the "Barebow Triangle": **Mechanical Execution**, **Aiming Fidelity (String Walking)**, and **Equipment Tuning**.

### A. Equipment Profile (Static Data)

| Data Field | Reasoning & Source Justification |
| :--- | :--- |
| **Draw Weight (OTF)** | "On The Fingers" weight differs from marked limb weight. Barebow tuning requires knowing the specific force applied to the arrow to calculate dynamic spine correctly. |
| **Draw Length (AMO & Actual)** | Essential for selecting the correct arrow spine. Barebow archers often use longer arrows for indoor shooting to reduce crawl distances. |
| **Tiller Setting** | Unlike Olympic recurve (positive tiller), barebow string walkers often require neutral or negative tiller (e.g., 1/8" to 1/4" negative) to compensate for the downward pressure placed on the bottom limb during a crawl. |
| **Nocking Point Height** | String walking changes the vertical force on the arrow. A higher nocking point (e.g., 1/2" to 3/4" high) is often required to prevent "nock low" flight caused by deep crawls. |
| **Plunger Tension** | The plunger is the primary tool for fine-tuning horizontal impact and compensating for the archer’s paradox. Recording specific click/turn settings allows the archer to adjust for different distances without aiming off. |
| **Brace Height** | Controls the timing of the arrow leaving the string. Even small changes affect dynamic spine and noise. |
| **Riser Weight Config** | Barebow requires adding weights to the riser for stability (since stabilizers are banned). Tracking weight distribution helps analyze how balance affects holding stability. |

### B. Arrow Configuration (The Projectile)

| Data Field | Reasoning & Source Justification |
| :--- | :--- |
| **Shaft Diameter** | Regulations differ. World Archery limits diameter to 9.3mm (approx 23/64"), while NFAA allows up to 0.422" (27/64"). Tracking this ensures the setup is legal for the specific event entered. |
| **Total Point Weight** | Barebow archers often use extremely heavy points (150–250+ grains) to weaken the arrow's dynamic spine and increase Front-of-Center (FOC) for stability. |
| **Arrow Length** | A longer arrow creates a weaker dynamic spine and reduces the crawl distance required for point-on aiming. |
| **Fletching Type** | Feathers are preferred for indoor (18m) due to forgiveness on rest contact; vanes (mylar/spin) are preferred for outdoor (50m) to reduce drag. |

### C. Shooting Variables (Dynamic Data)

| Data Field | Reasoning & Source Justification |
| :--- | :--- |
| **String Crawl** | The distance fingers move down the string. This is the barebow "sight." The app must link specific crawls (measured in mm or tab marks) to specific distances. |
| **Aiming Reference** | Whether the archer aims at the center (gold) or gaps (e.g., 6 o'clock ring). Changes in lighting or crawl can force an archer to change their visual hold. |
| **Bare Shaft Impact** | The relationship between bare and fletched arrows is the primary diagnostic tool for tuning. Tracking this over time shows if form or equipment is drifting. |

---

## Part 2: The "Setup Efficiency" Scoring Algorithm

Standard apps score based on where the arrow hits (10, 9, 8). However, a barebow app should score the efficiency and forgiveness of the setup. Based on the sources, here is a formulaic approach to scoring a "Setup Configuration."

### 1. The Stability Score (FOC & GPP Calculation)
This metric evaluates if the arrow is built correctly for the chosen discipline (Indoor vs. Outdoor).

*   **Formula Input:** Arrow Total Weight, Point Weight, Draw Weight (OTF).
*   **Logic:**
    *   Calculate GPP (Grains Per Pound): `Total Arrow Weight / Draw Weight`.
    *   Calculate FOC (Front of Center): (Use standard FOC formula).

**Scoring Criteria:**

*   **Indoor 18m Focus:**
    *   **High Score:** If GPP is 10–13 and FOC is 15–20%. Sources indicate this heavy, high-FOC setup maximizes forgiveness and stability for indoor barebow.
    *   **Low Score:** If GPP is < 8 or FOC is < 10% (too light/unstable for indoor) or FOC > 20% (critical release sensitivity).
*   **Outdoor 50m Focus:**
    *   **High Score:** GPP 7–9 (lighter for speed/trajectory) and FOC 10–15% using low-drag vanes (e.g., spin wings).

### 2. The Tune Status Score (Bareshaft Analysis)
This metric scores the bow's tune based on the user's input of bareshaft impact relative to the fletched group at 18m or 30m.

*   **Input:** Bareshaft impact coordinates relative to fletched group (e.g., "High Left").
*   **Logic:**
    *   **Perfect Score (100/100):** Bareshaft impacts within the fletched group.
    *   **Good Score (80/100):** Bareshaft impacts slightly stiff (Left for RH shooter) and slightly low. Sources suggest a slightly stiff/low tune is often more forgiving for finger shooters than a weak tune.
    *   **Critical Warning (0/100 - False Tune):** If the user reports "perfect grouping" at 18m but hasn't tested at 30m, the app should flag a "False Tune Risk." Sources warn that 18m bareshafting can be misleading; arrows may not have planed enough to show true flight.

### 3. The Crawl Optimization Score
This metric evaluates if the equipment is set up to minimize the difficulty of aiming (crawling).

*   **Input:** Arrow Length, Nock Height, Draw Weight.
*   **Logic:**
    *   **High Score:** If the setup results in a minimal crawl for the target distance. Shorter crawls reduce "arrow bounce" and stress on the bottom limb.
    *   **Recommendation Engine:** If the user reports a very deep crawl (e.g., > 5cm), the app should lower the Setup Score and recommend:
        1.  Increasing Arrow Length (weakens spine, raises point of impact).
        2.  Raising Nocking Point (flattens trajectory, reduces crawl).
        3.  Lowering Anchor Point.

---

## Part 3: Summary of Actionable Insights for the App

### User Flow Example:
1.  **User Input:** "I am shooting Indoor 18m. My arrows are Easton X23. My bare shafts hit 6 inches left."
2.  **App Analysis:**
    *   **Diagnosis:** Arrow is Dynamically Stiff.
    *   **Immediate Fix:** Decrease Plunger Tension.
    *   **Secondary Fix (Setup Score Improvement):** "Your arrow configuration is too stiff for your draw weight. To improve your 'Setup Score,' consider increasing point weight from 100gr to 150gr. This will weaken the spine and increase FOC, stabilizing the arrow faster for indoor distances".

### Safety Check Feature
The app should include a logic check for GPP (Grains Per Pound). If a user enters a setup that results in < 7 GPP, the app should issue a safety warning, as this can damage the bow and is generally unsafe, particularly for wooden bows or certain warranties.

By tracking these specific metrics, the application moves beyond simple scorekeeping and becomes a "Virtual Coach," helping the barebow archer navigate the complex relationship between string walking geometry, dynamic spine, and tournament regulations.
