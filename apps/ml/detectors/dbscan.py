from typing import List, Tuple, Optional
import numpy as np
from sklearn.cluster import DBSCAN
from .base import AnomalyDetector

class DBSCANDetector(AnomalyDetector):
    def __init__(self, eps: Optional[float] = None, min_samples: int = 5):
        self.eps = eps
        self.min_samples = min_samples
        self.model = None
        self.data_mean = 0.0
        self.data_std = 1.0

    def fit(self, values: List[float]) -> None:
        X = np.array(values, dtype=float).reshape(-1, 1)
        self.data_mean = np.mean(X)
        self.data_std = np.std(X) or 1.0
        
        # Scale data for DBSCAN
        X_scaled = (X - self.data_mean) / self.data_std
        
        if self.eps is None:
            # Heuristic: use average distance to k-nearest neighbors
            # For 1D data, a simple quantile works ok
            self.eps = 0.5 

        self.model = DBSCAN(eps=self.eps, min_samples=self.min_samples)
        self.model.fit(X_scaled)

    def score(self, values: List[float]) -> Tuple[np.ndarray, float]:
        # DBSCAN doesn't have a 'predict' for new data easily like IF/LOF
        # We check if the point would be noise if added to the cluster
        X_new = np.array(values, dtype=float).reshape(-1, 1)
        X_scaled_new = (X_new - self.data_mean) / self.data_std
        
        # Simple approximation: if distance to nearest core point > eps, it's an anomaly
        # For simplicity in this FYP, we'll use -1 labels from fit if scoring same data
        # Or distance-based heuristic for new data
        
        # We'll return 1.0 for noise, 0.0 for cluster points
        # Threshold at 0.5
        scores = []
        # Re-fit with new points included is expensive, so let's use a distance heuristic
        # If model was fitted, use its components_ to find nearest
        if self.model is not None and hasattr(self.model, "components_") and len(self.model.components_) > 0:
            for x in X_scaled_new:
                dists = np.abs(self.model.components_ - x)
                min_dist = np.min(dists)
                scores.append(1.0 if min_dist > self.eps else 0.0)
        else:
            scores = [0.0] * len(values)
            
        return np.array(scores), 0.5
