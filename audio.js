// Web Audio API Retro 8-bit Sound Synthesizer
// Không phụ thuộc vào file âm thanh bên ngoài, hoạt động 100% không bị chặn CORS

class RetroAudio {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.bgmTimer = null;
        this.isBgmPlaying = false;
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.ctx = new AudioContext();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleSound() {
        this.enabled = !this.enabled;
        if (!this.enabled && this.isBgmPlaying) {
            this.stopBGM();
        }
        return this.enabled;
    }

    playTone(freq, type, duration, startVol = 0.2, endVol = 0) {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = type; // 'square', 'sine', 'triangle', 'sawtooth'
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

            gain.gain.setValueAtTime(startVol, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(Math.max(endVol, 0.0001), this.ctx.currentTime + duration);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) {
            console.warn('Audio playTone error', e);
        }
    }

    // Tiếng nhảy Mario (tần số tăng vút lên)
    playJump() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);

            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.16);
        } catch (e) {}
    }

    // Tiếng nhặt đồng xu vàng (2 nốt cao leng keng)
    playCoin() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(987.77, now); // B5
            osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6

            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.35);
        } catch (e) {}
    }

    // Tiếng đạp quái / đụng vỡ gạch
    playStomp() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.exponentialRampToValueAtTime(60, now + 0.12);

            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.13);
        } catch (e) {}
    }

    // Tiếng bị thương / mất máu
    playHit() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(180, now);
            osc.frequency.linearRampToValueAtTime(40, now + 0.25);

            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.25);
        } catch (e) {}
    }

    // Nhạc chiến thắng khi cứu được công chúa (Victory Fanfare)
    playVictory() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        // Chuỗi nốt hào hùng: C4, E4, G4, C5, E5, G5...
        const notes = [
            { f: 261.63, d: 0.12 },
            { f: 329.63, d: 0.12 },
            { f: 392.00, d: 0.12 },
            { f: 523.25, d: 0.15 },
            { f: 392.00, d: 0.10 },
            { f: 523.25, d: 0.35 },
            { f: 659.25, d: 0.50 }
        ];

        let timeOffset = 0;
        notes.forEach(n => {
            setTimeout(() => {
                this.playTone(n.f, 'triangle', n.d, 0.28, 0.01);
            }, timeOffset * 1000);
            timeOffset += n.d * 0.9;
        });
    }

    // Âm thanh Game Over
    playGameOver() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const notes = [440, 415, 392, 349, 293];
        notes.forEach((freq, idx) => {
            setTimeout(() => {
                this.playTone(freq, 'sawtooth', 0.2, 0.25, 0.01);
            }, idx * 180);
        });
    }

    // Nhạc nền 8-bit chuông Nokia / Chiptune nhẹ nhàng lặp lại
    startBGM() {
        if (!this.enabled || this.isBgmPlaying) return;
        this.isBgmPlaying = true;
        this.init();

        const melody = [
            { f: 659.25, d: 0.15 }, // E5
            { f: 659.25, d: 0.15 }, // E5
            { f: 0,      d: 0.15 }, // nghỉ
            { f: 659.25, d: 0.15 }, // E5
            { f: 0,      d: 0.15 }, // nghỉ
            { f: 523.25, d: 0.15 }, // C5
            { f: 659.25, d: 0.25 }, // E5
            { f: 783.99, d: 0.35 }, // G5
            { f: 0,      d: 0.30 }, // nghỉ
            { f: 392.00, d: 0.35 }  // G4
        ];

        let step = 0;
        const playStep = () => {
            if (!this.isBgmPlaying || !this.enabled) return;
            const note = melody[step];
            if (note.f > 0) {
                this.playTone(note.f, 'square', note.d * 0.8, 0.04, 0.001);
            }
            step = (step + 1) % melody.length;
            this.bgmTimer = setTimeout(playStep, note.d * 1000 * 1.6);
        };

        playStep();
    }

    stopBGM() {
        this.isBgmPlaying = false;
        if (this.bgmTimer) {
            clearTimeout(this.bgmTimer);
            this.bgmTimer = null;
        }
    }
}

window.soundEngine = new RetroAudio();
