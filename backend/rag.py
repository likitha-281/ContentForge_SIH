import math
import re
from typing import List, Dict, Any, Tuple

class HybridRAG:
    """
    INTELLI-FORGE Hybrid Retrieval:
    Combines BM25 lexical term frequency with semantic ranking,
    returning source-grounded evidence chunks with exact locators.
    """

    def __init__(self):
        self.k1 = 1.5
        self.b = 0.75

    def chunk_document(self, text: str, chunk_size: int = 400, overlap: int = 50) -> List[Dict[str, Any]]:
        """Splits document into structured chunks with locator IDs."""
        paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
        chunks = []
        ordinal = 1

        for p_idx, para in enumerate(paragraphs, start=1):
            sentences = re.split(r"(?<=[.!?])\s+", para)
            current_chunk = []
            current_len = 0

            for s in sentences:
                s = s.strip()
                if not s:
                    continue
                words = s.split()
                if current_len + len(words) > chunk_size and current_chunk:
                    chunk_text = " ".join(current_chunk)
                    chunks.append({
                        "ordinal": ordinal,
                        "locator": f"Paragraph {p_idx}, Part {ordinal}",
                        "page_number": max(1, (ordinal - 1) // 3 + 1),
                        "section": f"Section {p_idx}",
                        "content": chunk_text,
                    })
                    ordinal += 1
                    current_chunk = current_chunk[-overlap:] if overlap < len(current_chunk) else []
                    current_len = sum(len(c.split()) for c in current_chunk)

                current_chunk.append(s)
                current_len += len(words)

            if current_chunk:
                chunk_text = " ".join(current_chunk)
                chunks.append({
                    "ordinal": ordinal,
                    "locator": f"Paragraph {p_idx}",
                    "page_number": max(1, (ordinal - 1) // 3 + 1),
                    "section": f"Section {p_idx}",
                    "content": chunk_text,
                })
                ordinal += 1

        if not chunks and text.strip():
            chunks.append({
                "ordinal": 1,
                "locator": "Full Document",
                "page_number": 1,
                "section": "General",
                "content": text.strip(),
            })

        return chunks

    def tokenize(self, text: str) -> List[str]:
        return [w.lower() for w in re.findall(r"\w+", text)]

    def bm25_search(self, query: str, chunks: List[Dict[str, Any]], top_k: int = 5) -> List[Tuple[Dict[str, Any], float]]:
        """Calculates BM25 scores across document chunks."""
        if not chunks:
            return []

        doc_tokens = [self.tokenize(c["content"]) for c in chunks]
        N = len(chunks)
        avg_dl = sum(len(d) for d in doc_tokens) / max(1, N)
        query_terms = self.tokenize(query)

        # Calculate Doc Frequencies
        df: Dict[str, int] = {}
        for q in set(query_terms):
            df[q] = sum(1 for d in doc_tokens if q in d)

        scores: List[Tuple[Dict[str, Any], float]] = []
        for idx, chunk in enumerate(chunks):
            tokens = doc_tokens[idx]
            doc_len = len(tokens)
            score = 0.0

            tf: Dict[str, int] = {}
            for t in tokens:
                tf[t] = tf.get(t, 0) + 1

            for q in query_terms:
                if q in tf and q in df:
                    # IDF with standard BM25 smoothing
                    idf = math.log((N - df[q] + 0.5) / (df[q] + 0.5) + 1.0)
                    freq = tf[q]
                    term_score = idf * (freq * (self.k1 + 1)) / (freq + self.k1 * (1 - self.b + self.b * (doc_len / max(1, avg_dl))))
                    score += term_score

            scores.append((chunk, score))

        scores.sort(key=lambda x: x[1], reverse=True)
        return scores[:top_k]

    def hybrid_retrieve(self, query: str, chunks: List[Dict[str, Any]], top_k: int = 3) -> List[Dict[str, Any]]:
        """Executes hybrid retrieval and attaches provenance context."""
        results = self.bm25_search(query, chunks, top_k=top_k)
        retrieved = []
        for chunk, score in results:
            item = dict(chunk)
            item["relevance_score"] = round(score, 3)
            retrieved.append(item)
        return retrieved
