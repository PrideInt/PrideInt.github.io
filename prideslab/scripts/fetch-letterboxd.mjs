#!/usr/bin/env node
/*
 * Runs before every `npm run dev` and `npm run build` (see package.json).
 *
 * Builds public/letterboxd.json for the left-edge panel:
 *   - recent diary entries      from your RSS feed
 *   - your four favorites       from your profile page
 *   - your profile banner       from your profile page
 *   - your chosen posters       from your profile and diary pages, falling back
 *                               to the default poster from the RSS feed
 * Images are downloaded into public/letterboxd/ so the site serves its own copies.
 *
 * If Letterboxd can't be reached, the build keeps going with whatever was saved
 * last time. Letterboxd blocks scripts from your profile and diary pages, so
 * the banner, favorites and chosen posters usually come from
 * integrations.letterboxdOverrides in src/data/portfolio.js. Fill that in with
 * scripts/letterboxd-export.js, which runs in your own browser (see that file).
 *
 * This reads a handful of your public pages once per build (about 10 requests).
 *
 * Something not showing up? Run this from the prideslab folder:
 *     node scripts/fetch-letterboxd.mjs --debug
 * It prints what it found and saves the pages it read into letterboxd-debug/.
 */
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';

const root = new URL('..', import.meta.url);
const publicDir = new URL('public/', root);
const imageDir = new URL('public/letterboxd/', root);
const out = new URL('public/letterboxd.json', root);

const { integrations } = await import(new URL('src/data/portfolio.js', root));
const user = integrations?.letterboxdUser;
const overrides = integrations?.letterboxdOverrides ?? {};

const log = (msg) => console.log(`[letterboxd] ${msg}`);
const DEBUG = process.argv.includes('--debug');
const debugDir = new URL('letterboxd-debug/', root);
const report = [];
const note = (msg) => { report.push(msg); if (DEBUG) log(msg); };

if (!user) {
    log('no letterboxdUser set in portfolio.js; skipping');
    process.exit(0);
}

const SITE = 'https://letterboxd.com';
const HEADERS = { 'User-Agent': 'prideslab build (personal portfolio; once per build)' };

const get = async (url, as = 'text') => {
    const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(12000) });
    note(`GET ${url} -> ${res.status}${res.headers.get('cf-mitigated') ? ' (Cloudflare challenge)' : ''}`);
    if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
    return as === 'buffer' ? Buffer.from(await res.arrayBuffer()) : res.text();
};

const decode = (s = '') =>
    s.replace(/^<!\[CDATA\[|\]\]>$/g, '')
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
        .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
        .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#039;/g, "'")
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
        .trim();

const tag = (xml, name) => {
    const m = xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
    return m ? decode(m[1]) : null;
};

const attr = (html, ...names) => {
    for (const name of names) {
        const m = html.match(new RegExp(`${name}="([^"]*)"`));
        if (m) return decode(m[1]);
    }
    return null;
};

const absolute = (url) => (!url ? null : url.startsWith('http') ? url : `${SITE}${url}`);
const slugFromLink = (link = '') => link.match(/\/film\/([^/]+)\//)?.[1] ?? null;

// Every poster component on a Letterboxd page, in page order:
// { slug, name, link, posterUrl, img }
function posterComponents(html) {
    const found = [];
    const re = /<(?:div|li)\b[^>]*\bdata-(?:film|item)-slug="[^"]*"[^>]*>[\s\S]*?(?=<(?:div|li)\b[^>]*\bdata-(?:film|item)-slug="|<\/ul>|<\/section>|$)/g;
    for (const [block] of html.matchAll(re)) {
        const open = block.match(/^<[^>]*>/)[0];
        const img = block.match(/<img\b[^>]*>/)?.[0] ?? '';
        const src = attr(img, 'src');
        const srcset = attr(img, 'srcset');
        const best = srcset?.split(',').map((x) => x.trim().split(/\s+/)[0]).pop() || src;
        const key = attr(open, 'data-cache-busting-key');
        let posterUrl = attr(open, 'data-poster-url', 'data-resolvable-poster-path', 'data-poster-path', 'data-image-url');
        if (posterUrl && key && !posterUrl.includes('k=')) posterUrl += `${posterUrl.includes('?') ? '&' : '?'}k=${key}`;
        found.push({
            slug: attr(open, 'data-film-slug', 'data-item-slug', 'data-film-link-slug'),
            name: attr(open, 'data-film-name', 'data-item-name', 'data-item-full-display-name') || attr(img, 'alt'),
            link: attr(open, 'data-target-link', 'data-item-link', 'data-film-link'),
            posterUrl,
            img: best && !/empty-poster/.test(best) ? best : null,
            attrs: [...new Set([...open.matchAll(/\b(data-[\w-]+)=/g)].map((m) => m[1]))],
        });
    }
    return found;
}

// Ask Letterboxd for the poster image a component would show (this is what
// carries a member's chosen poster). Returns the largest image URL found.
async function resolvePoster(component) {
    if (component?.img) return component.img;
    const candidates = [];
    if (component?.posterUrl) {
        const u = absolute(component.posterUrl);
        candidates.push(u);
        // a "resolvable poster path" like /film/stalker/ needs the image part added
        if (/\/film\/[^/]+\/?(\?|$)/.test(u)) candidates.push(u.replace(/\/?(\?|$)/, '/image-150/$1'));
    }
    if (component?.slug) {
        candidates.push(`${SITE}/film/${component.slug}/image-150/`);
        candidates.push(`${SITE}/ajax/poster/film/${component.slug}/std/150x225/`);
    }
    for (const url of candidates) {
        try {
            const html = await get(url);
            const img = html.match(/<img\b[^>]*>/)?.[0] ?? '';
            const srcset = attr(img, 'srcset');
            const big = srcset?.split(',').map((s) => s.trim().split(/\s+/)[0]).pop();
            const src = big || attr(img, 'src');
            if (src && !/empty-poster/.test(src)) return absolute(src);
        } catch { /* try the next one */ }
    }
    return null;
}

// Save an image into public/letterboxd/ and return its site path
async function save(url, name) {
    if (!url) return null;
    if (!/^https?:/.test(url)) return url; // already a local path (manual override)
    try {
        const ext = (url.split('?')[0].match(/\.(jpe?g|png|webp)$/i)?.[1] || 'jpg').toLowerCase();
        const file = `${name}.${ext}`;
        await writeFile(new URL(file, imageDir), await get(url, 'buffer'));
        return `letterboxd/${file}`;
    } catch (err) {
        log(`couldn't download ${name} (${err.message}); linking to Letterboxd instead`);
        return url;
    }
}

try {
    // 1. Diary entries from the RSS feed
    const xml = await get(`${SITE}/${encodeURIComponent(user)}/rss/`);
    const entries = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
        .map(([, item]) => {
            const title = tag(item, 'letterboxd:filmTitle');
            if (!title) return null; // lists also appear in the feed
            const rating = tag(item, 'letterboxd:memberRating');
            const link = tag(item, 'link');
            const description = item.match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? '';
            return {
                title,
                year: tag(item, 'letterboxd:filmYear'),
                rating: rating ? Number(rating) : null,
                liked: tag(item, 'letterboxd:memberLike') === 'Yes',
                rewatch: tag(item, 'letterboxd:rewatch') === 'Yes',
                watchedDate: tag(item, 'letterboxd:watchedDate'),
                url: link,
                slug: slugFromLink(link),
                rssPoster: description.match(/<img src="([^"]+)"/)?.[1] ?? null,
            };
        })
        .filter(Boolean)
        .slice(0, 4);

    // 2. Profile page: banner, favorites, and posters as shown on your profile
    let profileHtml = '';
    let diaryHtml = '';
    try { profileHtml = await get(`${SITE}/${user}/`); } catch (err) { log(`profile page: ${err.message}`); }
    try { diaryHtml = await get(`${SITE}/${user}/films/diary/`); } catch (err) { log(`diary page: ${err.message}`); }

    const bannerCandidates = [
        ['data-backdrop attribute', attr(profileHtml, 'data-backdrop2x', 'data-backdrop', 'data-backdrop-retina', 'data-backdrop-mobile')],
        ['backdrop style', profileHtml.match(/backdrop[^>]*style="[^"]*url\((?:&quot;|['"])?([^'")&]+)/)?.[1]],
        ['backdrop JSON', profileHtml.match(/"backdrop[\w]*"\s*:\s*"(https?:[^"]+)"/i)?.[1]?.replace(/\\\//g, '/')],
        ['backdrop-sized image URL', profileHtml.match(/https:\/\/a\.ltrbxd\.com\/resized\/[^"' )]+-(?:1920|1600|1400|1200)-\d+-(?:1080|900|788|675)-\d+-crop[^"' )]*/)?.[0]],
    ];
    const foundBanner = bannerCandidates.find(([, url]) => url);
    note(`banner: ${foundBanner ? `found via ${foundBanner[0]}` : 'not found'}${overrides.banner ? ' (using override)' : ''}`);
    const banner = overrides.banner || (foundBanner ? decode(foundBanner[1]) : null);
    const pagesBlocked = !profileHtml && !diaryHtml; // don't keep asking for pages we can't read

    const favSection = profileHtml.match(/id="favou?rites"[\s\S]*?<\/section>/)?.[0] ?? '';
    const favComponents = posterComponents(favSection).slice(0, 4);
    note(`favorites section: ${favSection ? `found, ${favComponents.length} posters` : 'not found'}`);
    if (favComponents[0]) note(`poster attributes seen: ${favComponents[0].attrs.join(' ')}`);

    // slug -> poster component, preferring how it appears on your own pages
    const bySlug = new Map();
    for (const c of [...posterComponents(diaryHtml), ...posterComponents(profileHtml)]) {
        if (c.slug && !bySlug.has(c.slug)) bySlug.set(c.slug, c);
    }

    // 3. Image folder (old images are tidied up after the new data is saved)
    await mkdir(imageDir, { recursive: true });

    // 4. Favorites
    let favorites;
    if (overrides.favorites?.length) {
        favorites = await Promise.all(overrides.favorites.slice(0, 4).map(async (f, i) => ({
            title: f.title,
            year: f.year ?? null,
            url: f.url ?? null,
            poster: await save(f.poster, `favorite-${i + 1}`),
        })));
    } else {
        favorites = await Promise.all(favComponents.map(async (c, i) => ({
            title: c.name,
            year: null,
            url: absolute(c.link) || (c.slug ? `${SITE}/film/${c.slug}/` : null),
            poster: await save(await resolvePoster(c), `favorite-${i + 1}`),
        })));
    }

    // 5. Diary posters: your chosen poster if we can find it, otherwise the feed's
    note(`poster components on profile + diary pages: ${bySlug.size}`);
    const posterOverrides = overrides.posters ?? {};
    const films = await Promise.all(entries.map(async ({ slug, rssPoster, ...film }, i) => {
        const manual = posterOverrides[slug] || posterOverrides[film.title];
        const chosen = manual || (slug && !pagesBlocked ? await resolvePoster(bySlug.get(slug) ?? { slug }) : null);
        note(`${film.title}: ${manual ? 'your poster (from letterboxdOverrides)' : chosen ? `your poster ${chosen}` : 'using the default poster from the feed'}`);
        return { ...film, slug, poster: await save(chosen || rssPoster, `recent-${i + 1}`) };
    }));

    const data = {
        profileUrl: `${SITE}/${user}/`,
        user,
        fetchedAt: new Date().toISOString(),
        banner: await save(banner, 'banner'),
        favorites,
        films,
        // your chosen posters by film, so live diary entries (from the worker) can use them too
        posters: posterOverrides,
    };
    await mkdir(publicDir, { recursive: true });
    await writeFile(out, JSON.stringify(data, null, 2) + '\n');
    // Remove images from earlier builds that nothing points to any more
    const used = new Set([data.banner, ...favorites.map((f) => f.poster), ...films.map((f) => f.poster)]
        .filter((p) => p?.startsWith('letterboxd/')).map((p) => p.slice('letterboxd/'.length)));
    for (const f of await readdir(imageDir)) if (!used.has(f)) await rm(new URL(f, imageDir));

    if (DEBUG) await saveDebug({ profileHtml, diaryHtml, data });

    log(`saved ${films.length} recent films, ${favorites.length} favorites, banner: ${data.banner ? 'yes' : 'no'}`);
    if (pagesBlocked && (!favorites.length || !data.banner)) {
        log('Letterboxd blocks scripts from your profile page. To add your banner, favorites and posters,');
        log('run scripts/letterboxd-export.js in your browser (instructions at the top of that file).');
    } else {
        if (!favorites.length) log('no favorites found; you can set them in portfolio.js (letterboxdOverrides.favorites)');
        if (!data.banner) log('no banner found; you can set one in portfolio.js (letterboxdOverrides.banner)');
    }
} catch (err) {
    log(`couldn't fetch from Letterboxd (${err.message}); keeping the existing letterboxd.json`);
    if (DEBUG) await saveDebug({});
}

async function saveDebug({ profileHtml = '', diaryHtml = '', data = null }) {
    await mkdir(debugDir, { recursive: true });
    await writeFile(new URL('report.txt', debugDir), report.join('\n') + '\n');
    if (profileHtml) await writeFile(new URL('profile.html', debugDir), profileHtml);
    if (diaryHtml) await writeFile(new URL('diary.html', debugDir), diaryHtml);
    if (data) await writeFile(new URL('result.json', debugDir), JSON.stringify(data, null, 2));
    log(`debug files saved in ${new URL('.', debugDir).pathname}`);
}
