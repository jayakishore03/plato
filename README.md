# Playto Community Feed Prototype

A high-performance threaded discussion feed with gamification and a dynamic leaderboard.

## Tech Stack
- **Backend**: Django, Django REST Framework.
- **Frontend**: React, Vite, TailwindCSS.
- **Database**: SQLite (default) or PostgreSQL.

## Features
- **Threaded Comments**: Optimized fetching (2 queries only) for deep trees.
- **Gamification**: Likes on posts (+5 karma) and comments (+1 karma).
- **Leaderboard**: Real-time aggregation of karma earned in the last 24 hours.
- **Concurrency**: Handled via database constraints to prevent double-voting.

## Setup Instructions

### 1. Backend

```bash
cd backend
# Create virtual env (optional but recommended)
# python -m venv venv
# source venv/bin/activate  # or venv\Scripts\activate on Windows

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Create admin user
python manage.py createsuperuser

# Start server
python manage.py runserver
```
Backend runs on `http://localhost:8000`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```
Frontend runs on `http://localhost:5173` (or similar).

## Architecture Notes
See `EXPLAINER.md` for deep dives into the N+1 optimization and Leaderboard math.
