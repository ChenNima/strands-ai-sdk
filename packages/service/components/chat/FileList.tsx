'use client';

import React from 'react';
import { XIcon, PaperclipIcon, Loader2Icon, AlertCircleIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import type { UploadedFile } from './hooks/useFileUpload';

interface FileAttachmentProps {
  file: UploadedFile;
  onRemove: (fileId: string) => void;
}

/**
 * Single file attachment display component
 * Styled to match PromptInputAttachment from AI SDK elements
 */
function FileAttachment({ file, onRemove }: FileAttachmentProps) {
  const t = useTranslations('attachment');
  const isUploading = file.status === 'uploading';
  const isFailed = file.status === 'failed';

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <HoverCard openDelay={0} closeDelay={0}>
      <HoverCardTrigger asChild>
        <div
          className={cn(
            'group relative flex h-8 cursor-pointer select-none items-center gap-1.5 rounded-md border border-border px-1.5 font-medium text-sm transition-all hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
            isFailed && 'border-destructive bg-destructive/10'
          )}
        >
          <div className="relative size-5 shrink-0">
            <div
              className={cn(
                'absolute inset-0 flex size-5 items-center justify-center overflow-hidden rounded bg-background transition-opacity group-hover:opacity-0',
                isUploading && 'group-hover:opacity-100'
              )}
            >
              {isUploading ? (
                <Loader2Icon className="size-3 animate-spin text-muted-foreground" />
              ) : isFailed ? (
                <AlertCircleIcon className="size-3 text-destructive" />
              ) : (
                <PaperclipIcon className="size-3 text-muted-foreground" />
              )}
            </div>
            {!isUploading && (
              <Button
                aria-label={t('remove')}
                className="absolute inset-0 size-5 cursor-pointer rounded p-0 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 [&>svg]:size-2.5"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(file.id);
                }}
                type="button"
                variant="ghost"
              >
                <XIcon />
                <span className="sr-only">{t('remove')}</span>
              </Button>
            )}
          </div>

          <span className="max-w-[120px] truncate flex-1">{file.filename}</span>

          {isFailed && (
            <span className="text-xs text-destructive">Failed</span>
          )}
        </div>
      </HoverCardTrigger>
      <HoverCardContent align="start" className="w-auto p-2">
        <div className="w-auto space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="min-w-0 flex-1 space-y-1 px-0.5">
              <h4 className="truncate font-semibold text-sm leading-none">
                {file.filename}
              </h4>
              <div className="flex items-center gap-2">
                <p className="truncate font-mono text-muted-foreground text-xs">
                  {file.mimeType}
                </p>
                <span className="text-muted-foreground text-xs">•</span>
                <p className="text-muted-foreground text-xs">
                  {formatFileSize(file.fileSize)}
                </p>
              </div>
              {file.status === 'uploading' && (
                <p className="text-xs text-muted-foreground">Uploading...</p>
              )}
              {isFailed && file.error && (
                <p className="text-xs text-destructive">{file.error}</p>
              )}
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

interface FileAttachmentsProps {
  files: UploadedFile[];
  onRemove: (fileId: string) => void;
  className?: string;
}

/**
 * File attachments container component
 * Designed to be used inside PromptInputHeader, styled like PromptInputAttachments
 */
export function FileAttachments({ files, onRemove, className }: FileAttachmentsProps) {
  if (files.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2 p-3 w-full', className)}>
      {files.map((file) => (
        <FileAttachment key={file.id} file={file} onRemove={onRemove} />
      ))}
    </div>
  );
}

// Keep backward compatible export
export { FileAttachments as FileList };
