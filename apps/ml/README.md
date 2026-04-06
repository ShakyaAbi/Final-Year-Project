# Merlin ML Service

## Run locally

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000
```

## Run tests

```bash
pytest -q
```

## Environment

- `ML_SERVICE_API_KEY` (optional): if set, the service requires `Authorization: Bearer <key>`.

## Endpoints

- `GET /health`
- `POST /score`
- `POST /score/batch`

## Sample test data

Example ML test payloads are included in this directory:

- `apps/ml/sample_ml_data.json`
- `apps/ml/sample_ml_batch_data.json`

Use them to verify the service manually:

```bash
curl -X POST http://localhost:8000/score \
  -H 'Content-Type: application/json' \
  --data @apps/ml/sample_ml_data.json

curl -X POST http://localhost:8000/score/batch \
  -H 'Content-Type: application/json' \
  --data @apps/ml/sample_ml_batch_data.json
```

If your ML service requires an API key, add the `Authorization: Bearer <key>` header.
