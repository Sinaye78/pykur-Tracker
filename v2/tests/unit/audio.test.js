import assert from "node:assert/strict";
import test from "node:test";

import { createAudioService } from "../../js/services/audio.js";

function createStore(settings) {
  return {
    getState: () => ({ optionsShared: true, sharedSettings: settings })
  };
}

test("le service audio respecte le mute global", () => {
  let created = 0;
  class AudioStub { constructor() { created += 1; } }
  const audio = createAudioService({ store: createStore({ sound: false, soundVolume: 100 }), AudioClass: AudioStub });
  assert.equal(audio.play("success.mp3"), false);
  assert.equal(created, 0);
});

test("le service audio applique le volume et coupe le son precedent", () => {
  const instances = [];
  class AudioStub {
    constructor(source) { this.source = source; this.paused = false; instances.push(this); }
    play() { return Promise.resolve(); }
    pause() { this.paused = true; }
    addEventListener() {}
  }
  const audio = createAudioService({ store: createStore({ sound: true, soundVolume: 50 }), AudioClass: AudioStub });
  assert.equal(audio.play("first.mp3", { gain: 0.75 }), true);
  assert.equal(instances[0].volume, 0.375);
  audio.play("second.mp3");
  assert.equal(instances[0].paused, true);
  assert.equal(instances[1].volume, 0.5);
});
