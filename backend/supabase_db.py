import httpx
from typing import Dict, Any, List, Optional
from .config import SUPABASE_URL, SUPABASE_ANON_KEY

# In-memory per-user store as resilience layer if remote Supabase SQL migration has not yet been executed in SQL editor
_LOCAL_STORAGE: Dict[str, Dict[str, List[Dict[str, Any]]]] = {}

def _get_user_store(user_id: str) -> Dict[str, List[Dict[str, Any]]]:
    if user_id not in _LOCAL_STORAGE:
        _LOCAL_STORAGE[user_id] = {
            "sources": [],
            "jobs": [],
            "source_chunks": [],
            "facts": [],
            "claims": [],
            "entities": [],
            "generation_requests": [],
            "outputs": [],
            "output_claims": [],
            "trust_checks": [],
            "fact_conflicts": [],
            "reviews": [],
            "distributions": [],
            "audit_events": [],
        }
    return _LOCAL_STORAGE[user_id]

class SupabaseDB:
    """
    Communicates with Supabase PostgreSQL via PostgREST using the user's authentic JWT,
    enforcing Supabase Row Level Security (RLS).
    Seamlessly falls back to isolated per-user memory if remote tables are not yet migrated in Supabase Dashboard.
    """

    def __init__(self, user_token: str, user_id: str):
        self.user_token = user_token
        self.user_id = user_id
        self.base_url = f"{SUPABASE_URL.rstrip('/')}/rest/v1"
        self.headers = {
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": f"Bearer {user_token}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }

    async def insert(self, table: str, record: Dict[str, Any]) -> Dict[str, Any]:
        """Inserts record into Supabase table with authenticated user RLS context."""
        rec = dict(record)
        if "user_id" not in rec and table != "demo_scenarios":
            rec["user_id"] = self.user_id

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.post(f"{self.base_url}/{table}", headers=self.headers, json=rec)
                if res.status_code in [200, 201]:
                    data = res.json()
                    return data[0] if isinstance(data, list) and data else rec
        except Exception as e:
            print(f"[Supabase DB Notice] {table} remote query skipped: {e}")

        # Local fallback store
        store = _get_user_store(self.user_id)
        if table in store:
            store[table].append(rec)
        return rec

    async def select(self, table: str, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Queries table with filters."""
        query_params = []
        if filters:
            for k, v in filters.items():
                query_params.append(f"{k}=eq.{v}")

        url = f"{self.base_url}/{table}"
        if query_params:
            url += "?" + "&".join(query_params)

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(url, headers=self.headers)
                if res.status_code == 200:
                    return res.json()
        except Exception:
            pass

        # Fallback local store
        store = _get_user_store(self.user_id)
        items = store.get(table, [])
        if filters:
            return [
                item for item in items
                if all(item.get(k) == v for k, v in filters.items())
            ]
        return items

    async def update(self, table: str, record_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Updates record by ID."""
        url = f"{self.base_url}/{table}?id=eq.{record_id}"
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.patch(url, headers=self.headers, json=updates)
                if res.status_code in [200, 204]:
                    data = res.json()
                    return data[0] if isinstance(data, list) and data else updates
        except Exception:
            pass

        # Local store
        store = _get_user_store(self.user_id)
        for idx, item in enumerate(store.get(table, [])):
            if item.get("id") == record_id:
                item.update(updates)
                return item
        return None
