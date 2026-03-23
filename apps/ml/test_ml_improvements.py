import time
import pytest
from fastapi.testclient import TestClient
from app import app, _cache

client = TestClient(app)

def _payload(indicator_id=1, values=None, new_value=10.0, method="ISOLATION_FOREST"):
    if values is None:
        values = [10.0, 12.0, 11.0, 10.5, 9.5, 11.5, 10.2, 10.8, 11.2, 10.1] # 10 points
    return {
        "indicatorId": indicator_id,
        "dataType": "NUMBER",
        "values": values,
        "newValue": new_value,
        "config": {
            "method": method,
            "contamination": 0.1,
            "windowSize": 50,
            "minPoints": 5,
            "seed": 42
        }
    }

def test_cache_hit():
    _cache.clear()
    payload = _payload()
    
    # First request - cache miss
    start = time.time()
    res1 = client.post("/score", json=payload)
    time1 = time.time() - start
    assert res1.status_code == 200
    assert res1.json()["meta"]["cached"] is False
    
    # Second request - cache hit
    start = time.time()
    res2 = client.post("/score", json=payload)
    time2 = time.time() - start
    assert res2.status_code == 200
    assert res2.json()["meta"]["cached"] is True
    # Cache hit should be significantly faster
    # Note: on some local systems this might be close, but usually fits vs lookup is noticeable
    assert time2 < time1

def test_cache_invalidated_on_data_change():
    _cache.clear()
    payload = _payload()
    client.post("/score", json=payload)
    
    # Change values
    payload["values"].append(20.0)
    res = client.post("/score", json=payload)
    assert res.json()["meta"]["cached"] is False

def test_multi_algorithms():
    methods = ["ISOLATION_FOREST", "Z_SCORE", "LOF", "DBSCAN"]
    for method in methods:
        payload = _payload(method=method)
        res = client.post("/score", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["method"] == method
        assert "isAnomaly" in data

def test_evaluate_endpoint():
    values = [10, 11, 10.5, 10, 50, 10, 11, 10.5, 10, 50]
    labels = [False, False, False, False, True, False, False, False, False, True]
    
    payload = {
        "indicatorId": 1,
        "dataType": "NUMBER",
        "values": values,
        "labels": labels,
        "config": {
            "method": "Z_SCORE",
            "contamination": 0.2,
            "minPoints": 5
        },
        "compareAll": True
    }
    
    res = client.post("/evaluate", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "results" in data
    assert len(data["results"]) == 4
    
    for result in data["results"]:
        assert "f1" in result
        assert "precision" in result
        assert "recall" in result
        assert "confusionMatrix" in result

def test_algorithms_list():
    res = client.get("/algorithms")
    assert res.status_code == 200
    data = res.json()
    assert "algorithms" in data
    assert len(data["algorithms"]) == 4
