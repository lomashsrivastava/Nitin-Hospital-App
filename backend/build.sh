#!/usr/bin/env bash
# ============================================================
# build.sh — Render build script for Nitin Hospital Backend
# This runs automatically on every Render deploy
# ============================================================
set -e

echo "🏥 Nitin Hospital — Starting Build..."

# Install Python dependencies
echo "📦 Installing dependencies..."
pip install -r requirements.txt

# Run database migrations (MongoDB uses syncdb)
echo "🗄️  Running database migrations..."
python manage.py migrate --run-syncdb 2>/dev/null || python manage.py migrate || echo "Migration skipped (MongoDB may not need it)"

# Collect static files
echo "📂 Collecting static files..."
python manage.py collectstatic --noinput

# Ensure admin user exists
echo "👤 Ensuring admin user exists..."
python ensure_user.py || echo "Admin user setup skipped"

echo "✅ Build complete!"
