export const ProcessingStatus = {
  IDLE: 'idle',
  LOADING_MODEL: 'loading_model',
  EXTRACTING_AUDIO: 'extracting_audio',
  SEPARATING: 'separating',
  RENDERING: 'rendering',
  COMPLETED: 'completed',
  ERROR: 'error'
};

export class Store extends EventTarget {
  constructor() {
    super();
    this.state = {
      sourceMedia: null, // { id, file, url, duration, format, size }
      processing: {
        status: ProcessingStatus.IDLE,
        progress: 0,
        error: null,
        details: ''
      },
      processedResult: null, // { sourceId, vocalsAudioBuffer, instrumentalAudioBuffer, instrumentalVideoBlob, downloadUrl }
      playback: {
        isPlaying: false,
        currentTime: 0,
        volume: 1.0,
        isVocalsEnabled: true,
        pitchShift: 0,
        playbackRate: 1.0
      }
    };
  }

  updateProcessing(status, progress, error = null, details = '') {
    this.state.processing = { ...this.state.processing, status, progress, error, details };
    this.dispatchEvent(new CustomEvent('processing-update', { detail: this.state.processing }));
  }

  setSourceMedia(media) {
    this.state.sourceMedia = media;
    this.dispatchEvent(new CustomEvent('source-media-set', { detail: media }));
  }

  setProcessedResult(result) {
    this.state.processedResult = result;
    this.dispatchEvent(new CustomEvent('result-ready', { detail: result }));
  }
}

export const store = new Store();
