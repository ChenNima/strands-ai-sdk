"""File upload service with S3 storage."""

from typing import List, Optional, Tuple
from uuid import UUID, uuid4

from sqlmodel import Session, select

from ..models.file_upload import FileUpload, FileUploadCreate
from ..utils.file_format import is_allowed_file_type, is_image_type, MAX_FILE_SIZE
from .s3_storage import get_s3_storage
from .document_parser import get_document_parser


class FileService:
    """File upload service with S3 storage."""

    def __init__(self, session: Session):
        self.session = session
        self.s3 = get_s3_storage()
        self.parser = get_document_parser()

    def create_file(
        self,
        file_data: FileUploadCreate,
        file_content: bytes,
        user_uuid: UUID,
    ) -> FileUpload:
        """
        Create file record and upload to S3.

        Args:
            file_data: File metadata
            file_content: File binary content
            user_uuid: User UUID

        Returns:
            Created FileUpload record

        Raises:
            ValueError: If file type is not allowed or file is too large
        """
        # Validate file type
        if not is_allowed_file_type(file_data.mime_type):
            raise ValueError(f"Unsupported file type: {file_data.mime_type}")

        # Validate file size
        if len(file_content) > MAX_FILE_SIZE:
            raise ValueError(f"File size exceeds limit: {MAX_FILE_SIZE} bytes")

        # Generate file ID
        file_id = uuid4()

        # Upload to S3
        s3_key = self.s3.upload(
            file_content=file_content,
            user_uuid=user_uuid,
            file_id=file_id,
            filename=file_data.filename,
            content_type=file_data.mime_type,
        )

        # Parse document to markdown (skip for images)
        markdown_content = None
        if not is_image_type(file_data.mime_type):
            markdown_content = self.parser.parse(
                content=file_content,
                mime_type=file_data.mime_type,
                filename=file_data.filename,
            )

        # Create database record
        file_upload = FileUpload(
            uuid=file_id,
            filename=file_data.filename,
            mime_type=file_data.mime_type,
            file_size=len(file_content),
            s3_key=s3_key,
            user_uuid=user_uuid,
            markdown_content=markdown_content,
        )

        self.session.add(file_upload)
        self.session.commit()
        self.session.refresh(file_upload)

        return file_upload

    def get_file(self, file_uuid: UUID, user_uuid: UUID) -> Optional[FileUpload]:
        """
        Get file metadata by UUID.

        Args:
            file_uuid: File UUID
            user_uuid: User UUID (for permission check)

        Returns:
            FileUpload record or None if not found
        """
        statement = select(FileUpload).where(
            FileUpload.uuid == file_uuid,
            FileUpload.user_uuid == user_uuid,
        )
        return self.session.exec(statement).first()

    def get_file_content(
        self, file_uuid: UUID, user_uuid: UUID
    ) -> Optional[Tuple[FileUpload, bytes]]:
        """
        Get file metadata and content.

        Args:
            file_uuid: File UUID
            user_uuid: User UUID (for permission check)

        Returns:
            Tuple of (FileUpload, content bytes) or None if not found
        """
        file_upload = self.get_file(file_uuid, user_uuid)
        if not file_upload:
            return None

        content = self.s3.download(file_upload.s3_key)
        return file_upload, content

    def get_files_by_uuids(
        self,
        file_uuids: List[UUID],
        user_uuid: UUID,
    ) -> List[FileUpload]:
        """
        Get multiple file metadata by UUIDs.

        Args:
            file_uuids: List of file UUIDs
            user_uuid: User UUID (for permission check)

        Returns:
            List of FileUpload records
        """
        if not file_uuids:
            return []

        statement = select(FileUpload).where(
            FileUpload.uuid.in_(file_uuids),
            FileUpload.user_uuid == user_uuid,
        )
        return list(self.session.exec(statement).all())

    def get_files_with_content(
        self,
        file_uuids: List[UUID],
        user_uuid: UUID,
    ) -> List[Tuple[FileUpload, bytes]]:
        """
        Get multiple file metadata and contents.

        Args:
            file_uuids: List of file UUIDs
            user_uuid: User UUID (for permission check)

        Returns:
            List of (FileUpload, content bytes) tuples
        """
        files = self.get_files_by_uuids(file_uuids, user_uuid)
        results = []
        for file in files:
            content = self.s3.download(file.s3_key)
            results.append((file, content))
        return results

    def delete_file(self, file_uuid: UUID, user_uuid: UUID) -> bool:
        """
        Delete file from S3 and database.

        Args:
            file_uuid: File UUID
            user_uuid: User UUID (for permission check)

        Returns:
            True if deleted successfully, False if not found
        """
        file_upload = self.get_file(file_uuid, user_uuid)
        if not file_upload:
            return False

        # Delete from S3
        self.s3.delete(file_upload.s3_key)

        # Delete from database
        self.session.delete(file_upload)
        self.session.commit()
        return True
