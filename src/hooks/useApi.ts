/**
 * Custom React hook for making API calls with JWT handling
 * Includes automatic token refresh and error handling
 */

import React, { useState, useCallback, useEffect } from 'react';
import { apiClient } from '../services/api/client';

interface UseApiOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

export function useApi<T = any>(endpoint: string, options?: UseApiOptions) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const request = useCallback(
    async (method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET', body?: any) => {
      try {
        setLoading(true);
        setError(null);

        let response;
        switch (method) {
          case 'POST':
            response = await apiClient.post<T>(endpoint, body);
            break;
          case 'PUT':
            response = await apiClient.put<T>(endpoint, body);
            break;
          case 'PATCH':
            response = await apiClient.patch<T>(endpoint, body);
            break;
          case 'DELETE':
            response = await apiClient.delete<T>(endpoint);
            break;
          default:
            response = await apiClient.get<T>(endpoint);
        }

        setData(response.data || null);
        options?.onSuccess?.(response.data);
        return response.data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        options?.onError?.(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [endpoint, options]
  );

  return {
    data,
    loading,
    error,
    get: () => request('GET'),
    post: (body: any) => request('POST', body),
    put: (body: any) => request('PUT', body),
    patch: (body: any) => request('PATCH', body),
    delete: () => request('DELETE'),
  };
}

/**
 * Custom hook for fetching data on component mount
 */
export function useFetch<T = any>(endpoint: string, deps: any[] = []) {
  const api = useApi<T>(endpoint);
  const [called, setCalled] = useState(false);

  useEffect(() => {
    if (!called) {
      api.get();
      setCalled(true);
    }
  }, deps);

  return api;
}
