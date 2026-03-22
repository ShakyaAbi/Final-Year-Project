import hashlib
import time
import threading
from typing import Any, Dict, Optional, Tuple

class ModelCache:
    def __init__(self, max_entries: int = 100, ttl_seconds: int = 300):
        self.max_entries = max_entries
        self.ttl_seconds = ttl_seconds
        self.cache: Dict[str, Tuple[Any, float, float]] = {}  # key -> (model, threshold, timestamp)
        self.lock = threading.Lock()

    def _generate_key(self, indicator_id: int, values: list, method: str, config_dict: dict) -> str:
        # Create a stable string representation for the data
        # We round values to avoid tiny float diffs causing misses, but hash them for performance
        data_str = f"{indicator_id}:{method}:{sorted(values)}:{config_dict}"
        return hashlib.sha256(data_str.encode()).hexdigest()

    def get(self, key: str) -> Optional[Tuple[Any, float]]:
        with self.lock:
            if key not in self.cache:
                return None
            
            model, threshold, timestamp = self.cache[key]
            if time.time() - timestamp > self.ttl_seconds:
                del self.cache[key]
                return None
            
            # Update timestamp to move to 'recently used' (simple LRU ish)
            self.cache[key] = (model, threshold, time.time())
            return model, threshold

    def put(self, key: str, model: Any, threshold: float):
        with self.lock:
            if len(self.cache) >= self.max_entries:
                # Simple evict oldest based on timestamp
                oldest_key = min(self.cache.keys(), key=lambda k: self.cache[k][2])
                del self.cache[oldest_key]
            
            self.cache[key] = (model, threshold, time.time())

    def clear(self):
        with self.lock:
            self.cache.clear()

    @staticmethod
    def get_data_hash(values: list) -> str:
        # Helper to hash values for the key
        return hashlib.sha256(str(sorted(values)).encode()).hexdigest()
