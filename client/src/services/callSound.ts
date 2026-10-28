/**
 * Synthesizes call ringtones and cues via the Web Audio API.
 * Guarantees zero latency, no network downloads, and zero missing asset issues.
 */
class CallSoundService {
  private audioCtx: AudioContext | null = null;
  private ringInterval: number | null = null;
  private activeOscillators: OscillatorNode[] = [];

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
   * Plays a gentle modern outgoing ring sound (pleasant two-tone pulse every 2.6s)
   */
  public playOutgoingRing(): void {
    this.stop();
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const playPulse = () => {
      const now = ctx.currentTime;
      // Tone 1: 440 Hz (A4)
      // Tone 2: 480 Hz
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

  /**
   * Plays an upbeat, melodic incoming call ring (3-tone major chord arpeggio)
   */
  public playIncomingRing(): void {
    this.stop();
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

  /**
   * Plays a brief descending cue when a call ends or is rejected
   */
  public playCallEnd(): void {
    this.stop();
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

  /**
   * Stops all active ringing oscillators and intervals
   */
  public stop(): void {
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
}

export const callSound = new CallSoundService();
