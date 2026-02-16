"""Lightweight schema migrations for BareTrack.

SQLModel's ``create_all()`` handles new tables but cannot alter existing ones.
This module runs forward-only migrations on startup, tracked by a simple
``_schema_version`` table so each migration executes exactly once.

Add new migrations to ``_MIGRATIONS`` as ``(version, description, sql_list)``
tuples.  Versions must be monotonically increasing integers.
"""

import logging
from sqlmodel import Session, text
from sqlalchemy import Engine

logger = logging.getLogger("baretrack.migrations")

# ---------------------------------------------------------------------------
# Migration registry — append-only, never edit past entries
# ---------------------------------------------------------------------------
# Each entry: (version, description, list_of_SQL_statements)

_MIGRATIONS: list[tuple[int, str, list[str]]] = [
    (
        1,
        "Make ArrowSetup.total_arrow_weight_gr and shaft_diameter_mm nullable",
        [
            # SQLite cannot ALTER COLUMN, so we recreate the table.
            "CREATE TABLE IF NOT EXISTS _arrowsetup_new ("
            "  id VARCHAR NOT NULL PRIMARY KEY,"
            "  make VARCHAR NOT NULL,"
            "  model VARCHAR NOT NULL,"
            "  spine FLOAT NOT NULL,"
            "  length_in FLOAT NOT NULL,"
            "  point_weight_gr FLOAT NOT NULL,"
            "  total_arrow_weight_gr FLOAT,"
            "  shaft_diameter_mm FLOAT,"
            "  fletching_type VARCHAR NOT NULL,"
            "  nock_type VARCHAR NOT NULL,"
            "  arrow_count INTEGER NOT NULL"
            ")",
            "INSERT INTO _arrowsetup_new SELECT * FROM arrowsetup",
            "DROP TABLE arrowsetup",
            "ALTER TABLE _arrowsetup_new RENAME TO arrowsetup",
        ],
    ),
]


# ---------------------------------------------------------------------------
# Migration runner
# ---------------------------------------------------------------------------


def _ensure_version_table(session: Session) -> None:
    """Create the version-tracking table if it doesn't exist."""
    session.exec(
        text(
            "CREATE TABLE IF NOT EXISTS _schema_version ("
            "  version INTEGER PRIMARY KEY,"
            "  description TEXT NOT NULL,"
            "  applied_at TEXT NOT NULL DEFAULT (datetime('now'))"
            ")"
        )
    )
    session.commit()


def _current_version(session: Session) -> int:
    """Return the highest applied migration version, or 0 if none."""
    result = session.exec(text("SELECT COALESCE(MAX(version), 0) FROM _schema_version"))
    return result.scalar() or 0


def _table_exists(session: Session, table_name: str) -> bool:
    """Check whether a table exists in the database."""
    result = session.exec(
        text("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=:name"),
        params={"name": table_name},
    )
    return (result.scalar() or 0) > 0


def run_migrations(engine: Engine) -> None:
    """Apply any pending migrations in order.

    Safe to call on every startup — already-applied migrations are skipped.
    Runs inside a transaction per migration for atomicity.
    """
    with Session(engine) as session:
        _ensure_version_table(session)
        current = _current_version(session)
        pending = [(v, d, sqls) for v, d, sqls in _MIGRATIONS if v > current]

        if not pending:
            logger.info("Database schema is up to date (version %d)", current)
            return

        for version, description, sql_statements in pending:
            logger.info("Applying migration %d: %s", version, description)
            try:
                # Disable FK checks during table recreation
                session.exec(text("PRAGMA foreign_keys = OFF"))

                for sql in sql_statements:
                    session.exec(text(sql))

                # Record successful migration
                session.exec(
                    text("INSERT INTO _schema_version (version, description) VALUES (:v, :d)"),
                    params={"v": version, "d": description},
                )
                session.commit()

                session.exec(text("PRAGMA foreign_keys = ON"))
                logger.info("Migration %d applied successfully", version)

            except Exception:
                session.rollback()
                logger.exception("Migration %d FAILED — rolling back", version)
                raise

        logger.info("All migrations applied (now at version %d)", pending[-1][0])
