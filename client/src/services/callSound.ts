/**
 * CallSoundService:
 * Hỗ trợ phát bài hát MP3 tùy chỉnh (tại /sounds/ringtone.mp3, /sounds/calling.mp3, /sounds/call-end.mp3).
 * Nếu không có file MP3 hoặc tải thất bại, tự động chuyển sang Web Audio API tổng hợp âm thanh dự phòng.
 */
class CallSoundService {
  private audioCtx: AudioContext | null = null;
  private ringInterval: number | null = null;
  private activeOscillators: OscillatorNode[] = [];
  private currentAudioElement: HTMLAudioElement | null = null;

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  /**
   * Thử phát file âm thanh từ URL.
   * Nếu thành công trả về true. Nếu file không tồn tại hoặc lỗi, gọi fallback.
   */
  private tryPlayAudioFile(url: string, loop: boolean, onFallback: () => void): void {
    const audio = new Audio(url);
    audio.loop = loop;
    this.currentAudioElement = audio;

    let hasHandledError = false;
    const handleError = () => {
      if (hasHandledError) return;
      hasHandledError = true;
      if (this.currentAudioElement === audio) {
        this.currentAudioElement = null;
      }
      onFallback();
    };

    audio.addEventListener('error', handleError, { once: true });

    audio.play().catch((err) => {
      // Nếu là lỗi 404 hoặc không load được media -> fallback sang synth
      if (err?.name === 'NotSupportedError' || audio.error) {
        handleError();
      } else {
        // Có thể bị chặn autoplay do chính sách trình duyệt
        console.warn(`[CallSound] Audio play paused or blocked:`, err);
      }
    });
  }

  /**
   * Phát nhạc chờ khi gọi đi (Outgoing)
   * Ưu tiên file /sounds/calling.mp3, nếu không có thì chạy Synth pulse.
   */
  public playOutgoingRing(): void {
    this.stop();
    this.tryPlayAudioFile('/sounds/calling.mp3', true, () => {
      this.playSyntheticOutgoing();
    });
  }

  /**
   * Phát nhạc chuông khi có người gọi đến (Incoming)
   * Ưu tiên file /sounds/ringtone.mp3, nếu không có thì chạy Synth arpeggio.
   */
  public playIncomingRing(): void {
    this.stop();
    this.tryPlayAudioFile('/sounds/ringtone.mp3', true, () => {
      this.playSyntheticIncoming();
    });
  }

  /**
   * Phát âm thanh khi kết thúc cuộc gọi
   * Ưu tiên file /sounds/call-end.mp3, nếu không có thì chạy Synth cue.
   */
  public playCallEnd(): void {
    this.stop();
    this.tryPlayAudioFile('/sounds/call-end.mp3', false, () => {
      this.playSyntheticCallEnd();
    });
  }

  /**
   * Dừng toàn bộ âm thanh (cả file MP3 lẫn Web Audio synth)
   */
  public stop(): void {
    // 1. Dừng Audio Element nếu đang phát MP3
    if (this.currentAudioElement) {
      try {
        this.currentAudioElement.pause();
        this.currentAudioElement.currentTime = 0;
      } catch {
        // ignore
      }
      this.currentAudioElement = null;
    }

    // 2. Dừng Web Audio intervals và oscillators
    if (this.ringInterval !== null) {
      clearInterval(this.ringInterval);
      this.ringInterval = null;
    }
    for (const osc of this.activeOscillators) {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // already stopped
      }
    }
    this.activeOscillators = [];
  }

  // ==========================================
  // Fallback Web Audio API Synthesizers
  // ==========================================

  private playSyntheticOutgoing(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const playPulse = () => {
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(440, now);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(480, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.08);
      gain.gain.setValueAtTime(0.08, now + 1.2);
      gain.gain.linearRampToValueAtTime(0, now + 1.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.4);
      osc2.stop(now + 1.4);

      this.activeOscillators.push(osc1, osc2);
    };

    playPulse();
    this.ringInterval = window.setInterval(playPulse, 2600);
  }

  private playSyntheticIncoming(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const playChord = () => {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);

        gain.gain.setValueAtTime(0, now + idx * 0.12);
        gain.gain.linearRampToValueAtTime(0.07, now + idx * 0.12 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.55);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.6);
        this.activeOscillators.push(osc);
      });
    };

    playChord();
    this.ringInterval = window.setInterval(playChord, 2200);
  }

  private playSyntheticCallEnd(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(260, now + 0.28);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.32);
  }
}

export const callSound = new CallSoundService();
