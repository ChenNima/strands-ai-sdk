'use client';

import { useState, useCallback } from 'react';
import { api, ApiError } from '@/lib/api-client';

export interface UploadedFile {
  id: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  status: 'uploading' | 'completed' | 'failed';
  error?: string;
}

interface UseFileUploadOptions {
  allowedTypes?: string[];
  maxSize?: number;
  maxFiles?: number;
}

const DEFAULT_ALLOWED_TYPES = [
  // Documents
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  // Images
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
];

const DEFAULT_MAX_SIZE = 20 * 1024 * 1024; // 20MB
const DEFAULT_MAX_FILES = 5;

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const {
    allowedTypes = DEFAULT_ALLOWED_TYPES,
    maxSize = DEFAULT_MAX_SIZE,
    maxFiles = DEFAULT_MAX_FILES,
  } = options;

  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const validateFile = useCallback(
    (file: File): string | null => {
      if (!allowedTypes.includes(file.type)) {
        return `Unsupported file type: ${file.type}`;
      }
      if (file.size > maxSize) {
        return `File size exceeds limit: ${Math.round(maxSize / 1024 / 1024)}MB`;
      }
      return null;
    },
    [allowedTypes, maxSize]
  );

  const uploadFiles = useCallback(
    async (fileList: FileList | File[]): Promise<string[]> => {
      const filesToUpload = Array.from(fileList);

      // Check file count
      if (files.length + filesToUpload.length > maxFiles) {
        throw new Error(`Maximum ${maxFiles} files allowed`);
      }

      // Validate all files
      for (const file of filesToUpload) {
        const error = validateFile(file);
        if (error) {
          throw new Error(`${file.name}: ${error}`);
        }
      }

      setIsUploading(true);

      // Add uploading status
      const pendingFiles: UploadedFile[] = filesToUpload.map((file) => ({
        id: crypto.randomUUID(),
        filename: file.name,
        mimeType: file.type,
        fileSize: file.size,
        status: 'uploading',
      }));

      setFiles((prev) => [...prev, ...pendingFiles]);

      try {
        const uploadedFiles = await api.uploadFiles(filesToUpload);

        // Update status to completed
        setFiles((prev) =>
          prev.map((f) => {
            const uploaded = uploadedFiles.find((u) => u.filename === f.filename);
            if (uploaded) {
              return {
                ...f,
                id: uploaded.uuid,
                status: 'completed',
              };
            }
            return f;
          })
        );

        return uploadedFiles.map((f) => f.uuid);
      } catch (error) {
        // Update status to failed
        const errorMessage =
          error instanceof ApiError
            ? error.message
            : error instanceof Error
              ? error.message
              : 'Upload failed';

        setFiles((prev) =>
          prev.map((f) =>
            f.status === 'uploading'
              ? {
                  ...f,
                  status: 'failed',
                  error: errorMessage,
                }
              : f
          )
        );
        throw error;
      } finally {
        setIsUploading(false);
      }
    },
    [files.length, maxFiles, validateFile]
  );

  const removeFile = useCallback(
    async (fileId: string) => {
      // Find the file to check if it's completed (uploaded to S3)
      const fileToRemove = files.find((f) => f.id === fileId);

      // If file was successfully uploaded, delete from server
      if (fileToRemove?.status === 'completed') {
        try {
          await api.deleteFile(fileId);
        } catch (error) {
          // Log error but don't block removal from UI
          // 404 is acceptable (file may already be deleted)
          if (error instanceof ApiError && error.status !== 404) {
            console.error('Failed to delete file from server:', error.message);
          }
        }
      }

      // Always remove from local state
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
    },
    [files]
  );

  const clearFiles = useCallback(() => {
    // Just clear local state - files are kept on S3 as they are referenced in the message
    setFiles([]);
  }, []);

  const getCompletedFileIds = useCallback(() => {
    return files.filter((f) => f.status === 'completed').map((f) => f.id);
  }, [files]);

  return {
    files,
    isUploading,
    uploadFiles,
    removeFile,
    clearFiles,
    getCompletedFileIds,
  };
}
