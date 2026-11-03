/*
 * prideslab-feeds: an optional Cloudflare Worker for the Letterboxd panel.
 *
 *   GET /letterboxd  the most recent diary entries from the Letterboxd RSS feed
 *
 * Without it, the site uses the copy saved at build time (public/letterboxd.json).
 * With it, the panel's diary updates within about 5 minutes of logging a film, no redeploy needed.
 * (Banner, favorites and your chosen posters still come from the site's build; see the README.)
 *
 * Vars (wrangler.toml): LETTERBOXD_USER, ALLOWED_ORIGINS
 */

const LETTERBOXD_TTL = 300;   // 15 minutes; diary entries don't change often

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const cors = corsHeaders(request.headers.get('Origin'), env.ALLOWED_ORIGINS);

        if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
        if (request.method !== 'GET') return json({ error: 'method not allowed' }, 405, cors);

        const routes = {
            '/letterboxd': [() => letterboxd(env), LETTERBOXD_TTL],
        };
        const route = routes[url.pathname];
        if (!route) return json({ error: 'not found' }, 404, cors);

        // Edge cache so visitors don't each hit Letterboxd
        const cache = caches.default;
        const cacheKey = new Request(url.origin + url.pathname);
        const hit = await cache.match(cacheKey);
        if (hit) return withHeaders(hit, cors);

        try {
            const [load, ttl] = route;
            const res = json(await load(), 200, { 'Cache-Control': `public, max-age=${ttl}` });
            ctx.waitUntil(cache.put(cacheKey, res.clone()));
            return withHeaders(res, cors);
        } catch (err) {
            return json({ error: String(err.message || err) }, 502, cors);
        }
    },
};

// ---------------- Letterboxd ----------------

const decode = (s = '') =>
    s.replace(/^<!\[CDATA\[|\]\]>$/g, '')
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
        .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
        .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
        .trim();

const tag = (xml, name) => {
    const m = xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
    return m ? decode(m[1]) : null;
}

async function letterboxd(env) {
    const user = env.LETTERBOXD_USER;
    if (!user) throw new Error('LETTERBOXD_USER is not set');

    const res = await fetch(`https://letterboxd.com/${encodeURIComponent(user)}/rss/`, {
        headers: { 'User-Agent': 'prideslab-feeds (personal portfolio)' },
    });
    if (!res.ok) throw new Error(`letterboxd ${res.status}`);
    const xml = await res.text();

    const films = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
        .map(([, item]) => {
            const title = tag(item, 'letterboxd:filmTitle');
            if (!title) return null; // lists also appear in the feed; skip them
            const rating = tag(item, 'letterboxd:memberRating');
            const description = item.match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? '';
            return {
                title,
                year: tag(item, 'letterboxd:filmYear'),
                rating: rating ? Number(rating) : null,
                liked: tag(item, 'letterboxd:memberLike') === 'Yes',
                rewatch: tag(item, 'letterboxd:rewatch') === 'Yes',
                watchedDate: tag(item, 'letterboxd:watchedDate'),
                poster: description.match(/<img src="([^"]+)"/)?.[1] ?? null,
                url: tag(item, 'link'),
                slug: tag(item, 'link')?.match(/\/film\/([^/]+)\//)?.[1] ?? null,
            };
        })
        .filter(Boolean)
        .slice(0, 4);

    return { profileUrl: `https://letterboxd.com/${user}/`, films };
}

// ---------------- helpers ----------------

function corsHeaders(origin, allowed = '') {
    const list = allowed.split(',').map((s) => s.trim()).filter(Boolean);
    const ok = origin && (list.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));
    return {
        'Access-Control-Allow-Origin': ok ? origin : list[0] || '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        Vary: 'Origin',
    };
}

function json(body, status = 200, headers = {}) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
    });
}

function withHeaders(res, headers) {
    const out = new Response(res.body, res);
    for (const [k, v] of Object.entries(headers)) out.headers.set(k, v);
    return out;
}
