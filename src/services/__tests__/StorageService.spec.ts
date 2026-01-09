import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StorageService } from '../StorageService';
import type { ProcessedResult } from '../../types';

// Mock idb
const mockDb = {
    put: vi.fn(),
    getAll: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    getAllKeys: vi.fn(),
};

vi.mock('idb', () => ({
    openDB: vi.fn(() => Promise.resolve(mockDb)),
}));

describe('StorageService', () => {
    let service: StorageService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new StorageService();
    });

    it('saves a song correctly', async () => {
        const mockResult = {
            originalVideo: new Blob(['video'], { type: 'video/mp4' }),
            vocalsBlob: new Blob(['vocals'], { type: 'audio/wav' }),
            instrumentalBlob: new Blob(['inst'], { type: 'audio/wav' }),
        } as unknown as ProcessedResult;

        await service.saveSong('test-id', 'Test Song.mp4', mockResult);

        expect(mockDb.put).toHaveBeenCalledWith('songs', expect.objectContaining({
            id: 'test-id',
            name: 'Test Song.mp4',
            timestamp: expect.any(Number),
            blobs: expect.objectContaining({
                original: expect.any(Blob),
                vocals: expect.any(Blob),
                instrumental: expect.any(Blob)
            })
        }));
    });

    it('retrieves all songs', async () => {
        const mockSongs = [
            { id: '1', name: 'Song 1', timestamp: 100 },
            { id: '2', name: 'Song 2', timestamp: 200 }
        ];
        mockDb.getAll.mockResolvedValue(mockSongs);

        const songs = await service.getSongs();
        expect(songs).toHaveLength(2);
        expect(songs[0].name).toBe('Song 2'); // Newest first
    });

    it('deletes a song', async () => {
        await service.deleteSong('test-id');
        expect(mockDb.delete).toHaveBeenCalledWith('songs', 'test-id');
    });
});
