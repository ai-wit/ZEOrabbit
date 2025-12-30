DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB?sslmode=require"
CRON_SECRET="dev_cron_secret_change_me"
DB_PUSH_ON_DEPLOY="0"
SEED_ON_DEPLOY="0"

# Session cookie configuration
# - In production, the session cookie is Secure by default.
# - If you run the app over HTTP (e.g., IP-based access without TLS), set this to "0".
SESSION_COOKIE_SECURE="1"

# Toss Payments Configuration
TOSS_PAYMENTS_CLIENT_KEY="test_ck_..."
TOSS_PAYMENTS_SECRET_KEY="test_sk_..."
TOSS_PAYMENTS_WEBHOOK_SECRET_KEY="test_wh_..."

## Environment variables example

```text
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB?sslmode=require"
CRON_SECRET="dev_cron_secret_change_me"
DB_PUSH_ON_DEPLOY="0"
SEED_ON_DEPLOY="0"

# Session cookie configuration
# - In production, the session cookie is Secure by default.
# - If you run the app over HTTP (e.g., IP-based access without TLS), set this to "0".
SESSION_COOKIE_SECURE="1"

# Toss Payments Configuration
TOSS_PAYMENTS_CLIENT_KEY="test_ck_..."
TOSS_PAYMENTS_SECRET_KEY="test_sk_..."
TOSS_PAYMENTS_WEBHOOK_SECRET_KEY="test_wh_..."
```


