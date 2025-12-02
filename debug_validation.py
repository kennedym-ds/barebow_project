from src.models import BowSetup
from pydantic import ValidationError

try:
    bow = BowSetup(id="bad-bow", name="Incomplete")
    print("No error raised")
    print(f"riser_make: {bow.riser_make!r}")
except ValidationError as e:
    print(f"Caught expected error: {e}")
except Exception as e:
    print(f"Caught unexpected error: {type(e)}: {e}")
