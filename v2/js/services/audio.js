import { selectSettings } from "../state/selectors.js";

export function createAudioService(options = {}) {
  const { store, AudioClass = globalThis.Audio } = options;
  let current = null;

  function play(source, playOptions = {}) {
    const settings = selectSettings(store.getState()) || {};
    if (settings.sound === false || !AudioClass || !source) return false;
    current?.pause?.();
    const audio = new AudioClass(source);
    const baseVolume = Math.max(0, Math.min(1, Number(settings.soundVolume ?? 100) / 100));
    audio.volume = Math.max(0, Math.min(1, baseVolume * (playOptions.gain ?? 1)));
    current = audio;
    const result = audio.play?.();
    result?.catch?.(() => {});
    audio.addEventListener?.("ended", () => { if (current === audio) current = null; }, { once: true });
    return true;
  }

  function stop() {
    current?.pause?.();
    current = null;
  }

  return Object.freeze({ play, stop });
}
