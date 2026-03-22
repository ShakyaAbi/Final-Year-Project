from typing import List, Tuple
import numpy as np
from .base import AnomalyDetector

class ZScoreDetector(AnomalyDetector):
    def __init__(self, threshold: float = 3.5):
        """
        Modified Z-score.
        Values > 3.5 are generally considered outliers.
        """
        self.threshold = threshold
        self.median = 0.0
        self.mad = 0.0

    def fit(self, values: List[float]) -> None:
        data = np.array(values, dtype=float)
        self.median = np.median(data)
        # Median Absolute Deviation
        self.mad = np.median(np.abs(data - self.median))
        if self.mad == 0:
            self.mad = 1e-9 # Prevent division by zero

    def score(self, values: List[float]) -> Tuple[np.ndarray, float]:
        data = np.array(values, dtype=float)
        # Modified Z-score = 0.6745 * (x - median) / MAD
        scores = 0.6745 * np.abs(data - self.median) / self.mad
        return scores, self.threshold
