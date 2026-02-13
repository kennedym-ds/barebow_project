from src.park_model import calculate_expected_score, calculate_sigma_from_score, predict_score_at_distance


def test_perfect_score_sigma():
    # A perfect score (10.0 average) should have near 0 sigma
    sigma = calculate_sigma_from_score(10.0, 122)
    assert sigma == 0.0


def test_sigma_score_round_trip():
    # If we have a sigma of 5cm on a 122cm face, we should get a score.
    # If we feed that score back, we should get 5cm.
    face = 122
    original_sigma = 5.0

    score = calculate_expected_score(original_sigma, face)
    calculated_sigma = calculate_sigma_from_score(score, face)

    assert abs(original_sigma - calculated_sigma) < 0.01


def test_prediction_logic():
    # If I shoot 9.0 average at 18m (40cm face),
    # I should shoot worse at 50m (122cm face) due to angular expansion?
    # Actually 18m/40cm is roughly equivalent to 50m/122cm in angular terms.
    # 40cm / 18m = 2.22 cm/m
    # 122cm / 50m = 2.44 cm/m
    # So 50m target is actually "larger" angularly. Score should be slightly higher or similar.

    score_18m = 9.0
    pred_50m, _ = predict_score_at_distance(score_18m, 18, 40, 50, 122)

    # Let's check the math manually roughly
    # Sigma at 18m for 9.0 score.
    # 9.0 is a good score.
    # Sigma_theta should be constant.

    # If distances were scaled perfectly with face size:
    # 18m -> 40cm
    # 54m -> 120cm
    # So at 54m on 120cm face, score should be identical to 18m on 40cm.

    pred_54m, _ = predict_score_at_distance(score_18m, 18, 40, 54, 120)
    assert abs(pred_54m - score_18m) < 0.1  # Should be very close


def test_drag_loss_scenario():
    # User shoots 270/300 (9.0 avg) at 18m.
    # User shoots 200/300 (6.6 avg) at 50m (122cm).
    # This is a massive drop.

    score_18 = 9.0
    score_50 = 6.6

    # Prediction should be much higher than 6.6
    pred_50, _ = predict_score_at_distance(score_18, 18, 40, 50, 122)

    assert pred_50 > score_50
