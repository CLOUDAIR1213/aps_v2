# Lightweight APS Scheduling Demo

Lightweight APS scheduling system for the machining industry.

This project demonstrates a minimal but complete APS workflow:

Order -> Routing -> Task Generation -> Scheduling -> Results -> Gantt

## Tech Stack

- Frontend: React + Vite
- Backend: FastAPI + SQLAlchemy + SQLite

## Core Features

- Machine management
- Order management
- Routing and routing operation management
- Automatic schedule task generation
- One-click rule-based scheduling
- Scheduling result storage
- Scheduling result page
- Gantt chart page
- Dashboard summary page

## System Flow

1. Create machines
2. Create orders
3. Create routings for orders
4. Add routing operations
5. Generate `schedule_tasks`
6. Run rule-based scheduling
7. View schedule results
8. View gantt chart

## Project Structure

```text
backend/
  app/
    api/
    crud/
    models/
    schemas/
    services/
  run.py
  seed.py
  requirements.txt

frontend/
  src/
    api/
    components/
    pages/
    App.jsx
    router.jsx
  package.json
  vite.config.js
```

## Backend Startup

Open a terminal in `backend/`:

```bash
pip install -r requirements.txt
python seed.py
python run.py
```

Backend default address:

```text
http://127.0.0.1:8000
```

## Frontend Startup

Open another terminal in `frontend/`:

```bash
npm install
npm run dev
```

Frontend default address:

```text
http://127.0.0.1:5173
```

## Key APIs

- `GET /api/dashboard/summary`
- `POST /api/scheduling/generate-tasks`
- `POST /api/scheduling/run`
- `GET /api/scheduling/results`
- `GET /api/scheduling/results/{schedule_id}`
- `GET /api/scheduling/gantt`

## Demo Data

The seed script inserts a small local demo dataset:

- 2 machines
- 2 orders
- 2 routings
- 4 routing operations

Run:

```bash
python seed.py
```

## Demo Walkthrough

1. Open the Dashboard page
2. Go to Machines and confirm machine data or add a new machine
3. Go to Orders and confirm order data or add a new order
4. Go to Routings and create routing data if needed
5. Open Scheduling
6. Click `Generate Tasks`
7. Click `Run Scheduling`
8. Open `Results`
9. Open `Gantt`

## Notes

- This is a lightweight demo-oriented APS system
- Scheduling is rule-based, not optimization-based
- No authentication, authorization, workflow approval, or advanced planning constraints are included
- No Docker, Alembic, WebSocket, or message queue is included
- Time is calculated with simple UTC-based logic for demonstration purposes
