# ============================================================
# Nitin Hospital — Backend Dockerfile (for Render deployment)
# ============================================================
FROM python:3.12-slim

# System dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . .

# Collect static files
RUN python manage.py collectstatic --noinput --settings=nitin_billing.settings || true

# Expose port (Render uses $PORT env var)
EXPOSE 8000

# Start gunicorn
CMD gunicorn nitin_billing.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 2 --timeout 120
