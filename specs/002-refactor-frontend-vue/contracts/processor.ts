// 定義 Processor 服務的介面契約

export type ProgressCallback = (stage: string, percent: number, details: string) => void;

export interface IProcessor {
    /**
     * 初始化 Processor
     * @param onProgress 下載模型進度的回調
     */
    init(onProgress?: (loaded: number, total: number) => void): Promise<void>;

    /**
     * 處理影片檔案
     * @param file 原始影片檔案
     * @param onProgress 處理進度的回調
     * @returns 處理結果 (包含音訊 buffer 與原始影片 blob)
     */
    process(file: File, onProgress: ProgressCallback): Promise<ProcessedResult>;

    /**
     * 渲染並下載最終影片
     * @param options 選項 (例如音高調整)
     * @returns 最終影片的 Blob
     */
    renderDownload(options: { pitchShift: number }): Promise<Blob>;
}

export interface ProcessedResult {
    originalVideo: Blob;
    vocals: AudioBuffer;
    instrumental: AudioBuffer;
}
