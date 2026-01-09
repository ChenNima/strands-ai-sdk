"""S3 storage service for file uploads."""

import os
from typing import Optional
from uuid import UUID

import boto3
from botocore.exceptions import ClientError


class S3Storage:
    """S3 storage service for file operations."""

    def __init__(self):
        self.bucket = os.environ.get("MSC_S3_BUCKET")
        if not self.bucket:
            raise ValueError("MSC_S3_BUCKET environment variable is required")

        self.endpoint = os.environ.get("MSC_S3_ENDPOINT")

        # Create S3 client
        client_kwargs = {}
        if self.endpoint:
            client_kwargs["endpoint_url"] = self.endpoint

        self.client = boto3.client("s3", **client_kwargs)

    def _get_s3_key(self, user_uuid: UUID, file_id: UUID, filename: str) -> str:
        """
        Generate S3 storage path.

        Format: uploads/{user_uuid}/{file_id}/{filename}
        """
        return f"uploads/{user_uuid}/{file_id}/{filename}"

    def upload(
        self,
        file_content: bytes,
        user_uuid: UUID,
        file_id: UUID,
        filename: str,
        content_type: str,
    ) -> str:
        """
        Upload file to S3.

        Args:
            file_content: File binary content
            user_uuid: User UUID
            file_id: File UUID
            filename: Original filename
            content_type: MIME type

        Returns:
            S3 key (storage path)
        """
        s3_key = self._get_s3_key(user_uuid, file_id, filename)

        self.client.put_object(
            Bucket=self.bucket,
            Key=s3_key,
            Body=file_content,
            ContentType=content_type,
        )

        return s3_key

    def download(self, s3_key: str) -> bytes:
        """
        Download file from S3.

        Args:
            s3_key: S3 storage path

        Returns:
            File binary content
        """
        response = self.client.get_object(Bucket=self.bucket, Key=s3_key)
        return response["Body"].read()

    def delete(self, s3_key: str) -> bool:
        """
        Delete file from S3.

        Args:
            s3_key: S3 storage path

        Returns:
            True if deleted successfully, False otherwise
        """
        try:
            self.client.delete_object(Bucket=self.bucket, Key=s3_key)
            return True
        except ClientError:
            return False


# Singleton instance
_s3_storage: Optional[S3Storage] = None


def get_s3_storage() -> S3Storage:
    """
    Get S3 storage service singleton.

    Returns:
        S3Storage instance
    """
    global _s3_storage
    if _s3_storage is None:
        _s3_storage = S3Storage()
    return _s3_storage
