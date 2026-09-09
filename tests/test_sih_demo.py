from backend.fact_lock import FactLockEngine
from backend.rag import HybridRAG
from backend.llm import LLMService
from backend.trust_engine import TrustEngine

def main():
    source_text = "On 12 August 2026, a high-severity security incident was detected in Hyderabad. 17 systems were affected. The recommended action is to patch the affected systems to Version Y."

    print("==================================================")
    print("STEP 1: FACT EXTRACTION & FACT LOCK")
    print("==================================================")
    facts = FactLockEngine.extract_facts(source_text)
    for f in facts:
        print(f"  [LOCKED FACT] {f['label']}: '{f['value']}' ({f['category']})")

    assert any(f["value"] == "17" for f in facts), "17 systems must be locked"
    assert any("Hyderabad" in f["value"] for f in facts), "Hyderabad location must be locked"
    assert any("12 August 2026" in f["value"] for f in facts), "Incident date must be locked"

    print("\n==================================================")
    print("STEP 2: CHUNKING & HYBRID RETRIEVAL")
    print("==================================================")
    rag = HybridRAG()
    chunks = rag.chunk_document(source_text)
    print(f"  Document divided into {len(chunks)} indexed chunks.")

    print("\n==================================================")
    print("STEP 3: LLM GENERATION (EXECUTIVE BRIEF)")
    print("==================================================")
    gen = LLMService.generate_artefact(
        source_title="Incident Report - Hyderabad",
        source_content=source_text,
        locked_facts=facts,
        audience="Executive Leadership",
        output_type="Executive Brief",
        tone="Formal & Concise",
        detail="Concise",
        objective="Executive briefing on incident, scope, and mitigation",
    )
    print(gen["content"])

    print("\n==================================================")
    print("STEP 4: TRUST & EVIDENCE PROVENANCE EVALUATION")
    print("==================================================")
    eval_result = TrustEngine.evaluate(
        source_text=source_text,
        source_chunks=chunks,
        locked_facts=facts,
        generated_content=gen["content"],
        audience="Executive Leadership",
        output_type="Executive Brief"
    )
    print(f"  Verification Status: {eval_result['verification_status']}")
    print(f"  Evidence Grounding Coverage: {eval_result['evidence_coverage']}%")
    print(f"  Fact Conflicts: {len(eval_result['conflicts'])}")

    for claim in eval_result["output_claims"][:3]:
        print(f"  [EVIDENCE TRACE] Claim: \"{claim['sentence'][:55]}...\" -> Locator: {claim['locator']} (Grounded: {claim['grounded']})")

    assert eval_result["verification_status"] == "VERIFIED", "Original generated output should be verified"
    assert len(eval_result["conflicts"]) == 0, "No conflicts should exist in compliant output"

    print("\n==================================================")
    print("STEP 5: CONTROLLED FACT CONFLICT TEST (17 -> 71)")
    print("==================================================")
    tampered_content = gen["content"].replace("17", "71")
    tampered_eval = TrustEngine.evaluate(
        source_text=source_text,
        source_chunks=chunks,
        locked_facts=facts,
        generated_content=tampered_content,
        audience="Executive Leadership",
        output_type="Executive Brief"
    )

    print(f"  Tampered Status: {tampered_eval['verification_status']}")
    print(f"  Conflicts Count: {len(tampered_eval['conflicts'])}")

    assert tampered_eval["verification_status"] == "FACT CONFLICT", "Tampered output must fail verification"
    assert len(tampered_eval["conflicts"]) > 0, "Fact conflict must be detected"

    for c in tampered_eval["conflicts"]:
        print(f"  [DETECTED CONFLICT] Label: {c['fact_label']} | Source Fact: {c['locked_value']} vs Generated: {c['generated_value']}")
        print(f"  Resolution Suggestion: {c['suggestion']}")

    print("\n>>> ALL DEMO SCENARIO CHECKS PASSED SUCCESSFULLY! <<<")

if __name__ == "__main__":
    main()
