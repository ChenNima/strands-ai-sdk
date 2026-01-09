'use client';

import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Paperclip, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadButtonProps {
  onFilesSelected: (files: FileList) => void;
  isUploading?: boolean;
  disabled?: boolean;
  accept?: string;
  className?: string;
}

const DEFAULT_ACCEPT = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
].join(',');

export function FileUploadButton({
  onFilesSelected,
  isUploading = false,
  disabled = false,
  accept = DEFAULT_ACCEPT,
  className,
}: FileUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
      // Clear input to allow re-selecting the same file
      e.target.value = '';
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        onChange={handleChange}
        className="hidden"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={handleClick}
        disabled={disabled || isUploading}
        className={cn('h-8 w-8', className)}
        title="Add PDF or Word document"
      >
        {isUploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Paperclip className="h-4 w-4" />
        )}
      </Button>
    </>
  );
}
