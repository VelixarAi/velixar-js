import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Velixar, VelixarError } from '../index.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Velixar', () => {
  let client: Velixar;

  beforeEach(() => {
    client = new Velixar({ apiKey: 'test-key' });
    mockFetch.mockClear();
  });

  describe('constructor', () => {
    it('should initialize with API key', () => {
      expect(client).toBeInstanceOf(Velixar);
    });

    it('should use custom base URL', () => {
      const customClient = new Velixar({ 
        apiKey: 'test-key', 
        baseUrl: 'https://custom.api.com' 
      });
      expect(customClient).toBeInstanceOf(Velixar);
    });
  });

  describe('store', () => {
    it('should store memory successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'mem-123' })
      });

      const result = await client.store('test content');
      
      expect(result).toEqual({ id: 'mem-123' });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://t4xrnwgo7f.execute-api.us-east-1.amazonaws.com/v1/memory',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-key',
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({ content: 'test content' })
        })
      );
    });

    it('should handle store with options', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'mem-123' })
      });

      await client.store('test content', {
        userId: 'user-1',
        tier: 1,
        tags: ['test'],
        metadata: { key: 'value' }
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            content: 'test content',
            userId: 'user-1',
            tier: 1,
            tags: ['test'],
            metadata: { key: 'value' }
          })
        })
      );
    });
  });

  describe('search', () => {
    it('should search memories successfully', async () => {
      const mockResponse = {
        memories: [{ id: 'mem-1', content: 'test memory' }],
        count: 1
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await client.search('test query');
      
      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://t4xrnwgo7f.execute-api.us-east-1.amazonaws.com/v1/memory/search?q=test+query',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-key'
          })
        })
      );
    });

    it('should handle search with options', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ memories: [], count: 0 })
      });

      await client.search('test query', { userId: 'user-1', limit: 5 });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://t4xrnwgo7f.execute-api.us-east-1.amazonaws.com/v1/memory/search?q=test+query&user_id=user-1&limit=5',
        expect.any(Object)
      );
    });
  });

  describe('get', () => {
    it('should get memory by ID', async () => {
      const mockMemory = { memory: { id: 'mem-1', content: 'test memory' } };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMemory)
      });

      const result = await client.get('mem-1');
      
      expect(result).toEqual(mockMemory);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://t4xrnwgo7f.execute-api.us-east-1.amazonaws.com/v1/memory/mem-1',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-key'
          })
        })
      );
    });
  });

  describe('delete', () => {
    it('should delete memory successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ deleted: true })
      });

      const result = await client.delete('mem-1');
      
      expect(result).toEqual({ deleted: true });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://t4xrnwgo7f.execute-api.us-east-1.amazonaws.com/v1/memory/mem-1',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-key'
          })
        })
      );
    });
  });

  describe('error handling', () => {
    it('should throw VelixarError on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Bad request' })
      });

      await expect(client.store('test')).rejects.toThrow(VelixarError);
    });

    it('should throw VelixarError with status code', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Not found' })
      });

      try {
        await client.get('nonexistent');
      } catch (error) {
        expect(error).toBeInstanceOf(VelixarError);
        expect((error as VelixarError).status).toBe(404);
      }
    });
  });
});