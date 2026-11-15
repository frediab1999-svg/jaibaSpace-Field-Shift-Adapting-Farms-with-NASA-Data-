from app.core.config import engine_connect_args, normalize_database_url

POOLER = "aws-0-us-east-1.pooler.supabase.com"


def test_supabase_session_pooler_string_is_ready_for_psycopg_with_tls():
    url = normalize_database_url(f"postgresql://postgres.abc123:clave@{POOLER}:5432/postgres")

    assert url == f"postgresql+psycopg://postgres.abc123:clave@{POOLER}:5432/postgres?sslmode=require"
    assert engine_connect_args(url) == {}


def test_postgres_scheme_and_existing_sslmode_are_respected():
    url = normalize_database_url(f"postgres://u:p@{POOLER}:5432/postgres?sslmode=verify-full")

    assert url == f"postgresql+psycopg://u:p@{POOLER}:5432/postgres?sslmode=verify-full"


def test_transaction_pooler_disables_prepared_statements():
    url = normalize_database_url(f"postgresql://u:p@{POOLER}:6543/postgres")

    assert engine_connect_args(url) == {"prepare_threshold": None}


def test_local_urls_are_left_alone():
    local = "postgresql+psycopg://jaibaspace:x@127.0.0.1:5432/jaibaspace"

    assert normalize_database_url(local) == local
    assert engine_connect_args(local) == {}
