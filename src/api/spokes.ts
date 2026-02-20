import { getAccessToken } from '../lib/auth';
import type { SpokesBike } from '../hooks/useOnboarding';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

export interface SpokesSearchResult {
  id: string;
  maker: string;
  model: string;
  year: number;
  family: string;
  category: string;
  subcategory: string | null;
}

export interface SearchBikesParams {
  query: string;
  year?: number;
  category?: string;
}

/**
 * Search bikes via 99Spokes API (proxied through our API)
 */
export async function searchBikes(params: SearchBikesParams): Promise<SpokesSearchResult[]> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const url = new URL(`${API_URL}/api/spokes/search`);
  url.searchParams.set('q', params.query);
  if (params.year) {
    url.searchParams.set('year', String(params.year));
  }
  if (params.category) {
    url.searchParams.set('category', params.category);
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Search failed' }));
    throw new Error(error.message || 'Failed to search bikes');
  }

  const data = await response.json();
  return data.bikes || [];
}

/**
 * Get full bike details by ID from 99Spokes
 */
export async function getBikeById(id: string): Promise<SpokesBike | null> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_URL}/api/spokes/bike/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    const error = await response.json().catch(() => ({ message: 'Failed to get bike' }));
    throw new Error(error.message || 'Failed to get bike details');
  }

  const data = await response.json();
  return data.bike || null;
}
