import axios from 'axios';
import { useAuth } from '@clerk/nextjs';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const apiClient = axios.create({
    baseURL: `${API_URL}/api/v1`,
    timeout: 120000, // 2 minutes for long-running predictions
});

// Helper hook to use authenticated API
export const useApiClient = () => {
    const { getToken } = useAuth();

    const fetcher = async (url: string, options: any = {}) => {
        const token = await getToken();

        // Build headers: merge caller headers with auth
        const headers: Record<string, string> = {
            ...(options.headers || {}),
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // Default Content-Type to JSON if not provided by caller
        if (!headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
        }

        // Build config: spread all caller options, then override headers
        const config: any = {
            ...options,
            headers,
        };

        // Map fetch-style 'body' to Axios-style 'data' (for backward compat)
        if (config.body !== undefined) {
            config.data = config.body;
            delete config.body;
        }

        // Clean up non-Axios properties
        delete config.isFormData;

        // CRITICAL: For FormData, DELETE Content-Type entirely.
        // The browser MUST set it automatically to include the boundary parameter
        // (e.g. "multipart/form-data; boundary=----WebKitFormBoundary...").
        // Explicitly setting Content-Type strips the boundary → Network Error.
        if (config.data instanceof FormData) {
            delete config.headers['Content-Type'];
        }

        return apiClient(url, config);
    };

    return fetcher;
}


