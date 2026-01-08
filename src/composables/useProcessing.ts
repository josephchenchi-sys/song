import { reactive } from 'vue';
import { ProcessingStatus, type SourceMedia, type ProcessedResult } from '../types';

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

    return {
        state,
        updateStatus,
        setError,
        setSourceMedia,
        setProcessedResult
    };
};
