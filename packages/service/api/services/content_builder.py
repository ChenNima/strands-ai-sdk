"""Content block builder for Strands Agent."""

from typing import List, Optional
from uuid import UUID

from sqlmodel import Session
from strands.types.content import ContentBlock

from ..models.file_upload import FileUpload
from ..services.file_service import FileService


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

        # 1. Add document ContentBlocks (using stored markdown)
        if file_uuids:
            files = self.file_service.get_files_by_uuids(file_uuids, user_uuid)
            for file in files:
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
