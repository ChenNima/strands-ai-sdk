---
name: add-api-endpoint
description: Add a new API endpoint to the frontend api-client.ts
allowedTools:
  - Read
  - Edit
  - Glob
  - Grep
---

# Add API Endpoint to Frontend

This skill guides you through adding a new backend API endpoint to the frontend `api-client.ts` file.

## Overview

The `api-client.ts` provides a centralized API client with:
- Automatic token injection
- Consistent error handling
- TypeScript type safety
- Support for JSON and FormData requests

## File Location

```
packages/service/lib/api-client.ts
```

## Structure of api-client.ts

```typescript
// 1. Endpoint constants
const API_ENDPOINTS = {
  CONVERSATIONS: '/api/conversations',
  FILES: '/api/files',
  // Add new endpoints here
} as const;

// 2. Response types
export interface ConversationItem { ... }
export interface FileUploadResponse { ... }
// Add new types here

// 3. ApiClient class with methods
export class ApiClient {
  get<T>(url: string): Promise<T>
  post<T>(url: string, data?: unknown): Promise<T>
  postFormData<T>(url: string, formData: FormData): Promise<T>
  put<T>(url: string, data?: unknown): Promise<T>
  delete<T>(url: string): Promise<T>
  patch<T>(url: string, data?: unknown): Promise<T>
}

// 4. Helper functions
export const api = {
  getConversations: () => ...,
  uploadFiles: (files) => ...,
  // Add new helpers here
};
```

## Steps to Add a New API Endpoint

### 1. Read the current api-client.ts

First, read the file to understand its current structure:

```bash
# File: packages/service/lib/api-client.ts
```

### 2. Add Endpoint Constant

Add a new constant to `API_ENDPOINTS`:

```typescript
const API_ENDPOINTS = {
  CONVERSATIONS: '/api/conversations',
  FILES: '/api/files',
  NEW_RESOURCE: '/api/new-resource',  // Add here
} as const;
```

### 3. Add Response Type (if needed)

Define TypeScript interfaces for the API response:

```typescript
/**
 * Response type description
 */
export interface NewResourceResponse {
  uuid: string;
  name: string;
  created_at: string;
  // Match the backend model fields
}
```

### 4. Add API Helper Function

Add a function to the `api` object:

#### For GET requests:

```typescript
export const api = {
  // ... existing methods

  /**
   * Get all resources
   * @returns Array of resources
   */
  getResources: (): Promise<NewResourceResponse[]> =>
    apiClient.get<NewResourceResponse[]>(API_ENDPOINTS.NEW_RESOURCE),

  /**
   * Get a single resource by ID
   * @param id - The resource UUID
   * @returns Resource data
   */
  getResource: (id: string): Promise<NewResourceResponse> =>
    apiClient.get<NewResourceResponse>(`${API_ENDPOINTS.NEW_RESOURCE}/${id}`),
};
```

#### For POST requests (JSON):

```typescript
/**
 * Create a new resource
 * @param data - The resource data
 * @returns Created resource
 */
createResource: (data: CreateResourceInput): Promise<NewResourceResponse> =>
  apiClient.post<NewResourceResponse>(API_ENDPOINTS.NEW_RESOURCE, data),
```

#### For POST requests (File Upload):

```typescript
/**
 * Upload files
 * @param files - Files to upload
 * @returns Upload response
 */
uploadFiles: (files: File[] | FileList): Promise<FileUploadResponse[]> => {
  const formData = new FormData();
  const fileArray = Array.from(files);
  fileArray.forEach((file) => {
    formData.append('files', file);
  });
  return apiClient.postFormData<FileUploadResponse[]>(
    `${API_ENDPOINTS.FILES}/upload`,
    formData
  );
},
```

#### For DELETE requests:

```typescript
/**
 * Delete a resource
 * @param id - The resource UUID
 */
deleteResource: (id: string): Promise<void> =>
  apiClient.delete<void>(`${API_ENDPOINTS.NEW_RESOURCE}/${id}`),
```

#### For PUT/PATCH requests:

```typescript
/**
 * Update a resource
 * @param id - The resource UUID
 * @param data - The update data
 * @returns Updated resource
 */
updateResource: (id: string, data: UpdateResourceInput): Promise<NewResourceResponse> =>
  apiClient.put<NewResourceResponse>(`${API_ENDPOINTS.NEW_RESOURCE}/${id}`, data),
```

### 5. Verify Backend Route Exists

Check that the backend route exists:

```bash
# Look for routes in api/routes/
```

Match the frontend endpoint path with the backend router prefix.

## Example: Adding a User Profile API

### Backend route (api/routes/users.py):

```python
@router.get("/me")
async def get_current_user(request: FastAPIRequest):
    return request.state.db_user

@router.patch("/me")
async def update_profile(request: FastAPIRequest, data: UpdateProfileRequest):
    ...
```

### Frontend implementation:

```typescript
// 1. Add endpoint constant
const API_ENDPOINTS = {
  // ...
  USERS: '/api/users',
} as const;

// 2. Add types
export interface UserProfile {
  uuid: string;
  email: string;
  name: string | null;
  created_at: string;
}

export interface UpdateProfileInput {
  name?: string;
}

// 3. Add helper functions
export const api = {
  // ...

  /**
   * Get current user profile
   */
  getCurrentUser: (): Promise<UserProfile> =>
    apiClient.get<UserProfile>(`${API_ENDPOINTS.USERS}/me`),

  /**
   * Update current user profile
   */
  updateProfile: (data: UpdateProfileInput): Promise<UserProfile> =>
    apiClient.patch<UserProfile>(`${API_ENDPOINTS.USERS}/me`, data),
};
```

## Usage in Components

After adding the API endpoint, use it in components:

```typescript
import { api, ApiError } from '@/lib/api-client';

// In a React component or hook
try {
  const data = await api.getResources();
  // Handle success
} catch (error) {
  if (error instanceof ApiError) {
    console.error(`API Error ${error.status}: ${error.message}`);
  }
}
```

## Checklist

- [ ] Added endpoint constant to `API_ENDPOINTS`
- [ ] Added response type interface (if needed)
- [ ] Added input type interface (if needed)
- [ ] Added helper function to `api` object
- [ ] Added JSDoc comments
- [ ] Verified backend route exists and paths match
- [ ] Types match backend response model

## Troubleshooting

### 404 Not Found

- Check that the endpoint path matches the backend router prefix
- Verify the backend route is registered in `api/main.py`

### Type Mismatch

- Compare TypeScript interface with backend Pydantic model
- Check field names (snake_case in Python, camelCase in TypeScript)

### FormData Not Working

- Use `postFormData()` instead of `post()` for file uploads
- Don't set Content-Type header manually (browser sets it with boundary)

## Example Usage

```
Add a new API endpoint for user preferences:
- GET /api/preferences - Get user preferences
- PUT /api/preferences - Update user preferences
```
