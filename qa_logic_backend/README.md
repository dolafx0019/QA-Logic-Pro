# QA-Logic Pro

**QA-Logic Pro** is an AI-assisted Quality Assurance web application that converts software requirements into structured test cases, assumptions, clarification questions, and deterministic risk scoring.

> ⚡ **Project Status: MVP integration-verified — Live Gemini path confirmed**
> The application is structurally complete for its core use case. The backend contracts, API layer, generation pipeline, and frontend UI are verified end-to-end. *Note: Production hardening (e.g., CI/CD, observability, load testing) is intentionally deferred to later phases.*

---

## 🎯 Overview

QA-Logic Pro bridges the gap between raw Product/Business requirements and actionable QA artifacts. By leveraging LLMs alongside deterministic Python-based heuristics, it ensures generated test plans are comprehensive, risk-aware, and strictly typed.

### Key Features
- **AI-Driven Structured Generation**: Transforms User Stories, Acceptance Criteria (AC), and Business Rules into comprehensive test suites using Google Gemini.
- **Deterministic Risk Scoring**: Analyzes generated tests to calculate normalized priority, probability, and severity scores natively on the backend.
- **Binary Excel Export**: Generates `.xlsx` files entirely in-memory and streams them to the client securely.
- **History Persistence**: All generations, including the precise payloads and outputs, are saved locally via SQLite for future retrieval and review.
- **Configurable Strictness**: Settings for "Target Test Case Count" and "Testing Strictness" (Relaxed, Balanced, Strict) are managed via robust browser-local orchestration.
- **Mock Mode**: Supports offline UI/UX validation simulating the complete API generation contract without requiring live AI API usage.

---

## 🛠 Tech Stack

**Frontend**
- React 18
- TypeScript
- Vite
- Tailwind CSS
- lucide-react (Icons)
- axios (Networking)
- react-hook-form (State Management)

**Backend**
- Python 3.1x
- FastAPI
- Pydantic (Strict Schema Contracts)
- SQLAlchemy + aiosqlite (Database layer)
- Google GenAI (Gemini for LLM orchestration)
- openpyxl (Excel export utility)

---

## 🏛 Architecture

### Frontend Responsibilities
- Manages local settings orchestrations (`localStorage`).
- Maintains complex, dynamic input arrays (User Story, Acceptance Criteria).
- Handles API exceptions and routes standard network errors to user-friendly UX banners.
- Conditionally reflects active `MOCK_MODE` vs live Gemini backend status dynamically.

### Backend Responsibilities
- Strict payload validation via Pydantic mapping real-world QA models.
- Invokes the un-typed Gemini generation prompt and coerces output strictly into Pydantic models.
- Identifies out-of-bounds context (Truncation fallback).
- Writes history payloads asynchronously via local background tasks.
- Produces fully formed native `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` binaries.

---

## 📂 Project Structure

```text
QA-Logic/
├── qa_logic_backend/
│   ├── app/
│   │   ├── api/v1/endpoints/  # API Routers (generate.py, export.py, history.py, health.py)
│   │   ├── core/              # Config, exceptions, standard error handlers
│   │   ├── db/                # SQLite setup, ORM models, sessions
│   │   ├── schemas/           # Pydantic data contracts (generator, history)
│   │   └── services/          # Core logic (AI bridge, deterministic risk, exporter)
│   ├── requirements.txt
│   └── .env
│
└── qa_logic_frontend/
    ├── src/
    │   ├── components/layout/ # App shell and sidebar
    │   ├── hooks/             # Local settings orchestration
    │   ├── pages/             # Dashboard, History, Settings views
    │   ├── services/          # Central API Axios client mapping
    │   └── types/             # Strict TS interfaces aligned to Backend bounds
    ├── package.json
    └── .env
```

---

## ⚙️ Environment Variables

Before running the application, ensure the appropriate `.env` files are created.

### Backend (`qa_logic_backend/.env`)
```env
# AI Settings
GEMINI_API_KEY=your_real_gemini_key_here
MOCK_MODE=False

# Backend Settings
CORS_ORIGINS=["http://localhost:5173", "http://127.0.0.1:5173"]
DATABASE_URL=sqlite+aiosqlite:///./qa_logic.db
```
*(Note: Setting `MOCK_MODE=True` allows exploring the entire frontend UI safely without hitting rate limits.)*

### Frontend (`qa_logic_frontend/.env`)
```env
# Base URL for local FastAPI Backend
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

---

## 🚀 Running Locally

### 1. Start the Backend
```bash
cd qa_logic_backend
python -m venv venv
.\venv\Scripts\activate      # Windows
# source venv/bin/activate  # macOS/Linux

pip install -r requirements.txt

# Start Dev Server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
The backend API docs are available at `http://127.0.0.1:8000/api/v1/openapi.json` (Swagger UI not actively configured inline, check via Postman/cURL if needed).

### 2. Start the Frontend
```bash
cd qa_logic_frontend
npm install

# Start Vite Server
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🔌 API Endpoints
All routes exist under `/api/v1/`

- `GET /status` — Exposes system health, Mock Mode state, and Gemini configuration.
- `POST /generate` — The primary route utilizing `GEMINI_API_KEY` to convert prompts to fully documented Test Case models.
- `POST /export` — Formats generated data (from active sessions or history references) to Excel streams.
- `GET /history` — Paginated history repository lookup.
- `GET /history/{history_id}` — Looks up a specific historical generation.

---

## 📋 Integration Verification Status

The current repository reflects an **Integration-Verified MVP**. 

- ✅ **Mock Mode Full End-to-End**: Passed.
- ✅ **Live Gemini Smoke Test**: Passed. Prompt injection, accurate heuristic parsing, and binary export functionality confirmed directly with the Google service.
- ✅ **SQLite Persistence Flow**: Background session creation and transactional payload saves are verified securely under real load parameters.

### Intentionally Deferred Constraints
The following features are consciously out of scope for the current MVP release:
- Database Migrations (Alembic)
- Production Telemetry & Observability
- Distributed Caching (Redis)
- Load/Stress Testing
- CI/CD Pipelines
- Multi-tenant Auth and enterprise security hardening

---

## 📄 License
*Placeholder for project licensing parameters.*
