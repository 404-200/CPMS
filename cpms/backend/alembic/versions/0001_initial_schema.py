"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-09-04

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

user_role_enum = sa.Enum("ADMIN", "MANAGER", "VIEWER", name="userrole")
period_type_enum = sa.Enum("BIWEEKLY", "MONTHLY", name="periodtype")
period_status_enum = sa.Enum("OPEN", "CLOSED", name="periodstatus")
upload_status_enum = sa.Enum("PENDING", "SUCCESS", "FAILED", name="uploadstatus")


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", user_role_enum, nullable=False, server_default="VIEWER"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "streams",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=100), nullable=False, unique=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "candidates",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("candidate_code", sa.String(length=50), nullable=False, unique=True),
        sa.Column("first_name", sa.String(length=100), nullable=False),
        sa.Column("last_name", sa.String(length=100), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("stream_id", sa.Integer(), sa.ForeignKey("streams.id"), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_candidates_candidate_code", "candidates", ["candidate_code"], unique=True)

    op.create_table(
        "scoring_periods",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("period_type", period_type_enum, nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("month", sa.Integer(), nullable=False),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("status", period_status_enum, nullable=False, server_default="OPEN"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("period_type", "start_date", "end_date", name="uq_period_window"),
    )

    op.create_table(
        "score_sheet_uploads",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("storage_path", sa.String(length=500), nullable=True),
        sa.Column("uploaded_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("uploaded_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("period_id", sa.Integer(), sa.ForeignKey("scoring_periods.id"), nullable=False),
        sa.Column("status", upload_status_enum, nullable=False, server_default="PENDING"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("error_message", sa.Text(), nullable=True),
    )

    op.create_table(
        "candidate_scores",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id"), nullable=False),
        sa.Column("period_id", sa.Integer(), sa.ForeignKey("scoring_periods.id"), nullable=False),
        sa.Column("upload_id", sa.Integer(), sa.ForeignKey("score_sheet_uploads.id"), nullable=False),
        sa.Column("communication", sa.Float(), nullable=False),
        sa.Column("attendance", sa.Float(), nullable=False),
        sa.Column("accountability", sa.Float(), nullable=False),
        sa.Column("project_delivery", sa.Float(), nullable=False),
        sa.Column("tech_skills", sa.Float(), nullable=False),
        sa.Column("creativity", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("candidate_id", "period_id", name="uq_candidate_period_score"),
    )

    op.create_table(
        "calculated_results",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id"), nullable=False),
        sa.Column("period_id", sa.Integer(), sa.ForeignKey("scoring_periods.id"), nullable=False),
        sa.Column("tdc_average", sa.Float(), nullable=False),
        sa.Column("tech_average", sa.Float(), nullable=False),
        sa.Column("overall_average", sa.Float(), nullable=False),
        sa.Column("ranking", sa.Integer(), nullable=False),
        sa.Column("calculated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("candidate_id", "period_id", name="uq_candidate_period_result"),
    )


def downgrade() -> None:
    op.drop_table("calculated_results")
    op.drop_table("candidate_scores")
    op.drop_table("score_sheet_uploads")
    op.drop_table("scoring_periods")
    op.drop_index("ix_candidates_candidate_code", table_name="candidates")
    op.drop_table("candidates")
    op.drop_table("streams")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")

    bind = op.get_bind()
    upload_status_enum.drop(bind, checkfirst=True)
    period_status_enum.drop(bind, checkfirst=True)
    period_type_enum.drop(bind, checkfirst=True)
    user_role_enum.drop(bind, checkfirst=True)