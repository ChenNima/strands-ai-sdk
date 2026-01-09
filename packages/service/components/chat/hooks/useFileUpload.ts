'use client';

import { useState, useCallback } from 'react';
import { getAccessToken } from '@/lib/auth';

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
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
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
        const formData = new FormData();
        filesToUpload.forEach((file) => {
          formData.append('files', file);
        });

        const token = await getAccessToken();
        const response = await fetch('/api/files/upload', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || 'Upload failed');
        }

        const uploadedFiles = await response.json();

        // Update status to completed
        setFiles((prev) =>
          prev.map((f) => {
            const uploaded = uploadedFiles.find(
              (u: { filename: string }) => u.filename === f.filename
            );
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

        return uploadedFiles.map((f: { uuid: string }) => f.uuid);
      } catch (error) {
        // Update status to failed
        setFiles((prev) =>
          prev.map((f) =>
            f.status === 'uploading'
              ? {
                  ...f,
                  status: 'failed',
                  error: error instanceof Error ? error.message : 'Upload failed',
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

  const removeFile = useCallback((fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  const clearFiles = useCallback(() => {
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
