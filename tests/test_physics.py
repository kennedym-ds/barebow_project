from src.physics import calculate_foc


def test_calculate_foc_standard():
    # Example:
    # Arrow Length: 30"
    # Point: 150gr
    # Nock: 10gr
    # Fletch: 15gr
    # Total: 450gr
    # Shaft: 450 - 150 - 10 - 15 = 275gr

    # Moments:
    # Nock: 0
    # Fletch: 15 * 1.5 = 22.5
    # Shaft: 275 * 15 = 4125
    # Point: 150 * 30 = 4500
    # Total Moment: 8647.5

    # CG = 8647.5 / 450 = 19.216 inches from nock

    # FOC = (19.216 - 15) / 30 = 4.216 / 30 = 0.1405 => 14.1%

    foc = calculate_foc(30, 150, 450, 10, 15)
    assert abs(foc - 14.1) < 0.2


def test_calculate_foc_high():
    # Heavy point
    # Arrow Length: 30"
    # Point: 250gr
    # Nock: 10gr
    # Fletch: 15gr
    # Total: 550gr
    # Shaft: 275gr

    foc = calculate_foc(30, 250, 550, 10, 15)
    # CG calculation:
    # Shaft: 275*15 = 4125
    # Point: 250*30 = 7500
    # Fletch: 22.5
    # Total M: 11647.5
    # CG: 11647.5 / 550 = 21.177
    # FOC: (21.177 - 15) / 30 = 6.177 / 30 = 0.2059 => 20.6%

    assert abs(foc - 20.6) < 0.2


def test_calculate_foc_zero():
    assert calculate_foc(0, 0, 0) == 0.0
