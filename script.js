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
        this.videoDurationEl = document.getElementById('videoDuration');
        this.videoPreview = document.getElementById('videoPreview');
        this.previewVideo = document.getElementById('previewVideo');
        this.uploadIcon = document.getElementById('uploadIcon');
        this.uploadSpinner = document.getElementById('uploadSpinner');
        this.uploadText = document.getElementById('uploadText');
        this.loadingText = document.getElementById('loadingText');
        this.splitMode = document.getElementById('splitMode');
        this.shortDuration = document.getElementById('shortDuration');
        this.shortCount = document.getElementById('shortCount');
        this.durationGroup = document.getElementById('durationGroup');
        this.countGroup = document.getElementById('countGroup');
        this.calculatedDuration = document.getElementById('calculatedDuration');
        this.quality = document.getElementById('quality');
        this.generateBtn = document.getElementById('generateBtn');
        this.progressSection = document.getElementById('progressSection');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.resultsSection = document.getElementById('resultsSection');
        this.shortsList = document.getElementById('shortsList');
        this.downloadAllBtn = document.getElementById('downloadAllBtn');
        this.toast = document.getElementById('toast');
    }

    attachEventListeners() {
        this.uploadArea.addEventListener('click', () => this.videoInput.click());
        this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        this.videoInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.splitMode.addEventListener('change', () => this.handleSplitModeChange());
        this.shortCount.addEventListener('change', () => this.updateCalculatedDuration());
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

    handleSplitModeChange() {
        const mode = this.splitMode.value;
        if (mode === 'duration') {
            this.durationGroup.style.display = 'block';
            this.countGroup.style.display = 'none';
        } else {
            this.durationGroup.style.display = 'none';
            this.countGroup.style.display = 'block';
            this.updateCalculatedDuration();
        }
    }

    updateCalculatedDuration() {
        if (this.videoDuration > 0) {
            const count = parseInt(this.shortCount.value);
            const durationPerShort = this.videoDuration / count;
            const minutes = Math.floor(durationPerShort / 60);
            const seconds = Math.floor(durationPerShort % 60);
            this.calculatedDuration.textContent = `Cada short: ${minutes}:${seconds.toString().padStart(2, '0')}`;
        } else {
            this.calculatedDuration.textContent = 'Carregue um vídeo primeiro';
        }
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
        if (!file.type.startsWith('video/')) {
            this.showError('Por favor, selecione um arquivo de vídeo válido.');
            return;
        }

        // Show loading state
        this.uploadIcon.style.display = 'none';
        this.uploadSpinner.classList.add('active');
        this.uploadText.style.display = 'none';
        this.loadingText.classList.add('active');
        this.uploadArea.style.pointerEvents = 'none';

        this.videoFile = file;
        this.videoName.textContent = `Arquivo: ${file.name}`;
        
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.src = URL.createObjectURL(file);
        
        video.onloadedmetadata = () => {
            this.videoDuration = video.duration;
            const minutes = Math.floor(video.duration / 60);
            const seconds = Math.floor(video.duration % 60);
            this.videoDurationEl.textContent = `Duração: ${minutes}:${seconds.toString().padStart(2, '0')}`;
            this.videoInfo.style.display = 'block';
            
            // Show video preview
            this.previewVideo.src = URL.createObjectURL(file);
            this.videoPreview.style.display = 'block';
            
            // Reset upload area
            this.uploadIcon.style.display = 'block';
            this.uploadSpinner.classList.remove('active');
            this.uploadText.style.display = 'block';
            this.loadingText.classList.remove('active');
            this.uploadArea.style.pointerEvents = 'auto';
            
            this.generateBtn.disabled = false;
            this.updateCalculatedDuration();
            this.showToast('Vídeo carregado com sucesso! 🎉');
            URL.revokeObjectURL(video.src);
        };

        video.onerror = () => {
            this.showError('Erro ao carregar o vídeo. Tente outro arquivo.');
            this.videoInfo.style.display = 'none';
            this.videoPreview.style.display = 'none';
            this.generateBtn.disabled = true;
            
            // Reset upload area
            this.uploadIcon.style.display = 'block';
            this.uploadSpinner.classList.remove('active');
            this.uploadText.style.display = 'block';
            this.loadingText.classList.remove('active');
            this.uploadArea.style.pointerEvents = 'auto';
        };
    }

    async generateShorts() {
        const mode = this.splitMode.value;
        let segmentDuration;
        let totalSegments;

        if (mode === 'duration') {
            segmentDuration = parseInt(this.shortDuration.value);
            totalSegments = Math.ceil(this.videoDuration / segmentDuration);
        } else {
            totalSegments = parseInt(this.shortCount.value);
            segmentDuration = this.videoDuration / totalSegments;
        }
        
        this.progressSection.style.display = 'block';
        this.resultsSection.style.display = 'none';
        this.shorts = [];
        this.shortsList.innerHTML = '';
        this.generateBtn.disabled = true;
        this.generateBtn.classList.add('loading');

        try {
            const video = document.createElement('video');
            video.src = URL.createObjectURL(this.videoFile);
            video.muted = true;
            video.crossOrigin = 'anonymous';
            
            await new Promise((resolve, reject) => {
                video.onloadeddata = resolve;
                video.onerror = () => reject(new Error('Erro ao carregar vídeo'));
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
                    
                    // Always use MP4 extension
                    this.shorts.push({
                        name: `short_${i + 1}.mp4`,
                        url: shortUrl,
                        blob: shortBlob,
                        startTime: this.formatTime(startTime),
                        endTime: this.formatTime(endTime)
                    });
                } catch (error) {
                    console.error(`Erro ao criar segmento ${i + 1}:`, error);
                    this.showError(`Erro ao criar segmento ${i + 1}: ${error.message}`);
                }
            }

            URL.revokeObjectURL(video.src);
            
            if (this.shorts.length > 0) {
                this.displayResults();
                this.showToast(`${this.shorts.length} shorts criados com sucesso! 🎬`);
            } else {
                this.showError('Não foi possível criar nenhum short. Tente novamente.');
            }
        } catch (error) {
            console.error('Erro ao gerar shorts:', error);
            this.showError('Erro ao processar vídeo: ' + error.message);
        } finally {
            this.generateBtn.disabled = false;
            this.generateBtn.classList.remove('loading');
        }
    }

    async createVideoSegment(video, startTime, endTime) {
        return new Promise((resolve, reject) => {
            try {
                // Get quality setting
                const quality = this.quality.value;
                const qualitySettings = {
                    low: { bitrate: 1000000, fps: 15 },
                    medium: { bitrate: 2500000, fps: 30 },
                    high: { bitrate: 5000000, fps: 30 }
                };
                
                const settings = qualitySettings[quality] || qualitySettings.medium;

                // Try to get supported MIME type - prioritize MP4
                const mimeTypes = [
                    'video/mp4',
                    'video/webm;codecs=vp9',
                    'video/webm;codecs=vp8',
                    'video/webm'
                ];
                
                let supportedMimeType = null;
                for (const mimeType of mimeTypes) {
                    if (MediaRecorder.isTypeSupported(mimeType)) {
                        supportedMimeType = mimeType;
                        break;
                    }
                }

                if (!supportedMimeType) {
                    throw new Error('Nenhum formato de vídeo suportado encontrado');
                }

                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                canvas.width = video.videoWidth || 1080;
                canvas.height = video.videoHeight || 1920;

                const stream = canvas.captureStream(settings.fps);
                const mediaRecorder = new MediaRecorder(stream, {
                    mimeType: supportedMimeType,
                    videoBitsPerSecond: settings.bitrate
                });

                const chunks = [];
                mediaRecorder.ondataavailable = (e) => {
                    if (e.data.size > 0) {
                        chunks.push(e.data);
                    }
                };

                mediaRecorder.onstop = () => {
                    // Always create as MP4 extension
                    const blob = new Blob(chunks, { type: supportedMimeType });
                    resolve(blob);
                };

                mediaRecorder.onerror = (e) => {
                    reject(new Error('Erro no MediaRecorder: ' + e.error));
                };

                mediaRecorder.start(100);

                video.currentTime = startTime;
                
                const processFrame = () => {
                    if (video.currentTime >= endTime || video.ended) {
                        mediaRecorder.stop();
                        video.ontimeupdate = null;
                    } else {
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                        video.currentTime += 1/settings.fps;
                        requestAnimationFrame(processFrame);
                    }
                };

                video.onseeked = () => {
                    video.onseeked = null;
                    processFrame();
                };

                video.onerror = (e) => {
                    reject(new Error('Erro ao processar vídeo: ' + e.error));
                };

            } catch (error) {
                reject(error);
            }
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
                <div class="short-actions">
                    <button class="preview-btn" onclick="window.previewShort(${index})">
                        ▶️
                    </button>
                    <button class="download-btn" onclick="window.downloadShort(${index})">
                        Baixar
                    </button>
                </div>
            `;
            this.shortsList.appendChild(shortItem);
        });
    }

    previewShort(index) {
        const short = this.shorts[index];
        const video = document.createElement('video');
        video.src = short.url;
        video.controls = true;
        video.autoplay = true;
        video.style.maxWidth = '100%';
        video.style.maxHeight = '300px';
        video.style.borderRadius = '8px';
        video.style.marginTop = '10px';
        
        const previewContainer = document.createElement('div');
        previewContainer.className = 'short-preview-container';
        previewContainer.style.marginTop = '10px';
        previewContainer.appendChild(video);
        
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕ Fechar';
        closeBtn.className = 'close-preview-btn';
        closeBtn.style.marginTop = '8px';
        closeBtn.style.padding = '6px 12px';
        closeBtn.style.background = '#ef4444';
        closeBtn.style.color = 'white';
        closeBtn.style.border = 'none';
        closeBtn.style.borderRadius = '4px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.onclick = () => previewContainer.remove();
        
        previewContainer.appendChild(closeBtn);
        
        const shortItem = this.shortsList.children[index];
        shortItem.appendChild(previewContainer);
    }

    downloadShort(index) {
        const short = this.shorts[index];
        const a = document.createElement('a');
        a.href = short.url;
        a.download = short.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        this.showToast(`Download iniciado: ${short.name} 📥`);
    }

    downloadAllShorts() {
        this.showToast(`Iniciando download de ${this.shorts.length} shorts... 📥`);
        this.shorts.forEach((short, index) => {
            setTimeout(() => {
                this.downloadShort(index);
            }, index * 500);
        });
    }

    showError(message) {
        this.showToast(message, 'error');
        this.progressSection.style.display = 'none';
    }

    showToast(message, type = 'success') {
        this.toast.textContent = message;
        this.toast.className = 'toast ' + type;
        this.toast.classList.add('show');
        
        setTimeout(() => {
            this.toast.classList.remove('show');
        }, 3000);
    }
}

window.downloadShort = function(index) {
    window.shorts360.downloadShort(index);
};

window.previewShort = function(index) {
    window.shorts360.previewShort(index);
};

document.addEventListener('DOMContentLoaded', () => {
    window.shorts360 = new Shorts360();
});