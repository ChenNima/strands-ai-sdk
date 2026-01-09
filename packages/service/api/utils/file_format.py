"""File format utilities for file upload."""

from typing import Literal, Optional

# Type for Strands image formats
ImageFormat = Literal["png", "jpeg", "gif", "webp"]

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

# MIME type to Strands ImageFormat mapping
MIME_TO_IMAGE_FORMAT: dict[str, ImageFormat] = {
    "image/png": "png",
    "image/jpeg": "jpeg",
    "image/gif": "gif",
    "image/webp": "webp",
}

# Allowed document types for upload
ALLOWED_DOCUMENT_TYPES: list[str] = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
]

# Allowed image types for upload
ALLOWED_IMAGE_TYPES: list[str] = [
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
]

# All allowed file types for upload
ALLOWED_MIME_TYPES: list[str] = ALLOWED_DOCUMENT_TYPES + ALLOWED_IMAGE_TYPES

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


def is_image_type(mime_type: str) -> bool:
    """
    Check if the file type is an image.

    Args:
        mime_type: The MIME type of the file

    Returns:
        True if the file type is an image, False otherwise
    """
    return mime_type in ALLOWED_IMAGE_TYPES


def get_image_format(mime_type: str) -> Optional[ImageFormat]:
    """
    Get the Strands SDK ImageFormat from MIME type.

    Args:
        mime_type: The MIME type of the file

    Returns:
        The corresponding Strands ImageFormat, or None if not supported
    """
    return MIME_TO_IMAGE_FORMAT.get(mime_type)
