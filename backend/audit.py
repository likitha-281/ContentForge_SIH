import hashlib
import json
import time
from typing import Dict, Any, Optional

class AuditService:
    """
    INTELLI-FORGE Audit Ledger:
    Maintains an immutable, tamper-evident log of operational lifecycle events
    using cryptographic SHA-256 hash chains.
    """

    @staticmethod
    def create_event(
        user_id: str,
        actor: str,
        action: str,
        entity_type: str,
        entity_id: Optional[str] = None,
        detail: Optional[str] = None,
        payload: Optional[Dict[str, Any]] = None,
        prev_hash: Optional[str] = None,
    ) -> Dict[str, Any]:
        now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        prev = prev_hash or "0000000000000000000000000000000000000000000000000000000000000000"

        canonical_data = f"{user_id}|{actor}|{action}|{entity_type}|{entity_id}|{detail}|{now_iso}|{prev}"
        event_hash = hashlib.sha256(canonical_data.encode("utf-8")).hexdigest()

        return {
            "user_id": user_id,
            "actor": actor,
            "action": action,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "detail": detail,
            "payload": payload or {},
            "prev_hash": prev,
            "hash": event_hash,
            "created_at": now_iso,
        }
