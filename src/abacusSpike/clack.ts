/**
 * The sound a bead makes when it lands: synthesised, never sampled.
 *
 * No audio file ships with this. A wooden knock is two decaying tones and a
 * bandpass — a low body around 300 Hz that falls as it dies (wood loses its
 * pitch as the energy goes) and a bright tick an octave and a half up that is
 * gone in thirty milliseconds. The filter is what stops it reading as a beep:
 * an unfiltered oscillator burst is a game-show buzzer, and rolling off both
 * ends leaves only the part of the spectrum a knock actually lives in.
 *
 * The `AudioContext` is built lazily on the first click, because every browser
 * refuses to start one outside a user gesture and a context created at page load
 * is a context permanently stuck in `suspended`. Each strike is a fresh little
 * graph; the nodes fall out of the graph when the oscillators stop and are
 * collected with them.
 */

/** The two voices of one knock: wave, start and end pitch, and how loud. */
const VOICES: readonly {
  type: OscillatorType;
  from: number;
  to: number;
  gain: number;
  seconds: number;
}[] = [
  { type: 'triangle', from: 420, to: 190, gain: 0.5, seconds: 0.1 },
  { type: 'square', from: 1650, to: 940, gain: 0.16, seconds: 0.035 },
];

export class Clack {
  private context: AudioContext | null = null;
  private enabled = true;

  setEnabled(on: boolean): void {
    this.enabled = on;
  }

  get on(): boolean {
    return this.enabled;
  }

  /**
   * Opens the audio device. Must be called from inside a click handler; calling
   * it again later is free, so the buttons simply call it every time.
   */
  arm(): void {
    if (!this.enabled) return;
    if (!this.context) {
      try {
        this.context = new AudioContext();
      } catch {
        // No audio device, or a browser that refuses one. The page is not about
        // sound; it just goes quiet.
        this.enabled = false;
        return;
      }
    }
    if (this.context.state === 'suspended') void this.context.resume();
  }

  play(): void {
    const context = this.context;
    if (!this.enabled || !context || context.state !== 'running') return;

    const now = context.currentTime;
    const body = context.createBiquadFilter();
    body.type = 'bandpass';
    body.frequency.value = 760;
    body.Q.value = 0.9;

    const master = context.createGain();
    // Ramped rather than set: an instantaneous gain step is a click of its own,
    // on top of the click we meant.
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.34, now + 0.004);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    body.connect(master);
    master.connect(context.destination);

    for (const voice of VOICES) {
      const osc = context.createOscillator();
      osc.type = voice.type;
      osc.frequency.setValueAtTime(voice.from, now);
      osc.frequency.exponentialRampToValueAtTime(voice.to, now + voice.seconds);
      const gain = context.createGain();
      gain.gain.setValueAtTime(voice.gain, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + voice.seconds);
      osc.connect(gain);
      gain.connect(body);
      osc.start(now);
      osc.stop(now + voice.seconds + 0.02);
      osc.onended = (): void => {
        gain.disconnect();
      };
    }

    window.setTimeout(() => {
      master.disconnect();
      body.disconnect();
    }, 300);
  }
}
