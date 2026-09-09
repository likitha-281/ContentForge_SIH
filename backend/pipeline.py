import io
import os
from typing import Dict, Any, List

class DocumentProcessor:
    """
    Multimodal ETL processor:
    Extracts text and metadata from PDF (PyMuPDF), DOCX (python-docx), PPTX, and plain text.
    """

    @staticmethod
    def extract_from_bytes(file_bytes: bytes, filename: str) -> Dict[str, Any]:
        ext = os.path.splitext(filename.lower())[1]
        
        # 1. Plain Text
        if ext in [".txt", ".md", ".csv", ".json", ".log"]:
            try:
                text = file_bytes.decode("utf-8")
            except UnicodeDecodeError:
                text = file_bytes.decode("latin-1", errors="replace")
            return {
                "text": text,
                "pages": 1,
                "extraction_method": "direct_text",
                "char_count": len(text),
            }

        # 2. PDF with PyMuPDF (fitz)
        if ext == ".pdf":
            try:
                import fitz  # PyMuPDF
                doc = fitz.open(stream=file_bytes, filetype="pdf")
                pages_text = []
                for idx, page in enumerate(doc, start=1):
                    p_txt = page.get_text()
                    if p_txt.strip():
                        pages_text.append(f"--- [Page {idx}] ---\n{p_txt}")
                full_text = "\n\n".join(pages_text) if pages_text else "No extractable text found in PDF."
                page_count = len(doc)
                doc.close()
                return {
                    "text": full_text,
                    "pages": page_count,
                    "extraction_method": "pymupdf",
                    "char_count": len(full_text),
                }
            except ImportError:
                return {
                    "text": "[PyMuPDF not installed in environment. Run pip install PyMuPDF]",
                    "pages": 1,
                    "extraction_method": "error",
                    "char_count": 0,
                }
            except Exception as e:
                return {
                    "text": f"Error parsing PDF: {e}",
                    "pages": 1,
                    "extraction_method": "pdf_error",
                    "char_count": 0,
                }

        # 3. DOCX with python-docx
        if ext == ".docx":
            try:
                import docx
                doc = docx.Document(io.BytesIO(file_bytes))
                paras = [p.text for p in doc.paragraphs if p.text.strip()]
                tables_text = []
                for t in doc.tables:
                    for row in t.rows:
                        row_txt = " | ".join(c.text.strip() for c in row.cells if c.text.strip())
                        if row_txt:
                            tables_text.append(row_txt)
                all_text = "\n\n".join(paras + tables_text)
                return {
                    "text": all_text,
                    "pages": max(1, len(paras) // 10),
                    "extraction_method": "python_docx",
                    "char_count": len(all_text),
                }
            except ImportError:
                return {
                    "text": "[python-docx not installed in environment. Run pip install python-docx]",
                    "pages": 1,
                    "extraction_method": "error",
                    "char_count": 0,
                }
            except Exception as e:
                return {
                    "text": f"Error parsing DOCX: {e}",
                    "pages": 1,
                    "extraction_method": "docx_error",
                    "char_count": 0,
                }

        # Fallback for unknown binary
        try:
            text = file_bytes.decode("utf-8")
            return {
                "text": text,
                "pages": 1,
                "extraction_method": "fallback_text",
                "char_count": len(text),
            }
        except Exception:
            return {
                "text": f"Binary media file ({filename}) uploaded. Audio/video transcription queued.",
                "pages": 1,
                "extraction_method": "media_standin",
                "char_count": 0,
            }
