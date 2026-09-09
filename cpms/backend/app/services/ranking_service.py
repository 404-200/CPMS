"""
Ranking logic: sorting by overall average, assigning ranks (standard
"competition ranking" — ties share a rank, next rank skips), and
identifying the highest, lowest, and median performer(s), handling ties
in all three per the spec.

Every function here works on plain dicts/lists of dicts (each dict must
have at least "overall_average" plus whatever identifying fields the
caller wants echoed back) so this stays independent of the ORM and is
easy to unit test.
"""

import statistics


def assign_rankings(candidates: list[dict]) -> list[dict]:
    """
    Returns a new list, sorted by overall_average descending, with a
    "ranking" key added to each dict. Ties share the same rank; the next
    distinct score resumes at its 1-indexed position (1, 1, 3, 4, ...).
    """
    ordered = sorted(candidates, key=lambda c: c["overall_average"], reverse=True)

    ranked = []
    current_rank = 0
    previous_score = None
    for index, candidate in enumerate(ordered, start=1):
        score = candidate["overall_average"]
        if score != previous_score:
            current_rank = index
            previous_score = score
        ranked.append({**candidate, "ranking": current_rank})
    return ranked


def find_highest(ranked_candidates: list[dict]) -> list[dict]:
    """All candidates sharing rank 1 (handles ties)."""
    if not ranked_candidates:
        return []
    return [c for c in ranked_candidates if c["ranking"] == 1]


def find_lowest(ranked_candidates: list[dict]) -> list[dict]:
    """All candidates sharing the worst (highest-numbered) rank (handles ties)."""
    if not ranked_candidates:
        return []
    worst_rank = max(c["ranking"] for c in ranked_candidates)
    return [c for c in ranked_candidates if c["ranking"] == worst_rank]


def find_median(ranked_candidates: list[dict]) -> tuple[list[dict], float]:
    """
    Returns (candidates closest to the median score, median value).
    With an odd count there's an exact median score, so ties there return
    every candidate at that exact score. With an even count the median is
    the average of the two middle scores, so this returns the candidate(s)
    whose score is closest to that value (there may be more than one if
    several candidates are equally close).
    """
    if not ranked_candidates:
        return [], 0.0

    scores = sorted((c["overall_average"] for c in ranked_candidates), reverse=False)
    median_value = round(statistics.median(scores), 2)

    closest_distance = min(abs(c["overall_average"] - median_value) for c in ranked_candidates)
    closest = [
        c for c in ranked_candidates if abs(c["overall_average"] - median_value) == closest_distance
    ]
    return closest, median_value
