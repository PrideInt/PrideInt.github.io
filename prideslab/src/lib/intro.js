/*
 * "Click to begin": the page waits for this before typing anything in.
 * The click that dismisses the intro is also what lets the browser play music.
 */

let begun = false;
const listeners = new Set();

export const hasBegun = () => begun;

// Run `fn` once the visitor has begun (right away if they already have)
export function onBegin(fn) {
    if (begun) { fn(); return () => {}; }
    listeners.add(fn);
    return () => listeners.delete(fn);
}

export function begin() {
    if (begun) return;
    begun = true;
    listeners.forEach((fn) => fn());
    listeners.clear();
}
