import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { ProcessedResult } from '../types';

interface SongSchema extends DBSchema {
    songs: {
        key: string;
        value: {
            id: string;
            name: string;
            timestamp: number;
            blobs: {
                original: Blob;
                vocals: Blob;
                instrumental: Blob;
            };
        };
        indexes: { 'by-date': number };
    };
}

const DB_NAME = 'vocal-remover-db';
const STORE_NAME = 'songs';
const MAX_SONGS = 5;

export class StorageService {
    private static instance: StorageService;
    private dbPromise: Promise<IDBPDatabase<SongSchema>>;

    constructor() {
        this.dbPromise = openDB<SongSchema>(DB_NAME, 1, {
            upgrade(db) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('by-date', 'timestamp');
            },
        });
    }

    public static getInstance(): StorageService {
        if (!StorageService.instance) {
            StorageService.instance = new StorageService();
        }
        return StorageService.instance;
    }

    async saveSong(id: string, name: string, result: ProcessedResult): Promise<void> {
        const db = await this.dbPromise;
        
        const record = {
            id,
            name,
            timestamp: Date.now(),
            blobs: {
                original: result.originalVideo,
                vocals: result.vocalsBlob,
                instrumental: result.instrumentalBlob
            }
        };

        await db.put(STORE_NAME, record);
        await this.enforceLimit();
    }

    async getSongs(): Promise<Array<{ id: string; name: string; timestamp: number }>> {
        const db = await this.dbPromise;
        const songs = await db.getAll(STORE_NAME);
        return songs.map(({ id, name, timestamp }) => ({ id, name, timestamp })).sort((a, b) => b.timestamp - a.timestamp);
    }

    async getSong(id: string): Promise<{
        id: string;
        name: string;
        blobs: { original: Blob; vocals: Blob; instrumental: Blob };
    } | undefined> {
        const db = await this.dbPromise;
        return db.get(STORE_NAME, id);
    }

    async deleteSong(id: string): Promise<void> {
        const db = await this.dbPromise;
        await db.delete(STORE_NAME, id);
    }

    async getStorageUsage(): Promise<number> {
        const db = await this.dbPromise;
        const songs = await db.getAll(STORE_NAME);
        let total = 0;
        for (const song of songs) {
            total += song.blobs.original.size;
            total += song.blobs.vocals.size;
            total += song.blobs.instrumental.size;
        }
        return total;
    }

    private async enforceLimit(): Promise<void> {
        const db = await this.dbPromise;
        const count = await db.count(STORE_NAME);
        
        if (count > MAX_SONGS) {
            const keys = await db.getAllKeysFromIndex(STORE_NAME, 'by-date');
            if (keys.length > 0) {
                const oldestKey = keys[0];
                await db.delete(STORE_NAME, oldestKey);
            }
        }
    }
}