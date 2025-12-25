import { store, ProcessingStatus } from './store.js';
import { Processor } from './processor.js';
import { AudioPlayer } from './audio-player.js';

console.log('App initialized');

// Mobile Warning Check
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
if (isMobile) {
  document.getElementById('mobile-warning').style.display = 'block';
}

const processor = new Processor();
const player = new AudioPlayer();

// Initialize
(async () => {
    try {
        await processor.init((loaded, total) => {
            if (total > 0) {
                const percent = (loaded / total) * 100;
                const mb = (loaded / 1024 / 1024).toFixed(1);
                const totalMb = (total / 1024 / 1024).toFixed(1);
                store.updateProcessing(ProcessingStatus.LOADING_MODEL, percent, null, `下載 AI 模型中... ${mb}MB / ${totalMb}MB`);
            }
        });
        await player.init();
        
        // Reset progress after init
        store.updateProcessing(ProcessingStatus.IDLE, 0);
        document.getElementById('status-text').innerText = '系統就緒';
        
        // If file was selected before init finished
        if (store.state.sourceMedia) {
             document.getElementById('process-btn').disabled = false;
        }
    } catch (e) {
        console.error('Initialization failed', e);
        document.getElementById('status-text').innerText = '初始化失敗: ' + e.message;
    }
})();

// UI Elements
const fileInput = document.getElementById('file-input');
const processBtn = document.getElementById('process-btn');
const downloadBtn = document.getElementById('download-btn');
const progressBar = document.getElementById('progress-bar');
const statusText = document.getElementById('status-text');
const logText = document.getElementById('log-text');
const fileName = document.getElementById('file-name');

// Preview UI
const previewContainer = document.getElementById('preview-container');
const previewVideo = document.getElementById('preview-video');
const playPauseBtn = document.getElementById('play-pause-btn');
const seekBar = document.getElementById('seek-bar');
const timeDisplay = document.getElementById('time-display');
const vocalsToggle = document.getElementById('vocals-toggle');
const pitchDownBtn = document.getElementById('pitch-down-btn');
const pitchUpBtn = document.getElementById('pitch-up-btn');
const pitchDisplay = document.getElementById('pitch-display');

// Store Subscriptions
store.addEventListener('processing-update', (e) => {
    const { status, progress, error, details } = e.detail;
    progressBar.style.width = `${progress}%`;
    
    let text = '準備就緒';
    if (status === ProcessingStatus.LOADING_MODEL) text = '載入/下載 AI 模型中...';
    if (status === ProcessingStatus.EXTRACTING_AUDIO) text = '提取音訊中... (FFmpeg)';
    if (status === ProcessingStatus.SEPARATING) text = '分離人聲中... (Demucs AI)';
    if (status === ProcessingStatus.RENDERING) text = '合成影片中... (FFmpeg)';
    if (status === ProcessingStatus.COMPLETED) text = '處理完成';
    if (status === ProcessingStatus.ERROR) text = '錯誤: ' + error;
    
    statusText.innerText = `${text} (${Math.round(progress)}%)`;
    
    if (details) {
        logText.style.display = 'block';
        logText.innerText = details + '\n' + logText.innerText.substring(0, 1000);
    }
});

store.addEventListener('result-ready', (e) => {
    const result = e.detail;
    if (result) {
        // Setup Preview
        previewContainer.style.display = 'block';
        previewVideo.src = URL.createObjectURL(result.originalVideo);
        previewVideo.muted = true; // Audio handled by Web Audio API
        
        player.loadBuffers(result.vocals, result.instrumental);
        
        seekBar.max = result.vocals.duration;
        updateTimeDisplay(0, result.vocals.duration);
    }
});

function updateTimeDisplay(current, total) {
    const fmt = t => {
        const m = Math.floor(t / 60);
        const s = Math.floor(t % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };
    timeDisplay.innerText = `${fmt(current)} / ${fmt(total)}`;
}

// Sync Logic Loop
function syncLoop() {
    if (store.state.playback.isPlaying) {
        const t = player.getCurrentTime();
        seekBar.value = t;
        updateTimeDisplay(t, seekBar.max);
        
        // Sync video if drifted (tighten threshold to 0.05s for better sync)
        const drift = previewVideo.currentTime - t;
        if (Math.abs(drift) > 0.05) {
            previewVideo.currentTime = t;
        }

        // Ensure video is playing at the correct rate
        if (previewVideo.playbackRate !== 1.0) {
            previewVideo.playbackRate = 1.0;
        }
    }
    requestAnimationFrame(syncLoop);
}
syncLoop();

// Event Listeners
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate MIME type
    const validTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (!validTypes.includes(file.type)) {
        alert('不支援的檔案格式。請上傳 MP4, WebM 或 MOV。');
        fileInput.value = ''; // Reset
        return;
    }

    fileName.innerText = file.name;
    
    // Only enable if initialized successfully
    if (document.getElementById('status-text').innerText.includes('系統就緒')) {
        processBtn.disabled = false;
    }
    
    downloadBtn.disabled = true;

    store.setSourceMedia({
        id: crypto.randomUUID(),
        file: file,
        url: URL.createObjectURL(file),
        format: file.type,
        size: file.size,
        duration: 0 
    });
});

processBtn.addEventListener('click', async () => {
    const { sourceMedia } = store.state;
    if (!sourceMedia) return;

    processBtn.disabled = true;
    downloadBtn.disabled = true;
    previewContainer.style.display = 'none';
    store.updateProcessing(ProcessingStatus.EXTRACTING_AUDIO, 0);

    try {
        const result = await processor.process(sourceMedia.file, (stage, percent, details) => {
            let status = ProcessingStatus.EXTRACTING_AUDIO;
            if (stage === 'separating') status = ProcessingStatus.SEPARATING;
            if (stage === 'rendering') status = ProcessingStatus.RENDERING;
            if (stage === 'completed') status = ProcessingStatus.COMPLETED;
            
            store.updateProcessing(status, percent, null, details);
        });

        store.setProcessedResult(result);
        downloadBtn.disabled = false;
        processBtn.disabled = false;
        store.updateProcessing(ProcessingStatus.COMPLETED, 100);

    } catch (e) {
        console.error(e);
        store.updateProcessing(ProcessingStatus.ERROR, 0, e.message);
        processBtn.disabled = false;
    }
});

downloadBtn.addEventListener('click', async () => {
    try {
        const blob = await processor.renderDownload({ pitchShift: store.state.playback.pitchShift });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'instrumental.mp4';
        a.click();
        URL.revokeObjectURL(url);
    } catch (e) {
        alert('下載失敗: ' + e.message);
    }
});

// Preview Controls
playPauseBtn.addEventListener('click', async () => {
    if (player.isPlaying) {
        player.pause();
        previewVideo.pause();
        playPauseBtn.innerText = '播放';
        store.state.playback.isPlaying = false;
    } else {
        await player.ctx.resume();
        player.play();
        previewVideo.play();
        playPauseBtn.innerText = '暫停';
        store.state.playback.isPlaying = true;
    }
});

seekBar.addEventListener('input', (e) => {
    const t = parseFloat(e.target.value);
    player.seek(t);
    previewVideo.currentTime = t;
});

vocalsToggle.addEventListener('change', (e) => {
    player.setVocalsEnabled(e.target.checked);
    store.state.playback.isVocalsEnabled = e.target.checked;
});

const updatePitch = (delta) => {
    let newPitch = store.state.playback.pitchShift + delta;
    if (newPitch > 12) newPitch = 12;
    if (newPitch < -12) newPitch = -12;
    store.state.playback.pitchShift = newPitch;
    player.setPitch(newPitch);
    pitchDisplay.innerText = newPitch > 0 ? `+${newPitch}` : newPitch;
    
    // Pitch shift now uses SoundTouch (time-stretch), so speed remains constant.
    // Video playbackRate should stay 1.0
    previewVideo.playbackRate = 1.0;
};

pitchUpBtn.addEventListener('click', () => updatePitch(1));
pitchDownBtn.addEventListener('click', () => updatePitch(-1));
