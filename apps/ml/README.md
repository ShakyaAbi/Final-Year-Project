# Merlin ML Service

## Run locally

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000
```

## Environment

- `ML_SERVICE_API_KEY` (optional): if set, the service requires `Authorization: Bearer <key>`.

## Endpoints

- `GET /health`
- `POST /score`
- `POST /score/batch`
