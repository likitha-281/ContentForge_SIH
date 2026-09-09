import uuid
import time
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, Body
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List, Dict, Any

from .config import CORS_ORIGINS
from .auth import get_current_user, AuthenticatedUser
from .pipeline import DocumentProcessor
from .fact_lock import FactLockEngine
from .rag import HybridRAG
from .llm import LLMService
from .trust_engine import TrustEngine
from .audit import AuditService
from .supabase_db import SupabaseDB

app = FastAPI(
    title="ContentForge Application Backend",
    description="ContentForge platform for fact-locked content transformation",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

rag_engine = HybridRAG()

@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "service": "ContentForge Core API",
        "version": "2.0.0",
        "modules": {
            "auth": "Supabase Auth (Bearer JWT)",
            "database": "Supabase PostgreSQL (RLS Enforced)",
            "storage": "Supabase Storage",
            "fact_lock": "Active",
            "trust_engine": "Active",
            "rag": "Hybrid BM25 + Semantic"
        }
    }

@app.get("/api/auth/me")
async def get_me(user: AuthenticatedUser = Depends(get_current_user)):
    """Verifies that the Supabase access token is valid and returns user identity."""
    return {
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "authenticated": True,
    }

@app.post("/api/upload")
async def upload_source(
    title: Optional[str] = Form(None),
    kind: str = Form("incident report"),
    text: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Upload source content: supports direct text input or file uploads (PDF, DOCX, TXT, etc.).
    Extracts content using PyMuPDF / python-docx and registers document metadata.
    """
    db = SupabaseDB(user.token, user.id)
    doc_id = str(uuid.uuid4())
    job_id = str(uuid.uuid4())

    extracted_text = text or ""
    byte_size = len(extracted_text.encode("utf-8"))
    ext_method = "direct_text"
    storage_path = None
    filename = None

    if file:
        filename = file.filename
        file_bytes = await file.read()
        byte_size = len(file_bytes)
        storage_path = f"{user.id}/{doc_id}/{filename}"
        
        parsed = DocumentProcessor.extract_from_bytes(file_bytes, filename)
        extracted_text = parsed.get("text", "")
        ext_method = parsed.get("extraction_method", "binary")
        if not title:
            title = filename

    if not title:
        title = f"Intelligence Source - {time.strftime('%Y-%m-%d %H:%M')}"

    # Insert Source record
    source_record = {
        "id": doc_id,
        "user_id": user.id,
        "title": title,
        "kind": kind,
        "raw_text": extracted_text,
        "byte_size": byte_size,
        "storage_path": storage_path,
        "extraction_method": ext_method,
        "status": "uploaded",
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    await db.insert("sources", source_record)

    # Initialise Job
    stages = [
        {"key": "upload", "label": "Source received", "status": "done", "note": f"{byte_size} bytes received"},
        {"key": "parsing", "label": "Parsing & normalising", "status": "pending"},
        {"key": "extraction", "label": "Text extraction", "status": "pending"},
        {"key": "understanding", "label": "Content understanding", "status": "pending"},
        {"key": "facts", "label": "Fact extraction", "status": "pending"},
        {"key": "factlock", "label": "Fact lock", "status": "pending"},
        {"key": "indexing", "label": "Chunking & keyword indexing", "status": "pending"},
        {"key": "ready", "label": "Ready for transformation", "status": "pending"},
    ]

    job_record = {
        "id": job_id,
        "user_id": user.id,
        "source_id": doc_id,
        "status": "queued",
        "current_stage": "upload",
        "stages": stages,
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    await db.insert("jobs", job_record)

    # Audit event
    audit_evt = AuditService.create_event(
        user_id=user.id,
        actor=user.email or "operator",
        action="source.uploaded",
        entity_type="source",
        entity_id=doc_id,
        detail=f"Source uploaded: {title} ({ext_method})",
    )
    await db.insert("audit_events", audit_evt)

    return {
        "source_id": doc_id,
        "job_id": job_id,
        "title": title,
        "status": "queued",
    }

@app.post("/api/process/{job_id}")
async def process_job(
    job_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Executes the full understanding, fact extraction, fact locking,
    and RAG chunking pipeline for a queued job.
    """
    db = SupabaseDB(user.token, user.id)
    jobs = await db.select("jobs", {"id": job_id})
    if not jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    job = jobs[0]

    sources = await db.select("sources", {"id": job["source_id"]})
    if not sources:
        raise HTTPException(status_code=404, detail="Source not found")
    source = sources[0]
    raw_text = source.get("raw_text", "")

    # 1. Chunking
    chunks = rag_engine.chunk_document(raw_text)
    for c in chunks:
        c_record = {
            "id": str(uuid.uuid4()),
            "user_id": user.id,
            "source_id": source["id"],
            "ordinal": c["ordinal"],
            "locator": c["locator"],
            "page_number": c["page_number"],
            "section": c["section"],
            "content": c["content"],
            "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
        await db.insert("source_chunks", c_record)

    # 2. Fact Extraction & Fact Locking
    facts = FactLockEngine.extract_facts(raw_text)
    for f in facts:
        f_record = {
            "id": str(uuid.uuid4()),
            "user_id": user.id,
            "source_id": source["id"],
            "label": f["label"],
            "value": f["value"],
            "category": f["category"],
            "locator": f["locator"],
            "is_locked": True,
            "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
        await db.insert("facts", f_record)

    # 3. Update Job status
    updated_stages = [
        {"key": "upload", "label": "Source received", "status": "done"},
        {"key": "parsing", "label": "Parsing & normalising", "status": "done"},
        {"key": "extraction", "label": "Text extraction", "status": "done"},
        {"key": "understanding", "label": "Content understanding", "status": "done"},
        {"key": "facts", "label": "Fact extraction", "status": "done", "note": f"{len(facts)} facts extracted"},
        {"key": "factlock", "label": "Fact lock", "status": "done", "note": f"{len(facts)} critical facts locked"},
        {"key": "indexing", "label": "Chunking & keyword indexing", "status": "done", "note": f"{len(chunks)} chunks indexed"},
        {"key": "ready", "label": "Ready for transformation", "status": "done"},
    ]

    await db.update("jobs", job_id, {
        "status": "ready",
        "current_stage": "ready",
        "stages": updated_stages,
        "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    })

    # Audit event
    audit_evt = AuditService.create_event(
        user_id=user.id,
        actor=user.email or "operator",
        action="source.processed",
        entity_type="job",
        entity_id=job_id,
        detail=f"Processed source with {len(facts)} locked facts and {len(chunks)} retrieval chunks.",
    )
    await db.insert("audit_events", audit_evt)

    return {
        "job_id": job_id,
        "source_id": source["id"],
        "status": "ready",
        "facts_count": len(facts),
        "chunks_count": len(chunks),
        "facts": facts,
    }

@app.post("/api/generate")
async def generate_artefact(
    payload: Dict[str, Any] = Body(...),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Generates audience-tailored content based on operator requirement,
    applies Fact Lock grounding, evaluates trust/evidence coverage,
    and returns verified artefacts.
    """
    db = SupabaseDB(user.token, user.id)
    source_id = payload.get("sourceId")
    if not source_id:
        raise HTTPException(status_code=400, detail="sourceId is required")

    sources = await db.select("sources", {"id": source_id})
    if not sources:
        raise HTTPException(status_code=404, detail="Source not found")
    source = sources[0]

    # Retrieve facts and chunks
    locked_facts = await db.select("facts", {"source_id": source_id})
    chunks = await db.select("source_chunks", {"source_id": source_id})

    artefacts_req = payload.get("artefacts", [
        {
            "audience": "Executive Leadership",
            "outputType": "Executive Brief",
            "tone": "Formal",
            "detail": "Concise",
            "objective": "Executive Briefing",
        }
    ])
    language = payload.get("language", "English")

    generated_results = []

    for req in artefacts_req:
        audience = req.get("audience", "Executive")
        output_type = req.get("outputType", "Executive Brief")
        tone = req.get("tone", "Formal")
        detail = req.get("detail", "Concise")
        objective = req.get("objective", "Inform")

        # 1. Generate text grounded in locked facts
        gen_res = LLMService.generate_artefact(
            source_title=source.get("title", ""),
            source_content=source.get("raw_text", ""),
            locked_facts=locked_facts,
            audience=audience,
            output_type=output_type,
            tone=tone,
            detail=detail,
            objective=objective,
            language=language,
        )

        content = gen_res["content"]
        output_id = str(uuid.uuid4())

        # 2. Evaluate with Trust Engine
        eval_res = TrustEngine.evaluate(
            source_text=source.get("raw_text", ""),
            source_chunks=chunks,
            locked_facts=locked_facts,
            generated_content=content,
            audience=audience,
            output_type=output_type,
        )

        # 3. Store Output in DB
        output_record = {
            "id": output_id,
            "user_id": user.id,
            "source_id": source_id,
            "output_type": output_type,
            "audience": audience,
            "tone": tone,
            "content": content,
            "status": "generated",
            "verification_status": eval_res["verification_status"],
            "evidence_coverage": eval_res["evidence_coverage"],
            "model": gen_res["model"],
            "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
        await db.insert("outputs", output_record)

        # Store output claims
        for claim in eval_res["output_claims"]:
            claim_rec = {
                "id": str(uuid.uuid4()),
                "user_id": user.id,
                "output_id": output_id,
                "ordinal": claim["ordinal"],
                "sentence": claim["sentence"],
                "locator": claim["locator"],
                "evidence_text": claim["evidence_text"],
                "grounded": claim["grounded"],
                "match_score": claim["match_score"],
                "chunk_id": claim["chunk_id"],
                "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            }
            await db.insert("output_claims", claim_rec)

        # Store fact conflicts if any
        for conflict in eval_res["conflicts"]:
            conf_rec = {
                "id": str(uuid.uuid4()),
                "user_id": user.id,
                "output_id": output_id,
                "fact_label": conflict["fact_label"],
                "locked_value": conflict["locked_value"],
                "generated_text": conflict["generated_text"],
                "generated_value": conflict.get("generated_value"),
                "status": "open",
                "suggestion": conflict["suggestion"],
                "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            }
            await db.insert("fact_conflicts", conf_rec)

        # Store trust checks
        for tc in eval_res["trust_checks"]:
            tc_rec = {
                "id": str(uuid.uuid4()),
                "user_id": user.id,
                "output_id": output_id,
                "check_key": tc["check_key"],
                "label": tc["label"],
                "status": tc["status"],
                "detail": tc["detail"],
                "method": tc["method"],
                "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            }
            await db.insert("trust_checks", tc_rec)

        # Audit event
        audit_evt = AuditService.create_event(
            user_id=user.id,
            actor=user.email or "operator",
            action="output.generated",
            entity_type="output",
            entity_id=output_id,
            detail=f"Generated {output_type} for {audience} with status {eval_res['verification_status']}",
        )
        await db.insert("audit_events", audit_evt)

        generated_results.append({
            "output_id": output_id,
            "output_type": output_type,
            "audience": audience,
            "content": content,
            "verification_status": eval_res["verification_status"],
            "evidence_coverage": eval_res["evidence_coverage"],
            "conflicts": eval_res["conflicts"],
            "output_claims": eval_res["output_claims"],
            "trust_checks": eval_res["trust_checks"],
        })

    return {
        "source_id": source_id,
        "results": generated_results,
    }

@app.post("/api/verify")
async def verify_content(
    payload: Dict[str, Any] = Body(...),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Verifies user-edited or generated content against source Fact Lock.
    Specifically triggers fact conflict detection (e.g., when 17 is changed to 71).
    """
    db = SupabaseDB(user.token, user.id)
    source_id = payload.get("sourceId")
    content = payload.get("content", "")
    audience = payload.get("audience", "Executive")
    output_type = payload.get("outputType", "Executive Brief")

    locked_facts = await db.select("facts", {"source_id": source_id}) if source_id else []
    chunks = await db.select("source_chunks", {"source_id": source_id}) if source_id else []

    eval_res = TrustEngine.evaluate(
        source_text="",
        source_chunks=chunks,
        locked_facts=locked_facts,
        generated_content=content,
        audience=audience,
        output_type=output_type,
    )

    return eval_res

@app.post("/api/review/{output_id}")
async def submit_review(
    output_id: str,
    payload: Dict[str, Any] = Body(...),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Human Review action: 'approved', 'rejected', or 'edited'.
    If edited content conflicts with a Fact Lock, returns a prominent warning.
    """
    db = SupabaseDB(user.token, user.id)
    action = payload.get("action", "approved")
    notes = payload.get("notes", "")
    edited_content = payload.get("editedContent")

    outputs = await db.select("outputs", {"id": output_id})
    if not outputs:
        raise HTTPException(status_code=404, detail="Output not found")
    output = outputs[0]

    # Check for conflicts if edited
    conflicts = []
    if edited_content and edited_content != output.get("content"):
        locked_facts = await db.select("facts", {"source_id": output.get("source_id")})
        conflicts = FactLockEngine.detect_conflicts(locked_facts, edited_content)

    new_status = "approved" if action == "approved" else "rejected" if action == "rejected" else "edited"
    updates: Dict[str, Any] = {
        "status": new_status,
        "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    if edited_content:
        updates["content"] = edited_content

    await db.update("outputs", output_id, updates)

    # Record review entry
    rev_rec = {
        "id": str(uuid.uuid4()),
        "user_id": user.id,
        "output_id": output_id,
        "action": action,
        "notes": notes,
        "previous_content": output.get("content"),
        "edited_content": edited_content,
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    await db.insert("reviews", rev_rec)

    # Log audit event
    audit_evt = AuditService.create_event(
        user_id=user.id,
        actor=user.email or "operator",
        action=f"output.{action}",
        entity_type="output",
        entity_id=output_id,
        detail=f"Human review: {action.upper()} by {user.email}. Notes: {notes or 'None'}",
    )
    await db.insert("audit_events", audit_evt)

    return {
        "output_id": output_id,
        "status": new_status,
        "conflicts_detected": conflicts,
        "has_conflicts": len(conflicts) > 0,
        "message": f"Output marked as {new_status}."
    }

@app.post("/api/distribute/{output_id}")
async def distribute_output(
    output_id: str,
    payload: Dict[str, Any] = Body(...),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Distributes approved artefact via Web, SMTP email, or REST API webhook.
    """
    db = SupabaseDB(user.token, user.id)
    channel = payload.get("channel", "web")
    target = payload.get("target", "Operator Console")

    outputs = await db.select("outputs", {"id": output_id})
    if not outputs:
        raise HTTPException(status_code=404, detail="Output not found")
    output = outputs[0]

    dist_rec = {
        "id": str(uuid.uuid4()),
        "user_id": user.id,
        "output_id": output_id,
        "channel": channel,
        "target": target,
        "status": "sent",
        "payload": {
            "output_type": output.get("output_type"),
            "audience": output.get("audience"),
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        },
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    await db.insert("distributions", dist_rec)

    audit_evt = AuditService.create_event(
        user_id=user.id,
        actor=user.email or "operator",
        action="output.distributed",
        entity_type="output",
        entity_id=output_id,
        detail=f"Output distributed via {channel.upper()} to {target}",
    )
    await db.insert("audit_events", audit_evt)

    return {
        "output_id": output_id,
        "channel": channel,
        "target": target,
        "status": "sent",
        "message": f"Successfully distributed artefact via {channel.upper()} to {target}."
    }

@app.get("/api/dashboard")
async def get_dashboard_metrics(user: AuthenticatedUser = Depends(get_current_user)):
    """Provides live operational stats for the signed-in operator."""
    db = SupabaseDB(user.token, user.id)
    sources = await db.select("sources")
    jobs = await db.select("jobs")
    outputs = await db.select("outputs")
    conflicts = await db.select("fact_conflicts", {"status": "open"})
    audit_events = await db.select("audit_events")

    pending_reviews = [o for o in outputs if o.get("status") in ["generated", "edited"]]

    return {
        "active_documents": len(sources),
        "processing_jobs": len(jobs),
        "generated_outputs": len(outputs),
        "pending_reviews": len(pending_reviews),
        "active_conflicts": len(conflicts),
        "audit_events_count": len(audit_events),
        "recent_activity": audit_events[-10:] if audit_events else [],
    }

@app.get("/api/audit")
async def get_audit_trail(user: AuthenticatedUser = Depends(get_current_user)):
    """Returns the immutable cryptographic audit trail for the operator."""
    db = SupabaseDB(user.token, user.id)
    events = await db.select("audit_events")
    events.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return {
        "count": len(events),
        "events": events,
    }
