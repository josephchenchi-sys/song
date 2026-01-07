import { describe, it, expect } from 'vitest';
import { useProcessing } from '../useProcessing';
import { ProcessingStatus } from '../../types';

describe('useProcessing', () => {
    it('initializes with IDLE status', () => {
        const { state } = useProcessing();
        expect(state.status).toBe(ProcessingStatus.IDLE);
        expect(state.progress).toBe(0);
        expect(state.error).toBeNull();
    });

    it('can update status and progress', () => {
        const { state, updateStatus } = useProcessing();
        
        updateStatus(ProcessingStatus.EXTRACTING_AUDIO, 50, 'Extracting...');
        
        expect(state.status).toBe(ProcessingStatus.EXTRACTING_AUDIO);
        expect(state.progress).toBe(50);
        expect(state.logs).toContain('Extracting...');
    });

    it('can set error', () => {
        const { state, setError } = useProcessing();
        
        setError('Something went wrong');
        
        expect(state.status).toBe(ProcessingStatus.ERROR);
        expect(state.error).toBe('Something went wrong');
    });

    it('can set source media', () => {
        const { state, setSourceMedia } = useProcessing();
        const mockFile = new File([''], 'test.mp4', { type: 'video/mp4' });
        
        setSourceMedia(mockFile);
        
        expect(state.sourceMedia).toBeDefined();
        expect(state.sourceMedia?.file).toBe(mockFile);
        expect(state.sourceMedia?.id).toBeDefined();
    });
});
