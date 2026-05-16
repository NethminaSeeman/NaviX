import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


class AgentStore:
    """Simple SQLite logger for agent inputs/outputs."""

    def __init__(self, db_path: str = "data/agent_logs.db") -> None:
        base_dir = Path(__file__).resolve().parents[1]
        self.db_path = base_dir / db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_schema()

    def _connect(self) -> sqlite3.Connection:
        return sqlite3.connect(self.db_path)

    def _init_schema(self) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS agent_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    agent_name TEXT NOT NULL,
                    query_text TEXT,
                    input_payload TEXT,
                    output_payload TEXT,
                    status TEXT NOT NULL,
                    error_text TEXT,
                    created_at TEXT NOT NULL
                )
                """
            )

    def log(
        self,
        agent_name: str,
        query_text: str | None,
        input_payload: Any,
        output_payload: Any,
        status: str = "success",
        error_text: str | None = None,
    ) -> None:
        created_at = datetime.now(timezone.utc).isoformat()
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO agent_logs (
                    agent_name,
                    query_text,
                    input_payload,
                    output_payload,
                    status,
                    error_text,
                    created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    agent_name,
                    query_text,
                    json.dumps(input_payload, ensure_ascii=False, default=str),
                    json.dumps(output_payload, ensure_ascii=False, default=str),
                    status,
                    error_text,
                    created_at,
                ),
            )

    def recent(self, limit: int = 50) -> list[dict[str, Any]]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT
                    id,
                    agent_name,
                    query_text,
                    input_payload,
                    output_payload,
                    status,
                    error_text,
                    created_at
                FROM agent_logs
                ORDER BY id DESC
                LIMIT ?
                """,
                (max(1, limit),),
            ).fetchall()

        result: list[dict[str, Any]] = []
        for row in rows:
            result.append(
                {
                    "id": row[0],
                    "agent_name": row[1],
                    "query_text": row[2],
                    "input_payload": _safe_json(row[3]),
                    "output_payload": _safe_json(row[4]),
                    "status": row[5],
                    "error_text": row[6],
                    "created_at": row[7],
                }
            )
        return result


def _safe_json(value: str | None) -> Any:
    if not value:
        return None
    try:
        return json.loads(value)
    except Exception:
        return value
