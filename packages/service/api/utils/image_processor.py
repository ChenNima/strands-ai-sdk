"""Image processing utilities for LLM input."""

import io
from typing import Tuple

from PIL import Image

# Max image size for Bedrock (5MB), but we target 3.5MB to account for base64 overhead (~33%)
MAX_IMAGE_SIZE_BYTES = 3 * 1024 * 1024  # 3MB raw = ~4MB base64
MAX_DIMENSION = 4096  # Max width/height


def compress_image(
    content: bytes,
    mime_type: str,
    max_size: int = MAX_IMAGE_SIZE_BYTES,
    max_dimension: int = MAX_DIMENSION,
) -> Tuple[bytes, str]:
    """
    Compress image to fit within size limits.

    Args:
        content: Original image bytes
        mime_type: Original MIME type
        max_size: Maximum size in bytes
        max_dimension: Maximum width/height

    Returns:
        Tuple of (compressed_bytes, output_mime_type)
    """
    # If already small enough, return as-is
    if len(content) <= max_size:
        img = Image.open(io.BytesIO(content))
        # Still check dimensions
        if img.width <= max_dimension and img.height <= max_dimension:
            return content, mime_type

    # Open image
    img = Image.open(io.BytesIO(content))

    # Convert to RGB for JPEG output
    if img.mode != 'RGB':
        if img.mode in ('RGBA', 'LA'):
            # Has alpha channel - composite on white background
            background = Image.new('RGB', img.size, (255, 255, 255))
            background.paste(img, mask=img.split()[-1])
            img = background
        elif img.mode == 'P':
            # Palette mode - convert to RGBA first, then composite
            img = img.convert('RGBA')
            background = Image.new('RGB', img.size, (255, 255, 255))
            background.paste(img, mask=img.split()[-1])
            img = background
        else:
            # L (grayscale), etc - just convert
            img = img.convert('RGB')

    # Resize if dimensions exceed max
    if img.width > max_dimension or img.height > max_dimension:
        ratio = min(max_dimension / img.width, max_dimension / img.height)
        new_size = (int(img.width * ratio), int(img.height * ratio))
        img = img.resize(new_size, Image.Resampling.LANCZOS)

    # Try to compress to fit size limit
    output_mime = "image/jpeg"
    quality = 85

    while quality >= 20:
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=quality, optimize=True)
        compressed = buffer.getvalue()

        if len(compressed) <= max_size:
            return compressed, output_mime

        # Reduce quality or resize further
        if quality > 50:
            quality -= 10
        else:
            # Also reduce dimensions
            quality -= 5
            new_size = (int(img.width * 0.9), int(img.height * 0.9))
            img = img.resize(new_size, Image.Resampling.LANCZOS)

    # Final attempt with minimum quality
    buffer = io.BytesIO()
    img.save(buffer, format="JPEG", quality=20, optimize=True)
    return buffer.getvalue(), output_mime
