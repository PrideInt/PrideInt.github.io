import { integrations } from '../data/portfolio'

/*
 * Data for the Letterboxd panel (left edge).
 *
 * Where it comes from, in order:
 *  1. The optional Cloudflare Worker, if `integrations.endpoint` is set
 *     (live: updates within 15 minutes of logging a film).
 *  2. public/letterboxd.json, written by scripts/fetch-letterboxd.mjs on
 *     every `npm run dev` / `npm run build` (updates when you deploy).
 *
 * Shape: {
 *   profileUrl, user,
 *   banner,                                   // image path or URL, or null
 *   favorites: [{ title, year, url, poster }], // up to 4
 *   films: [{ title, year, rating, liked, rewatch, watchedDate, poster, url }],
 * }
 * Image paths like "letterboxd/banner.jpg" live in /public; use assetUrl() for them.
 */

export const assetUrl = (path) =>
    !path ? null : /^(https?:|data:|\/)/.test(path) ? path : `${import.meta.env.BASE_URL}${path}`;

const { endpoint } = integrations;

export const profileUrl = integrations.letterboxdUser
    ? `https://letterboxd.com/${integrations.letterboxdUser}/`
    : null;

const getJson = async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url} ${res.status}`);
    return res.json();
}

export async function fetchLetterboxd() {
    if (endpoint) {
        try {
            return await getJson(`${endpoint.replace(/\/$/, '')}/letterboxd`);
        } catch {
            // fall through to the copy saved at build time
        }
    }
    return getJson(`${import.meta.env.BASE_URL}letterboxd.json`);
}
