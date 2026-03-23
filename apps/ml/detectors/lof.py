from typing import List, Tuple
import numpy as np
from sklearn.neighbors import LocalOutlierFactor
from .base import AnomalyDetector

class LOFDetector(AnomalyDetector):
    def __init__(self, contamination: float = 0.05, n_neighbors: int = 20):
        self.contamination = contamination
        self.n_neighbors = n_neighbors
        self.model = LocalOutlierFactor(
            n_neighbors=min(n_neighbors, 20),
            contamination=contamination,
            novelty=True
        )
        self.threshold = 0.0

    def fit(self, values: List[float]) -> None:
        X = np.array(values, dtype=float).reshape(-1, 1)
        # LOF needs enough points for n_neighbors
        n_samples = X.shape[0]
        if n_samples <= self.n_neighbors:
             self.model.n_neighbors = max(1, n_samples - 1)
        
        self.model.fit(X)
        # The threshold is fixed at 1.5 - 2.0 or based on offsets in sklearn
        # offset_ is the threshold for negative_outlier_factor_
        self.threshold = -self.model.offset_

    def score(self, values: List[float]) -> Tuple[np.ndarray, float]:
        X = np.array(values, dtype=float).reshape(-1, 1)
        # negative_outlier_factor_ is the opposite of LOF
        # score_samples returns negative_outlier_factor_
        scores = -self.model.score_samples(X)
        return scores, self.threshold
