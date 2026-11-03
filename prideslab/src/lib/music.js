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

// ---------- volume ramps ----------

const ramps = new Map(); // deck -> { frame, resolve }
// Ears hear loudness on a log scale, so ramp in decibels (-40 dB <-> full)
// rather than in raw volume, which sounds like it jumps at the quiet end.
const DB_RANGE = 40;
const fadeInCurve = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(10, (-DB_RANGE * (1 - t)) / 20));
const fadeOutCurve = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.pow(10, (-DB_RANGE * t) / 20));

function cancelRamp(a) {
    const r = ramps.get(a);
    if (!r) return;
    cancelAnimationFrame(r.frame);
    ramps.delete(a);
    r.resolve(false);
}

// Ramp a deck's volume to `to` over `ms`. Resolves true when finished, false if interrupted.
function ramp(a, to, ms, curve) {
    cancelRamp(a);
    return new Promise((resolve) => {
        const from = a.volume;
        const start = performance.now();
        const r = { resolve, frame: 0 };
        ramps.set(a, r);
        const step = (now) => {
            // rAF timestamps can be slightly earlier than `start`; clamp to [0, 1]
            const t = Math.max(0, Math.min(1, (now - start) / ms));
            a.volume = Math.max(0, Math.min(1, from + (to - from) * curve(t)));
            if (t < 1) r.frame = requestAnimationFrame(step);
            else { ramps.delete(a); resolve(true); }
        };
        r.frame = requestAnimationFrame(step);
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
    const a = current();
    if (state.index < 0) {
        a.src = tracks[startIndex()].url;
        set({ index: startIndex(), time: 0, duration: 0 });
    }
    a.volume = 0;
    startPlayback(a);
    ramp(a, config.volume, FADE_MS, fadeInCurve);
}

export function pause() {
    switchToken++; // cancel a song change that's fading out or waiting in the gap
    for (const d of getDecks()) {
        cancelRamp(d);
        if (d !== current()) { d.pause(); d.volume = 0; }
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
    const token = ++switchToken;
    const outgoing = current();
    active = 1 - active;
    const incoming = current();

    cancelRamp(incoming);
    incoming.pause();
    incoming.volume = 0;
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
