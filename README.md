# ContentForge

ContentForge is a student-built content transformation platform. It turns one source document into clear, audience-specific drafts while keeping important facts traceable and giving a human the final approval.

## Project layout

- `src/` — the web application and authenticated workspace
- `backend/` — the FastAPI service for uploads, processing, generation, review, and distribution
- `supabase/` — database configuration and migrations
- `scripts/` — small maintenance and build helpers

## Run locally

Install the JavaScript dependencies, then start the web application with the existing project scripts. To run the Python service separately, install `backend/requirements.txt` and start FastAPI with:

```bash
uvicorn backend.main:app --reload --port 8000
```

The web app uses Supabase for sign-in and data storage. The FastAPI service accepts the signed-in Supabase access token and applies the same user boundary when reading and writing records.

## Main workflow

1. Create an account or sign in.
2. Add a report, memo, advisory, or supported document.
3. Run source understanding and fact locking.
4. Open the workspace to create audience-specific outputs.
5. Review, approve, and distribute an output.

## Deployment

The frontend is configured for Vercel and the Python API is configured for Render. Deploy the frontend and API from the same repository, then set the frontend API base URL to the deployed Render service URL. Keep private model credentials on the backend only.

ContentForge includes a deterministic local generation path so the core workflow remains usable when no model provider is configured.
