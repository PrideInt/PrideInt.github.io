import { useSyncExternalStore } from 'react'

import { tracks } from './playlist'
import { music as config } from '../data/portfolio'

/*
 * The site's theme music, shared by the whole app so it keeps playing
 * when you move between pages.
 *
 * - The default song is loaded right away and starts when the visitor clicks
 *   "begin" on the intro (browsers only allow sound after a click). If the
 *   browser still blocks it, it starts on their next click or tap instead.
 * - "Next" shuffles: every other song plays once before any repeats.
 * - Changing songs fades the current one out, leaves a short silence, then
 *   fades the next one in. Songs that end on their own fade out over their
 *   last couple of seconds the same way. Fades follow a decibel curve, so
 *   the loudness changes evenly to the ear instead of jumping.
 * - Mute is remembered between visits.
 */

const MUTE_KEY = 'prideslab:muted';
const FADE_MS = config.fadeMs ?? 2500;        // fade-in
const FADE_OUT_MS = config.fadeOutMs ?? 2000; // fade-out, on a switch or at the end of a song
const GAP_MS = config.gapMs ?? 1000;          // silence between songs

const readMuted = () => {
    try { return localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; }
};
const saveMuted = (muted) => {
    try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch { /* private mode */ }
};

let state = {
    tracks,
    index: -1,
    playing: false,
    muted: readMuted(),
    waiting: false, // blocked by the browser until the visitor interacts
    time: 0,
    duration: 0,
};

const listeners = new Set();
const set = (patch) => {
    state = { ...state, ...patch };
    listeners.forEach((l) => l());
};
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };

export const useMusic = () => useSyncExternalStore(subscribe, () => state, () => state);
export const hasMusic = tracks.length > 0;

// ---------- two decks, so a fading song and the next one don't collide ----------

const decks = [];
let active = 0;
const current = () => getDecks()[active];

function getDecks() {
    if (decks.length) return decks;
    for (let i = 0; i < 2; i++) {
        const a = new Audio();
        a.preload = 'auto';
        a.muted = state.muted;
        a.volume = 0;
        levels.set(a, { to: 0, ms: 0 });
        // Only the active deck drives what the player shows
        a.addEventListener('timeupdate', () => {
            if (a !== current()) return;
            set({ time: a.currentTime });
            fadeOutNearEnd(a);
        });
        a.addEventListener('loadedmetadata', () => a === current() && set({ duration: a.duration || 0 }));
        a.addEventListener('play', () => a === current() && set({ playing: true, waiting: false }));
        a.addEventListener('pause', () => a === current() && set({ playing: false }));
        a.addEventListener('ended', () => a === current() && next());
        a.addEventListener('error', () => {
            // A broken file: skip it rather than going silent
            if (a === current() && tracks.length > 1) setTimeout(next, 800);
        });
        decks.push(a);
    }
    return decks;
}

// ---------- volume ----------
//
// iPhones and iPads ignore a web page's audio volume (it's read-only there), so
// volume and fades go through the Web Audio API where it exists: each deck feeds
// a gain node, and fades are scheduled on the audio engine itself (which also
// keeps them going when the tab isn't in focus). Browsers without Web Audio fall
// back to the element's own volume.

// Ears hear loudness on a log scale, so ramp in decibels (-40 dB <-> full)
// rather than in raw volume, which sounds like it jumps at the quiet end.
const DB_RANGE = 40;
const fadeInCurve = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(10, (-DB_RANGE * (1 - t)) / 20));
const fadeOutCurve = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.pow(10, (-DB_RANGE * t) / 20));
const RAMP_STEPS = 32; // a fade is scheduled as this many short straight segments

let audioCtx = null;       // null = not set up yet, false = Web Audio unavailable
const gains = new Map();   // deck -> GainNode
const levels = new Map();  // deck -> { from, to, start, ms, curve }; ms 0 = holding steady at `to`
const ramps = new Map();   // deck -> { cancel }

const clamp01 = (v) => Math.max(0, Math.min(1, v));

// The level a deck is at right now (tracked here so we never rely on
// browsers reporting scheduled values back correctly)
function levelOf(a) {
    const l = levels.get(a);
    if (!l) return 0;
    if (!l.ms) return l.to;
    const t = clamp01((performance.now() - l.start) / l.ms);
    return l.from + (l.to - l.from) * l.curve(t);
}

// Set up the Web Audio route. Must first run inside a click or tap (iOS rule),
// which is why play() and the song switches call it.
function ensureAudioGraph() {
    if (audioCtx === null) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) { audioCtx = false; return; }
        try {
            audioCtx = new AC();
            for (const d of getDecks()) {
                const g = audioCtx.createGain();
                g.gain.value = levelOf(d);
                audioCtx.createMediaElementSource(d).connect(g).connect(audioCtx.destination);
                d.volume = 1; // the gain node does the work now
                gains.set(d, g);
            }
        } catch {
            audioCtx = false;
            gains.clear();
            return;
        }
    }
    if (audioCtx && audioCtx.state !== 'running') audioCtx.resume().catch(() => {});
}

// Jump straight to a level
function setLevel(a, v) {
    cancelRamp(a);
    levels.set(a, { to: clamp01(v), ms: 0 });
    const g = gains.get(a);
    if (g) {
        const now = audioCtx.currentTime;
        g.gain.cancelScheduledValues(now);
        g.gain.setValueAtTime(clamp01(v), now);
    } else {
        a.volume = clamp01(v);
    }
}

function cancelRamp(a) {
    const r = ramps.get(a);
    if (!r) return;
    ramps.delete(a);
    r.cancel();
}

// Fade a deck to `to` over `ms`. Resolves true when finished, false if interrupted.
function ramp(a, to, ms, curve) {
    cancelRamp(a);
    const from = levelOf(a);
    levels.set(a, { from, to, start: performance.now(), ms, curve });
    const valueAt = (t) => clamp01(from + (to - from) * curve(t));

    return new Promise((resolve) => {
        const g = gains.get(a);
        if (g) {
            // Web Audio: schedule the whole fade up front
            const now = audioCtx.currentTime;
            g.gain.cancelScheduledValues(now);
            g.gain.setValueAtTime(from, now);
            for (let i = 1; i <= RAMP_STEPS; i++) {
                g.gain.linearRampToValueAtTime(valueAt(i / RAMP_STEPS), now + (ms / 1000) * (i / RAMP_STEPS));
            }
            const timer = setTimeout(() => {
                ramps.delete(a);
                levels.set(a, { to, ms: 0 });
                resolve(true);
            }, ms);
            ramps.set(a, {
                cancel: () => {
                    clearTimeout(timer);
                    const v = levelOf(a);
                    levels.set(a, { to: v, ms: 0 });
                    const t = audioCtx.currentTime;
                    g.gain.cancelScheduledValues(t);
                    g.gain.setValueAtTime(v, t);
                    resolve(false);
                },
            });
        } else {
            // Fallback: step the element's own volume every frame
            const start = performance.now();
            let frame = 0;
            const step = (now) => {
                // rAF timestamps can be slightly earlier than `start`; clamp to [0, 1]
                const t = clamp01((now - start) / ms);
                a.volume = valueAt(t);
                if (t < 1) frame = requestAnimationFrame(step);
                else { ramps.delete(a); levels.set(a, { to, ms: 0 }); resolve(true); }
            };
            frame = requestAnimationFrame(step);
            ramps.set(a, {
                cancel: () => {
                    cancelAnimationFrame(frame);
                    levels.set(a, { to: a.volume, ms: 0 });
                    resolve(false);
                },
            });
        }
    });
}

// ---------- shuffle ----------

let bag = [];
const history = [];

const shuffled = (list) => {
    const a = [...list];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};

const drawNext = () => {
    if (tracks.length < 2) return state.index;
    if (!bag.length) bag = shuffled(tracks.map((_, i) => i).filter((i) => i !== state.index));
    return bag.pop();
};

// ---------- autoplay unlock ----------

let unlockArmed = false;
const armUnlock = () => {
    if (unlockArmed) return;
    unlockArmed = true;
    const unlock = (e) => {
        // Clicking the mute button or the player itself shouldn't also start the music
        if (e.target?.closest?.('[data-music-ignore]')) return;
        ['pointerdown', 'keydown'].forEach((t) => window.removeEventListener(t, unlock, true));
        unlockArmed = false;
        if (!state.playing) play();
    };
    ['pointerdown', 'keydown'].forEach((t) => window.addEventListener(t, unlock, true));
};

const startPlayback = (a) => {
    a.play().catch((err) => {
        if (err?.name === 'NotAllowedError') {
            set({ waiting: true });
            armUnlock();
        }
    });
};

// ---------- controls ----------

export function play() {
    if (!hasMusic) return;
    ensureAudioGraph();
    const a = current();
    if (state.index < 0) {
        a.src = tracks[startIndex()].url;
        set({ index: startIndex(), time: 0, duration: 0 });
    }
    setLevel(a, 0);
    startPlayback(a);
    ramp(a, config.volume, FADE_MS, fadeInCurve);
}

export function pause() {
    switchToken++; // cancel a song change that's fading out or waiting in the gap
    for (const d of getDecks()) {
        cancelRamp(d);
        if (d !== current()) { d.pause(); setLevel(d, 0); }
    }
    current().pause();
    set({ playing: false, waiting: false });
}

export const toggle = () => (state.playing ? pause() : play());

// Fade the current song out, wait out the gap, then fade `index` in on the other deck.
// Rapid clicks are fine: only the latest switch goes through.
let switchToken = 0;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function switchTo(index) {
    if (!hasMusic) return;
    ensureAudioGraph();
    const token = ++switchToken;
    const outgoing = current();
    active = 1 - active;
    const incoming = current();

    incoming.pause();
    setLevel(incoming, 0);
    incoming.muted = state.muted;
    incoming.src = tracks[index].url; // starts loading during the fade and gap
    set({ index, time: 0, duration: 0, playing: true });

    if (!outgoing.paused) {
        const finished = await ramp(outgoing, 0, FADE_OUT_MS, fadeOutCurve);
        if (finished && outgoing !== current()) outgoing.pause();
    }
    if (token !== switchToken) return;

    await wait(GAP_MS);
    if (token !== switchToken) return;

    startPlayback(incoming);
    ramp(incoming, config.volume, FADE_MS, fadeInCurve);
}

// Start fading out a little before a song ends, then the usual gap and fade-in
let endingDeck = null;
function fadeOutNearEnd(a) {
    if (a.paused || !a.duration) return;
    if (a.duration - a.currentTime > FADE_OUT_MS / 1000) { if (endingDeck === a) endingDeck = null; return; }
    if (endingDeck === a) return;
    endingDeck = a;
    next();
}

export function next() {
    if (!hasMusic) return;
    if (state.index >= 0) history.push(state.index);
    switchTo(drawNext());
}

export function previous() {
    if (!hasMusic) return;
    // Like most players: restart the song unless we're right at the start
    if (state.time > 3 || !history.length) {
        seek(0);
        if (!state.playing) play();
        return;
    }
    switchTo(history.pop());
}

export function seek(seconds) {
    const a = current();
    if (Number.isFinite(seconds)) a.currentTime = Math.max(0, Math.min(seconds, a.duration || seconds));
}

export function toggleMute() {
    const muted = !state.muted;
    for (const d of getDecks()) d.muted = muted;
    saveMuted(muted);
    set({ muted });
}

const startIndex = () => {
    const i = tracks.findIndex((t) => t.file === config.defaultSong);
    return i >= 0 ? i : 0;
};

// Load the default song so it's ready the moment the visitor clicks "begin"
let started = false;
export function start() {
    if (started || !hasMusic) return;
    started = true;
    const a = current();
    a.src = tracks[startIndex()].url;
    set({ index: startIndex(), time: 0, duration: 0 });
}
