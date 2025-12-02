from sqlmodel import SQLModel, create_engine, Session
from src.models import BowSetup, ArrowSetup, Session as SessionModel, End, Shot

sqlite_file_name = "baretrack.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"

engine = create_engine(sqlite_url)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
