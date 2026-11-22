// Synthesized sound for Sunset Bay: no audio files, everything is WebAudio
// oscillators and noise, so the game loads nothing over the network.
// Sound starts on the first user gesture (browsers block audio before that).
export function createAudio() {
  let ctx = null;
  let muted = false;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenTimer = 0;

  function ensure() {
    if (ctx) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    } catch {
      ctx = null;
    }
    return ctx;
  }

  function beep(freq, seconds, type, volume, when = 0) {
    if (muted) return;
    const ac = ensure();
    if (!ac) return;
    const t = ac.currentTime + when;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(volume || 0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + seconds);
    osc.connect(gain).connect(ac.destination);
    osc.start(t);
    osc.stop(t + seconds + 0.02);
  }

  function noise(seconds, volume, filterFreq) {
    if (muted) return;
    const ac = ensure();
    if (!ac) return;
    const len = Math.floor(ac.sampleRate * seconds);
    const buffer = ac.createBuffer(1, len, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ac.createBufferSource();
    src.buffer = buffer;
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq || 1200;
    const gain = ac.createGain();
    gain.gain.value = volume || 0.15;
    src.connect(filter).connect(gain).connect(ac.destination);
    src.start();
  }

  return {
    unlock() {
      const ac = ensure();
      if (ac && ac.state === 'suspended') ac.resume();
    },
    toggleMute() {
      muted = !muted;
      if (muted) this.stopEngine();
      return muted;
    },
    isMuted() {
      return muted;
    },
    shoot() {
      noise(0.12, 0.2, 2500);
      beep(180, 0.08, 'square', 0.06);
    },
    punch() {
      noise(0.08, 0.12, 800);
    },
    crash() {
      noise(0.25, 0.25, 500);
    },
    pickup() {
      beep(880, 0.1, 'sine', 0.1);
      beep(1320, 0.14, 'sine', 0.1, 0.09);
    },
    missionComplete() {
      [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.18, 'triangle', 0.12, i * 0.12));
    },
    wantedUp() {
      beep(220, 0.15, 'sawtooth', 0.08);
      beep(165, 0.2, 'sawtooth', 0.08, 0.12);
    },
    /** Continuous engine hum whose pitch follows the car's speed (0..1). */
    engine(speed01) {
      if (muted) return;
      const ac = ensure();
      if (!ac) return;
      if (!engineOsc) {
        engineOsc = ac.createOscillator();
        engineOsc.type = 'sawtooth';
        engineGain = ac.createGain();
        engineGain.gain.value = 0;
        engineOsc.connect(engineGain).connect(ac.destination);
        engineOsc.start();
      }
      engineOsc.frequency.setTargetAtTime(50 + speed01 * 140, ac.currentTime, 0.05);
      engineGain.gain.setTargetAtTime(0.03 + speed01 * 0.04, ac.currentTime, 0.05);
    },
    stopEngine() {
      if (engineGain) engineGain.gain.value = 0;
    },
    /** Two-tone police siren while the player is wanted; call every frame. */
    siren(dt, wanted) {
      if (muted || wanted < 1) {
        if (sirenGain) sirenGain.gain.value = 0;
        return;
      }
      const ac = ensure();
      if (!ac) return;
      if (!sirenOsc) {
        sirenOsc = ac.createOscillator();
        sirenOsc.type = 'sine';
        sirenGain = ac.createGain();
        sirenGain.gain.value = 0;
        sirenOsc.connect(sirenGain).connect(ac.destination);
        sirenOsc.start();
      }
      sirenTimer += dt;
      const high = Math.floor(sirenTimer * 1.6) % 2 === 0;
      sirenOsc.frequency.setTargetAtTime(high ? 880 : 660, ac.currentTime, 0.02);
      sirenGain.gain.setTargetAtTime(0.025, ac.currentTime, 0.1);
    },
  };
}
