"""
Candidate bulk-import from spreadsheet (.xlsx / .csv) or .pdf documents.

Spreadsheet: expects a header row with columns (case-insensitive, any
order): "Candidate ID", "First Name", "Last Name", "Stream" (required),
and "Email" (optional) — same header style as the existing score-sheet
Excel upload.

PDF: expects the same columns laid out as a table on the page (extracted
via pdfplumber). Only the first table found is read; for multi-page
candidate lists, a spreadsheet import is more reliable.

Validation mirrors excel_service.py: any row error rejects the whole
file — no partial saves. Returns (valid_rows, errors) where valid_rows
are dicts ready to construct Candidate objects, and errors are
{"row": <1-indexed, header = row 1>, "message": str}.
"""

import io

import pandas as pd
import pdfplumber
from sqlalchemy.orm import Session

from app.models.candidate import Candidate
from app.models.stream import Stream

REQUIRED_COLUMNS = ["Candidate ID", "First Name", "Last Name", "Stream"]


class CandidateDocumentStructureError(Exception):
    """Raised when the file itself is unreadable, has no table, or is missing required columns."""


def validate_and_parse(file_bytes: bytes, filename: str, db: Session) -> tuple[list[dict], list[dict]]:
    lower_name = filename.lower()
    if lower_name.endswith(".xlsx"):
        table = _extract_spreadsheet_table(file_bytes, engine="openpyxl")
    elif lower_name.endswith(".csv"):
        table = _extract_spreadsheet_table(file_bytes, engine=None)
    elif lower_name.endswith(".pdf"):
        table = _extract_pdf_table(file_bytes)
    else:
        raise CandidateDocumentStructureError("Unsupported file type — use .xlsx, .csv, or .pdf")

    if not table or len(table) < 2:
        raise CandidateDocumentStructureError(
            "No table with candidate data was found in the file (need a header row plus at least one data row)."
        )

    header = [str(cell or "").strip() for cell in table[0]]
    header_index = {name.lower(): i for i, name in enumerate(header)}

    missing_columns = [col for col in REQUIRED_COLUMNS if col.lower() not in header_index]
    if missing_columns:
        raise CandidateDocumentStructureError(f"Missing required column(s): {', '.join(missing_columns)}")

    email_idx = header_index.get("email")

    streams_by_name = {s.name.strip().lower(): s for s in db.query(Stream).all()}
    existing_codes = {c.candidate_code.strip().lower() for c in db.query(Candidate).all()}

    errors: list[dict] = []
    valid_rows: list[dict] = []
    seen_codes_in_file: set[str] = set()

    for offset, raw_row in enumerate(table[1:]):
        row_number = offset + 2  # +1 for 1-indexing, +1 because row 1 is the header

        row = list(raw_row) + [None] * (len(header) - len(raw_row))

        code_raw = row[header_index["candidate id"]]
        first_raw = row[header_index["first name"]]
        last_raw = row[header_index["last name"]]
        stream_raw = row[header_index["stream"]]
        email_raw = row[email_idx] if email_idx is not None else None

        if _is_empty(code_raw) and _is_empty(first_raw) and _is_empty(last_raw) and _is_empty(stream_raw):
            continue  # skip fully blank rows

        if _is_empty(code_raw):
            errors.append(_err(row_number, "Empty required value: Candidate ID"))
            continue
        candidate_code = str(code_raw).strip()

        if _is_empty(first_raw):
            errors.append(_err(row_number, "Empty required value: First Name"))
            continue
        if _is_empty(last_raw):
            errors.append(_err(row_number, "Empty required value: Last Name"))
            continue
        if _is_empty(stream_raw):
            errors.append(_err(row_number, "Empty required value: Stream"))
            continue

        code_key = candidate_code.lower()
        if code_key in seen_codes_in_file:
            errors.append(_err(row_number, f"Duplicate candidate in file: {candidate_code}"))
            continue
        seen_codes_in_file.add(code_key)

        if code_key in existing_codes:
            errors.append(_err(row_number, f"Candidate ID already exists: {candidate_code}"))
            continue

        stream = streams_by_name.get(str(stream_raw).strip().lower())
        if stream is None:
            errors.append(_err(row_number, f"Invalid stream: {stream_raw}"))
            continue

        email_value = str(email_raw).strip() if not _is_empty(email_raw) else None

        valid_rows.append(
            {
                "candidate_code": candidate_code,
                "first_name": str(first_raw).strip(),
                "last_name": str(last_raw).strip(),
                "email": email_value,
                "stream_id": stream.id,
            }
        )

    return valid_rows, errors


def _extract_spreadsheet_table(file_bytes: bytes, engine: str | None) -> list[list]:
    try:
        if engine == "openpyxl":
            df = pd.read_excel(io.BytesIO(file_bytes), engine=engine)
        else:
            df = pd.read_csv(io.BytesIO(file_bytes))
    except Exception as exc:  # noqa: BLE001
        raise CandidateDocumentStructureError(f"Could not read the file: {exc}") from exc

    header = list(df.columns)
    rows = df.to_dict(orient="split")["data"]
    return [header] + rows


def _extract_pdf_table(file_bytes: bytes) -> list[list] | None:
    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                tables = page.extract_tables()
                if tables:
                    return tables[0]
    except Exception as exc:  # noqa: BLE001
        raise CandidateDocumentStructureError(f"Could not read the PDF file: {exc}") from exc
    return None


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
