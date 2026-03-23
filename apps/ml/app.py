import os
import time
from typing import List, Optional, Dict

import numpy as np
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

from detectors import get_detector
from model_cache import ModelCache

app = FastAPI(title="Merlin ML Service", version="0.1.0")
_cache = ModelCache(max_entries=100, ttl_seconds=300)


class MLConfig(BaseModel):
    method: str = Field(default="ISOLATION_FOREST")
    contamination: float = Field(default=0.05, ge=0.001, le=0.5)
    windowSize: int = Field(default=50, ge=1, le=500)
    minPoints: int = Field(default=20, ge=1, le=500)
    seed: Optional[int] = 42
    zscore_threshold: float = Field(default=3.5)


class ScoreRequest(BaseModel):
    indicatorId: int
    dataType: str
    values: List[float]
    newValue: float
    config: MLConfig


class BatchScoreRequest(BaseModel):
    indicatorId: int
    dataType: str
    values: List[float]
    config: MLConfig


class ScoreResult(BaseModel):
    isAnomaly: bool
    score: float
    threshold: float
    method: str
    reason: str
    meta: Optional[dict] = None


class EvaluateRequest(BaseModel):
    indicatorId: int
    dataType: str
    values: List[float]
    labels: List[bool]
    config: MLConfig
    compareAll: bool = False


class AlgorithmResult(BaseModel):
    method: str
    precision: float
    recall: float
    f1: float
    accuracy: float
    confusionMatrix: Dict[str, int]


def _require_api_key(auth_header: Optional[str]) -> None:
    api_key = os.getenv("ML_SERVICE_API_KEY")
    if not api_key:
        return
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = auth_header.split("Bearer ", 1)[1].strip()
    if token != api_key:
        raise HTTPException(status_code=401, detail="Unauthorized")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/algorithms")
def get_algorithms():
    return {
        "algorithms": [
            {"id": "ISOLATION_FOREST", "name": "Isolation Forest", "description": "Good for global anomalies in high-dimensional data."},
            {"id": "Z_SCORE", "name": "Z-Score (Modified)", "description": "Fast baseline. Detects values far from the median."},
            {"id": "LOF", "name": "Local Outlier Factor", "description": "Detects local anomalies based on neighborhood density."},
            {"id": "DBSCAN", "name": "DBSCAN", "description": "Cluster-based detection. Points not in any cluster are anomalies."}
        ]
    }


@app.post("/score", response_model=ScoreResult)
def score(req: ScoreRequest, authorization: Optional[str] = Header(default=None)):
    _require_api_key(authorization)

    if len(req.values) < req.config.minPoints:
        return ScoreResult(
            isAnomaly=False, score=0.0, threshold=0.0,
            method=req.config.method, reason="Insufficient data"
        )

    # Cache logic
    cache_key = _cache._generate_key(req.indicatorId, req.values, req.config.method, req.config.model_dump())
    cached = _cache.get(cache_key)

    if cached:
        detector, threshold = cached
        from_cache = True
    else:
        detector = get_detector(req.config.method, req.config)
        detector.fit(req.values)
        _, threshold = detector.score(req.values) # Extract threshold from first score
        _cache.put(cache_key, detector, threshold)
        from_cache = False

    scores, _ = detector.score([req.newValue])
    new_score = float(scores[0])
    is_anomaly = new_score >= threshold

    return ScoreResult(
        isAnomaly=is_anomaly,
        score=new_score,
        threshold=threshold,
        method=req.config.method,
        reason=f"{req.config.method} score >= threshold" if is_anomaly else "Within expected range",
        meta={**req.config.model_dump(), "cached": from_cache}
    )


@app.post("/score/batch")
def score_batch(req: BatchScoreRequest, authorization: Optional[str] = Header(default=None)):
    _require_api_key(authorization)

    if len(req.values) < req.config.minPoints:
        return {"results": [ScoreResult(isAnomaly=False, score=0.0, threshold=0.0, method=req.config.method, reason="Insufficient data") for _ in req.values]}

    cache_key = _cache._generate_key(req.indicatorId, req.values, req.config.method, req.config.model_dump())
    cached = _cache.get(cache_key)

    if cached:
        detector, threshold = cached
        from_cache = True
    else:
        detector = get_detector(req.config.method, req.config)
        detector.fit(req.values)
        _, threshold = detector.score(req.values)
        _cache.put(cache_key, detector, threshold)
        from_cache = False

    scores, _ = detector.score(req.values)
    
    results = []
    for s in scores:
        score_val = float(s)
        is_anomaly = score_val >= threshold
        results.append(ScoreResult(
            isAnomaly=is_anomaly,
            score=score_val,
            threshold=threshold,
            method=req.config.method,
            reason=f"{req.config.method} score >= threshold" if is_anomaly else "Within expected range",
            meta={**req.config.model_dump(), "cached": from_cache}
        ))

    return {"results": results}


@app.post("/evaluate")
def evaluate(req: EvaluateRequest, authorization: Optional[str] = Header(default=None)):
    _require_api_key(authorization)
    
    methods = ["ISOLATION_FOREST", "Z_SCORE", "LOF", "DBSCAN"] if req.compareAll else [req.config.method]
    results: List[AlgorithmResult] = []

    for method in methods:
        detector = get_detector(method, req.config)
        detector.fit(req.values)
        scores, threshold = detector.score(req.values)
        predictions = (scores >= threshold)
        
        tp = int(np.sum((predictions == True) & (np.array(req.labels) == True)))
        fp = int(np.sum((predictions == True) & (np.array(req.labels) == False)))
        tn = int(np.sum((predictions == False) & (np.array(req.labels) == False)))
        fn = int(np.sum((predictions == False) & (np.array(req.labels) == True)))
        
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
        accuracy = (tp + tn) / len(req.labels)
        
        results.append(AlgorithmResult(
            method=method,
            precision=precision,
            recall=recall,
            f1=f1,
            accuracy=accuracy,
            confusionMatrix={"tp": tp, "fp": fp, "tn": tn, "fn": fn}
        ))
        
    return {"results": results}


@app.delete("/cache")
def clear_cache(authorization: Optional[str] = Header(default=None)):
    _require_api_key(authorization)
    _cache.clear()
    return {"status": "cleared"}
