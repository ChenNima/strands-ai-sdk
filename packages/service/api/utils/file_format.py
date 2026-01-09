"""File format utilities for file upload."""

from typing import Optional

# MIME type to Strands DocumentFormat mapping
MIME_TO_FORMAT: dict[str, str] = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/msword": "doc",
    "text/plain": "txt",
    "text/markdown": "md",
    "text/csv": "csv",
    "text/html": "html",
}

# Allowed file types for upload
ALLOWED_MIME_TYPES: list[str] = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
]

# Maximum file size (20MB)
MAX_FILE_SIZE: int = 20 * 1024 * 1024


def get_document_format(mime_type: str) -> Optional[str]:
    """
    Get the Strands SDK DocumentFormat from MIME type.

    Args:
        mime_type: The MIME type of the file

    Returns:
        The corresponding Strands DocumentFormat, or None if not supported
    """
    return MIME_TO_FORMAT.get(mime_type)


def is_allowed_file_type(mime_type: str) -> bool:
    """
    Check if the file type is allowed for upload.

    Args:
        mime_type: The MIME type of the file

    Returns:
        True if the file type is allowed, False otherwise
    """
    return mime_type in ALLOWED_MIME_TYPES
