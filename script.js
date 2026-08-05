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
        this.shortDuration = document.getElementById('shortDuration');
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
        if (!file.type.startsWith('video/')) {
            this.showError('Por favor, selecione um arquivo de vídeo válido.');
            return;
        }

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
            this.generateBtn.disabled = false;
            this.showToast('Vídeo carregado com sucesso! 🎉');
            URL.revokeObjectURL(video.src);
        };

        video.onerror = () => {
            this.showError('Erro ao carregar o vídeo. Tente outro arquivo.');
            this.videoInfo.style.display = 'none';
            this.generateBtn.disabled = true;
        };
    }

    async generateShorts() {
        const segmentDuration = parseInt(this.shortDuration.value);
        const totalSegments = Math.ceil(this.videoDuration / segmentDuration);
        
        this.progressSection.style.display = 'block';
        this.resultsSection.style.display = 'none';
        this.shorts = [];
        this.shortsList.innerHTML = '';
        this.generateBtn.disabled = true;

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
                    
                    const extension = shortBlob.type.includes('mp4') ? 'mp4' : 'webm';
                    
                    this.shorts.push({
                        name: `short_${i + 1}.${extension}`,
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
        }
    }

    async createVideoSegment(video, startTime, endTime) {
        return new Promise((resolve, reject) => {
            try {
                // Try to get supported MIME type
                const mimeTypes = [
                    'video/webm;codecs=vp9',
                    'video/webm;codecs=vp8',
                    'video/webm',
                    'video/mp4'
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

                const stream = canvas.captureStream(30);
                const mediaRecorder = new MediaRecorder(stream, {
                    mimeType: supportedMimeType,
                    videoBitsPerSecond: 2500000
                });

                const chunks = [];
                mediaRecorder.ondataavailable = (e) => {
                    if (e.data.size > 0) {
                        chunks.push(e.data);
                    }
                };

                mediaRecorder.onstop = () => {
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
                        video.currentTime += 1/30;
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

document.addEventListener('DOMContentLoaded', () => {
    window.shorts360 = new Shorts360();
});