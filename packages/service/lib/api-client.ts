'use client';

import { getAccessToken } from './auth';

/**
 * API endpoint constants
 */
const API_ENDPOINTS = {
  CONVERSATIONS: '/api/conversations',
} as const;

/**
 * Conversation item from API
 */
export interface ConversationItem {
  uuid: string;
  title: string;
  created_at: string;
  updated_at: string;
}

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  status: number;
  statusText: string;
  url: string;

  constructor({
    status,
    statusText,
    message,
    url,
  }: {
    status: number;
    statusText: string;
    message: string;
    url: string;
  }) {
    super(`API Error ${status}: ${message}`);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
    this.url = url;
  }
}

/**
 * API client with automatic token injection and error handling
 */
export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  /**
   * Get headers with authorization token
   */
  private async getHeaders(): Promise<HeadersInit> {
    const token = await getAccessToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Handle API response errors
   */
  private async handleResponse<T>(response: Response, url: string): Promise<T> {
    if (!response.ok) {
      const errorBody = await response.text().catch(() => response.statusText);
      throw new ApiError({
        status: response.status,
        statusText: response.statusText,
        message: errorBody,
        url,
      });
    }

    // Handle empty responses (e.g., 204 No Content)
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return {} as T;
    }

    return response.json();
  }

  /**
   * Make a GET request
   * @param url - The API endpoint URL
   * @returns The response data
   */
  async get<T = unknown>(url: string): Promise<T> {
    const headers = await this.getHeaders();
    const response = await fetch(`${this.baseUrl}${url}`, {
      method: 'GET',
      headers,
    });

    return this.handleResponse<T>(response, url);
  }

  /**
   * Make a POST request
   * @param url - The API endpoint URL
   * @param data - The request body data
   * @returns The response data
   */
  async post<T = unknown>(url: string, data?: unknown): Promise<T> {
    const headers = await this.getHeaders();
    const response = await fetch(`${this.baseUrl}${url}`, {
      method: 'POST',
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    return this.handleResponse<T>(response, url);
  }

  /**
   * Make a PUT request
   * @param url - The API endpoint URL
   * @param data - The request body data
   * @returns The response data
   */
  async put<T = unknown>(url: string, data?: unknown): Promise<T> {
    const headers = await this.getHeaders();
    const response = await fetch(`${this.baseUrl}${url}`, {
      method: 'PUT',
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    return this.handleResponse<T>(response, url);
  }

  /**
   * Make a DELETE request
   * @param url - The API endpoint URL
   * @returns The response data
   */
  async delete<T = unknown>(url: string): Promise<T> {
    const headers = await this.getHeaders();
    const response = await fetch(`${this.baseUrl}${url}`, {
      method: 'DELETE',
      headers,
    });

    return this.handleResponse<T>(response, url);
  }

  /**
   * Make a PATCH request
   * @param url - The API endpoint URL
   * @param data - The request body data
   * @returns The response data
   */
  async patch<T = unknown>(url: string, data?: unknown): Promise<T> {
    const headers = await this.getHeaders();
    const response = await fetch(`${this.baseUrl}${url}`, {
      method: 'PATCH',
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    return this.handleResponse<T>(response, url);
  }
}

// Export a default instance
export const apiClient = new ApiClient();

/**
 * Typed API helper functions for common API calls
 */
export const api = {
  /**
   * Get all conversations for the current user
   * @returns Array of conversation objects
   */
  getConversations: (): Promise<ConversationItem[]> =>
    apiClient.get<ConversationItem[]>(API_ENDPOINTS.CONVERSATIONS),

  /**
   * Get messages for a specific conversation
   * @param conversationId - The UUID of the conversation
   * @returns Array of message objects
   */
  getConversationMessages: (conversationId: string): Promise<unknown[]> =>
    apiClient.get<unknown[]>(`${API_ENDPOINTS.CONVERSATIONS}/${conversationId}/messages`),

  /**
   * Delete a conversation
   * @param conversationId - The UUID of the conversation to delete
   */
  deleteConversation: (conversationId: string): Promise<void> =>
    apiClient.delete<void>(`${API_ENDPOINTS.CONVERSATIONS}/${conversationId}`),
};
