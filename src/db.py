import os

from sqlmodel import SQLModel, create_engine, Session
from src.models import BowSetup, ArrowSetup, Session as SessionModel, End, Shot, ArrowShaft


def _get_db_url() -> str:
    """Build the SQLite URL.

    When BARETRACK_DATA_DIR is set (desktop / packaged mode), the database
    file is placed in that directory.  Otherwise it defaults to the current
    working directory (original behaviour for ``uvicorn api.main:app``).
    """
    data_dir = os.environ.get("BARETRACK_DATA_DIR", "")
    db_file = os.path.join(data_dir, "baretrack.db") if data_dir else "baretrack.db"
    return f"sqlite:///{db_file}"


engine = create_engine(_get_db_url())

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
