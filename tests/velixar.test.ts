import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Velixar, VelixarError } from '../src/index';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Velixar', () => {
  let client: Velixar;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new Velixar({ apiKey: 'test-key' });
  });

  describe('constructor', () => {
    it('uses default baseUrl when not provided', () => {
      const client = new Velixar({ apiKey: 'test-key' });
      expect(client['baseUrl']).toBe('https://t4xrnwgo7f.execute-api.us-east-1.amazonaws.com/v1');
    });

    it('uses provided baseUrl', () => {
      const client = new Velixar({ apiKey: 'test-key', baseUrl: 'https://custom.api.com' });
      expect(client['baseUrl']).toBe('https://custom.api.com');
    });
  });

  describe('store', () => {
    it('stores memory successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'mem-123' })
      });

      const result = await client.store('test content');
      
      expect(result).toEqual({ id: 'mem-123' });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://t4xrnwgo7f.execute-api.us-east-1.amazonaws.com/v1/memory',
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-key',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ content: 'test content' })
        }
      );
    });
  });

  describe('search', () => {
    it('searches memories successfully', async () => {
      const mockResult = { memories: [{ id: 'mem-1', content: 'test' }], count: 1 };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResult)
      });

      const result = await client.search('query');
      
      expect(result).toEqual(mockResult);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://t4xrnwgo7f.execute-api.us-east-1.amazonaws.com/v1/memory/search?q=query',
        {
          headers: {
            'Authorization': 'Bearer test-key',
            'Content-Type': 'application/json'
          }
        }
      );
    });
  });

  describe('get', () => {
    it('gets memory by id successfully', async () => {
      const mockMemory = { memory: { id: 'mem-123', content: 'test content' } };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMemory)
      });

      const result = await client.get('mem-123');
      
      expect(result).toEqual(mockMemory);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://t4xrnwgo7f.execute-api.us-east-1.amazonaws.com/v1/memory/mem-123',
        {
          headers: {
            'Authorization': 'Bearer test-key',
            'Content-Type': 'application/json'
          }
        }
      );
    });
  });

  describe('delete', () => {
    it('deletes memory successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ deleted: true })
      });

      const result = await client.delete('mem-123');
      
      expect(result).toEqual({ deleted: true });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://t4xrnwgo7f.execute-api.us-east-1.amazonaws.com/v1/memory/mem-123',
        {
          method: 'DELETE',
          headers: {
            'Authorization': 'Bearer test-key',
            'Content-Type': 'application/json'
          }
        }
      );
    });
  });

  describe('error handling', () => {
    it('throws VelixarError on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Bad request' })
      });

      await expect(client.store('test')).rejects.toThrow(VelixarError);
    });
  });
});