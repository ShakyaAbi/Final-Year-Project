import os
from typing import List, Optional

import numpy as np
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field
from sklearn.ensemble import IsolationForest

app = FastAPI(title="Merlin ML Service", version="0.1.0")


class MLConfig(BaseModel):
    method: str = Field(default="ISOLATION_FOREST")
    contamination: float = Field(default=0.05, ge=0.001, le=0.5)
    windowSize: int = Field(default=50, ge=10, le=500)
    minPoints: int = Field(default=20, ge=10, le=500)
    seed: Optional[int] = 42


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


def _require_api_key(auth_header: Optional[str]) -> None:
    api_key = os.getenv("ML_SERVICE_API_KEY")
    if not api_key:
        return
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = auth_header.split("Bearer ", 1)[1].strip()
    if token != api_key:
        raise HTTPException(status_code=401, detail="Unauthorized")


def _fit_isolation_forest(values: List[float], contamination: float, seed: Optional[int]):
    X = np.array(values, dtype=float).reshape(-1, 1)
    model = IsolationForest(
        contamination=contamination,
        random_state=seed,
        n_estimators=200,
    )
    model.fit(X)
    return model


def _scores(model: IsolationForest, values: List[float]) -> np.ndarray:
    X = np.array(values, dtype=float).reshape(-1, 1)
    raw_scores = model.score_samples(X)
    return -raw_scores


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/score", response_model=ScoreResult)
def score(req: ScoreRequest, authorization: Optional[str] = Header(default=None)):
    _require_api_key(authorization)

    if len(req.values) < req.config.minPoints:
        return ScoreResult(
            isAnomaly=False,
            score=0.0,
            threshold=0.0,
            method=req.config.method,
            reason="Insufficient data",
            meta={"minPoints": req.config.minPoints, "windowSize": req.config.windowSize},
        )

    model = _fit_isolation_forest(
        req.values,
        req.config.contamination,
        req.config.seed,
    )
    training_scores = _scores(model, req.values)
    threshold = float(np.quantile(training_scores, 1 - req.config.contamination))

    new_score = float(_scores(model, [req.newValue])[0])
    is_anomaly = new_score >= threshold

    return ScoreResult(
        isAnomaly=is_anomaly,
        score=new_score,
        threshold=threshold,
        method=req.config.method,
        reason="Isolation Forest score >= threshold" if is_anomaly else "Within expected range",
        meta={
            "windowSize": req.config.windowSize,
            "minPoints": req.config.minPoints,
            "contamination": req.config.contamination,
            "seed": req.config.seed,
        },
    )


@app.post("/score/batch")
def score_batch(
    req: BatchScoreRequest, authorization: Optional[str] = Header(default=None)
):
    _require_api_key(authorization)

    if len(req.values) < req.config.minPoints:
        results = [
            ScoreResult(
                isAnomaly=False,
                score=0.0,
                threshold=0.0,
                method=req.config.method,
                reason="Insufficient data",
                meta={"minPoints": req.config.minPoints, "windowSize": req.config.windowSize},
            )
            for _ in req.values
        ]
        return {"results": results}

    model = _fit_isolation_forest(
        req.values,
        req.config.contamination,
        req.config.seed,
    )
    scores = _scores(model, req.values)
    threshold = float(np.quantile(scores, 1 - req.config.contamination))

    results = []
    for score in scores:
        score_val = float(score)
        is_anomaly = score_val >= threshold
        results.append(
            ScoreResult(
                isAnomaly=is_anomaly,
                score=score_val,
                threshold=threshold,
                method=req.config.method,
                reason="Isolation Forest score >= threshold"
                if is_anomaly
                else "Within expected range",
                meta={
                    "windowSize": req.config.windowSize,
                    "minPoints": req.config.minPoints,
                    "contamination": req.config.contamination,
                    "seed": req.config.seed,
                },
            )
        )

    return {"results": results}
