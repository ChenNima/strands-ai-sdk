---
name: login-strands-ai-sdk
description: Login to Strands AI SDK application using Playwright MCP
allowed-tools:
  - mcp__playwright__*
---

# Login to Strands AI SDK

This skill automates the login process for the Strands AI SDK application at localhost:3000.

## Prerequisites

- The application must be running at `http://localhost:3000`
- Playwright MCP must be configured and available
- Valid user credentials (email and password)

## Steps

### 1. Navigate to the application

```
Navigate to http://localhost:3000
```

The page will initially show a loading state, then redirect to `/login`.

### 2. Wait for login page to load

Wait 2-3 seconds for the page to fully load and redirect to the login page.

### 3. Click "Sign In with OIDC" button

Click the "Sign In with OIDC" button to initiate the authentication flow. This will redirect to Amazon Cognito login page.

### 4. Enter email address

On the Cognito login page:
- Find the "Email address" textbox
- Enter the user's email address
- Click the "Next" button

### 5. Enter password

On the password page:
- Find the "Password" textbox
- Enter the user's password
- Click the "Continue" button

### 6. Wait for authentication to complete

Wait 2-3 seconds for the authentication to complete. The page will:
1. Show "Completing sign in..." message
2. Redirect to `/chat/{conversation-id}`

### 7. Verify successful login

After successful login, you should see:
- User email displayed in the top right corner
- Chat interface with conversation history on the left
- Message input area at the bottom

## Example Usage

```
Login to the Strands AI SDK application:
- URL: http://localhost:3000
- Email: user@example.com
- Password: ********
```

## Notes

- The login uses Amazon Cognito for OIDC authentication
- Session will persist until manually logged out or token expires
- If login fails, check credentials and ensure the backend services are running
