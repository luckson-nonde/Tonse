/**
 * Fetch Interceptor
 * Wraps window.fetch to handle network errors and provide fallback/mock data
 * Useful for development when backend is unavailable
 */

// Store the original fetch function
const originalFetch = window.fetch.bind(window);

// Mock data for common endpoints
const MOCK_RESPONSES: Record<string, Record<string, any>> = {
  '/auth/me': {
    id: 'dev-user-123',
    email: 'dev@example.com',
    name: 'Developer User',
    role: 'BUYER',
    phone: '+260123456789',
    nrc: '123456/12/1',
    metadata: {},
  },
  '/auth/refresh': {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
  },
};

/**
 * Enhanced fetch that handles errors gracefully
 */
export function createFetchInterceptor(
  options: {
    useMockData?: boolean;
    logErrors?: boolean;
    timeout?: number;
  } = {}
) {
  const { useMockData = false, logErrors = true, timeout = 10000 } = options;

  // Override window.fetch
  (window as any).fetch = async function interceptedFetch(
    resource: string | Request,
    init?: RequestInit
  ): Promise<Response> {
    const url = typeof resource === 'string' ? resource : resource.url;
    const method = init?.method || 'GET';

    try {
      // Create a timeout promise
      const timeoutPromise = new Promise<Response>((_, reject) =>
        setTimeout(() => reject(new Error('Fetch timeout')), timeout)
      );

      // Race between actual fetch and timeout
      const response = await Promise.race([originalFetch(resource, init), timeoutPromise]);

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (logErrors) {
        console.warn(`[Fetch Interceptor] Error calling ${method} ${url}:`, errorMessage);
      }

      // If mock data is enabled and we have a mock response for this endpoint
      if (useMockData) {
        const mockData = getMockResponse(url);
        if (mockData) {
          if (logErrors) {
            console.info(`[Fetch Interceptor] Using mock data for ${url}`);
          }
          return new Response(JSON.stringify(mockData), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }

      // Return an error response instead of throwing
      const errorResponse = {
        data: null,
        message: `Network error: ${errorMessage}`,
        statusCode: 0,
        error: errorMessage,
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 503, // Service Unavailable
        headers: { 'Content-Type': 'application/json' },
      });
    }
  };

  // Return a function to restore original fetch
  return () => {
    (window as any).fetch = originalFetch;
  };
}

/**
 * Get mock response for a given endpoint
 */
function getMockResponse(url: string): any | null {
  // Extract the endpoint path
  const pathname = new URL(url, 'http://localhost').pathname;

  // Check for exact matches
  if (MOCK_RESPONSES[pathname]) {
    return MOCK_RESPONSES[pathname];
  }

  // Check for pattern matches
  if (pathname.includes('/auth/me')) {
    return MOCK_RESPONSES['/auth/me'];
  }
  if (pathname.includes('/auth/refresh')) {
    return MOCK_RESPONSES['/auth/refresh'];
  }

  return null;
}

/**
 * Initialize fetch interceptor (to be called in App.tsx or main.tsx)
 */
export function initializeFetchInterceptor(options?: {
  useMockData?: boolean;
  logErrors?: boolean;
  timeout?: number;
}): void {
  // Use mock data only if explicitly enabled
  const shouldUseMockData = options?.useMockData === true;

  createFetchInterceptor({
    ...options,
    useMockData: shouldUseMockData,
    logErrors: true,
  });

  if (shouldUseMockData) {
    console.info('[Fetch Interceptor] Mock data mode enabled - backend responses will be mocked');
  }
}

/**
 * Note: Backend connection check removed - errors are handled gracefully
 * during actual API requests, so we no longer need a proactive health check.
 */
async function checkBackendConnection(): Promise<boolean> {
  // Always return false to rely on graceful error handling instead
  return false;
}

export { originalFetch };
