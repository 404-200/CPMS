"""
Excel score sheet validation and parsing.

Reads the uploaded .xlsx into a DataFrame, checks structure (required
columns) and per-row data quality (missing values, unknown candidates,
invalid streams, non-numeric or out-of-range scores, duplicate candidates
within the file), and returns clean rows plus a list of row-level errors.
The caller decides whether "any errors -> reject the whole file" (per the
spec: no partial saves on critical validation errors).
"""

import io

import pandas as pd
from sqlalchemy.orm import Session

from app.models.candidate import Candidate
from app.models.stream import Stream

REQUIRED_COLUMNS = [
    "Candidate ID",
    "Candidate Name",
    "Stream",
    "Communication",
    "Attendance",
    "Accountability",
    "Project Delivery",
    "Tech Skills",
    "Creativity",
]

SCORE_COLUMNS = [
    "Communication",
    "Attendance",
    "Accountability",
    "Project Delivery",
    "Tech Skills",
    "Creativity",
]

# Optional — if present in the sheet they're captured, but a missing column
# (or blank cell) never rejects the row, unlike SCORE_COLUMNS above.
OPTIONAL_TEXT_COLUMNS = {
    "Dev Group": "dev_group_name",
    "Weekly Feedback": "weekly_feedback",
    "Action Plan": "action_plan",
}

MIN_SCORE = 0
MAX_SCORE = 100


class ExcelStructureError(Exception):
    """Raised when the file itself is unreadable or missing required columns."""


def validate_and_parse(file_bytes: bytes, db: Session) -> tuple[list[dict], list[dict]]:
    """
    Returns (valid_rows, errors).

    valid_rows: list of dicts with candidate_id (DB pk), candidate_code,
    and the six numeric scores — ready to persist.
    errors: list of {"row": <1-indexed row number, header = row 1>, "message": str}
    """
    try:
        df = pd.read_excel(io.BytesIO(file_bytes), engine="openpyxl")
    except Exception as exc:  # noqa: BLE001
        raise ExcelStructureError(f"Could not read the Excel file: {exc}") from exc

    missing_columns = [col for col in REQUIRED_COLUMNS if col not in df.columns]
    if missing_columns:
        raise ExcelStructureError(f"Missing required column(s): {', '.join(missing_columns)}")

    streams_by_name = {s.name.strip().lower(): s for s in db.query(Stream).all()}
    candidates_by_code = {c.candidate_code.strip().lower(): c for c in db.query(Candidate).all()}

    errors: list[dict] = []
    valid_rows: list[dict] = []
    seen_codes_in_file: set[str] = set()

    for offset, row in enumerate(df.to_dict(orient="records")):
        row_number = offset + 2  # +1 for 1-indexing, +1 because row 1 is the header

        candidate_code_raw = row.get("Candidate ID")
        stream_raw = row.get("Stream")

        if _is_empty(candidate_code_raw):
            errors.append(_err(row_number, "Empty required value: Candidate ID"))
            continue
        candidate_code = str(candidate_code_raw).strip()

        if _is_empty(stream_raw):
            errors.append(_err(row_number, "Empty required value: Stream"))
            continue

        code_key = candidate_code.lower()
        if code_key in seen_codes_in_file:
            errors.append(_err(row_number, f"Duplicate candidate in file: {candidate_code}"))
            continue
        seen_codes_in_file.add(code_key)

        candidate = candidates_by_code.get(code_key)
        if candidate is None:
            errors.append(_err(row_number, f"Candidate ID does not exist: {candidate_code}"))
            continue

        stream = streams_by_name.get(str(stream_raw).strip().lower())
        if stream is None:
            errors.append(_err(row_number, f"Invalid stream: {stream_raw}"))
            continue
        if stream.id != candidate.stream_id:
            errors.append(
                _err(
                    row_number,
                    f"Stream '{stream_raw}' does not match candidate {candidate_code}'s assigned stream",
                )
            )
            continue

        row_scores: dict[str, float] = {}
        row_has_score_error = False
        for col in SCORE_COLUMNS:
            raw_value = row.get(col)
            if _is_empty(raw_value):
                errors.append(_err(row_number, f"Empty required value: {col}"))
                row_has_score_error = True
                continue
            try:
                score = float(raw_value)
            except (TypeError, ValueError):
                errors.append(_err(row_number, f"Invalid score: {col} must be numeric"))
                row_has_score_error = True
                continue
            if score < MIN_SCORE or score > MAX_SCORE:
                errors.append(
                    _err(row_number, f"Score outside the allowed range (0-100): {col} = {score}")
                )
                row_has_score_error = True
                continue
            row_scores[col] = score

        if row_has_score_error:
            continue

        row_out = {
            "candidate_id": candidate.id,
            "candidate_code": candidate.candidate_code,
            "communication": row_scores["Communication"],
            "attendance": row_scores["Attendance"],
            "accountability": row_scores["Accountability"],
            "project_delivery": row_scores["Project Delivery"],
            "tech_skills": row_scores["Tech Skills"],
            "creativity": row_scores["Creativity"],
        }
        for column, field in OPTIONAL_TEXT_COLUMNS.items():
            if column in df.columns and not _is_empty(row.get(column)):
                row_out[field] = str(row.get(column)).strip()

        valid_rows.append(row_out)

    return valid_rows, errors


def _is_empty(value) -> bool:
    if value is None:
        return True
    if isinstance(value, float) and pd.isna(value):
        return True
    if isinstance(value, str) and value.strip() == "":
        return True
    return False


def _err(row: int, message: str) -> dict:
    return {"row": row, "message": message}
