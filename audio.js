export class AudioEngine {
  constructor(isEnabled) {
    this.isEnabled = isEnabled;
    this.context = null;
    this.master = null;
    this.ambientNodes = [];
  }

  ensureContext() {
    if (!this.isEnabled()) return null;
    if (!this.context) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      this.context = new AudioContextClass();
      this.master = this.context.createGain();
      this.master.gain.value = 0.3;
      this.master.connect(this.context.destination);
    }
    if (this.context.state === 'suspended') this.context.resume().catch(() => {});
    return this.context;
  }

  chime(frequency = 432, duration = 0.2, volume = 0.04) {
    const context = this.ensureContext();
    if (!context || !this.master) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(volume, context.currentTime + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    oscillator.connect(gain).connect(this.master);
    oscillator.start();
    oscillator.stop(context.currentTime + duration + 0.03);
  }

  stopAmbient() {
    this.ambientNodes.forEach((node) => {
      try { node.stop?.(); } catch { /* already stopped */ }
      try { node.disconnect?.(); } catch { /* already disconnected */ }
    });
    this.ambientNodes = [];
  }

  startAmbient(kind) {
    this.stopAmbient();
    const context = this.ensureContext();
    if (!context || !this.master || !kind || kind === 'off') return;

    const output = context.createGain();
    output.gain.value = 0.06;
    output.connect(this.master);
    this.ambientNodes.push(output);

    if (kind === 'rain') {
      const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
      const samples = buffer.getChannelData(0);
      let previous = 0;
      for (let index = 0; index < samples.length; index += 1) {
        previous = previous * 0.78 + (Math.random() * 2 - 1) * 0.22;
        samples[index] = previous * 0.38;
      }
      const source = context.createBufferSource();
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 2800;
      source.buffer = buffer;
      source.loop = true;
      source.connect(filter).connect(output);
      source.start();
      this.ambientNodes.push(source, filter);
      return;
    }

    if (kind === 'waves') {
      const oscillator = context.createOscillator();
      const waveGain = context.createGain();
      const lfo = context.createOscillator();
      const lfoGain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = 76;
      waveGain.gain.value = 0.04;
      lfo.frequency.value = 0.16;
      lfoGain.gain.value = 0.035;
      lfo.connect(lfoGain).connect(waveGain.gain);
      oscillator.connect(waveGain).connect(output);
      oscillator.start();
      lfo.start();
      this.ambientNodes.push(oscillator, waveGain, lfo, lfoGain);
      return;
    }

    [174, 220, 261].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const nodeGain = context.createGain();
      oscillator.type = index === 0 ? 'sine' : 'triangle';
      oscillator.frequency.value = frequency;
      nodeGain.gain.value = 0.012 / (index + 1);
      oscillator.connect(nodeGain).connect(output);
      oscillator.start();
      this.ambientNodes.push(oscillator, nodeGain);
    });
  }
}
