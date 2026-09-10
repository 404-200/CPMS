from app.services.calculation_service import (
    calculate_all,
    calculate_monthly_average,
    calculate_overall_average,
    calculate_tdc_average,
    calculate_tech_average,
)


def test_tdc_average():
    assert calculate_tdc_average(80, 90, 70) == 80.0


def test_tech_average():
    assert calculate_tech_average(85, 95, 75) == 85.0


def test_overall_average():
    assert calculate_overall_average(80, 90) == 85.0


def test_rounding_to_two_decimal_places():
    # (70 + 71 + 72) / 3 = 71.0 exactly, so use values that don't divide evenly
    assert calculate_tdc_average(70, 71, 73) == 71.33


def test_calculate_all_returns_all_three_averages():
    result = calculate_all(
        communication=80,
        attendance=90,
        accountability=70,
        project_delivery=85,
        tech_skills=95,
        creativity=75,
    )
    assert result == {"tdc_average": 80.0, "tech_average": 85.0, "overall_average": 82.5}


def test_monthly_average():
    assert calculate_monthly_average(80.0, 90.0) == 85.0


def test_monthly_average_rounds():
    assert calculate_monthly_average(70.5, 71.2) == 70.85
