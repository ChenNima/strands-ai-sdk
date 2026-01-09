"""Content block builder for Strands Agent."""

from typing import List, Optional
from uuid import UUID

from sqlmodel import Session
from strands.types.content import ContentBlock

from ..models.file_upload import FileUpload
from ..services.file_service import FileService
from ..utils.file_format import is_image_type, get_image_format, MIME_TO_IMAGE_FORMAT
from ..utils.image_processor import compress_image


# Document template for LLM input
DOCUMENT_TEMPLATE = """## 文档: {filename}

{content}
"""


class ContentBlockBuilder:
    """Build Strands ContentBlock list from files and text."""

    def __init__(self, session: Session):
        self.file_service = FileService(session)

    def build(
        self,
        text: str,
        file_uuids: Optional[List[UUID]],
        user_uuid: UUID,
    ) -> List[ContentBlock]:
        """
        Build ContentBlock list from text and file UUIDs.

        Args:
            text: User message text
            file_uuids: List of file UUIDs
            user_uuid: User UUID

        Returns:
            List of Strands SDK ContentBlock
        """
        content_blocks: List[ContentBlock] = []

        # 1. Add file ContentBlocks (documents and images)
        if file_uuids:
            # Get files with content for images
            files_with_content = self.file_service.get_files_with_content(
                file_uuids, user_uuid
            )
            for file, content in files_with_content:
                if is_image_type(file.mime_type):
                    # Build image content block
                    image_block = self._build_image_block(file, content)
                    if image_block:
                        content_blocks.append(image_block)
                else:
                    # Build document content block (from stored markdown)
                    doc_block = self._build_document_block(file)
                    if doc_block:
                        content_blocks.append(doc_block)

        # 2. Add text ContentBlock
        if text:
            content_blocks.append({"text": text})

        return content_blocks

    def _build_document_block(
        self,
        file: FileUpload,
    ) -> Optional[ContentBlock]:
        """
        Build document ContentBlock from file record's markdown content.

        Args:
            file: FileUpload record with markdown_content

        Returns:
            ContentBlock with document text, or None if no markdown content
        """
        if not file.markdown_content:
            return None

        document_text = DOCUMENT_TEMPLATE.format(
            filename=file.filename,
            content=file.markdown_content,
        )

        return {"text": document_text}

    def _build_image_block(
        self,
        file: FileUpload,
        content: bytes,
    ) -> Optional[ContentBlock]:
        """
        Build image ContentBlock from file content.

        Compresses large images to fit within LLM size limits (5MB).

        Args:
            file: FileUpload record
            content: Image file content bytes

        Returns:
            ContentBlock with image data, or None if format not supported
        """
        image_format = get_image_format(file.mime_type)
        if not image_format:
            return None

        # Compress image if needed (Bedrock has 5MB limit)
        compressed_content, output_mime = compress_image(content, file.mime_type)

        # Get the format for the compressed image
        output_format = MIME_TO_IMAGE_FORMAT.get(output_mime, image_format)

        return {
            "image": {
                "format": output_format,
                "source": {
                    "bytes": compressed_content,
                },
            }
        }
