import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from root project if exists
root_env = Path(__file__).resolve().parent.parent / ".env"
if root_env.exists():
    load_dotenv(root_env)
else:
    load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL") or "https://toqcdcapidfcgxfdqcvy.supabase.co"
SUPABASE_ANON_KEY = os.getenv("SUPABASE_PUBLISHABLE_KEY") or os.getenv("VITE_SUPABASE_PUBLISHABLE_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY") or "sb_publishable_tRxdda-sMwyS2zBtRw6-zA_qIVzKll3"
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or ""

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or ""
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY") or ""
LOVABLE_API_KEY = os.getenv("LOVABLE_API_KEY") or ""

QDRANT_URL = os.getenv("QDRANT_URL") or "http://localhost:6333"
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY") or ""

CORS_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "*"
]
