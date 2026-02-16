import axios from 'axios';
import { useAuth } from '@clerk/nextjs';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const apiClient = axios.create({
    baseURL: `${API_URL}/api/v1`,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Helper hook to use authenticated API
export const useApiClient = () => {
    const { getToken } = useAuth();

    const fetcher = async (url: string, options: any = {}) => {
        const token = await getToken();
        const config = { ...options, headers: { ...options.headers } };

        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return apiClient(url, config);
    };

    return fetcher;
}

// Interceptor to add token dynamically if using the instance directly (needs token management)
// Ideally simpler: Components get token and pass it, or we use a hook wrapper.
// Let's rely on the components getting the token using `useAuth()` and setting headers or passing it.
