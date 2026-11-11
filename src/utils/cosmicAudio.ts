import { CinematicState, SceneStage } from '../types/cinematic';

export const LASER_BEAM_SOUND_PATH =
  '/assets/aistudio/laser-beam-sound_b3d8c3ea.mp4';
export const AMBIENT_LOOP_SOUND_PATH =
  '/assets/aistudio/ambient-loop_de3c97a4.wav';
export const HOME_TRANSITION_SOUND_PATH =
  '/assets/aistudio/home-transition_8ecda214.wav';

// Sustain window in laser-beam-sound_b3d8c3ea.mp4 (2.763s total):
// Plays from 0.000s through 2.680s as a single continuous track; if the user takes longer than 2.68s
// to scroll through the text, it smoothly sustains the continuous 1.55s -> 2.68s writing stream
// instead of abruptly cutting off or re-triggering the 0.0s start burst.
const LASER_SUSTAIN_LOOP_START = 1.55;
const LASER_SUSTAIN_LOOP_END = 2.68;

type AudioListenerCallback = (isMuted: boolean, masterVolume: number) => void;

class CosmicAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  // Continuous background ambient audio (/assets/aistudio/ambient-loop_de3c97a4.wav)
  private ambientAudio: HTMLAudioElement | null = null;

  // Holographic screen transition audio (/assets/aistudio/home-transition_8ecda214.wav)
  private transitionAudioBuffer: AudioBuffer | null = null;
  private transitionBufferLoading = false;
  private fallbackTransitionAudio: HTMLAudioElement | null = null;

  // Decoded Web Audio buffer & seamless single-stream nodes for /assets/aistudio/laser-beam-sound_b3d8c3ea.mp4
  private laserAudioBuffer: AudioBuffer | null = null;
  private laserBufferLoading = false;
  private laserSourceNode: AudioBufferSourceNode | null = null;
  private laserGainNode: GainNode | null = null;
  private isLaserSourceRunning = false;
  private hasPlayedStartForCurrentPass = false;
  private laserFadeOutTimerId: number | null = null;

  // Fallback HTMLAudioElement while AudioBuffer is decoding
  private fallbackLaserAudio: HTMLAudioElement | null = null;

  private isMuted = true; // Starts muted by default
  private masterVolume = 0.8;
  private isInitialized = false;
  private lastHoverTime = 0;
  private lastStageChimeTime = 0;
  private lastTransitionTime = 0;
  private prevIntroProgress = 0;
  private listeners = new Set<AudioListenerCallback>();

  constructor() {
    if (typeof window !== 'undefined') {
      this.ambientAudio = new Audio(AMBIENT_LOOP_SOUND_PATH);
      this.ambientAudio.loop = true;
      this.ambientAudio.preload = 'auto';
      this.ambientAudio.volume = 0;

      this.fallbackLaserAudio = new Audio(LASER_BEAM_SOUND_PATH);
      this.fallbackLaserAudio.loop = false;
      this.fallbackLaserAudio.preload = 'auto';
      this.fallbackLaserAudio.volume = 0;

      this.fallbackTransitionAudio = new Audio(HOME_TRANSITION_SOUND_PATH);
      this.fallbackTransitionAudio.loop = false;
      this.fallbackTransitionAudio.preload = 'auto';
      this.fallbackTransitionAudio.volume = 0;
    }
  }

  public getState() {
    return {
      isMuted: this.isMuted,
      masterVolume: this.masterVolume,
      isInitialized: this.isInitialized,
    };
  }

  public subscribe(cb: AudioListenerCallback): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => cb(this.isMuted, this.masterVolume));
  }

  /**
   * Initializes the Web Audio API context and decodes laser-beam-sound_b3d8c3ea.mp4
   * and home-transition_8ecda214.wav into AudioBuffers.
   */
  private initContext() {
    if (!this.isInitialized || !this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        this.ctx = ctx;

        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(this.masterVolume, ctx.currentTime);
        masterGain.connect(ctx.destination);
        this.masterGain = masterGain;

        const laserGain = ctx.createGain();
        laserGain.gain.setValueAtTime(0.0001, ctx.currentTime);
        laserGain.connect(masterGain);
        this.laserGainNode = laserGain;
      }
      this.isInitialized = true;
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    // Fetch and decode laser-beam-sound_b3d8c3ea.mp4
    if (this.ctx && !this.laserAudioBuffer && !this.laserBufferLoading) {
      this.laserBufferLoading = true;
      fetch(LASER_BEAM_SOUND_PATH)
        .then((res) => res.arrayBuffer())
        .then((arrayBuf) => this.ctx!.decodeAudioData(arrayBuf))
        .then((decoded) => {
          this.laserAudioBuffer = decoded;
          this.laserBufferLoading = false;
        })
        .catch(() => {
          this.laserBufferLoading = false;
        });
    }

    // Fetch and decode home-transition_8ecda214.wav
    if (this.ctx && !this.transitionAudioBuffer && !this.transitionBufferLoading) {
      this.transitionBufferLoading = true;
      fetch(HOME_TRANSITION_SOUND_PATH)
        .then((res) => res.arrayBuffer())
        .then((arrayBuf) => this.ctx!.decodeAudioData(arrayBuf))
        .then((decoded) => {
          this.transitionAudioBuffer = decoded;
          this.transitionBufferLoading = false;
        })
        .catch(() => {
          this.transitionBufferLoading = false;
        });
    }
  }

  /**
   * Toggles mute/un-mute state and starts/stops ambient-loop.wav accordingly.
   */
  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (!muted) {
      this.initContext();
      if (this.ctx && this.masterGain) {
        if (this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
        this.masterGain.gain.setTargetAtTime(
          this.masterVolume,
          this.ctx.currentTime,
          0.08
        );
      }

      // Always play ambient-loop.wav when sound is ON
      if (this.ambientAudio) {
        this.ambientAudio.volume = Math.min(1, this.masterVolume * 0.75);
        this.ambientAudio.play().catch(() => {});
      }
    } else {
      if (this.ctx && this.masterGain) {
        this.masterGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.06);
      }

      if (this.ambientAudio) {
        this.ambientAudio.pause();
      }
      this.stopLaserBeamSingleStream(true);
    }
    this.notify();
  }

  public setMasterVolume(volume: number) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    if (!this.isMuted) {
      if (this.ctx && this.masterGain) {
        this.masterGain.gain.setTargetAtTime(
          this.masterVolume,
          this.ctx.currentTime,
          0.06
        );
      }
      if (this.ambientAudio) {
        this.ambientAudio.volume = Math.min(1, this.masterVolume * 0.75);
      }
    }
    this.notify();
  }

  /**
   * Plays laser-beam-sound_b3d8c3ea.mp4 as a single synchronized stream while the
   * multicolor laser beams trace and write "Hi, My name is Md Kajal Mia".
   */
  private engageLaserSingleStream(introProgress: number) {
    if (this.isMuted) return;
    this.initContext();

    if (this.ctx && this.laserAudioBuffer && this.laserGainNode) {
      const now = this.ctx.currentTime;

      if (!this.isLaserSourceRunning) {
        const source = this.ctx.createBufferSource();
        source.buffer = this.laserAudioBuffer;
        source.loop = true;
        source.loopStart = LASER_SUSTAIN_LOOP_START;
        source.loopEnd = Math.min(
          LASER_SUSTAIN_LOOP_END,
          this.laserAudioBuffer.duration
        );

        source.connect(this.laserGainNode);

        // Start from 0.0s on initial entry, or from the proportional timestamp in the track
        // if resuming mid-sentence so it feels like a single continuous audio track!
        const startOffset = !this.hasPlayedStartForCurrentPass
          ? 0
          : Math.min(
              LASER_SUSTAIN_LOOP_START +
                (introProgress * 0.9) %
                  (LASER_SUSTAIN_LOOP_END - LASER_SUSTAIN_LOOP_START),
              this.laserAudioBuffer.duration - 0.1
            );

        this.hasPlayedStartForCurrentPass = true;
        this.laserGainNode.gain.cancelScheduledValues(now);
        this.laserGainNode.gain.setValueAtTime(
          Math.max(0.0001, this.laserGainNode.gain.value),
          now
        );
        this.laserGainNode.gain.setTargetAtTime(0.95, now, 0.03);

        source.start(0, startOffset);
        this.laserSourceNode = source;
        this.isLaserSourceRunning = true;
      } else {
        this.laserGainNode.gain.cancelScheduledValues(now);
        this.laserGainNode.gain.setTargetAtTime(0.95, now, 0.03);
      }

      if (this.laserFadeOutTimerId !== null) {
        window.clearTimeout(this.laserFadeOutTimerId);
      }
      this.laserFadeOutTimerId = window.setTimeout(() => {
        this.stopLaserBeamSingleStream(false);
      }, 280);
    } else if (this.fallbackLaserAudio) {
      this.fallbackLaserAudio.volume = Math.min(1, this.masterVolume * 0.9);
      if (this.fallbackLaserAudio.paused) {
        this.fallbackLaserAudio.play().catch(() => {});
      }
    }
  }

  private stopLaserBeamSingleStream(immediate: boolean) {
    if (this.laserFadeOutTimerId !== null) {
      window.clearTimeout(this.laserFadeOutTimerId);
      this.laserFadeOutTimerId = null;
    }

    if (this.fallbackLaserAudio && !this.fallbackLaserAudio.paused) {
      this.fallbackLaserAudio.pause();
    }

    if (!this.ctx || !this.laserGainNode || !this.isLaserSourceRunning) return;

    const now = this.ctx.currentTime;
    this.laserGainNode.gain.cancelScheduledValues(now);

    if (immediate) {
      this.laserGainNode.gain.setValueAtTime(0.0001, now);
      if (this.laserSourceNode) {
        try {
          this.laserSourceNode.stop();
          this.laserSourceNode.disconnect();
        } catch {
          // Ignore
        }
        this.laserSourceNode = null;
      }
      this.isLaserSourceRunning = false;
    } else {
      this.laserGainNode.gain.setTargetAtTime(0.0001, now, 0.05);
      const nodeToStop = this.laserSourceNode;
      this.laserSourceNode = null;
      this.isLaserSourceRunning = false;
      window.setTimeout(() => {
        if (nodeToStop) {
          try {
            nodeToStop.stop();
            nodeToStop.disconnect();
          } catch {
            // Ignore
          }
        }
      }, 170);
    }
  }

  /**
   * Synchronizes laser-beam-sound_b3d8c3ea.mp4 with the text writing progress.
   */
  public updateFromCinematicState(state: CinematicState) {
    const introDelta = Math.abs(state.introRevealProgress - this.prevIntroProgress);
    this.prevIntroProgress = state.introRevealProgress;

    if (state.introRevealProgress <= 0.005) {
      this.hasPlayedStartForCurrentPass = false;
    }

    if (this.isMuted) return;

    // Keep ambient-loop.wav playing continuously whenever sound is ON
    if (this.ambientAudio && this.ambientAudio.paused) {
      this.ambientAudio.volume = Math.min(1, this.masterVolume * 0.75);
      this.ambientAudio.play().catch(() => {});
    }

    const isWritingPhase =
      state.introRevealProgress > 0.004 && state.introRevealProgress < 0.992;

    if (isWritingPhase && introDelta > 0.00012) {
      this.engageLaserSingleStream(state.introRevealProgress);
    } else if (!isWritingPhase && this.isLaserSourceRunning) {
      this.stopLaserBeamSingleStream(false);
    }
  }

  /**
   * Called by IntroductionText.tsx as characters are traced by the laser beams.
   */
  public playLaserWriteStroke(
    charIndex: number,
    _char: string,
    _strokeSubStep = 0
  ) {
    if (this.isMuted) return;
    const approxProgress = charIndex / 27;
    this.engageLaserSingleStream(approxProgress);
  }

  /**
   * Smoothly ends the laser beam audio stream when the text finishes writing.
   */
  public playLaserWriteComplete() {
    this.stopLaserBeamSingleStream(false);
  }

  /**
   * Subtle high-tech HUD reticle tick when hovering links or buttons.
   */
  public playHoverSound() {
    if (this.isMuted || !this.isInitialized || !this.ctx || !this.masterGain) return;

    const perfNow = performance.now();
    if (perfNow - this.lastHoverTime < 55) return;
    this.lastHoverTime = perfNow;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(3180, now);
    osc.frequency.exponentialRampToValueAtTime(2240, now + 0.012);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.045, now + 0.0015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.013);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.015);
  }

  /**
   * Crisp sci-fi HUD click on buttons and links.
   */
  public playClickSound() {
    if (this.isMuted || !this.isInitialized || !this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(2340, now);
    osc1.frequency.exponentialRampToValueAtTime(1680, now + 0.016);

    gain1.gain.setValueAtTime(0.0001, now);
    gain1.gain.linearRampToValueAtTime(0.065, now + 0.0015);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.018);

    osc1.connect(gain1);
    gain1.connect(this.masterGain);
    osc1.start(now);
    osc1.stop(now + 0.02);
  }

  /**
   * Subtle scanner sweep when transitioning between Scene Chapters (01 -> 06).
   */
  public playStageChime(stage: SceneStage) {
    if (this.isMuted || !this.isInitialized || !this.ctx || !this.masterGain) return;

    const perfNow = performance.now();
    if (perfNow - this.lastStageChimeTime < 300) return;
    this.lastStageChimeTime = perfNow;

    const stageBaseFreq: Record<SceneStage, number> = {
      1: 1420,
      2: 1680,
      3: 1960,
      4: 2240,
      5: 2560,
      6: 2940,
      7: 3320,
    };

    const freq = stageBaseFreq[stage] || 1680;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 0.75, now);
    osc.frequency.exponentialRampToValueAtTime(freq, now + 0.045);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.035, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  /**
   * Plays /assets/aistudio/home-transition_8ecda214.wav during the holographic transition
   * between the Hero screen and the About Me section.
   */
  public playHomeTransitionSound() {
    if (this.isMuted) return;

    const perfNow = performance.now();
    if (perfNow - this.lastTransitionTime < 450) return;
    this.lastTransitionTime = perfNow;

    this.initContext();
    this.stopLaserBeamSingleStream(true);

    if (this.ctx && this.transitionAudioBuffer && this.masterGain) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      const now = this.ctx.currentTime;
      const source = this.ctx.createBufferSource();
      const gain = this.ctx.createGain();

      source.buffer = this.transitionAudioBuffer;
      gain.gain.setValueAtTime(Math.min(1, this.masterVolume * 0.95), now);

      source.connect(gain);
      gain.connect(this.masterGain);
      source.start(0);
    } else if (this.fallbackTransitionAudio) {
      this.fallbackTransitionAudio.currentTime = 0;
      this.fallbackTransitionAudio.volume = Math.min(1, this.masterVolume * 0.95);
      this.fallbackTransitionAudio.play().catch(() => {});
    }
  }

  /**
   * Plays a futuristic holographic slide swoosh + zigzag/ripple harmonic pulse
   * whenever transitioning from one slide to another (on scroll, button click, or slider scrub).
   */
  public playSlideTransitionSound(direction = 1) {
    if (this.isMuted) return;

    const perfNow = performance.now();
    if (perfNow - this.lastStageChimeTime < 140) return;
    this.lastStageChimeTime = perfNow;

    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    const now = this.ctx.currentTime;

    // 1. Pitch-shifted holographic slice from home-transition.wav (if decoded)
    if (this.transitionAudioBuffer) {
      const sliceSource = this.ctx.createBufferSource();
      const sliceGain = this.ctx.createGain();
      sliceSource.buffer = this.transitionAudioBuffer;
      sliceSource.playbackRate.setValueAtTime(direction >= 0 ? 1.55 : 1.32, now);

      sliceGain.gain.setValueAtTime(0.0001, now);
      sliceGain.gain.linearRampToValueAtTime(
        Math.min(0.42, this.masterVolume * 0.45),
        now + 0.025
      );
      sliceGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);

      sliceSource.connect(sliceGain);
      sliceGain.connect(this.masterGain);
      sliceSource.start(now, 0.05, 0.36);
    }

    // 2. Synthesized Bandpass Filter Swoosh (Airy Hologram Slide)
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.26);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(3.2, now);
    filter.frequency.setValueAtTime(direction >= 0 ? 420 : 2200, now);
    filter.frequency.exponentialRampToValueAtTime(
      direction >= 0 ? 2450 : 480,
      now + 0.16
    );
    filter.frequency.exponentialRampToValueAtTime(820, now + 0.25);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.0001, now);
    noiseGain.gain.linearRampToValueAtTime(0.14, now + 0.04);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    whiteNoise.start(now);
    whiteNoise.stop(now + 0.26);

    // 3. Zigzag & Ripple 4-Step Crystalline Frequency Contour
    const notes =
      direction >= 0
        ? [660, 1080, 820, 1440]
        : [1440, 820, 1080, 660];

    const osc = this.ctx.createOscillator();
    const chimeGain = this.ctx.createGain();
    osc.type = 'triangle';

    notes.forEach((freq, idx) => {
      const stepTime = now + idx * 0.048;
      if (idx === 0) {
        osc.frequency.setValueAtTime(freq, stepTime);
      } else {
        osc.frequency.exponentialRampToValueAtTime(freq, stepTime);
      }
    });

    chimeGain.gain.setValueAtTime(0.0001, now);
    chimeGain.gain.linearRampToValueAtTime(0.075, now + 0.015);
    chimeGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);

    osc.connect(chimeGain);
    chimeGain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.25);
  }
}

export const cosmicAudio = new CosmicAudioEngine();
