// Tiny synthesized sound set (WebAudio, no files to download). Phones default to SILENT: 60 devices beeping in a room is a risk.
// The stage page sets window.CCA_SFX_STAGE = 1 and starts with sound on (the host controls the speakers; press M to mute).
(function () {
  var ctx = null, on = !!window.CCA_SFX_STAGE;
  if (!window.CCA_SFX_STAGE) { try { on = localStorage.getItem('cca-sound') === '1'; } catch (e) {} }
  function ac() {
    if (!ctx) { var C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ctx = new C(); }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(f, t0, d, type, vol) {
    if (!on) return; var c = ac(); if (!c) return;
    var o = c.createOscillator(), g = c.createGain(), t = c.currentTime + t0;
    o.type = type || 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol || 0.12, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + d + 0.05);
  }
  window.CCASfx = {
    isOn: function () { return on; },
    set: function (v) { on = !!v; if (!window.CCA_SFX_STAGE) { try { localStorage.setItem('cca-sound', on ? '1' : '0'); } catch (e) {} } if (on) { ac(); this.tick(); } },
    toggle: function () { this.set(!on); return on; },
    tick: function () { tone(880, 0, 0.06, 'triangle', 0.07); },
    rise: function () { for (var i = 0; i < 9; i++) tone(260 + i * 55, i * 0.075, 0.1, 'triangle', 0.05); },
    lock: function () { tone(196, 0, 0.09, 'sine', 0.1); tone(392, 0.04, 0.12, 'triangle', 0.05); },
    cliff: function () { tone(110, 0, 1.2, 'sine', 0.14); tone(165, 0.1, 1.0, 'sine', 0.08); tone(220, 0.9, 1.4, 'sine', 0.09); },
    chime: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, i * 0.085, 0.3, 'sine', 0.13); }); },
    miss: function () { tone(196, 0, 0.2, 'sine', 0.12); tone(147, 0.15, 0.34, 'sine', 0.1); },
    boom: function () { tone(70, 0, 0.55, 'sine', 0.3); tone(140, 0, 0.22, 'triangle', 0.1); }
  };
})();
