import time
import httpx
from fastapi import Header, HTTPException, Depends
from typing import Optional, Dict, Any
from .config import SUPABASE_URL, SUPABASE_ANON_KEY

# Cache verified tokens for up to 60 seconds to optimize performance
_TOKEN_CACHE: Dict[str, Dict[str, Any]] = {}
CACHE_TTL_SECONDS = 60

class AuthenticatedUser:
    def __init__(self, id: str, email: str, role: str, raw: dict, token: str):
        self.id = id
        self.email = email
        self.role = role
        self.raw = raw
        self.token = token

    def __repr__(self):
        return f"<AuthenticatedUser id={self.id} email={self.email}>"

async def get_current_user(authorization: Optional[str] = Header(None)) -> AuthenticatedUser:
    """
    Reusable FastAPI authentication dependency.
    Extracts Supabase access token from Authorization header (Bearer <token>),
    validates it against Supabase Auth (https://<project>.supabase.co/auth/v1/user),
    and returns an AuthenticatedUser object with verified user ID.
    Rejects any unauthenticated or spoofed request with 401 Unauthorized.
    """
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Authorization header is required. Format: Bearer <Supabase_Token>",
            headers={"WWW-Authenticate": "Bearer"},
        )

    parts = authorization.strip().split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=401,
            detail="Invalid Authorization header format. Expected 'Bearer <token>'",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = parts[1].strip()
    if not token or len(token.split(".")) != 3:
        raise HTTPException(
            status_code=401,
            detail="Invalid JWT token structure. Expected 3 parts in JWT.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check cache
    now = time.time()
    if token in _TOKEN_CACHE:
        cached = _TOKEN_CACHE[token]
        if now - cached["timestamp"] < CACHE_TTL_SECONDS:
            u = cached["user"]
            return AuthenticatedUser(
                id=u["id"],
                email=u.get("email", ""),
                role=u.get("role", "authenticated"),
                raw=u,
                token=token,
            )

    # Validate against Supabase Auth endpoint
    user_url = f"{SUPABASE_URL.rstrip('/')}/auth/v1/user"
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {token}",
    }

    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(user_url, headers=headers)
            if resp.status_code != 200:
                raise HTTPException(
                    status_code=401,
                    detail="Invalid, revoked, or expired Supabase authentication session.",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            user_data = resp.json()
            user_id = user_data.get("id")
            if not user_id:
                raise HTTPException(status_code=401, detail="Malformed Supabase user profile")

            # Cache validated token
            _TOKEN_CACHE[token] = {
                "timestamp": now,
                "user": user_data,
            }

            return AuthenticatedUser(
                id=user_id,
                email=user_data.get("email", ""),
                role=user_data.get("role", "authenticated"),
                raw=user_data,
                token=token,
            )
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Unable to reach Supabase Auth provider for token verification: {exc}",
        )
