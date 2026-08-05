class Shorts360 {
    constructor() {
        this.videoFile = null;
        this.videoDuration = 0;
        this.shorts = [];
        this.initializeElements();
        this.attachEventListeners();
    }

    initializeElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.videoInput = document.getElementById('videoInput');
        this.videoInfo = document.getElementById('videoInfo');
        this.videoName = document.getElementById('videoName');
        this.videoDuration = document.getElementById('videoDuration');
        this.shortDuration = document.getElementById('shortDuration');
        this.generateBtn = document.getElementById('generateBtn');
        this.progressSection = document.getElementById('progressSection');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.resultsSection = document.getElementById('resultsSection');
        this.shortsList = document.getElementById('shortsList');
        this.downloadAllBtn = document.getElementById('downloadAllBtn');
    }

    attachEventListeners() {
        this.uploadArea.addEventListener('click', () => this.videoInput.click());
        this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        this.videoInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.generateBtn.addEventListener('click', () => this.generateShorts());
        this.downloadAllBtn.addEventListener('click', () => this.downloadAllShorts());
    }

    handleDragOver(e) {
        e.preventDefault();
        this.uploadArea.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type.startsWith('video/')) {
            this.processVideoFile(files[0]);
        }
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.processVideoFile(file);
        }
    }

    processVideoFile(file) {
        this.videoFile = file;
        this.videoName.textContent = `Arquivo: ${file.name}`;
        
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.src = URL.createObjectURL(file);
        
        video.onloadedmetadata = () => {
            this.videoDuration = video.duration;
            const minutes = Math.floor(video.duration / 60);
            const seconds = Math.floor(video.duration % 60);
            this.videoDuration.textContent = `Duração: ${minutes}:${seconds.toString().padStart(2, '0')}`;
            this.videoInfo.style.display = 'block';
            this.generateBtn.disabled = false;
            URL.revokeObjectURL(video.src);
        };
    }

    async generateShorts() {
        const segmentDuration = parseInt(this.shortDuration.value);
        const totalSegments = Math.ceil(this.videoDuration / segmentDuration);
        
        this.progressSection.style.display = 'block';
        this.resultsSection.style.display = 'none';
        this.shorts = [];
        this.shortsList.innerHTML = '';

        const video = document.createElement('video');
        video.src = URL.createObjectURL(this.videoFile);
        video.muted = true;
        
        await new Promise(resolve => {
            video.onloadeddata = resolve;
        });

        for (let i = 0; i < totalSegments; i++) {
            const startTime = i * segmentDuration;
            const endTime = Math.min(startTime + segmentDuration, this.videoDuration);
            
            const progress = ((i + 1) / totalSegments) * 100;
            this.progressFill.style.width = `${progress}%`;
            this.progressText.textContent = `Gerando short ${i + 1} de ${totalSegments}...`;

            try {
                const shortBlob = await this.createVideoSegment(video, startTime, endTime);
                const shortUrl = URL.createObjectURL(shortBlob);
                
                this.shorts.push({
                    name: `short_${i + 1}.mp4`,
                    url: shortUrl,
                    blob: shortBlob,
                    startTime: this.formatTime(startTime),
                    endTime: this.formatTime(endTime)
                });
            } catch (error) {
                console.error(`Erro ao criar segmento ${i + 1}:`, error);
            }
        }

        URL.revokeObjectURL(video.src);
        this.displayResults();
    }

    async createVideoSegment(video, startTime, endTime) {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = video.videoWidth || 1080;
            canvas.height = video.videoHeight || 1920;

            const stream = canvas.captureStream(30);
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'video/webm;codecs=vp9'
            });

            const chunks = [];
            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunks.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                resolve(blob);
            };

            mediaRecorder.onerror = reject;
            mediaRecorder.start();

            video.currentTime = startTime;
            
            video.ontimeupdate = () => {
                if (video.currentTime >= endTime || video.ended) {
                    mediaRecorder.stop();
                    video.ontimeupdate = null;
                } else {
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    video.currentTime += 1/30;
                }
            };

            video.onerror = reject;
        });
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    displayResults() {
        this.progressSection.style.display = 'none';
        this.resultsSection.style.display = 'block';

        this.shorts.forEach((short, index) => {
            const shortItem = document.createElement('div');
            shortItem.className = 'short-item';
            shortItem.innerHTML = `
                <div class="short-info">
                    <div class="short-name">${short.name}</div>
                    <div class="short-time">${short.startTime} - ${short.endTime}</div>
                </div>
                <button class="download-btn" onclick="window.downloadShort(${index})">
                    Baixar
                </button>
            `;
            this.shortsList.appendChild(shortItem);
        });
    }

    downloadShort(index) {
        const short = this.shorts[index];
        const a = document.createElement('a');
        a.href = short.url;
        a.download = short.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    downloadAllShorts() {
        this.shorts.forEach((short, index) => {
            setTimeout(() => {
                this.downloadShort(index);
            }, index * 500);
        });
    }
}

window.downloadShort = function(index) {
    window.shorts360.downloadShort(index);
};

document.addEventListener('DOMContentLoaded', () => {
    window.shorts360 = new Shorts360();
});