from app.services.ranking_service import assign_rankings, find_highest, find_lowest, find_median


def make_candidates(scores):
    return [{"id": i, "overall_average": s} for i, s in enumerate(scores, start=1)]


def test_assign_rankings_no_ties():
    candidates = make_candidates([70, 90, 80])
    ranked = assign_rankings(candidates)
    ranks_by_id = {c["id"]: c["ranking"] for c in ranked}
    assert ranks_by_id == {2: 1, 3: 2, 1: 3}


def test_assign_rankings_with_ties_skips_next_rank():
    candidates = make_candidates([90, 90, 80])
    ranked = assign_rankings(candidates)
    ranks_by_id = {c["id"]: c["ranking"] for c in ranked}
    # Both 90s share rank 1; the 80 gets rank 3, not 2.
    assert ranks_by_id == {1: 1, 2: 1, 3: 3}


def test_find_highest_single():
    ranked = assign_rankings(make_candidates([70, 90, 80]))
    highest = find_highest(ranked)
    assert len(highest) == 1
    assert highest[0]["overall_average"] == 90


def test_find_highest_handles_ties():
    ranked = assign_rankings(make_candidates([90, 90, 80]))
    highest = find_highest(ranked)
    assert len(highest) == 2
    assert all(c["overall_average"] == 90 for c in highest)


def test_find_lowest_handles_ties():
    ranked = assign_rankings(make_candidates([70, 70, 90]))
    lowest = find_lowest(ranked)
    assert len(lowest) == 2
    assert all(c["overall_average"] == 70 for c in lowest)


def test_find_median_odd_count():
    ranked = assign_rankings(make_candidates([60, 70, 80]))
    median_candidates, median_value = find_median(ranked)
    assert median_value == 70
    assert len(median_candidates) == 1
    assert median_candidates[0]["overall_average"] == 70


def test_find_median_even_count_closest_candidate():
    # scores 60, 70, 80, 90 -> median value = 75, closest score is 70 or 80 (tie)
    ranked = assign_rankings(make_candidates([60, 70, 80, 90]))
    median_candidates, median_value = find_median(ranked)
    assert median_value == 75
    assert {c["overall_average"] for c in median_candidates} == {70, 80}


def test_empty_list_handled_gracefully():
    assert assign_rankings([]) == []
    assert find_highest([]) == []
    assert find_lowest([]) == []
    assert find_median([]) == ([], 0.0)
