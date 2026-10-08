"""add cohorts table; candidates.cohort_id; candidates.stream_id becomes nullable

Revision ID: 0003
Revises: 0002
Create Date: 2026-09-15

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "cohorts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("name", name="uq_cohorts_name"),
    )

    # Nullable at the DB level so existing candidate rows (created before
    # cohorts existed) don't break the migration. The API requires cohort_id
    # for every *new* candidate — see CandidateCreate in schemas/candidate.py.
    op.add_column("candidates", sa.Column("cohort_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_candidates_cohort_id", "candidates", "cohorts", ["cohort_id"], ["id"]
    )

    # A stream is now assigned partway through the bootcamp rather than at
    # candidate creation, so it can no longer be required.
    op.alter_column("candidates", "stream_id", existing_type=sa.Integer(), nullable=True)


def downgrade() -> None:
    op.alter_column("candidates", "stream_id", existing_type=sa.Integer(), nullable=False)
    op.drop_constraint("fk_candidates_cohort_id", "candidates", type_="foreignkey")
    op.drop_column("candidates", "cohort_id")
    op.drop_table("cohorts")