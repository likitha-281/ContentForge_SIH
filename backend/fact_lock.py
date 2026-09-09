import re
from typing import List, Dict, Any, Optional

class FactLockEngine:
    """
    INTELLI-FORGE Fact Lock Engine:
    Identifies, locks, and monitors critical factual anchors (numbers, dates, locations,
    severity levels, version identifiers, and key organizational entities).
    Detects fact mutability and hallucination conflicts (e.g., 17 vs 71 systems affected).
    """

    @staticmethod
    def extract_facts(text: str) -> List[Dict[str, Any]]:
        facts: List[Dict[str, Any]] = []
        seen = set()

        def add_fact(label: str, value: str, category: str, locator: str):
            key = f"{label.lower()}:{value.lower()}"
            if key not in seen and value.strip():
                seen.add(key)
                facts.append({
                    "label": label,
                    "value": value.strip(),
                    "category": category,
                    "locator": locator,
                    "is_locked": True,
                })

        # 1. Detect Dates & Timestamps
        date_patterns = [
            r"\b(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})\b",
            r"\b(\d{4}-\d{2}-\d{2})\b",
            r"\b(\d{1,2}:\d{2}(?:\s*(?:IST|UTC|GMT|AM|PM))?)\b",
        ]
        for pattern in date_patterns:
            for match in re.finditer(pattern, text, re.IGNORECASE):
                val = match.group(1)
                add_fact("Incident / Reported Date", val, "date", f"Char {match.start()}-{match.end()}")

        # 2. Detect Numbers & Quantities associated with systems, units, hours, percentages
        quantity_patterns = [
            (r"\b(\d+)\s+(systems|hosts|servers|switches|devices|workstations|endpoints)\b", "Systems Affected"),
            (r"\b(\d+)\s+(subnets|networks|vlans|interfaces|hubs)\b", "Network Segments Affected"),
            (r"\b(\d+)\s+(hours|days|weeks|minutes)\b", "Time / Duration Metric"),
            (r"\b(\d+[\d,]*)\s+(residents|citizens|people|personnel|battalions)\b", "Personnel / Residents Impacted"),
            (r"\b(\d+(?:\.\d+)?)\s*(%|percent)\b", "Percentage Metric"),
        ]
        for pattern, label in quantity_patterns:
            for match in re.finditer(pattern, text, re.IGNORECASE):
                num_val = match.group(1)
                full_phrase = match.group(0)
                add_fact(label, num_val, "number", full_phrase)

        # 3. Detect Severity / Classification
        severity_match = re.search(r"\b(high-severity|critical|urgent|high|moderate|low)\s*(?:severity|incident)?\b", text, re.IGNORECASE)
        if severity_match:
            add_fact("Incident Severity", severity_match.group(1).title(), "severity", severity_match.group(0))

        # 4. Detect Specific Locations
        location_patterns = [
            r"\bin\s+([A-Z][a-zA-Z\s]{2,20})\b",
            r"\bnear\s+([A-Z][a-zA-Z\s]{2,20})\b",
        ]
        for pat in location_patterns:
            for match in re.finditer(pat, text):
                loc = match.group(1).strip()
                if loc not in ["Section", "February", "August", "September", "Version", "Security"]:
                    add_fact("Location / Geography", loc, "location", match.group(0))

        # 5. Detect Version / Recommendation Mandates
        version_match = re.search(r"\b(version\s+[A-Za-z0-9\.\-]+|security\s+release\s+[vV\d\.]+)\b", text, re.IGNORECASE)
        if version_match:
            add_fact("Target Release / Version", version_match.group(1), "version", version_match.group(0))

        # 6. Action item detection
        action_match = re.search(r"(?:recommended action(?:\s+is)?|mandatory actions?|action mandate)[\s:]+([^\.\n]+)", text, re.IGNORECASE)
        if action_match:
            add_fact("Recommended Action", action_match.group(1).strip(), "action", action_match.group(0))

        return facts

    @staticmethod
    def detect_conflicts(locked_facts: List[Dict[str, Any]], generated_text: str) -> List[Dict[str, Any]]:
        """
        Detects conflicts where generated text contradicts a locked source fact.
        For example, if Source has: Systems Affected = 17, and Generated has 71 systems.
        """
        conflicts: List[Dict[str, Any]] = []

        for fact in locked_facts:
            label = fact.get("label", "")
            val = str(fact.get("value", "")).strip()
            category = fact.get("category", "")

            # Check numeric conflicts
            if category == "number" and val.isdigit():
                num_int = int(val)
                # Look specifically for numbers tied to systems, hosts, or devices
                matches = re.finditer(r"\b(\d+)\s+(systems|servers|hosts|switches|devices|workstations|endpoints|subnets)\b", generated_text, re.IGNORECASE)
                for m in matches:
                    gen_num_str = m.group(1)
                    gen_num = int(gen_num_str)
                    if gen_num != num_int:
                        conflicts.append({
                            "fact_label": label,
                            "locked_value": val,
                            "generated_value": gen_num_str,
                            "generated_text": m.group(0),
                            "status": "open",
                            "suggestion": f"Conflict detected: Source states {val} {m.group(2)}, but generated text says {gen_num_str} {m.group(2)}. Restore to {val}."
                        })

            # Check location conflict
            elif category == "location":
                if val.lower() not in generated_text.lower():
                    # If common other Indian cities/places are present instead of the source location
                    other_places = ["Bangalore", "Bengaluru", "Mumbai", "Delhi", "Chennai", "Kolkata", "Pune"]
                    for other in other_places:
                        if other.lower() != val.lower() and other.lower() in generated_text.lower():
                            conflicts.append({
                                "fact_label": label,
                                "locked_value": val,
                                "generated_value": other,
                                "generated_text": f"Generated references {other} instead of source location {val}",
                                "status": "open",
                                "suggestion": f"Location mismatch: Source location is {val}, generated text mentions {other}."
                            })

            # Check version conflict
            elif category == "version" or "version" in label.lower():
                ver_source_match = re.search(r"\b(version\s+[A-Za-z0-9\.\-]+)\b", val, re.IGNORECASE)
                if ver_source_match:
                    source_ver = ver_source_match.group(1).lower()
                    gen_ver_matches = re.finditer(r"\b(version\s+[A-Za-z0-9\.\-]+)\b", generated_text, re.IGNORECASE)
                    found_mismatch = False
                    for vm in gen_ver_matches:
                        if vm.group(1).lower() != source_ver:
                            found_mismatch = True
                            conflicts.append({
                                "fact_label": label,
                                "locked_value": val,
                                "generated_value": vm.group(1),
                                "generated_text": vm.group(0),
                                "status": "open",
                                "suggestion": f"Version conflict: Source requires {val}, but generated output specifies {vm.group(1)}."
                            })
                    # If no version was mentioned at all, or wrong version
                    if not found_mismatch and source_ver not in generated_text.lower():
                        conflicts.append({
                            "fact_label": label,
                            "locked_value": val,
                            "generated_value": "Missing",
                            "generated_text": "Missing mandated target version",
                            "status": "open",
                            "suggestion": f"Version omission: Output does not state target version {val}."
                        })

        return conflicts
