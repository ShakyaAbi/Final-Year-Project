from typing import List, Tuple, Optional
import numpy as np
from sklearn.ensemble import IsolationForest
from .base import AnomalyDetector

class IsolationForestDetector(AnomalyDetector):
    def __init__(self, contamination: float = 0.05, seed: Optional[int] = 42):
        self.contamination = contamination
        self.seed = seed
        self.model = IsolationForest(
            contamination=contamination,
            random_state=seed,
            n_estimators=200
        )
        self.threshold = 0.0

    def fit(self, values: List[float]) -> None:
        X = np.array(values, dtype=float).reshape(-1, 1)
        self.model.fit(X)
        # Calculate threshold on training data
        raw_scores = self.model.score_samples(X)
        scores = -raw_scores
        self.threshold = float(np.quantile(scores, 1 - self.contamination))

    def score(self, values: List[float]) -> Tuple[np.ndarray, float]:
        X = np.array(values, dtype=float).reshape(-1, 1)
        raw_scores = self.model.score_samples(X)
        return -raw_scores, self.threshold
