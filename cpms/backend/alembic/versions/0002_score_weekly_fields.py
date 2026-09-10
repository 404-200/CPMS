"""score weekly fields: dev group, feedback, action plan, manual entry support

Revision ID: 0002
Revises: 0001
Create Date: 2026-09-10

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

commitment_type_enum = sa.Enum("INDIVIDUAL", "GROUP", name="commitmenttype")


def upgrade() -> None:
    bind = op.get_bind()
    commitment_type_enum.create(bind, checkfirst=True)

    # Manual score entries aren't tied to a file upload.
    op.alter_column("candidate_scores", "upload_id", existing_type=sa.Integer(), nullable=True)

    op.add_column("candidate_scores", sa.Column("dev_group_name", sa.String(length=120), nullable=True))
    op.add_column("candidate_scores", sa.Column("weekly_feedback", sa.Text(), nullable=True))
    op.add_column("candidate_scores", sa.Column("action_plan", sa.Text(), nullable=True))
    op.add_column(
        "candidate_scores",
        sa.Column("commitment_type", commitment_type_enum, nullable=True),
    )


def downgrade() -> None:
    op.drop_column("candidate_scores", "commitment_type")
    op.drop_column("candidate_scores", "action_plan")
    op.drop_column("candidate_scores", "weekly_feedback")
    op.drop_column("candidate_scores", "dev_group_name")
    op.alter_column("candidate_scores", "upload_id", existing_type=sa.Integer(), nullable=False)

    bind = op.get_bind()
    commitment_type_enum.drop(bind, checkfirst=True)
