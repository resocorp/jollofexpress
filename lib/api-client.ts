// API client utilities
import { createClient } from '@/lib/supabase/client';

// Use empty string for relative URLs (same origin) - works for both dev and production
const API_BASE_URL = '';

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Get auth token for admin API requests
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch {
    return null;
  }
}

/**
 * Build an Authorization header if a token is available
 */
async function buildAuthHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Authenticated fetch for admin API routes
 * Use this in hooks and components that need auth
 */
export async function adminFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const authHeaders = await buildAuthHeaders();
  
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      ...authHeaders,
    },
  });
}

/**
 * Generic API request function
 * Automatically adds auth token for /api/admin/* routes
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  // Automatically add auth token for admin, kitchen, dispatch, notifications,
  // tracking, and expense routes
  if (
    endpoint.startsWith('/api/admin') ||
    endpoint.startsWith('/api/kitchen') ||
    endpoint.startsWith('/api/dispatch') ||
    endpoint.startsWith('/api/notifications') ||
    endpoint.startsWith('/api/tracking') ||
    endpoint.startsWith('/api/expenses') ||
    endpoint.startsWith('/api/expense-categories')
  ) {
    const authHeaders = await buildAuthHeaders();
    Object.assign(defaultHeaders, authHeaders);
  }
  
  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };
  
  try {
    const response = await fetch(url, config);
    
    const data = await response.json() as Record<string, unknown>;
    
    if (!response.ok) {
      // Don't log expected errors (503 for capacity)
      const isExpectedError = response.status === 503;
      
      const errorMessage = (data.error as string) || (data.message as string) || 'An error occurred';
      const apiError = new ApiError(
        errorMessage,
        response.status,
        data
      );
      
      // Only log unexpected errors to console
      if (!isExpectedError) {
        console.error('API Error:', {
          status: response.status,
          message: apiError.message,
          endpoint,
        });
      }
      
      throw apiError;
    }
    
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Network errors should be logged
    console.error('Network error:', error);
    
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
export async function post<T>(endpoint: string, data?: unknown): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * PATCH request
 */
export async function patch<T>(endpoint: string, data?: unknown): Promise<T> {
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
  
  // Omit Content-Type so browser sets multipart boundary for FormData
  return apiRequest<T>(endpoint, {
    method: 'POST',
    body: formData as unknown as string,
    headers: { 'Content-Type': '' },
  });
}
