// sound.js — tiny WebAudio beeps, zero audio assets, zero network.
// Created lazily on the first user gesture so browsers allow it.

const SoundFX = {
  ctx: null,
  enabled: true,

  unlock: function () {
    if (!this.ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) this.ctx = new AC();
      } catch (err) { this.ctx = null; }
    }
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
  },

  beep: function (freq, dur, type) {
    if (!this.enabled || !this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type || "sine";
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    } catch (err) { /* silence is fine */ }
  },

  pickup: function () { this.beep(520, 0.07, "sine"); },
  chopDone: function () { this.beep(740, 0.08, "square"); this.beep(980, 0.06, "square"); },
  grillDone: function () { this.beep(880, 0.1, "triangle"); },
  serveGood: function () {
    const self = this;
    this.beep(660, 0.09, "triangle");
    setTimeout(function () { self.beep(880, 0.12, "triangle"); }, 90);
    setTimeout(function () { self.beep(1174, 0.14, "triangle"); }, 180);
  },
  serveBad: function () { this.beep(160, 0.2, "sawtooth"); },
  tick: function () { this.beep(1200, 0.04, "square"); },
};
