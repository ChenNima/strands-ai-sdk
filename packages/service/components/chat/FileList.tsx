'use client';

import React from 'react';
import { X, FileText, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { UploadedFile } from './hooks/useFileUpload';

interface FileListProps {
  files: UploadedFile[];
  onRemove: (fileId: string) => void;
  className?: string;
}

export function FileList({ files, onRemove, className }: FileListProps) {
  if (files.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {files.map((file) => (
        <div
          key={file.id}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm',
            'border bg-muted/50',
            file.status === 'failed' && 'border-destructive bg-destructive/10'
          )}
        >
          {file.status === 'uploading' ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : file.status === 'failed' ? (
            <AlertCircle className="h-4 w-4 text-destructive" />
          ) : (
            <FileText className="h-4 w-4 text-muted-foreground" />
          )}

          <span className="max-w-[150px] truncate" title={file.filename}>
            {file.filename}
          </span>

          {file.status === 'failed' && file.error && (
            <span className="text-xs text-destructive" title={file.error}>
              Failed
            </span>
          )}

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-5 w-5 p-0"
            onClick={() => onRemove(file.id)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}
