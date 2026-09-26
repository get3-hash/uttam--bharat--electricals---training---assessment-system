// Continuous Training & Quiz Background Music Engine using Web Audio API
// Continuous, pleasant, uplifting focus soundtrack starting at Employee Registration
// and playing uninterrupted until Quiz Assessment is completed.
// 100% offline, zero external audio assets, precision Web Audio lookahead scheduling.
import { safeStorage } from "./storage";

type SoundStateListener = (state: {
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  mode: "ambient" | "quiz";
}) => void;

class BackgroundMusicManager {
  private audioCtx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private isMuted: boolean = false;
  private volume: number = 0.65; // Loud, clear, audible focus level
  private mode: "ambient" | "quiz" = "quiz";
  private masterGain: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private compressorNode: DynamicsCompressorNode | null = null;

  // Web Audio lookahead scheduler properties
  private schedulerTimer: any = null;
  private nextNoteTime: number = 0;
  private currentStep: number = 0;
  private tempo: number = 108; // 108 BPM steady inspiring rhythm
  private lookahead: number = 25.0; // ms
  private scheduleAheadTime: number = 0.15; // s

  // Active oscillator tracking for clean teardown
  private activeNodes: { osc: OscillatorNode; gain: GainNode }[] = [];
  private listeners: Set<SoundStateListener> = new Set();
  private gestureListenersAttached: boolean = false;

  // 64-step (4 bars of 16-steps) uplifting, continuous ringtone/chime focus sequence
  // Progression: C Maj -> A Min -> F Maj -> G Maj
  private melodyPattern = [
    // Bar 1: C Major (Bright, welcoming, ringtone chime)
    523.25, 0, 659.25, 523.25, 783.99, 0, 659.25, 523.25,
    587.33, 659.25, 0, 523.25, 440.00, 523.25, 587.33, 0,

    // Bar 2: A Minor (Focused, thoughtful, intellectual)
    440.00, 0, 523.25, 440.00, 659.25, 0, 523.25, 440.00,
    392.00, 440.00, 0, 523.25, 587.33, 523.25, 440.00, 0,

    // Bar 3: F Major (Inspiring, motivating)
    349.23, 0, 440.00, 523.25, 659.25, 0, 523.25, 440.00,
    523.25, 587.33, 0, 659.25, 587.33, 523.25, 440.00, 392.00,

    // Bar 4: G Major (Uplifting cadence, resolving back to C)
    392.00, 0, 493.88, 587.33, 783.99, 0, 659.25, 587.33,
    523.25, 587.33, 0, 659.25, 783.99, 659.25, 587.33, 523.25,
  ];

  // 64-step Bass note pattern (C2 -> A1/A2 -> F1/F2 -> G1/G2)
  private bassPattern = [
    // Bar 1 (C)
    130.81, 0, 0, 130.81, 0, 0, 164.81, 0, 130.81, 0, 0, 196.00, 0, 130.81, 0, 0,
    // Bar 2 (Am)
    110.00, 0, 0, 110.00, 0, 0, 130.81, 0, 110.00, 0, 0, 164.81, 0, 110.00, 0, 0,
    // Bar 3 (F)
    87.31, 0, 0, 87.31, 0, 0, 110.00, 0, 87.31, 0, 0, 130.81, 0, 87.31, 0, 0,
    // Bar 4 (G)
    98.00, 0, 0, 98.00, 0, 0, 123.47, 0, 98.00, 0, 0, 146.83, 0, 98.00, 0, 0,
  ];

  constructor() {
    if (typeof window !== "undefined") {
      try {
        const savedMute = safeStorage.getItem("employee_bg_sound_muted");
        if (savedMute !== null) {
          this.isMuted = savedMute === "true";
        }
        const savedVol = safeStorage.getItem("employee_bg_sound_volume");
        if (savedVol !== null) {
          const parsed = parseFloat(savedVol);
          if (!isNaN(parsed) && parsed >= 0.1) {
            this.volume = parsed;
          }
        }
      } catch {
        // Fallback default audio values
      }
      this.attachGlobalGestureListeners();
    }
  }

  private initAudio(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }

    if (this.audioCtx && !this.masterGain) {
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.audioCtx.currentTime);

      // Low-pass filter for bright, crisp, professional sound
      this.filterNode = this.audioCtx.createBiquadFilter();
      this.filterNode.type = "lowpass";
      this.filterNode.frequency.setValueAtTime(3600, this.audioCtx.currentTime);
      this.filterNode.Q.setValueAtTime(1.0, this.audioCtx.currentTime);

      // Studio Dynamics Compressor: guarantees high audibility without speaker distortion
      this.compressorNode = this.audioCtx.createDynamicsCompressor();
      this.compressorNode.threshold.setValueAtTime(-12, this.audioCtx.currentTime);
      this.compressorNode.knee.setValueAtTime(8, this.audioCtx.currentTime);
      this.compressorNode.ratio.setValueAtTime(4, this.audioCtx.currentTime);
      this.compressorNode.attack.setValueAtTime(0.003, this.audioCtx.currentTime);
      this.compressorNode.release.setValueAtTime(0.25, this.audioCtx.currentTime);

      // Routing: Voices -> masterGain -> filter -> compressor -> destination
      this.masterGain.connect(this.filterNode);
      this.filterNode.connect(this.compressorNode);
      this.compressorNode.connect(this.audioCtx.destination);

      // Listen to context state change (e.g., when browser unpauses audio)
      this.audioCtx.onstatechange = () => {
        if (this.audioCtx && this.audioCtx.state === "running" && this.isPlaying) {
          if (!this.schedulerTimer) {
            this.nextNoteTime = this.audioCtx.currentTime + 0.05;
            this.scheduler();
          }
        }
      };
    }

    return this.audioCtx;
  }

  // Attach global user gesture listeners to overcome browser autoplay restrictions
  private attachGlobalGestureListeners() {
    if (this.gestureListenersAttached || typeof window === "undefined") return;
    this.gestureListenersAttached = true;

    const resumeAndKickstart = () => {
      if (this.audioCtx) {
        if (this.audioCtx.state === "suspended") {
          this.audioCtx.resume().then(() => {
            if (this.isPlaying) {
              if (this.schedulerTimer) {
                clearTimeout(this.schedulerTimer);
                this.schedulerTimer = null;
              }
              this.nextNoteTime = this.audioCtx!.currentTime + 0.05;
              this.scheduler();
            }
          }).catch(() => {});
        } else if (this.isPlaying && !this.schedulerTimer) {
          this.nextNoteTime = this.audioCtx.currentTime + 0.05;
          this.scheduler();
        }
      }
    };

    const events = ["pointerdown", "click", "touchstart", "keydown", "focusin", "input"];
    events.forEach((evt) => {
      window.addEventListener(evt, resumeAndKickstart, { passive: true });
    });
  }

  private notify() {
    const state = {
      isPlaying: this.isPlaying,
      isMuted: this.isMuted,
      volume: this.volume,
      mode: this.mode,
    };
    this.listeners.forEach((cb) => cb(state));
  }

  public subscribe(cb: SoundStateListener): () => void {
    this.listeners.add(cb);
    cb({
      isPlaying: this.isPlaying,
      isMuted: this.isMuted,
      volume: this.volume,
      mode: this.mode,
    });
    return () => this.listeners.delete(cb);
  }

  // Precision Note Scheduler with High Audibility Gains
  private scheduleStep(step: number, time: number) {
    if (!this.audioCtx || !this.masterGain) return;

    const secondsPer16th = (60.0 / this.tempo) / 4;

    // 1. Play Lead Melody / Bell Chime Note
    const melodyFreq = this.melodyPattern[step];
    if (melodyFreq > 0) {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = "triangle"; // Clear marimba/bell tone
      osc.frequency.setValueAtTime(melodyFreq, time);

      // Fast, audible attack & sustained pleasant chime
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(0.60, time + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, time + secondsPer16th * 2.2);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(time);
      osc.stop(time + secondsPer16th * 2.25);

      this.activeNodes.push({ osc, gain });
    }

    // 2. Play Sub-Bass Note - Warm, solid focus foundation
    const bassFreq = this.bassPattern[step];
    if (bassFreq > 0) {
      const bassOsc = this.audioCtx.createOscillator();
      const bassGain = this.audioCtx.createGain();

      bassOsc.type = "sine";
      bassOsc.frequency.setValueAtTime(bassFreq, time);

      bassGain.gain.setValueAtTime(0.0001, time);
      bassGain.gain.linearRampToValueAtTime(0.68, time + 0.02);
      bassGain.gain.exponentialRampToValueAtTime(0.002, time + secondsPer16th * 2.8);

      bassOsc.connect(bassGain);
      bassGain.connect(this.masterGain);

      bassOsc.start(time);
      bassOsc.stop(time + secondsPer16th * 2.85);

      this.activeNodes.push({ osc: bassOsc, gain: bassGain });
    }

    // 3. Gentle Shaker / Rhythmic Click on quarter notes (steps 0, 4, 8, 12, etc.)
    if (step % 4 === 0) {
      const clickOsc = this.audioCtx.createOscillator();
      const clickGain = this.audioCtx.createGain();

      clickOsc.type = "sine";
      clickOsc.frequency.setValueAtTime(step % 16 === 0 ? 1000 : 750, time);

      clickGain.gain.setValueAtTime(0.14, time);
      clickGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.035);

      clickOsc.connect(clickGain);
      clickGain.connect(this.masterGain);

      clickOsc.start(time);
      clickOsc.stop(time + 0.04);
    }

    // 4. Harmonic Chord Pad at measure boundaries (steps 0, 16, 32, 48)
    if (step === 0 || step === 16 || step === 32 || step === 48) {
      let chordFreqs: number[] = [];
      if (step === 0) {
        // C Major (C4, E4, G4)
        chordFreqs = [261.63, 329.63, 392.00];
      } else if (step === 16) {
        // A Minor (A3, C4, E4)
        chordFreqs = [220.00, 261.63, 329.63];
      } else if (step === 32) {
        // F Major (F3, A3, C4)
        chordFreqs = [174.61, 220.00, 261.63];
      } else {
        // G Major (G3, B3, D4)
        chordFreqs = [196.00, 246.94, 293.66];
      }

      chordFreqs.forEach((f) => {
        if (!this.audioCtx || !this.masterGain) return;
        const padOsc = this.audioCtx.createOscillator();
        const padGain = this.audioCtx.createGain();

        padOsc.type = "sine";
        padOsc.frequency.setValueAtTime(f, time);

        padGain.gain.setValueAtTime(0.0001, time);
        padGain.gain.linearRampToValueAtTime(0.28, time + 0.25);
        padGain.gain.linearRampToValueAtTime(0.0001, time + secondsPer16th * 15.5);

        padOsc.connect(padGain);
        padGain.connect(this.masterGain);

        padOsc.start(time);
        padOsc.stop(time + secondsPer16th * 15.8);

        this.activeNodes.push({ osc: padOsc, gain: padGain });
      });
    }

    // Periodic cleanup of active node list
    if (this.activeNodes.length > 50) {
      this.activeNodes = this.activeNodes.slice(-20);
    }
  }

  // Lookahead loop
  private scheduler = () => {
    if (!this.isPlaying || !this.audioCtx) return;

    const secondsPer16th = (60.0 / this.tempo) / 4;

    // If context was suspended and resumed, avoid falling behind
    if (this.nextNoteTime < this.audioCtx.currentTime) {
      this.nextNoteTime = this.audioCtx.currentTime + 0.05;
    }

    while (this.nextNoteTime < this.audioCtx.currentTime + this.scheduleAheadTime) {
      this.scheduleStep(this.currentStep, this.nextNoteTime);
      this.nextNoteTime += secondsPer16th;
      this.currentStep = (this.currentStep + 1) % 64;
    }

    this.schedulerTimer = setTimeout(this.scheduler, this.lookahead);
  };

  // Start continuous music (called from Employee Registration onwards)
  public start(mode: "ambient" | "quiz" = "quiz") {
    this.mode = mode;
    const ctx = this.initAudio();
    if (!ctx) return;

    this.isPlaying = true;
    this.notify();

    // If already running with an active scheduler, keep playing continuously
    if (ctx.state === "running" && this.schedulerTimer) {
      return;
    }

    const launchPlayback = () => {
      if (!this.audioCtx) return;
      if (this.schedulerTimer) {
        clearTimeout(this.schedulerTimer);
        this.schedulerTimer = null;
      }
      this.nextNoteTime = this.audioCtx.currentTime + 0.05;
      this.currentStep = 0;
      this.scheduler();
    };

    if (ctx.state === "suspended") {
      ctx.resume().then(() => {
        launchPlayback();
      }).catch(() => {});
    } else {
      launchPlayback();
    }
  }

  // Force start continuous quiz music
  public startQuizMusic() {
    this.mode = "quiz";
    const ctx = this.initAudio();
    if (!ctx) return;

    this.volume = Math.max(this.volume, 0.65);
    if (this.masterGain && !this.isMuted) {
      this.masterGain.gain.cancelScheduledValues(ctx.currentTime);
      this.masterGain.gain.setValueAtTime(this.volume, ctx.currentTime);
    }

    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    if (!this.isPlaying || !this.schedulerTimer) {
      this.start("quiz");
    } else {
      this.notify();
    }
  }

  // Stop / Pause music (called when quiz is completed or candidate exits)
  public stop() {
    if (!this.isPlaying) return;

    if (this.schedulerTimer) {
      clearTimeout(this.schedulerTimer);
      this.schedulerTimer = null;
    }

    if (this.audioCtx && this.masterGain) {
      const now = this.audioCtx.currentTime;
      try {
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
        this.masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.5);
      } catch (e) {}
    }

    setTimeout(() => {
      this.activeNodes.forEach(({ osc, gain }) => {
        try {
          osc.stop();
          osc.disconnect();
          gain.disconnect();
        } catch (e) {}
      });
      this.activeNodes = [];
      this.isPlaying = false;
      this.notify();
    }, 550);
  }

  // Toggle mute
  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (typeof window !== "undefined") {
      safeStorage.setItem("employee_bg_sound_muted", String(this.isMuted));
    }

    if (this.audioCtx && this.masterGain) {
      const now = this.audioCtx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.linearRampToValueAtTime(
        this.isMuted ? 0 : this.volume,
        now + 0.15
      );
    }

    // If unmuting, make sure context is active
    if (!this.isMuted && this.isPlaying) {
      this.start(this.mode);
    }

    this.notify();
    return this.isMuted;
  }

  public setMuted(mute: boolean) {
    this.isMuted = mute;
    if (typeof window !== "undefined") {
      safeStorage.setItem("employee_bg_sound_muted", String(mute));
    }
    if (this.audioCtx && this.masterGain) {
      const now = this.audioCtx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.linearRampToValueAtTime(
        this.isMuted ? 0 : this.volume,
        now + 0.15
      );
    }
    if (!this.isMuted && this.isPlaying) {
      this.start(this.mode);
    }
    this.notify();
  }

  // Volume control (0.1 to 1.0)
  public setVolume(vol: number) {
    this.volume = Math.max(0.1, Math.min(1.0, vol));
    if (typeof window !== "undefined") {
      safeStorage.setItem("employee_bg_sound_volume", String(this.volume));
    }
    if (this.audioCtx && this.masterGain && !this.isMuted) {
      const now = this.audioCtx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.linearRampToValueAtTime(this.volume, now + 0.1);
    }
    this.notify();
  }

  public getVolume(): number {
    return this.volume;
  }

  // Expose the shared audio context for sound effects to share without conflicting
  public getSharedAudioContext(): AudioContext | null {
    return this.initAudio();
  }

  public getStatus() {
    return {
      isPlaying: this.isPlaying,
      isMuted: this.isMuted,
      volume: this.volume,
      mode: this.mode,
    };
  }
}

export const backgroundMusic = new BackgroundMusicManager();
