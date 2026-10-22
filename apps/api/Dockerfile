# Production image (Railway builds this file from the apps/api root directory).
# Local development uses Dockerfile.dev through docker-compose.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8000

WORKDIR /app

COPY pyproject.toml ./
COPY app ./app
RUN pip install . && useradd --create-home --uid 10001 appuser

USER appuser
EXPOSE 8000

# app/server.py opens one dual-stack socket on $PORT (Railway private network is IPv6,
# newer environments also IPv4) and trusts forwarded headers from the web proxy.
CMD ["python", "-m", "app.server"]
