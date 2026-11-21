class AviationAudioEngine {
  private ctx: AudioContext | null = null;
  private noiseNode: AudioNode | null = null;
  private gainNode: GainNode | null = null;
  private isAmbientPlaying = false;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public playBoardingChime(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25]; // C5 -> E5 soft cabin ding-dong
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.22);

      gain.gain.setValueAtTime(0.001, now + idx * 0.22);
      gain.gain.exponentialRampToValueAtTime(0.12, now + idx * 0.22 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.22 + 0.7);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.22);
      osc.stop(now + idx * 0.22 + 0.75);
    });
  }

  public playArrivalChime(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // Uplifting major arpeggio
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.14);

      gain.gain.setValueAtTime(0.001, now + idx * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.14, now + idx * 0.14 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.14 + 0.9);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.14);
      osc.stop(now + idx * 0.14 + 0.95);
    });
  }

  public startCabinAmbient(): void {
    if (this.isAmbientPlaying) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Pink-ish soft noise for warm aircraft cabin hum
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
      data[i] *= 2.5;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 340;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 1.2);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();

    this.noiseNode = source;
    this.gainNode = gain;
    this.isAmbientPlaying = true;
  }

  public stopCabinAmbient(): void {
    if (!this.isAmbientPlaying || !this.ctx) return;
    try {
      if (this.gainNode) {
        this.gainNode.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.4);
      }
      const node = this.noiseNode as AudioBufferSourceNode | null;
      setTimeout(() => {
        try {
          node?.stop();
          node?.disconnect();
        } catch {
          // Ignore already stopped source
        }
      }, 420);
    } catch {
      // Ignore cleanup issues
    }
    this.noiseNode = null;
    this.gainNode = null;
    this.isAmbientPlaying = false;
  }
}

export const aviationAudio = new AviationAudioEngine();
