// Synthesizer-based audio effects using standard browser Web Audio API
// Fully coordinated with backgroundMusic, works offline, zero latency, highly responsive
import { backgroundMusic } from "./backgroundMusic";
import { safeStorage } from "./storage";

class SoundEffectManager {
  private fallbackAudioCtx: AudioContext | null = null;
  private muted: boolean = false;

  constructor() {
    // Read user mute preference safely
    try {
      const saved = safeStorage.getItem("quiz_sound_muted");
      if (saved !== null) {
        this.muted = saved === "true";
      }
    } catch {
      this.muted = false;
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;

    // Prefer using the running audio context from backgroundMusic so both play simultaneously without iOS Safari suspension
    const sharedCtx = backgroundMusic.getSharedAudioContext();
    if (sharedCtx) {
      if (sharedCtx.state === "suspended") {
        sharedCtx.resume().catch(() => {});
      }
      return sharedCtx;
    }

    if (!this.fallbackAudioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.fallbackAudioCtx = new AudioCtxClass();
      }
    }
    if (this.fallbackAudioCtx && this.fallbackAudioCtx.state === "suspended") {
      this.fallbackAudioCtx.resume().catch(() => {});
    }
    return this.fallbackAudioCtx;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(mute: boolean) {
    this.muted = mute;
    safeStorage.setItem("quiz_sound_muted", String(mute));
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  // 1. Option Select Click Sound - Satisfying crisp melodic chime pop
  public playOptionSelect() {
    if (this.muted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Primary tone: warm sine pop glide 540Hz -> 840Hz
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(540, now);
      osc1.frequency.exponentialRampToValueAtTime(840, now + 0.08);

      gain1.gain.setValueAtTime(0.40, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      // Secondary overtone: sparkling triangle chime 1080Hz -> 1320Hz
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(1080, now);
      osc2.frequency.exponentialRampToValueAtTime(1320, now + 0.06);

      gain2.gain.setValueAtTime(0.20, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.095);
      osc2.stop(now + 0.075);
    } catch (e) {
      // Audio context error ignore
    }
  }

  // 2. Touch / Button Tap Sound - Tactile modern click response
  public playTouchTap() {
    if (this.muted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(680, now);
      osc.frequency.exponentialRampToValueAtTime(260, now + 0.045);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.055);
    } catch (e) {}
  }

  // 3. Navigation Next / Previous Sound
  public playNavigate() {
    if (this.muted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      const now = ctx.currentTime;

      osc.frequency.setValueAtTime(460, now);
      osc.frequency.exponentialRampToValueAtTime(680, now + 0.07);

      gain.gain.setValueAtTime(0.30, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch (e) {}
  }

  // 3. Low Time Clock Tick
  public playTick() {
    if (this.muted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      const now = ctx.currentTime;

      osc.frequency.setValueAtTime(800, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch (e) {}
  }

  // 4. Anti-Cheating Warning Alert
  public playWarningAlert() {
    if (this.muted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      [0, 0.12].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "square";
        osc.frequency.setValueAtTime(400, now + offset);

        gain.gain.setValueAtTime(0.15, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.09);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + offset);
        osc.stop(now + offset + 0.09);
      });
    } catch (e) {}
  }

  // 5. Celebration Victory Fanfare (Trainee Passed!)
  public playVictoryFanfare() {
    if (this.muted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const notes = [
        { freq: 523.25, time: 0.0, dur: 0.14 }, // C5
        { freq: 659.25, time: 0.14, dur: 0.14 }, // E5
        { freq: 783.99, time: 0.28, dur: 0.18 }, // G5
        { freq: 1046.5, time: 0.46, dur: 0.45 }, // C6
      ];

      const now = ctx.currentTime;
      notes.forEach(({ freq, time, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + time);

        gain.gain.setValueAtTime(0.25, now + time);
        gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + time);
        osc.stop(now + time + dur);
      });
    } catch (e) {}
  }

  // 6. Test Failed Tone
  public playFailSound() {
    if (this.muted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const notes = [
        { freq: 440, time: 0.0, dur: 0.2 },
        { freq: 392, time: 0.2, dur: 0.2 },
        { freq: 330, time: 0.4, dur: 0.4 },
      ];

      const now = ctx.currentTime;
      notes.forEach(({ freq, time, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, now + time);

        gain.gain.setValueAtTime(0.12, now + time);
        gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + time);
        osc.stop(now + time + dur);
      });
    } catch (e) {}
  }

  // 7. Light Success Jingle / Affirmation Sound
  public playSuccessJingle() {
    if (this.muted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const notes = [
        { freq: 523.25, time: 0.0, dur: 0.12 }, // C5
        { freq: 659.25, time: 0.10, dur: 0.12 }, // E5
        { freq: 783.99, time: 0.20, dur: 0.25 }, // G5
      ];

      const now = ctx.currentTime;
      notes.forEach(({ freq, time, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + time);

        gain.gain.setValueAtTime(0.20, now + time);
        gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + time);
        osc.stop(now + time + dur);
      });
    } catch (e) {}
  }
}

export const soundEffects = new SoundEffectManager();
