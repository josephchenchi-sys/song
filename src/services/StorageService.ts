import { openDB, type DBSchema } from 'idb';
import type { ProcessedResult } from '../types';

interface SongRecord {
    id: string;
    name: string;
    date: number;
    originalVideo: Blob;
    vocalsBlob: Blob;
    instrumentalAudioBlob: Blob;
    instrumentalVideoBlob: Blob;
}

interface SongDB extends DBSchema {
  songs: {
    key: string;
    value: SongRecord;
    indexes: { 'by-date': number };
  };
}

export class StorageService {
    private dbName = 'song-db';
    
    private async getDB() {
        return openDB<SongDB>(this.dbName, 1, {
            upgrade(db) {
                const store = db.createObjectStore('songs', { keyPath: 'id' });
                store.createIndex('by-date', 'date');
            },
        });
    }

    async saveSong(file: File, result: ProcessedResult): Promise<string> {
        const db = await this.getDB();
        const id = crypto.randomUUID();
        
        await db.add('songs', {
            id,
            name: file.name,
            date: Date.now(),
            originalVideo: result.originalVideo,
            vocalsBlob: result.vocalsBlob,
            instrumentalAudioBlob: result.instrumentalAudioBlob,
            instrumentalVideoBlob: result.instrumentalBlob
        });
        
        return id;
    }

    async getAllSongs(): Promise<{id: string, name: string, date: number}[]> {
        const db = await this.getDB();
        const songs = await db.getAllFromIndex('songs', 'by-date');
        // Return reverse order (newest first)
        return songs.reverse().map(s => ({
            id: s.id,
            name: s.name,
            date: s.date
        }));
    }

    async getSong(id: string): Promise<SongRecord | undefined> {
        const db = await this.getDB();
        return db.get('songs', id);
    }

    async deleteSong(id: string): Promise<void> {
        const db = await this.getDB();
        await db.delete('songs', id);
    }

    async getStorageEstimate(): Promise<{usage: number, quota: number} | null> {
        if (navigator.storage && navigator.storage.estimate) {
            const estimate = await navigator.storage.estimate();
            return {
                usage: estimate.usage || 0,
                quota: estimate.quota || 0
            };
        }
        return null;
    }
}

export const storageService = new StorageService();
