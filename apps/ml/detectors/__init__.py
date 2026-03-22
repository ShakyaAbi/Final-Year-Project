from .base import AnomalyDetector
from .isolation_forest import IsolationForestDetector
from .zscore import ZScoreDetector
from .lof import LOFDetector
from .dbscan import DBSCANDetector

def get_detector(method: str, config: any) -> AnomalyDetector:
    method = method.upper()
    if method == "ISOLATION_FOREST":
        return IsolationForestDetector(
            contamination=config.contamination,
            seed=config.seed
        )
    elif method == "Z_SCORE":
        # Check for custom threshold in meta/config if added later
        threshold = getattr(config, "zscore_threshold", 3.5)
        return ZScoreDetector(threshold=threshold)
    elif method == "LOF":
        return LOFDetector(contamination=config.contamination)
    elif method == "DBSCAN":
        return DBSCANDetector(min_samples=config.minPoints)
    else:
        # Fallback to Isolation Forest
        return IsolationForestDetector(
            contamination=config.contamination,
            seed=config.seed
        )
