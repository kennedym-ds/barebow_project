"""Seed fake 18m session data into baretrack.db.

Creates 6 sessions of WA 18m Indoor (10 ends × 3 arrows = 30 arrows)
with realistic scores around 255/300 (avg ~8.5 per arrow).
Shot coordinates use a bivariate normal distribution centred slightly
off-centre (simulating mild left-low bias).
"""

import math
import random
import uuid
from datetime import datetime, timedelta

from sqlmodel import Session, select, delete
from src.db import engine, create_db_and_tables
from src.models import (
    BowSetup, ArrowSetup, Session as SessionModel, End, Shot, ArrowShaft,
)

random.seed(42)

# ── WA target geometry (40 cm face) ──────────────────────
# Ring radii in cm (centre-of-ring boundary), WA 10-zone
RING_RADII_CM = [2.0, 4.0, 6.0, 8.0, 10.0, 12.0, 14.0, 16.0, 18.0, 20.0]
X_RADIUS_CM = 1.0  # inner X
FACE_RADIUS_CM = 20.0


def score_from_coords(x_cm: float, y_cm: float) -> tuple[int, bool]:
    """Return (score, is_x) from coordinates in cm from centre."""
    r = math.sqrt(x_cm ** 2 + y_cm ** 2)
    if r <= X_RADIUS_CM:
        return 10, True
    for ring_idx, boundary in enumerate(RING_RADII_CM):
        if r <= boundary:
            return 10 - ring_idx, False
    return 0, False  # miss


def generate_shot(sigma: float, bias_x: float = 0.0, bias_y: float = 0.0):
    """Generate a single shot with bivariate normal distribution."""
    x = random.gauss(bias_x, sigma)
    y = random.gauss(bias_y, sigma)
    score, is_x = score_from_coords(x, y)
    return x, y, score, is_x


def main():
    create_db_and_tables()

    with Session(engine) as db:
        # ── Clear all existing sessions, ends, shots ──
        db.exec(delete(Shot))
        db.exec(delete(End))
        db.exec(delete(SessionModel))
        db.commit()
        print("Cleared existing session data.")

        # ── Ensure we have a bow and arrow profile ──
        bow = db.exec(select(BowSetup)).first()
        arrow = db.exec(select(ArrowSetup)).first()

        if not bow:
            bow = BowSetup(
                name="Gillo GQ 25",
                riser_make="Gillo", riser_model="GQ 25", riser_length_in=25,
                limbs_make="WNS", limbs_model="Axiom Alpha", limbs_length="Medium",
                limbs_marked_poundage=34,
                draw_weight_otf=32.5,
                brace_height_in=8.25,
                tiller_top_mm=3.0, tiller_bottom_mm=0.0, tiller_type="positive",
                plunger_spring_tension=3.0, plunger_center_shot_mm=0.5,
                nocking_point_height_mm=6.0,
                total_mass_g=1350,
                string_material="BCY-X", strand_count=16,
            )
            db.add(bow)
            db.commit()
            db.refresh(bow)
            print(f"Created bow: {bow.name}")

        if not arrow:
            arrow = ArrowSetup(
                make="Easton", model="ACE", spine=620,
                length_in=28.5, point_weight_gr=100, total_arrow_weight_gr=285,
                shaft_diameter_mm=5.2,
                fletching_type="Spin Wing", nock_type="Pin",
                arrow_count=12,
            )
            db.add(arrow)
            db.commit()
            db.refresh(arrow)
            print(f"Created arrow: {arrow.make} {arrow.model}")

        # ── Generate 6 sessions spread over ~3 weeks ──
        # Vary sigma slightly session-to-session to simulate real improvement
        session_configs = [
            {"days_ago": 21, "sigma": 3.2, "bias_x": -0.8, "bias_y": -0.5},
            {"days_ago": 17, "sigma": 3.1, "bias_x": -0.7, "bias_y": -0.4},
            {"days_ago": 14, "sigma": 3.0, "bias_x": -0.6, "bias_y": -0.3},
            {"days_ago": 10, "sigma": 2.9, "bias_x": -0.5, "bias_y": -0.3},
            {"days_ago": 6,  "sigma": 2.8, "bias_x": -0.4, "bias_y": -0.2},
            {"days_ago": 2,  "sigma": 2.7, "bias_x": -0.3, "bias_y": -0.2},
        ]

        for cfg in session_configs:
            sess_date = datetime.now() - timedelta(days=cfg["days_ago"])
            session = SessionModel(
                date=sess_date,
                bow_id=bow.id,
                arrow_id=arrow.id,
                round_type="WA 18m Indoor",
                target_face_size_cm=40,
                distance_m=18,
                notes="Seed data",
            )
            db.add(session)
            db.commit()
            db.refresh(session)

            session_score = 0
            arrow_nums = list(range(1, 13))  # 12-arrow quiver

            for end_num in range(1, 11):  # 10 ends
                end = End(
                    session_id=session.id,
                    end_number=end_num,
                )
                db.add(end)
                db.commit()
                db.refresh(end)

                # Pick 3 arrows for this end
                end_arrows = random.sample(arrow_nums, 3)

                for arrow_num in sorted(end_arrows):
                    # First arrow in end has slightly higher sigma (cold shot)
                    shot_sigma = cfg["sigma"] * 1.15 if arrow_num == end_arrows[0] else cfg["sigma"]
                    x, y, score, is_x = generate_shot(
                        sigma=shot_sigma,
                        bias_x=cfg["bias_x"],
                        bias_y=cfg["bias_y"],
                    )
                    shot = Shot(
                        end_id=end.id,
                        score=score,
                        is_x=is_x,
                        x=round(x, 3),
                        y=round(y, 3),
                        arrow_number=arrow_num,
                    )
                    db.add(shot)
                    session_score += score

                db.commit()

            print(f"Session {sess_date.strftime('%Y-%m-%d')}: {session_score}/300 "
                  f"(avg {session_score/30:.2f}) σ={cfg['sigma']}")

    print("\nDone! 6 sessions seeded.")


if __name__ == "__main__":
    main()
