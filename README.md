# Stockview

A modern, full-stack stock market app inspired by Robinhood — dark mode, glassmorphism UI, real-time data.

## Features

- **Home Dashboard** — Major indices (S&P 500, NASDAQ, Dow), top gainers/losers, most active stocks
- **Stock Detail** — Interactive charts (1D / 1W / 1M / 1Y / ALL), key statistics, recent news
- **News Feed** — Aggregated financial news, filterable by ticker
- **Search** — Autocomplete stock search by name or ticker
- **Watchlist** — Add/remove stocks, synced to your account
- **Auth** — Real signup & login with hashed passwords and JWT sessions

## Quick Start (Mac)

```bash
chmod +x start.sh
./start.sh
```

The script will:
1. Check Python 3 and Node.js are installed
2. Create a Python virtual environment and install dependencies
3. Start the FastAPI backend on port 8000
4. Install frontend packages and start Vite on port 5173
5. Open your browser automatically

## Manual Setup

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # edit SECRET_KEY
python main.py
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Frontend  | React 18, Vite, Recharts, Zustand   |
| Styling   | Tailwind CSS + custom CSS variables |
| Backend   | FastAPI (Python)                    |
| Database  | SQLite via SQLAlchemy               |
| Auth      | JWT (python-jose) + bcrypt          |
| Data      | yfinance (Yahoo Finance — no API key needed) |

## Environment Variables

Copy `backend/.env.example` to `backend/.env`:

```
SECRET_KEY=<random 32+ char string>
DATABASE_URL=sqlite:///./stockview.db
```

The start script generates a random `SECRET_KEY` automatically.

## API Documentation

FastAPI's interactive docs are available at `http://localhost:8000/docs` while the backend is running.
