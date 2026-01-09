# File Upload Architecture

## Overview

The Strands AI SDK file upload system enables users to upload documents and images that can be attached to chat messages. Documents are parsed to Markdown at upload time, while images are processed and compressed for LLM compatibility.

### Key Design Principles

1. **Upload-then-Reference**: Files are uploaded first and referenced by ID in messages
2. **S3 Storage**: File binaries stored in S3, metadata in PostgreSQL
3. **Pre-parsed Markdown**: Documents converted to Markdown at upload time (not at query time)
4. **Image Compression**: Large images automatically compressed to fit LLM size limits
5. **AI SDK Integration**: Uses official `files` property in `sendMessage()` for file attachments
6. **Universal LLM Compatibility**: Markdown-based approach works with any LLM for documents

### File Processing Strategy

| File Type | Processing | LLM Input Format |
|-----------|------------|------------------|
| **Documents** (PDF, Word) | Parse to Markdown via markitdown | Text ContentBlock |
| **Images** (PNG, JPEG, GIF, WebP) | Compress if >3MB, convert to JPEG | Image ContentBlock (raw bytes) |

### Document vs Image Processing

| Feature | Documents | Images |
|---------|-----------|--------|
| Storage | S3 + Markdown in DB | S3 only |
| Processing | markitdown parsing | Pillow compression |
| LLM Format | `{"text": "## Document: ..."}` | `{"image": {"format": "jpeg", "source": {"bytes": ...}}}` |
| Size Limit | 20MB upload | 20MB upload, 5MB after compression |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Shared File Upload Module                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  Frontend (Next.js)                │  Backend (FastAPI)                      │
│  ┌─────────────────────────────┐   │  ┌─────────────────────────────┐       │
│  │  useFileUpload hook         │   │  │  FileService                │       │
│  │  - uploadFiles()            │◀─▶│  │  - create_file()            │       │
│  │  - removeFile()             │   │  │  - get_files_by_uuids()     │       │
│  │  - files state              │   │  │  - get_files_with_content() │       │
│  └─────────────────────────────┘   │  └─────────────────────────────┘       │
│                                    │              │                          │
│  ┌─────────────────────────────┐   │  ┌───────────▼───────────────────────┐ │
│  │  FileUploadButton           │   │  │  DocumentParser (markitdown)      │ │
│  │  FileAttachments component  │   │  │  - parse() → Markdown (docs only) │ │
│  └─────────────────────────────┘   │  └───────────────────────────────────┘ │
│                                    │              │                          │
│                                    │  ┌───────────▼───────────────────────┐ │
│                                    │  │  ImageProcessor (Pillow)          │ │
│                                    │  │  - compress_image() → JPEG bytes  │ │
│                                    │  └───────────────────────────────────┘ │
│                                    │              │                          │
│                                    │  ┌───────────▼───────────────────────┐ │
│                                    │  │  file_uploads table               │ │
│                                    │  │  - uuid (PK)                      │ │
│                                    │  │  - filename                       │ │
│                                    │  │  - mime_type                      │ │
│                                    │  │  - file_size                      │ │
│                                    │  │  - s3_key                         │ │
│                                    │  │  - markdown_content (docs only)   │ │
│                                    │  │  - user_uuid (FK)                 │ │
│                                    │  └───────────────────────────────────┘ │
│                                    │              │                          │
│                                    │  ┌───────────▼───────────────────────┐ │
│                                    │  │  S3 Bucket (MSC_S3_BUCKET)        │ │
│                                    │  │  - Original file storage           │ │
│                                    │  └───────────────────────────────────┘ │
└────────────────────────────────────┴────────────────────────────────────────┘
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
│  1. Validate file type and size (≤20MB)                     │
│  2. Upload binary to S3 → get s3_key                        │
│  3. If DOCUMENT: Parse to Markdown via DocumentParser       │
│     If IMAGE: Skip parsing (markdown_content = NULL)        │
│  4. Store metadata in database                              │
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
│  2. FileService.get_files_with_content() → get files + S3   │
│  3. ContentBlockBuilder.build() → create ContentBlock[]     │
│     - Documents → text block with markdown                  │
│     - Images → image block with compressed bytes            │
│  4. agent.stream_async(content_blocks)                      │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
LLM receives (documents):
[
  { "text": "## Document: report.pdf\n\n<markdown content>" },
  { "text": "Please summarize this document" }
]

LLM receives (images):
[
  { "image": { "format": "jpeg", "source": { "bytes": <raw bytes> } } },
  { "text": "What is in this image?" }
]
```

### 3. Image Compression Flow

```
Image uploaded (e.g., 6.6MB PNG)
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  ContentBlockBuilder._build_image_block()                    │
│  1. Get image format from MIME type                         │
│  2. Call ImageProcessor.compress_image()                    │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  ImageProcessor.compress_image()                             │
│  1. Check if size ≤ 3MB and dimensions ≤ 4096px → skip      │
│  2. Convert color mode to RGB (handle RGBA, P, L, etc.)     │
│  3. Resize if dimensions > 4096px                           │
│  4. Compress to JPEG with quality 85 → 20 (iteratively)     │
│  5. Return compressed bytes + "image/jpeg" MIME type        │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
Compressed image (e.g., 2.5MB JPEG) sent to LLM
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

#### 2. ImageProcessor (`api/utils/image_processor.py`)

Uses [Pillow](https://pillow.readthedocs.io/) to compress images for LLM compatibility.

```python
def compress_image(
    content: bytes,
    mime_type: str,
    max_size: int = 3 * 1024 * 1024,  # 3MB (allows for base64 overhead)
    max_dimension: int = 4096,
) -> Tuple[bytes, str]:
    """
    Compress image to fit within LLM size limits (Bedrock: 5MB).

    Returns:
        Tuple of (compressed_bytes, output_mime_type)
    """
```

Features:
- **Size compression**: Iteratively reduces JPEG quality (85 → 20)
- **Dimension scaling**: Resizes images exceeding 4096px
- **Color mode conversion**: Handles RGBA, LA, P, L → RGB for JPEG output
- **Format conversion**: Outputs as JPEG for best compression

#### 3. S3Storage (`api/services/s3_storage.py`)

Handles file storage in S3.

```python
class S3Storage:
    def upload(self, file_content, user_uuid, file_id, filename, content_type) -> str
    def download(self, s3_key) -> bytes
    def delete(self, s3_key) -> bool
```

S3 key format: `uploads/{user_uuid}/{file_id}/{filename}`

#### 4. FileService (`api/services/file_service.py`)

Main service for file operations.

```python
class FileService:
    def create_file(self, file_data, file_content, user_uuid) -> FileUpload
    def get_files_by_uuids(self, file_ids, user_uuid) -> List[FileUpload]
    def get_files_with_content(self, file_ids, user_uuid) -> List[Tuple[FileUpload, bytes]]
    def delete_file(self, file_id, user_uuid) -> bool
```

Note: `create_file()` skips markdown parsing for image files (sets `markdown_content = NULL`).

#### 5. ContentBlockBuilder (`api/services/content_builder.py`)

Builds Strands SDK ContentBlock list from files and text.

```python
class ContentBlockBuilder:
    def build(self, text, file_uuids, user_uuid) -> List[ContentBlock]
    def _build_document_block(self, file) -> Optional[ContentBlock]
    def _build_image_block(self, file, content) -> Optional[ContentBlock]
```

Document template:
```
## Document: {filename}

{markdown_content}
```

Image format (Bedrock Converse API):
```python
{
    "image": {
        "format": "jpeg",  # png, jpeg, gif, webp
        "source": {
            "bytes": <raw bytes>  # Not base64 encoded
        }
    }
}
```

#### 6. File Format Utilities (`api/utils/file_format.py`)

Constants and helpers for file type handling.

```python
# Allowed types
ALLOWED_DOCUMENT_TYPES = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword"]
ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"]

# Helper functions
def is_allowed_file_type(mime_type: str) -> bool
def is_image_type(mime_type: str) -> bool
def get_image_format(mime_type: str) -> Optional[ImageFormat]
def get_document_format(mime_type: str) -> Optional[str]
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

// Allowed types include both documents and images
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

function useFileUpload(options?) {
  return {
    files: UploadedFile[],
    isUploading: boolean,
    uploadFiles: (files: FileList) => Promise<string[]>,
    removeFile: (fileId: string) => Promise<void>,  // Calls DELETE API for completed files
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
  accept?: string,  // Defaults to documents + images
})
```

#### 3. FileAttachments (`components/chat/FileList.tsx`)

Displays uploaded files with status indicators.

```typescript
function FileAttachments({
  files: UploadedFile[],
  onRemove: (fileId: string) => void,
})
```

#### 4. ChatInterface Integration

Key integration points in `ChatInterface.tsx`:

```typescript
// 1. Drag-and-drop support
const [isDragging, setIsDragging] = useState(false);
// ... drag event handlers

// 2. Send message with files using AI SDK format
sendMessage({
  text: input,
  files: fileIds.map((id) => ({
    type: 'file' as const,
    name: file.filename,
    url: id,  // File UUID stored in url field
    mediaType: file.mimeType,
  })),
});

// 3. Extract file IDs in transport layer
prepareSendMessagesRequest({ messages, id }) {
  const lastMessage = messages[messages.length - 1];
  const fileIds = lastMessage.parts
    ?.filter((part) => part.type === 'file')
    .map((part) => part.url) || [];

  return {
    body: { message: lastMessage, id, file_ids: fileIds },
  };
}

// 4. Render file attachments in messages
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
| markdown_content | TEXT | Parsed Markdown content (NULL for images) |
| user_uuid | UUID | Foreign key to users |
| created_at | TIMESTAMP | Creation timestamp |

---

## API Endpoints

### POST /api/files/upload

Upload files (documents or images).

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
"pillow>=11.0.0"
```

---

## Limitations

### File Restrictions

| Type | Formats | Max Size |
|------|---------|----------|
| Documents | PDF, Word (.doc, .docx) | 20MB |
| Images | PNG, JPEG, GIF, WebP | 20MB upload, 5MB to LLM |
| Count | - | 5 files per message |

### Document Parsing
- Complex layouts (multi-column, nested tables) may not parse perfectly
- Scanned PDFs require OCR-enabled markitdown
- Parse failures return placeholder text, don't block the flow

### Image Processing
- Large images (>3MB) are compressed to JPEG, may lose quality
- Transparent PNGs converted to white background
- Bedrock Converse API limit: 5MB per image after processing
- Animated GIFs: only first frame may be processed

### Security
- Files are user-scoped (users can only access their own files)
- File type validated on both frontend and backend
- S3 paths are not exposed to clients

---

## Testing

### Upload Document Test
```bash
curl -X POST "http://localhost:8000/api/files/upload" \
  -H "Authorization: Bearer <token>" \
  -F "files=@./document.pdf"
```

### Upload Image Test
```bash
curl -X POST "http://localhost:8000/api/files/upload" \
  -H "Authorization: Bearer <token>" \
  -F "files=@./image.png"
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

### Chat with Image Test
```bash
curl -X POST "http://localhost:8000/api/agent/chat" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "conversation-uuid",
    "message": {
      "role": "user",
      "parts": [
        { "type": "file", "name": "image.png", "url": "image-uuid", "mediaType": "image/png" },
        { "type": "text", "text": "What is in this image?" }
      ]
    },
    "file_ids": ["image-uuid"]
  }'
```
