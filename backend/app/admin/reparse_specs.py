"""Re-parse AI-sourced rubric specs made with an older parser prompt version.

Run with: python -m app.admin.reparse_specs [--org-id ID] [--dry-run]
Teacher-edited specs are never touched. Each selected question is queued through the same
path as the "re-parse" endpoint (`mark_reparse` + `enqueue_parses(force=True)`).
"""

import argparse
from uuid import UUID

from sqlmodel import Session, col, select

from app.core.db import engine
from app.models.exam import Exam, Question
from app.models.rubric import RubricSpecSource
from app.rubrics import service
from app.rubrics.parser import PARSER_PROMPT_VERSION


def find_outdated(db: Session, org_id: UUID | None = None) -> list[Question]:
    """Live questions whose current spec is AI-sourced with a different parser prompt version."""
    stmt = select(Question).where(col(Question.deleted_at).is_(None))
    if org_id is not None:
        stmt = stmt.join(Exam, col(Exam.id) == col(Question.exam_id)).where(Exam.org_id == org_id)
    questions = list(db.exec(stmt).all())
    current = service.current_specs(db, questions)
    return [
        q for q in questions
        if q.id in current
        and current[q.id].source == RubricSpecSource.AI
        and current[q.id].parser_prompt_version != PARSER_PROMPT_VERSION
    ]


def run(org_id: UUID | None = None, dry_run: bool = False) -> int:
    """Queue a re-parse for each outdated question; returns how many were selected."""
    with Session(engine) as db:
        outdated = find_outdated(db, org_id)
        print(f"{len(outdated)} AI spec(s) made with a parser prompt other than {PARSER_PROMPT_VERSION}")
        if dry_run or not outdated:
            if dry_run:
                print("Dry run: nothing queued")
            return len(outdated)
        items = [(q.id, service.mark_reparse(db, q)) for q in outdated]
        db.commit()
    from app.api.v1.endpoints.rubrics import enqueue_parses

    enqueue_parses(items, force=True)
    print(f"Queued {len(items)} re-parse(s)")
    return len(items)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--org-id", type=UUID, default=None, help="only this organization")
    parser.add_argument("--dry-run", action="store_true", help="count without queueing")
    args = parser.parse_args()
    run(args.org_id, args.dry_run)


if __name__ == "__main__":
    main()
