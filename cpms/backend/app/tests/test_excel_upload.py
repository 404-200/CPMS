import io

import openpyxl
import pytest

from app.services.excel_service import REQUIRED_COLUMNS, ExcelStructureError, validate_and_parse

VALID_ROW = ["C001", "Jane Doe", "Software Development", 80, 90, 70, 85, 95, 75]


def make_xlsx(rows: list[list], columns: list[str] = REQUIRED_COLUMNS) -> bytes:
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(columns)
    for row in rows:
        ws.append(row)
    buffer = io.BytesIO()
    wb.save(buffer)
    return buffer.getvalue()


def test_valid_row_parses_cleanly(db_session):
    file_bytes = make_xlsx([VALID_ROW])
    valid_rows, errors = validate_and_parse(file_bytes, db_session)
    assert errors == []
    assert len(valid_rows) == 1
    assert valid_rows[0]["candidate_code"] == "C001"
    assert valid_rows[0]["communication"] == 80


def test_missing_required_column_raises_structure_error(db_session):
    columns = [c for c in REQUIRED_COLUMNS if c != "Accountability"]
    file_bytes = make_xlsx([], columns=columns)
    with pytest.raises(ExcelStructureError, match="Accountability"):
        validate_and_parse(file_bytes, db_session)


def test_unknown_candidate_id(db_session):
    row = ["C999", "Nobody", "Software Development", 80, 90, 70, 85, 95, 75]
    file_bytes = make_xlsx([row])
    valid_rows, errors = validate_and_parse(file_bytes, db_session)
    assert valid_rows == []
    assert any("does not exist" in e["message"] for e in errors)


def test_invalid_stream(db_session):
    row = ["C001", "Jane Doe", "Underwater Basket Weaving", 80, 90, 70, 85, 95, 75]
    file_bytes = make_xlsx([row])
    valid_rows, errors = validate_and_parse(file_bytes, db_session)
    assert valid_rows == []
    assert any("Invalid stream" in e["message"] for e in errors)


def test_duplicate_candidate_in_file(db_session):
    file_bytes = make_xlsx([VALID_ROW, VALID_ROW])
    valid_rows, errors = validate_and_parse(file_bytes, db_session)
    assert len(valid_rows) == 1
    assert any("Duplicate candidate" in e["message"] for e in errors)


def test_invalid_non_numeric_score(db_session):
    row = ["C001", "Jane Doe", "Software Development", "not-a-number", 90, 70, 85, 95, 75]
    file_bytes = make_xlsx([row])
    valid_rows, errors = validate_and_parse(file_bytes, db_session)
    assert valid_rows == []
    assert any("Invalid score" in e["message"] for e in errors)


def test_score_out_of_range(db_session):
    row = ["C001", "Jane Doe", "Software Development", 150, 90, 70, 85, 95, 75]
    file_bytes = make_xlsx([row])
    valid_rows, errors = validate_and_parse(file_bytes, db_session)
    assert valid_rows == []
    assert any("outside the allowed range" in e["message"] for e in errors)


def test_empty_required_value(db_session):
    row = ["C001", "Jane Doe", "Software Development", None, 90, 70, 85, 95, 75]
    file_bytes = make_xlsx([row])
    valid_rows, errors = validate_and_parse(file_bytes, db_session)
    assert valid_rows == []
    assert any("Empty required value" in e["message"] for e in errors)
