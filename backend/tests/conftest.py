import pytest

from app import db


@pytest.fixture(scope="session")
def database():
    """Real read-only DB connection; DB tests are skipped when Postgres isn't running."""
    db.pool.open(wait=False)
    if not db.ping():
        pytest.skip("PostgreSQL not reachable (see DATABASE_URL)")
    return db
