"""Document parser service using markitdown."""

import logging
import os
import tempfile
from typing import Optional

from markitdown import MarkItDown

logger = logging.getLogger(__name__)


class DocumentParser:
    """Document parser service: convert documents to Markdown using markitdown."""

    def __init__(self):
        self.md = MarkItDown()

    def parse(self, content: bytes, mime_type: str, filename: str) -> Optional[str]:
        """
        Parse document content to Markdown text.

        Args:
            content: File binary content
            mime_type: MIME type of the file
            filename: Original filename

        Returns:
            Markdown text or None if parsing fails
        """
        ext = self._get_extension(mime_type, filename)
        if not ext:
            return None

        tmp_path = None
        try:
            with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
                tmp.write(content)
                tmp.flush()
                tmp_path = tmp.name

            result = self.md.convert(tmp_path)
            markdown = result.text_content if result.text_content else None
            logger.info(f"Parsed document {filename}, markdown length: {len(markdown) if markdown else 0}")
            return markdown
        except Exception as e:
            logger.error(f"Failed to parse document {filename}: {e}", exc_info=True)
            return None
        finally:
            if tmp_path and os.path.exists(tmp_path):
                os.unlink(tmp_path)

    def _get_extension(self, mime_type: str, filename: str) -> Optional[str]:
        """Get file extension from MIME type or filename."""
        if filename and "." in filename:
            return "." + filename.rsplit(".", 1)[-1].lower()
        mime_to_ext = {
            "application/pdf": ".pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
            "application/msword": ".doc",
        }
        return mime_to_ext.get(mime_type)


_document_parser: Optional[DocumentParser] = None


def get_document_parser() -> DocumentParser:
    """Get document parser service singleton."""
    global _document_parser
    if _document_parser is None:
        _document_parser = DocumentParser()
    return _document_parser
