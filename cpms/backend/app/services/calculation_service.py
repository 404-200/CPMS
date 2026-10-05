"""
Pure calculation functions for candidate scoring. Kept free of DB/ORM
concerns so they're trivial to unit test (see app/tests/test_calculations.py).

Each of communication, attendance, accountability, project_delivery,
tech_skills, and creativity is entered on a 1-5 scale. TDC and Tech are
each the sum of their three scores out of a possible 15, shown as a
percentage - e.g. (5+4+3)/15*100 = 80.0 - matching how the mentor's
original scorecard reports every number (TDC%, Tech%, Overall%).
"""


def calculate_tdc_average(communication: float, attendance: float, accountability: float) -> float:
    return round((communication + attendance + accountability) / 15 * 100, 2)


def calculate_tech_average(project_delivery: float, tech_skills: float, creativity: float) -> float:
    return round((project_delivery + tech_skills + creativity) / 15 * 100, 2)


def calculate_overall_average(tdc_average: float, tech_average: float) -> float:
    return round((tdc_average + tech_average) / 2, 2)


def calculate_all(
    communication: float,
    attendance: float,
    accountability: float,
    project_delivery: float,
    tech_skills: float,
    creativity: float,
) -> dict:
    """Convenience helper returning all three averages for one candidate's scores."""
    tdc = calculate_tdc_average(communication, attendance, accountability)
    tech = calculate_tech_average(project_delivery, tech_skills, creativity)
    overall = calculate_overall_average(tdc, tech)
    return {"tdc_average": tdc, "tech_average": tech, "overall_average": overall}


def calculate_monthly_average(biweekly_1: float, biweekly_2: float) -> float:
    return round((biweekly_1 + biweekly_2) / 2, 2)