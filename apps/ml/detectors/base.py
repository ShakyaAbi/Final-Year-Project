from abc import ABC, abstractmethod
from typing import List, Tuple
import numpy as np

class AnomalyDetector(ABC):
    @abstractmethod
    def fit(self, values: List[float]) -> None:
        """Fit the model on historical data."""
        pass

    @abstractmethod
    def score(self, values: List[float]) -> Tuple[np.ndarray, float]:
        """
        Score new values.
        Returns Tuple of (scores, threshold).
        Values with score >= threshold are considered anomalies.
        """
        pass
