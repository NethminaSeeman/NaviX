# NaviX FastAPI Multi-Agent Backend

## Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env` with:

```env
OPENAI_API_KEY=your_openai_key
OPENWEATHER_API_KEY=your_openweathermap_key
GOOGLE_MAPS_API_KEY=your_google_maps_key
```

Do not commit real API keys.

## Run

```bash
uvicorn main:app --reload --port 8000
```

## Endpoints

- `POST /chat`
- `GET /weather?lat=7.8731&lon=80.7718`
- `GET /nearby?lat=7.8731&lon=80.7718`
- `GET /health`

## Chat Request

```json
{
  "lat": 7.8731,
  "lon": 80.7718,
  "query": "What can I visit nearby today?"
}
```
