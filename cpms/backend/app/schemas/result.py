from pydantic import BaseModel


class CandidateResultOut(BaseModel):
    candidate_id: int
    candidate_code: str
    candidate_name: str
    stream_id: int
    stream_name: str
    tdc_average: float
    tech_average: float
    overall_average: float
    ranking: int


class StreamAverageOut(BaseModel):
    stream_id: int
    stream_name: str
    tdc_average: float
    tech_average: float
    overall_average: float
    candidate_count: int


class RankingSummary(BaseModel):
    highest: list[CandidateResultOut]
    lowest: list[CandidateResultOut]
    median: list[CandidateResultOut]
    median_value: float


class BiweeklyResultsOut(BaseModel):
    period_id: int
    results: list[CandidateResultOut]
    stream_averages: list[StreamAverageOut]
    ranking_summary: RankingSummary


class MonthlyCandidateResultOut(BaseModel):
    candidate_id: int
    candidate_code: str
    candidate_name: str
    stream_id: int
    stream_name: str
    monthly_tdc_average: float
    monthly_tech_average: float
    monthly_overall_average: float
    ranking: int


class MonthlyResultsOut(BaseModel):
    month: int
    year: int
    complete: bool
    message: str | None = None
    biweekly_period_ids: list[int]
    results: list[MonthlyCandidateResultOut] = []
