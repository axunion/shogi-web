export type PieceSoundKind = "move" | "capture" | "drop";

let audioContext: AudioContext | null = null;

/** Creates the AudioContext lazily on the first user gesture (autoplay policy). */
export function ensureAudioContext(): void {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  if (audioContext.state === "suspended") {
    void audioContext.resume();
  }
}

interface SoundParams {
  frequency: number;
  duration: number;
}

const SOUND_PARAMS: Record<PieceSoundKind, SoundParams> = {
  move: { frequency: 1600, duration: 0.08 },
  capture: { frequency: 1000, duration: 0.12 },
  drop: { frequency: 2000, duration: 0.07 },
};

/** Synthesizes a short filtered noise burst ("パチッ") for a piece move/capture/drop. */
export function playPieceSound(kind: PieceSoundKind): void {
  if (!audioContext) return;
  const ctx = audioContext;
  const { frequency, duration } = SOUND_PARAMS[kind];

  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = frequency;
  filter.Q.value = 1.2;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.6, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  noise.start();
  noise.stop(ctx.currentTime + duration);
}
