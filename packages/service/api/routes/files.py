"""
File upload routes.
"""
from typing import List
from uuid import UUID

from fastapi import APIRouter, File, HTTPException, Request as FastAPIRequest, UploadFile, status

from ..database.session import get_session
from ..models.file_upload import FileUploadCreate, FileUploadRead
from ..services.file_service import FileService
from ..utils.file_format import ALLOWED_MIME_TYPES, MAX_FILE_SIZE

router = APIRouter()


@router.post("/upload", response_model=List[FileUploadRead])
async def upload_files(
    request: FastAPIRequest,
    files: List[UploadFile] = File(...),
) -> List[FileUploadRead]:
    """
    Upload one or more files.

    Supported file types: PDF, Word (.doc, .docx)
    Maximum file size: 20MB per file
    """
    user = request.state.db_user
    session = get_session()
    file_service = FileService(session)
    results: List[FileUploadRead] = []

    for file in files:
        # Validate file type
        if file.content_type not in ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file type: {file.content_type}. Allowed: PDF, Word (.doc, .docx)",
            )

        # Read file content
        content = await file.read()

        # Validate file size
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File {file.filename} exceeds size limit (20MB)",
            )

        # Create file record
        file_data = FileUploadCreate(
            filename=file.filename or "unnamed",
            mime_type=file.content_type or "application/octet-stream",
            file_size=len(content),
        )

        file_record = file_service.create_file(
            file_data=file_data,
            file_content=content,
            user_uuid=user.uuid,
        )

        results.append(FileUploadRead.model_validate(file_record))

    return results


@router.get("/{file_uuid}", response_model=FileUploadRead)
async def get_file(
    file_uuid: str,
    request: FastAPIRequest,
) -> FileUploadRead:
    """
    Get file metadata by UUID (without content).
    """
    user = request.state.db_user
    session = get_session()
    file_service = FileService(session)

    file_record = file_service.get_file(UUID(file_uuid), user.uuid)

    if not file_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found",
        )

    return FileUploadRead.model_validate(file_record)


@router.delete("/{file_uuid}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_file(
    file_uuid: str,
    request: FastAPIRequest,
):
    """
    Delete a file by UUID.
    """
    user = request.state.db_user
    session = get_session()
    file_service = FileService(session)

    success = file_service.delete_file(UUID(file_uuid), user.uuid)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found",
        )
