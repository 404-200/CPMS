"""add cohorts table; candidates.cohort_id; candidates.stream_id becomes nullable

Revision ID: 0004
Revises: 0003
Create Date: 2026-10-21

This used to be a second "0003" that branched off 0002 next to the password
reset migration. It now comes after it. Each step checks whether it has
already been applied, because at least one database ran the earlier version
of this migration before the renumbering.

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())

    if "cohorts" not in inspector.get_table_names():
        op.create_table(
            "cohorts",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("name", sa.String(length=100), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.UniqueConstraint("name", name="uq_cohorts_name"),
        )

    # Nullable at the DB level so existing candidate rows (created before
    # cohorts existed) don't break the migration. The API requires cohort_id
    # for every *new* candidate - see CandidateCreate in schemas/candidate.py.
    candidate_columns = {column["name"] for column in inspector.get_columns("candidates")}
    if "cohort_id" not in candidate_columns:
        op.add_column("candidates", sa.Column("cohort_id", sa.Integer(), nullable=True))

    foreign_keys = {fk["name"] for fk in inspector.get_foreign_keys("candidates")}
    if "fk_candidates_cohort_id" not in foreign_keys:
        op.create_foreign_key(
            "fk_candidates_cohort_id", "candidates", "cohorts", ["cohort_id"], ["id"]
        )

    # A stream is now assigned partway through the bootcamp rather than at
    # candidate creation, so it can no longer be required. (Safe to repeat.)
    op.alter_column("candidates", "stream_id", existing_type=sa.Integer(), nullable=True)


def downgrade() -> None:
    op.alter_column("candidates", "stream_id", existing_type=sa.Integer(), nullable=False)
    op.drop_constraint("fk_candidates_cohort_id", "candidates", type_="foreignkey")
    op.drop_column("candidates", "cohort_id")
    op.drop_table("cohorts")