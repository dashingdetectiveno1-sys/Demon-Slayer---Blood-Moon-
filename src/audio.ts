class SoundEngine {
  ctx: AudioContext | null = null;
  masterGain: GainNode | null = null;
  musicGain: GainNode | null = null;
  sfxGain: GainNode | null = null;

  musicOsc: OscillatorNode | null = null;
  musicInterval: number | null = null;

  rainGain: GainNode | null = null;
  rainNoise: AudioBufferSourceNode | null = null;
  snowGain: GainNode | null = null;
  snowOsc: OscillatorNode | null = null;

  ambientVolume: number = 1.0;
  musicVolume: number = 1.0;
  sfxVolume: number = 1.0;
  masterVolume: number = 1.0;

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    
    this.musicGain = this.ctx.createGain();
    this.musicGain.connect(this.masterGain);
    this.musicGain.gain.value = 0.3 * this.musicVolume;

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.connect(this.masterGain);
    this.sfxGain.gain.value = 0.5 * this.sfxVolume;

    this.rainGain = this.ctx.createGain();
    this.rainGain.connect(this.masterGain);
    this.rainGain.gain.value = 0;

    this.snowGain = this.ctx.createGain();
    this.snowGain.connect(this.masterGain);
    this.snowGain.gain.value = 0;
    this.initVoices();
  }

  setVolumes(master: number, music: number, sfx: number, ambient: number) {
    this.masterVolume = master;
    this.musicVolume = music;
    this.sfxVolume = sfx;
    this.ambientVolume = ambient;

    if (this.masterGain && !this.isPaused) this.masterGain.gain.value = master;
    if (this.musicGain) this.musicGain.gain.value = 0.3 * music;
    if (this.sfxGain) this.sfxGain.gain.value = 0.5 * sfx;
    if (this.voiceGain) this.voiceGain.gain.value = 0.9 * sfx;
    // Ambient volumes will be updated in the next setAmbient or we can re-evaluate it but setAmbient can just take the current state.
  }

  isPaused: boolean = false;
  setPaused(paused: boolean) {
    this.isPaused = paused;
    if (this.masterGain) {
      this.masterGain.gain.linearRampToValueAtTime(paused ? 0 : this.masterVolume, this.ctx?.currentTime || 0 + 0.1);
    }
  }

  setAmbient(stage: 'village' | 'forest' | 'boss' | 'none', weather: 'clear' | 'rain' | 'snow' = 'clear') {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    
    if (!this.rainNoise) {
        const bufferSize = this.ctx.sampleRate * 2.0; 
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        this.rainNoise = this.ctx.createBufferSource();
        this.rainNoise.buffer = buffer;
        this.rainNoise.loop = true;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 600; // Softer, less harsh rain
        this.rainNoise.connect(filter);
        if (this.rainGain) filter.connect(this.rainGain);
        this.rainNoise.start();
    }
    
    if (!this.snowOsc) {
        this.snowOsc = this.ctx.createOscillator();
        this.snowOsc.type = 'sine';
        this.snowOsc.frequency.value = 80;
        const oscGain = this.ctx.createGain();
        this.snowOsc.connect(oscGain);
        
        const bufferSize = this.ctx.sampleRate * 3.0; 
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const windNoise = this.ctx.createBufferSource();
        windNoise.buffer = buffer;
        windNoise.loop = true;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 300; // Softer wind
        filter.Q.value = 0.3;
        windNoise.connect(filter);
        if (this.snowGain) {
            filter.connect(this.snowGain);
            oscGain.connect(this.snowGain);
        }
        windNoise.start();
        this.snowOsc.start();
    }

    if (this.rainGain && this.snowGain) {
        const rainTarget = weather === 'rain' ? 0.05 * this.ambientVolume : 0;
        const snowTarget = weather === 'snow' ? 0.05 * this.ambientVolume : 0;
        this.rainGain.gain.linearRampToValueAtTime(rainTarget, t + 1.0);
        this.snowGain.gain.linearRampToValueAtTime(snowTarget, t + 1.0);
    }
  }

  playSlash() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    
    // Whoosh layer
    const bufferSize = this.ctx.sampleRate * 0.4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(800, t);
    bandpass.frequency.exponentialRampToValueAtTime(200, t + 0.3);
    bandpass.Q.value = 1.0;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0, t);
    noiseGain.gain.linearRampToValueAtTime(1.0, t + 0.05);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
    
    noise.connect(bandpass);
    bandpass.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noise.start(t);

    // Metallic layer
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1500, t);
    osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);
    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.3, t);
    oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  playDash() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.15);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

    osc.start();
    osc.stop(t + 0.15);
  }

  playWater() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    
    // Whooshing ambient splash base
    const bufferSize = this.ctx.sampleRate * 0.9;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(350, t);
    filter.frequency.exponentialRampToValueAtTime(2500, t + 0.35);
    filter.Q.value = 1.8;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(1.0, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.7);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(t);

    // Dynamic rising liquid bubble resonators
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const lGain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(120, t);
    osc1.frequency.exponentialRampToValueAtTime(650, t + 0.3);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(180, t);
    osc2.frequency.exponentialRampToValueAtTime(950, t + 0.25);

    lGain.gain.setValueAtTime(0.5, t);
    lGain.gain.exponentialRampToValueAtTime(0.01, t + 0.45);

    osc1.connect(lGain);
    osc2.connect(lGain);
    lGain.connect(this.sfxGain);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.5);
    osc2.stop(t + 0.5);
  }

  playFire() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    
    // Crackling hot flare (sweeping noise)
    const bufferSize = this.ctx.sampleRate * 1.0;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, t);
    filter.frequency.exponentialRampToValueAtTime(150, t + 0.5);
    filter.Q.value = 1.0;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(2.2, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.9);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(t);

    // Giant detuned saw-wave dual explosion
    const tOsc1 = this.ctx.createOscillator();
    const tOsc2 = this.ctx.createOscillator();
    const tGain = this.ctx.createGain();

    tOsc1.type = 'sawtooth';
    tOsc1.frequency.setValueAtTime(330, t);
    tOsc1.frequency.exponentialRampToValueAtTime(45, t + 0.5);

    tOsc2.type = 'sawtooth';
    tOsc2.frequency.setValueAtTime(335, t); // detuned
    tOsc2.frequency.exponentialRampToValueAtTime(40, t + 0.55);

    tGain.gain.setValueAtTime(1.8, t);
    tGain.gain.exponentialRampToValueAtTime(0.01, t + 0.6);

    tOsc1.connect(tGain);
    tOsc2.connect(tGain);
    tGain.connect(this.sfxGain);

    tOsc1.start(t);
    tOsc2.start(t);
    tOsc1.stop(t + 0.65);
    tOsc2.stop(t + 0.65);

    // Bass impact hit (sub slam)
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(140, t);
    sub.frequency.exponentialRampToValueAtTime(32, t + 0.35);

    subGain.gain.setValueAtTime(2.5, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    sub.connect(subGain);
    subGain.connect(this.sfxGain);

    sub.start(t);
    sub.stop(t + 0.45);
  }

  playThunder() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    
    // Instantaneous electrical crackle spark (crisp noise cluster)
    const bufferSize = this.ctx.sampleRate * 0.6;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(4500, t);
    filter.frequency.exponentialRampToValueAtTime(1000, t + 0.25);
    filter.Q.value = 2.5;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(2.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.55);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(t);

    // Screaming electronic lightning flash (modulated sawtooth)
    const osc = this.ctx.createOscillator();
    const mod = this.ctx.createOscillator();
    const ringGain = this.ctx.createGain();
    const oscGain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(950, t);
    osc.frequency.linearRampToValueAtTime(50, t + 0.4);

    mod.type = 'triangle';
    mod.frequency.setValueAtTime(40, t); // frequency modulator

    ringGain.gain.setValueAtTime(1.8, t);
    ringGain.gain.exponentialRampToValueAtTime(0.01, t + 0.45);

    osc.connect(ringGain);
    mod.connect(ringGain.gain); // Modulate amplitude
    ringGain.connect(this.sfxGain);

    osc.start(t);
    mod.start(t);
    osc.stop(t + 0.5);
    mod.stop(t + 0.5);

    // Exploding heavy speaker rumble
    const rumble = this.ctx.createOscillator();
    const rumbleGain = this.ctx.createGain();
    rumble.type = 'sawtooth';
    rumble.frequency.setValueAtTime(95, t);
    rumble.frequency.linearRampToValueAtTime(25, t + 0.7);

    const rumbleFilter = this.ctx.createBiquadFilter();
    rumbleFilter.type = 'lowpass';
    rumbleFilter.frequency.setValueAtTime(120, t);

    rumbleGain.gain.setValueAtTime(2.2, t);
    rumbleGain.gain.exponentialRampToValueAtTime(0.005, t + 0.8);

    rumble.connect(rumbleFilter);
    rumbleFilter.connect(rumbleGain);
    rumbleGain.connect(this.sfxGain);

    rumble.start(t);
    rumble.stop(t + 0.85);
  }

  playDamage() {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.type = 'square';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playCrit() {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(800, this.ctx.currentTime + 0.05);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  playLevelUp() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    
    // Arpeggio fanfare
    [440, 554.37, 659.25, 880].forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + i * 0.1);
        gain.gain.setValueAtTime(0, t + i * 0.1);
        gain.gain.linearRampToValueAtTime(0.3, t + i * 0.1 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, t + i * 0.1 + 0.3);
        osc.connect(gain);
        gain.connect(this.sfxGain!);
        osc.start(t + i * 0.1);
        osc.stop(t + i * 0.1 + 0.4);
    });

    // Impact
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'square';
    sub.frequency.setValueAtTime(110, t);
    sub.frequency.exponentialRampToValueAtTime(55, t + 0.5);
    subGain.gain.setValueAtTime(0.2, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    sub.connect(subGain);
    subGain.connect(this.sfxGain);
    sub.start(t);
    sub.stop(t + 0.5);
  }

  playStinger() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    // deep taiko boom
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(95, t);
    osc.frequency.exponentialRampToValueAtTime(36, t + 1.0);
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
    osc.connect(g); g.connect(this.sfxGain);
    osc.start(t); osc.stop(t + 1.5);
    // tense detuned swell (minor second)
    [220, 233.1].forEach((f) => {
      const o = this.ctx!.createOscillator();
      const og = this.ctx!.createGain();
      const flt = this.ctx!.createBiquadFilter();
      o.type = 'sawtooth'; o.frequency.value = f;
      flt.type = 'lowpass'; flt.frequency.value = 800;
      og.gain.setValueAtTime(0.0001, t);
      og.gain.linearRampToValueAtTime(0.05, t + 0.8);
      og.gain.exponentialRampToValueAtTime(0.001, t + 2.4);
      o.connect(flt); flt.connect(og); og.connect(this.sfxGain!);
      o.start(t); o.stop(t + 2.4);
    });
  }

  setMusicTheme(theme: 'ambient' | 'battle' | 'boss' | 'none') {
    if (!this.ctx || !this.musicGain) return;
    if (this.musicInterval) clearInterval(this.musicInterval);
    
    if (theme === 'none') {
        this.musicGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
        return;
    }

    this.musicGain.gain.linearRampToValueAtTime(0.2, this.ctx.currentTime + 1.0);

    let bpm = 60;
    let notes = [200, 250, 300];
    
    if (theme === 'battle') {
        bpm = 120;
        notes = [150, 180, 200, 150, 220];
    } else if (theme === 'boss') {
        bpm = 140;
        notes = [100, 110, 100, 90, 80, 150];
    } else {
        bpm = 40;
        notes = [220, 261.63, 329.63, 440];
    }

    const intervalMs = (60 / bpm) * 1000;
    let step = 0;

    this.musicInterval = setInterval(() => {
        if (!this.ctx || !this.musicGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.musicGain);

        osc.type = theme === 'ambient' ? 'sine' : 'square';
        osc.frequency.value = notes[step % notes.length];
        
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + (intervalMs/1000) * 0.8);

        osc.start();
        osc.stop(this.ctx.currentTime + (intervalMs/1000));

        step++;
        
        // Ambient wind synth
        if (theme === 'ambient' && step % 4 === 0) {
            const windOsc = this.ctx.createOscillator();
            const windGain = this.ctx.createGain();
            windOsc.type = 'sine';
            windOsc.frequency.setValueAtTime(100, this.ctx.currentTime);
            windOsc.frequency.linearRampToValueAtTime(150, this.ctx.currentTime + 1.0);
            windOsc.frequency.linearRampToValueAtTime(100, this.ctx.currentTime + 2.0);
            
            windGain.gain.setValueAtTime(0, this.ctx.currentTime);
            windGain.gain.linearRampToValueAtTime(0.05, this.ctx.currentTime + 1.0);
            windGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 2.0);
            
            windOsc.connect(windGain);
            windGain.connect(this.musicGain);
            windOsc.start();
            windOsc.stop(this.ctx.currentTime + 2.0);
        }

    }, intervalMs) as any;
  }
  // ---- Anime voice bus (real voice clips in /voices/*.mp3) ----
  voiceGain: GainNode | null = null;
  voiceBuffers: Record<string, AudioBuffer | null> = {};
  voiceLastPlayed: Record<string, number> = {};
  activeVoices = 0;

  static VOICE_FILES = ['atk_kiai_1','atk_kiai_2','atk_kiai_3','dash_voice','hurt_1','hurt_2','crit_shout','levelup_voice','boss_roar','narr_intro','narr_forest','narr_cavern','narr_summit','narr_midfight','narr_cocoon','narr_victory','shira_bossintro_1','shira_bossintro_2','shira_arrival','shira_death','iwato_1','iwato_2','iwato_3','iwato_4','iwato_5','iwato_memory','iwato_farewell','narr_ren','narr_climb'];

  initVoices() {
    if (!this.ctx || !this.masterGain) return;
    if (!this.voiceGain) {
      this.voiceGain = this.ctx.createGain();
      this.voiceGain.connect(this.masterGain);
      this.voiceGain.gain.value = 0.9 * this.sfxVolume;
    }
    for (const name of SoundEngine.VOICE_FILES) {
      if (name in this.voiceBuffers) continue;
      this.voiceBuffers[name] = null;
      fetch('voices/' + name + '.mp3')
        .then(r => r.ok ? r.arrayBuffer() : Promise.reject(r.status))
        .then(ab => this.ctx!.decodeAudioData(ab))
        .then(buf => { this.voiceBuffers[name] = buf; })
        .catch(() => { this.voiceBuffers[name] = null; });
    }
  }

  playVoice(name: string, opts: { volume?: number; cooldown?: number } = {}) {
    if (!this.ctx || !this.voiceGain || this.isPaused) return;
    const buf = this.voiceBuffers[name];
    if (!buf) return; // clip missing/not loaded yet: synth SFX still plays alongside
    const now = performance.now();
    if (now - (this.voiceLastPlayed[name] || 0) < (opts.cooldown ?? 350)) return;
    if (this.activeVoices >= 2) return;
    this.voiceLastPlayed[name] = now;
    this.activeVoices++;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = opts.volume ?? 1.0;
    src.connect(g);
    g.connect(this.voiceGain);
    if (this.musicGain) {
      const t = this.ctx.currentTime;
      const cur = this.musicGain.gain.value;
      this.musicGain.gain.cancelScheduledValues(t);
      this.musicGain.gain.setValueAtTime(cur, t);
      this.musicGain.gain.linearRampToValueAtTime(Math.max(cur * 0.65, 0.001), t + 0.06);
      this.musicGain.gain.linearRampToValueAtTime(cur, t + buf.duration + 0.35);
    }
    src.onended = () => { this.activeVoices--; };
    src.start();
  }

  playVoiceRandom(names: string[], opts: { volume?: number; chance?: number; cooldown?: number } = {}) {
    if (Math.random() > (opts.chance ?? 1)) return;
    this.playVoice(names[Math.floor(Math.random() * names.length)], opts);
  }

}

export const audioManager = new SoundEngine();
