"""SQLite database setup and models for Gr8r."""

import json
from datetime import datetime
from pathlib import Path
from typing import Optional
from uuid import UUID, uuid4
import sqlite3

# Import from new location
from app.schemas.grading import ProcessingStatus, GradingResult


class Database:
    """Simple SQLite database manager for sessions and results."""

    def __init__(self, db_path: str = "./data/gr8r.db"):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        """Get a database connection."""
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        """Initialize database tables."""
        conn = self._get_connection()
        cursor = conn.cursor()

        # Sessions table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                session_id TEXT PRIMARY KEY,
                status TEXT NOT NULL DEFAULT 'pending',
                progress REAL DEFAULT 0.0,
                current_step TEXT,
                error_message TEXT,
                questions_path TEXT,
                answers_path TEXT,
                rubric_path TEXT,
                triplets_json TEXT,
                results_json TEXT,
                total_score REAL,
                max_total_score REAL,
                summary TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                completed_at TEXT
            )
        """)

        conn.commit()
        conn.close()

    def create_session(self) -> UUID:
        """Create a new grading session."""
        session_id = uuid4()
        now = datetime.utcnow().isoformat()

        conn = self._get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO sessions (session_id, status, created_at, updated_at)
            VALUES (?, ?, ?, ?)
            """,
            (str(session_id), ProcessingStatus.PENDING.value, now, now)
        )
        conn.commit()
        conn.close()

        return session_id

    def get_session(self, session_id: UUID) -> Optional[dict]:
        """Get session by ID."""
        conn = self._get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM sessions WHERE session_id = ?",
            (str(session_id),)
        )
        row = cursor.fetchone()
        conn.close()

        if row:
            return dict(row)
        return None

    def update_session(
        self,
        session_id: UUID,
        status: Optional[ProcessingStatus] = None,
        progress: Optional[float] = None,
        current_step: Optional[str] = None,
        error_message: Optional[str] = None,
        questions_path: Optional[str] = None,
        answers_path: Optional[str] = None,
        rubric_path: Optional[str] = None,
        triplets_json: Optional[str] = None,
        results_json: Optional[str] = None,
        total_score: Optional[float] = None,
        max_total_score: Optional[float] = None,
        summary: Optional[str] = None,
    ) -> bool:
        """Update session fields."""
        updates = []
        values = []

        if status is not None:
            updates.append("status = ?")
            values.append(status.value)
        if progress is not None:
            updates.append("progress = ?")
            values.append(progress)
        if current_step is not None:
            updates.append("current_step = ?")
            values.append(current_step)
        if error_message is not None:
            updates.append("error_message = ?")
            values.append(error_message)
        if questions_path is not None:
            updates.append("questions_path = ?")
            values.append(questions_path)
        if answers_path is not None:
            updates.append("answers_path = ?")
            values.append(answers_path)
        if rubric_path is not None:
            updates.append("rubric_path = ?")
            values.append(rubric_path)
        if triplets_json is not None:
            updates.append("triplets_json = ?")
            values.append(triplets_json)
        if results_json is not None:
            updates.append("results_json = ?")
            values.append(results_json)
        if total_score is not None:
            updates.append("total_score = ?")
            values.append(total_score)
        if max_total_score is not None:
            updates.append("max_total_score = ?")
            values.append(max_total_score)
        if summary is not None:
            updates.append("summary = ?")
            values.append(summary)

        if not updates:
            return False

        updates.append("updated_at = ?")
        values.append(datetime.utcnow().isoformat())

        if status == ProcessingStatus.COMPLETED:
            updates.append("completed_at = ?")
            values.append(datetime.utcnow().isoformat())

        values.append(str(session_id))

        conn = self._get_connection()
        cursor = conn.cursor()
        cursor.execute(
            f"UPDATE sessions SET {', '.join(updates)} WHERE session_id = ?",
            values
        )
        conn.commit()
        affected = cursor.rowcount
        conn.close()

        return affected > 0

    def save_results(
        self,
        session_id: UUID,
        results: list[GradingResult],
        total_score: float,
        max_total_score: float,
        summary: str
    ) -> bool:
        """Save grading results for a session."""
        results_json = json.dumps([r.model_dump() for r in results])
        return self.update_session(
            session_id=session_id,
            status=ProcessingStatus.COMPLETED,
            progress=100.0,
            results_json=results_json,
            total_score=total_score,
            max_total_score=max_total_score,
            summary=summary
        )

    def get_results(self, session_id: UUID) -> Optional[list[GradingResult]]:
        """Get grading results for a session."""
        session = self.get_session(session_id)
        if session and session.get("results_json"):
            results_data = json.loads(session["results_json"])
            return [GradingResult(**r) for r in results_data]
        return None


# Global database instance
_db: Optional[Database] = None


def get_grading_store() -> Database:
    """Get the database instance."""
    global _db
    if _db is None:
        _db = Database()
    return _db
