// Original synthesised sounds (WebAudio, no files to download, no recordings used): talking drum, shekere, agogo bell,
// kalimba, a highlife-style pluck, cassette and old-TV textures, and a Nollywood-style dramatic stinger. They evoke; they never copy a recording or a tune.
// Where it plays:
//   onboarding pages (opening, questions, ending): ON by default, one tap on the Sound pill turns it off, and the choice is remembered.
//   welcome game (60 devices in one room): OFF by default.
//   stage deck: ON (the host controls the speakers; press M to mute). If a file cues/<name>.mp3 sits next to the deck, it plays instead of the synthesised version
//   (names: tick lock rise cliff boom chime miss drum sting beep buzzer static cassette pluck). No file: the synthesised sound plays.
(function () {
  var ctx = null, stage = !!window.CCA_SFX_STAGE, on = stage, noiseBuf = null, cueState = {};
  if (!stage) {
    var pref = null; try { pref = localStorage.getItem('cca-sound'); } catch (e) {}
    var onboarding = !!(document.querySelector && document.querySelector('main.wizard, main.landing, main.cliff'));
    on = pref === '1' || (pref === null && onboarding);
  }
  var master = null, unlocked = false;
  function ac() {
    if (!ctx) { var C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ctx = new C(); }
    if (ctx.state === 'suspended') ctx.resume();
    if (!unlocked) { unlocked = true; iosUnlock(); }
    return ctx;
  }
  // everything goes through one louder, limited bus: phone speakers are small, and these sounds are short and soft
  function bus(c) {
    if (!master) { master = c.createGain(); master.gain.value = 2.6; var lim = c.createDynamicsCompressor(); lim.threshold.value = -14; lim.knee.value = 12; lim.ratio.value = 10; lim.attack.value = 0.003; lim.release.value = 0.2; master.connect(lim); lim.connect(c.destination); }
    return master;
  }
  // iPhones silence in-page (WebAudio) sound when the ringer switch is on silent, unless the page counts as media playback.
  // Two known workarounds: the audio-session setting where it exists, and a silent looping <audio> element started from a tap.
  function iosUnlock() {
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    try {
      var a = document.createElement('audio'); a.setAttribute('playsinline', ''); a.loop = true; a.volume = 0.01;
      a.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=';
      var p = a.play(); if (p && p.catch) p.catch(function () {});
    } catch (e) {}
  }
  function noise(c) {
    if (!noiseBuf) { noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate); var d = noiseBuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    return noiseBuf;
  }
  // a plain tone with a quick attack and an exponential decay
  function tone(f, t0, d, type, vol) {
    var c = ac(); if (!c) return;
    var o = c.createOscillator(), g = c.createGain(), t = c.currentTime + t0;
    o.type = type || 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol || 0.12, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(bus(c)); o.start(t); o.stop(t + d + 0.05);
  }
  // talking drum: a skin tone whose pitch bends (squeezing the cords), f0 -> f1
  function tdrum(f0, f1, t0, d, vol) {
    var c = ac(); if (!c) return;
    var o = c.createOscillator(), g = c.createGain(), t = c.currentTime + t0;
    o.type = 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + d * 0.7);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol || 0.2, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(bus(c)); o.start(t); o.stop(t + d + 0.05);
    tone(f0 * 2.4, t0, 0.03, 'triangle', (vol || 0.2) * 0.3); // the slap
  }
  // filtered noise burst (shaker, static, tape)
  function burst(t0, d, type, freq, q, vol, f1) {
    var c = ac(); if (!c) return;
    var s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime + t0;
    s.buffer = noise(c); f.type = type; f.frequency.setValueAtTime(freq, t); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + d); f.Q.value = q || 1;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(0.012, d / 3)); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(f); f.connect(g); g.connect(bus(c)); s.start(t); s.stop(t + d + 0.05);
  }
  // agogo: two bell tones at an inharmonic ratio, very short
  function agogo(f, t0, vol) { tone(f, t0, 0.22, 'sine', vol); tone(f * 1.504, t0, 0.17, 'sine', vol * 0.8); tone(f * 2.76, t0, 0.07, 'triangle', vol * 0.3); }
  // kalimba: a soft tine with one bright overtone that dies quickly
  function kalimba(f, t0, vol) { tone(f, t0, 0.55, 'sine', vol); tone(f * 6.2, t0, 0.07, 'sine', vol * 0.25); }
  // highlife-style plucked string (Karplus-Strong): a noise burst through a short feedback loop
  function pluck(f, t0, vol) {
    var c = ac(); if (!c) return;
    var sr = c.sampleRate, len = Math.floor(sr * 0.7), n = Math.max(2, Math.round(sr / f)), buf = c.createBuffer(1, len, sr), d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    for (var j = n; j < len; j++) d[j] = 0.5 * (d[j - n] + d[j - n + 1 < j ? j - n + 1 : j - n]) * 0.997;
    var s = c.createBufferSource(), g = c.createGain(); s.buffer = buf; g.gain.value = vol; s.connect(g); g.connect(bus(c)); s.start(c.currentTime + t0);
  }
  // play a named sound: on the stage, a file cues/<name>.mp3 wins if it exists; otherwise the synthesised version
  function play(name, synth) {
    if (!on) return;
    if (!stage || cueState[name] === 'missing' || typeof Audio === 'undefined') { synth(); return; }
    var done = false, fb = function () { if (done) return; done = true; cueState[name] = 'missing'; synth(); };
    try {
      var a = new Audio('cues/' + name + '.mp3');
      a.addEventListener('error', fb, { once: true });
      a.addEventListener('playing', function () { done = true; cueState[name] = 'file'; }, { once: true });
      var p = a.play(); if (p && p.catch) p.catch(fb);
    } catch (e) { fb(); }
  }
  var S = {
    tick: function () { kalimba(988, 0, 0.07); },
    lock: function () { agogo(660, 0, 0.1); tdrum(210, 150, 0.02, 0.12, 0.12); },
    rise: function () { var t = 0; for (var i = 0; i < 9; i++) { burst(t, 0.07, 'highpass', 5200, 1, 0.11); t += Math.max(0.04, 0.13 - i * 0.011); } },
    cliff: function () { tone(110, 0, 1.2, 'sine', 0.14); tone(165, 0.1, 1.0, 'sine', 0.08); tdrum(180, 70, 0.05, 0.9, 0.16); tone(220, 0.9, 1.4, 'sine', 0.09); },
    beep: function (go) { tone(go ? 990 : 660, 0, go ? 0.35 : 0.12, 'triangle', go ? 0.09 : 0.07); },
    drum: function () { var t = 0; for (var i = 0; i < 16; i++) { tdrum(150 + (i % 2) * 40, 95, t, 0.09, 0.13); t += Math.max(0.045, 0.12 - i * 0.005); } },
    // Nollywood-style stinger: three low hits, the last one long, with a rising chord on top
    sting: function () { tdrum(130, 55, 0, 0.3, 0.26); tdrum(130, 55, 0.3, 0.3, 0.26); tdrum(140, 45, 0.6, 0.9, 0.3);
      tone(247, 0.6, 0.9, 'sawtooth', 0.04); tone(311, 0.6, 0.9, 'sawtooth', 0.035); tone(370, 0.62, 0.9, 'triangle', 0.06); },
    buzzer: function () { tone(118, 0, 0.55, 'sawtooth', 0.12); tone(124, 0, 0.55, 'sawtooth', 0.12); },
    chime: function () { [523, 659, 784, 1047].forEach(function (f, i) { kalimba(f, i * 0.085, 0.12); }); },
    miss: function () { tdrum(300, 120, 0, 0.42, 0.18); },
    boom: function () { tdrum(110, 38, 0, 0.7, 0.34); tone(70, 0, 0.5, 'sine', 0.2); },
    welcome: function () { welcomeMotif(); },
    static: function () { burst(0, 0.28, 'bandpass', 2400, 0.7, 0.16); },
    cassette: function () { burst(0, 0.03, 'highpass', 3000, 1, 0.22); tone(90, 0.0, 0.05, 'sine', 0.12); burst(0.05, 0.45, 'bandpass', 700, 2, 0.1, 3200); },
    pluck: function () { pluck(196, 0, 0.45); pluck(247, 0.14, 0.4); pluck(294, 0.28, 0.4); }
  };
  // the welcome song: starts from the opening tap, fades in, loops softly under the questions. No file yet (or not cleared): a short original welcome motif instead.
  var song = null, clip = null, songVol = 0.35;
  function welcomeMotif() { kalimba(392, 0, 0.1); kalimba(494, 0.22, 0.1); kalimba(587, 0.44, 0.1); kalimba(784, 0.7, 0.11); pluck(196, 0.9, 0.35); }
  function fadeTo(a, v) { var n = 0, id = setInterval(function () { n++; try { a.volume = Math.min(v, v * n / 24); } catch (e) {} if (n >= 24) clearInterval(id); }, 90); }
  var api = {
    isOn: function () { return on; },
    theme: function (url) {
      if (!on || song || stage) return;
      if (!url || typeof Audio === 'undefined') { welcomeMotif(); return; }
      var failed = false, fb = function () { if (failed) return; failed = true; song = null; welcomeMotif(); };
      try { song = new Audio(url); song.loop = true; song.volume = 0; song.addEventListener('error', fb, { once: true });
        var p = song.play(); if (p && p.then) p.then(function () { fadeTo(song, songVol); }, fb); } catch (e) { fb(); }
    },
    // a short clip (about 10 seconds) of the picked country's song: the welcome song steps back while it plays and returns after
    snippet: function (url) {
      this.stopSnippet(); if (!on || stage || typeof Audio === 'undefined') return;
      var a = new Audio(url); clip = a; a.volume = 0.9;
      var back = function () { if (clip === a) { clip = null; if (song && on) try { song.volume = songVol; } catch (e) {} } };
      a.addEventListener('ended', back, { once: true }); a.addEventListener('error', back, { once: true });
      if (song) { try { song.volume = 0.06; } catch (e) {} }
      var p = a.play(); if (p && p.catch) p.catch(back);
    },
    // the sound for a tapped answer: a voice expression file if there is one (a short fun clip), otherwise the synthesised lock sound
    answer: function (url) {
      if (!on) return; var self = this;
      if (!url || stage || typeof Audio === 'undefined') { self.lock(); return; }
      var done = false, fb = function () { if (done) return; done = true; self.lock(); };
      try { var a = new Audio(url); a.volume = 1; a.addEventListener('error', fb, { once: true }); a.addEventListener('playing', function () { done = true; }, { once: true });
        var p = a.play(); if (p && p.catch) p.catch(fb); } catch (e) { fb(); }
    },
    stopSnippet: function () { if (clip) { var a = clip; clip = null; try { a.pause(); } catch (e) {} if (song && on) try { song.volume = songVol; } catch (e) {} } },
    set: function (v) { on = !!v; try { if (!stage) localStorage.setItem('cca-sound', on ? '1' : '0'); } catch (e) {}
      if (!on) this.stopSnippet();
      if (song) { try { if (on) { var q = song.play(); if (q && q.catch) q.catch(function () {}); } else song.pause(); } catch (e) {} }
      if (on) { ac(); this.tick(); } },
    toggle: function () { this.set(!on); return on; }
  };
  Object.keys(S).forEach(function (k) { api[k] = function (a) { play(k, function () { S[k](a); }); }; });
  window.CCASfx = api;
})();
