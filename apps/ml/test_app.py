import os

from fastapi.testclient import TestClient

from app import app


client = TestClient(app)


def _payload(values, new_value=10.0):
    return {
        "indicatorId": 1,
        "dataType": "NUMBER",
        "values": values,
        "newValue": new_value,
        "config": {
            "method": "ISOLATION_FOREST",
            "contamination": 0.05,
            "windowSize": 50,
            "minPoints": 2,
            "seed": 42,
        },
    }


def test_health_ok():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_score_requires_auth_when_api_key_set(monkeypatch):
    monkeypatch.setenv("ML_SERVICE_API_KEY", "secret")
    res = client.post("/score", json=_payload([10, 12], 200))
    assert res.status_code == 401


def test_score_works_with_auth_when_api_key_set(monkeypatch):
    monkeypatch.setenv("ML_SERVICE_API_KEY", "secret")
    res = client.post(
        "/score",
        json=_payload([10, 12, 11, 10, 9], 200),
        headers={"Authorization": "Bearer secret"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "isAnomaly" in data
    assert "score" in data
    assert "threshold" in data


def test_score_insufficient_data(monkeypatch):
    monkeypatch.delenv("ML_SERVICE_API_KEY", raising=False)
    payload = _payload([10], 12)
    payload["config"]["minPoints"] = 5
    res = client.post("/score", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["isAnomaly"] is False
    assert data["reason"] == "Insufficient data"


def test_score_batch_shape(monkeypatch):
    monkeypatch.delenv("ML_SERVICE_API_KEY", raising=False)
    payload = {
        "indicatorId": 1,
        "dataType": "NUMBER",
        "values": [10, 11, 12, 300],
        "config": {
            "method": "ISOLATION_FOREST",
            "contamination": 0.1,
            "windowSize": 50,
            "minPoints": 2,
            "seed": 42,
        },
    }
    res = client.post("/score/batch", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "results" in data
    assert len(data["results"]) == 4


def teardown_module(_module):
    os.environ.pop("ML_SERVICE_API_KEY", None)
