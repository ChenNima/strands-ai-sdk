# File Upload Architecture

## Overview

The Strands AI SDK file upload system enables users to upload PDF and Word documents that can be attached to chat messages. Documents are parsed to Markdown at upload time and stored in the database, allowing the LLM to understand and process document content.

### Key Design Principles

1. **Upload-then-Reference**: Files are uploaded first and referenced by ID in messages
2. **S3 Storage**: File binaries stored in S3, metadata in PostgreSQL
3. **Pre-parsed Markdown**: Documents converted to Markdown at upload time (not at query time)
4. **AI SDK Integration**: Uses official `files` property in `sendMessage()` for file attachments
5. **Universal LLM Compatibility**: Markdown-based approach works with any LLM (not dependent on native document processing)

### Document Processing Strategy

| Feature | Native LLM Document Processing | Markdown + Prompt (This Approach) |
|---------|-------------------------------|-----------------------------------|
| Compatibility | LLM-specific | **Universal - all LLMs** |
| Filename Restrictions | Strict limitations | **None** |
| Document Format | Binary bytes | **Text Markdown** |
| Debug Friendly | Hard to inspect | **Human readable** |
| Token Consumption | LLM-dependent | Predictable |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Shared File Upload Module                        │
├─────────────────────────────────────────────────────────────────────────┤
│  Frontend (Next.js)                │  Backend (FastAPI)                  │
│  ┌─────────────────────────────┐   │  ┌─────────────────────────────┐   │
│  │  useFileUpload hook         │   │  │  FileService                │   │
│  │  - uploadFiles()            │◀─▶│  │  - create_file()            │   │
│  │  - removeFile()             │   │  │  - get_files_by_uuids()     │   │
│  │  - files state              │   │  │  - delete_file()            │   │
│  └─────────────────────────────┘   │  └─────────────────────────────┘   │
│                                    │              │                      │
│  ┌─────────────────────────────┐   │  ┌───────────▼───────────────────┐ │
│  │  FileUploadButton           │   │  │  DocumentParser (markitdown)  │ │
│  │  FileList components        │   │  │  - parse() → Markdown         │ │
│  └─────────────────────────────┘   │  └───────────────────────────────┘ │
│                                    │              │                      │
│                                    │  ┌───────────▼───────────────────┐ │
│                                    │  │  file_uploads table           │ │
│                                    │  │  - uuid (PK)                  │ │
│                                    │  │  - filename                   │ │
│                                    │  │  - mime_type                  │ │
│                                    │  │  - file_size                  │ │
│                                    │  │  - s3_key                     │ │
│                                    │  │  - markdown_content (TEXT)    │ │
│                                    │  │  - user_uuid (FK)             │ │
│                                    │  └───────────────────────────────┘ │
│                                    │              │                      │
│                                    │  ┌───────────▼───────────────────┐ │
│                                    │  │  S3 Bucket (MSC_S3_BUCKET)    │ │
│                                    │  │  - Original file storage       │ │
│                                    │  └───────────────────────────────┘ │
└────────────────────────────────────┴────────────────────────────────────┘
```

---

## Data Flow

### 1. File Upload Flow

```
User selects file(s)
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  Frontend: useFileUpload.uploadFiles()                       │
│  POST /api/files/upload (multipart/form-data)               │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  Backend: FileService.create_file()                          │
│  1. Validate file type (PDF, Word) and size (≤20MB)         │
│  2. Upload binary to S3 → get s3_key                        │
│  3. Parse document to Markdown via DocumentParser           │
│  4. Store metadata + markdown_content in database           │
│  5. Return file UUID                                        │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
Frontend receives: { uuid, filename, mime_type, file_size }
```

### 2. Message with Attachments Flow

```
User types message + has uploaded files
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  Frontend: sendMessage({ text, files })                      │
│  Files passed using AI SDK's official format:               │
│  {                                                          │
│    type: 'file',                                            │
│    name: 'document.pdf',                                    │
│    url: 'file-uuid',        // File ID stored in url field  │
│    mediaType: 'application/pdf'                             │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  Transport: prepareSendMessagesRequest()                     │
│  Extract file IDs from message.parts where type === 'file'  │
│  Send: { message, id, file_ids: [...] }                     │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  Backend: POST /api/agent/chat                              │
│  1. Extract file_ids from request                           │
│  2. FileService.get_files_by_uuids() → get file records     │
│  3. ContentBlockBuilder.build() → create ContentBlock[]     │
│     - Each document becomes a text block with markdown      │
│     - User message becomes a separate text block            │
│  4. agent.stream_async(content_blocks)                      │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
LLM receives:
[
  { "text": "## Document: report.pdf\n\n<markdown content>" },
  { "text": "Please summarize this document" }
]
```

---

## Component Details

### Backend Components

#### 1. DocumentParser (`api/services/document_parser.py`)

Uses Microsoft's [markitdown](https://github.com/microsoft/markitdown) library (v0.1.4+) to convert documents to Markdown.

```python
class DocumentParser:
    def parse(self, content: bytes, mime_type: str, filename: str) -> Optional[str]:
        """Convert document bytes to Markdown text."""
```

Supported formats:
- PDF (`.pdf`)
- Word (`.docx`, `.doc`)

#### 2. S3Storage (`api/services/s3_storage.py`)

Handles file storage in S3.

```python
class S3Storage:
    def upload(self, file_content, user_uuid, file_id, filename, content_type) -> str
    def download(self, s3_key) -> bytes
    def delete(self, s3_key) -> bool
```

S3 key format: `uploads/{user_uuid}/{file_id}/{filename}`

#### 3. FileService (`api/services/file_service.py`)

Main service for file operations.

```python
class FileService:
    def create_file(self, file_data, file_content, user_uuid) -> FileUpload
    def get_files_by_uuids(self, file_ids, user_uuid) -> List[FileUpload]
    def delete_file(self, file_id, user_uuid) -> bool
```

#### 4. ContentBlockBuilder (`api/services/content_builder.py`)

Builds Strands SDK ContentBlock list from files and text.

```python
class ContentBlockBuilder:
    def build(self, text, file_uuids, user_uuid) -> List[ContentBlock]
```

Document template:
```
## Document: {filename}

{markdown_content}
```

### Frontend Components

#### 1. useFileUpload Hook (`components/chat/hooks/useFileUpload.ts`)

React hook for file upload state management.

```typescript
interface UploadedFile {
  id: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  status: 'uploading' | 'completed' | 'failed';
  error?: string;
}

function useFileUpload(options?) {
  return {
    files: UploadedFile[],
    isUploading: boolean,
    uploadFiles: (files: FileList) => Promise<string[]>,
    removeFile: (fileId: string) => void,
    clearFiles: () => void,
    getCompletedFileIds: () => string[],
  };
}
```

#### 2. FileUploadButton (`components/chat/FileUploadButton.tsx`)

Button component with hidden file input.

```typescript
function FileUploadButton({
  onFilesSelected: (files: FileList) => void,
  isUploading?: boolean,
  disabled?: boolean,
  accept?: string,
})
```

#### 3. FileList (`components/chat/FileList.tsx`)

Displays uploaded files with status indicators.

```typescript
function FileList({
  files: UploadedFile[],
  onRemove: (fileId: string) => void,
})
```

#### 4. ChatInterface Integration

Key integration points in `ChatInterface.tsx`:

```typescript
// 1. Send message with files using AI SDK format
sendMessage({
  text: input,
  files: fileIds.map((id) => ({
    type: 'file' as const,
    name: file.filename,
    url: id,  // File UUID stored in url field
    mediaType: file.mimeType,
  })),
});

// 2. Extract file IDs in transport layer
prepareSendMessagesRequest({ messages, id }) {
  const lastMessage = messages[messages.length - 1];
  const fileIds = lastMessage.parts
    ?.filter((part) => part.type === 'file')
    .map((part) => part.url) || [];

  return {
    body: { message: lastMessage, id, file_ids: fileIds },
  };
}

// 3. Render file attachments in messages
if (part.type === 'file') {
  return <FileAttachment name={part.name} />;
}
```

---

## Database Schema

### file_uploads Table

| Column | Type | Description |
|--------|------|-------------|
| uuid | UUID | Primary key |
| filename | VARCHAR(255) | Original filename |
| mime_type | VARCHAR(100) | MIME type |
| file_size | INTEGER | File size in bytes |
| s3_key | VARCHAR(500) | S3 storage path |
| markdown_content | TEXT | Parsed Markdown content |
| user_uuid | UUID | Foreign key to users |
| created_at | TIMESTAMP | Creation timestamp |

---

## API Endpoints

### POST /api/files/upload

Upload files.

**Request**: `multipart/form-data` with `files` field

**Response**:
```json
[
  {
    "uuid": "file-uuid",
    "filename": "report.pdf",
    "mime_type": "application/pdf",
    "file_size": 1024000,
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

### GET /api/files/{file_id}

Get file metadata.

### DELETE /api/files/{file_id}

Delete file (S3 + database).

### POST /api/agent/chat

Send message with file attachments.

**Request**:
```json
{
  "id": "conversation-uuid",
  "message": { "role": "user", "parts": [...] },
  "file_ids": ["file-uuid-1", "file-uuid-2"]
}
```

---

## Configuration

### Environment Variables

```bash
# Required: S3 bucket name
MSC_S3_BUCKET=your-bucket-name

# AWS credentials (uses default credential chain if not set)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1

# Optional: Custom S3 endpoint (for MinIO, LocalStack, etc.)
# MSC_S3_ENDPOINT=http://localhost:9000
```

### Dependencies

**Python** (`pyproject.toml`):
```toml
"python-multipart>=0.0.6"
"boto3>=1.34.0"
"markitdown[all]>=0.1.4"
```

---

## Limitations

### File Restrictions
- **Types**: PDF, Word (.doc, .docx) only
- **Size**: Maximum 20MB per file
- **Count**: Maximum 5 files per message

### Document Parsing
- Complex layouts (multi-column, nested tables) may not parse perfectly
- Scanned PDFs require OCR-enabled markitdown
- Parse failures return placeholder text, don't block the flow

### Security
- Files are user-scoped (users can only access their own files)
- File type validated on both frontend and backend
- S3 paths are not exposed to clients

---

## Testing

### Upload Test
```bash
curl -X POST "http://localhost:8000/api/files/upload" \
  -H "Authorization: Bearer <token>" \
  -F "files=@./document.pdf"
```

### Chat with File Test
```bash
curl -X POST "http://localhost:8000/api/agent/chat" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "conversation-uuid",
    "message": {
      "role": "user",
      "parts": [
        { "type": "file", "name": "doc.pdf", "url": "file-uuid", "mediaType": "application/pdf" },
        { "type": "text", "text": "Summarize this document" }
      ]
    },
    "file_ids": ["file-uuid"]
  }'
```
