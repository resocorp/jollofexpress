// API client utilities
import type { ApiResponse } from '@/types/database';

const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Generic API request function
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };
  
  try {
    const response = await fetch(url, config);
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new ApiError(
        data.error || data.message || 'An error occurred',
        response.status,
        data
      );
    }
    
    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    throw new ApiError(
      'Network error. Please check your connection.',
      0
    );
  }
}

/**
 * GET request
 */
export async function get<T>(endpoint: string): Promise<T> {
  return apiRequest<T>(endpoint, { method: 'GET' });
}

/**
 * POST request
 */
export async function post<T>(endpoint: string, data?: any): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * PATCH request
 */
export async function patch<T>(endpoint: string, data?: any): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * DELETE request
 */
export async function del<T>(endpoint: string): Promise<T> {
  return apiRequest<T>(endpoint, { method: 'DELETE' });
}

/**
 * Upload file
 */
export async function uploadFile<T>(
  endpoint: string,
  file: File
): Promise<T> {
  const formData = new FormData();
  formData.append('file', file);
  
  return apiRequest<T>(endpoint, {
    method: 'POST',
    body: formData,
    headers: {
      // Let browser set Content-Type for FormData
    },
  });
}
