import { reactive, ref } from 'vue';
import { ProcessingStatus, type SourceMedia, type ProcessedResult } from '../types';
import { StorageService } from '../services/StorageService';
import { ProcessorService } from '../services/ProcessorService';

const storageService = StorageService.getInstance();
const processorService = ProcessorService.getInstance();

const historyVersion = ref(0);

const state = reactive<{
    status: ProcessingStatus;
    progress: number;
    error: string | null;
    logs: string[];
    sourceMedia: SourceMedia | null;
    result: ProcessedResult | null;
}>({
    status: ProcessingStatus.IDLE,
    progress: 0,
    error: null,
    logs: [],
    sourceMedia: null,
    result: null
});

export const useProcessing = () => {
    const updateStatus = (status: ProcessingStatus, progress: number, details?: string) => {
        state.status = status;
        state.progress = progress;
        if (details) {
            state.logs.push(details);
        }
    };

    const setError = (message: string) => {
        state.status = ProcessingStatus.ERROR;
        state.error = message;
        state.logs.push(`Error: ${message}`);
    };

    const setSourceMedia = (file: File) => {
        state.sourceMedia = {
            id: crypto.randomUUID(),
            file,
            url: URL.createObjectURL(file),
            format: file.type,
            size: file.size,
            duration: 0 
        };
    };
    
    const setProcessedResult = (result: ProcessedResult) => {
        state.result = result;
    }

    const resetState = () => {
        state.status = ProcessingStatus.IDLE;
        state.progress = 0;
        state.error = null;
        state.logs = [];
        state.sourceMedia = null;
        state.result = null;
    };

    const saveCurrentResult = async () => {
        if (state.sourceMedia && state.result) {
            try {
                await storageService.saveSong(state.sourceMedia.id, state.sourceMedia.file.name, state.result);
                console.log('Saved to history:', state.sourceMedia.file.name);
                historyVersion.value++;
            } catch (e) {
                console.error('Failed to save to history:', e);
            }
        }
    };

    const loadFromHistory = async (id: string) => {
        try {
            updateStatus(ProcessingStatus.LOADING_MODEL, 0, '正在讀取歷史紀錄...');
            const song = await storageService.getSong(id);
            if (!song) throw new Error('找不到該紀錄');

            const result = await processorService.restoreState(
                song.blobs.original,
                song.blobs.vocals,
                song.blobs.instrumental
            );

            // Reconstruct source media state
            state.sourceMedia = {
                id: song.id,
                file: new File([song.blobs.original], song.name, { type: song.blobs.original.type }),
                url: URL.createObjectURL(song.blobs.original),
                format: song.blobs.original.type,
                size: song.blobs.original.size,
                duration: 0
            };

            state.result = result;
            updateStatus(ProcessingStatus.COMPLETED, 100, '讀取完成');
        } catch (e: any) {
            setError(`讀取失敗: ${e.message}`);
        }
    };

    return {
        state,
        historyVersion,
        updateStatus,
        setError,
        setSourceMedia,
        setProcessedResult,
        resetState,
        saveCurrentResult,
        loadFromHistory
    };
};