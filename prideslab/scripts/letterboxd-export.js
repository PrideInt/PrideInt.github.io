/*
 * Letterboxd export for the portfolio's Letterboxd panel.
 *
 * Letterboxd blocks scripts from reading your profile pages, but your own browser
 * can see them fine. This snippet reads the page you're looking at and copies your
 * banner, favorites and chosen posters, ready to paste into portfolio.js.
 * It only reads the page; it doesn't change or send anything.
 *
 * How to use it:
 *   1. Open https://letterboxd.com/pridelightbourn/ in your browser.
 *      Scroll down once so all the posters load.
 *   2. Open the developer console (F12, or Ctrl+Shift+J / Cmd+Option+J), then click its "Console" tab.
 *      Chrome may ask you to type "allow pasting" first.
 *   3. Paste everything in this file and press Enter.
 *   4. Optional, for your chosen posters on older diary entries: open
 *      https://letterboxd.com/pridelightbourn/films/diary/ and run it again there.
 *      Each run adds to what earlier runs found.
 *   5. The result is copied to your clipboard. In src/data/portfolio.js, replace
 *      the whole `letterboxdOverrides: { ... },` block with it.
 *
 * Run it again whenever you change your favorites, banner or posters.
 */
(() => {
    const KEY = 'prideslab-letterboxd-export';

    const largest = (img) => {
        const set = img.getAttribute('srcset');
        const fromSet = set ? set.split(',').map((s) => s.trim().split(/\s+/)[0]).pop() : null;
        return fromSet || img.currentSrc || img.src || '';
    };
    const isRealPoster = (url) => url && !/empty-poster|avatar|\/static\//.test(url);
    const slugFor = (el) => {
        const holder = el.closest('[data-film-slug], [data-item-slug]');
        if (holder) return holder.dataset.filmSlug || holder.dataset.itemSlug;
        const link = el.closest('a[href*="/film/"]') || el.parentElement?.querySelector?.('a[href*="/film/"]');
        return link?.getAttribute('href').match(/\/film\/([^/]+)/)?.[1] || null;
    };

    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { /* start fresh */ }
    const out = {
        banner: saved.banner || '',
        favorites: saved.favorites || [],
        posters: saved.posters || {},
    };

    // Banner: Letterboxd shows it as a backdrop behind the profile header
    const backdrops = [...document.querySelectorAll('#backdrop, [data-backdrop], [data-backdrop2x], [class*="backdrop"]')];
    for (const el of backdrops) {
        const fromData = el.dataset.backdrop2x || el.dataset.backdrop;
        const fromStyle = getComputedStyle(el).backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1];
        const fromImg = el.querySelector('img')?.src;
        const url = fromData || fromStyle || fromImg;
        if (url && /^https?:/.test(url)) { out.banner = url; break; }
    }

    // Favorites: the four posters in the "Favorite films" section
    const favSection = document.querySelector('#favourites, #favorites, section.favourites, section.favorites');
    let favsOnPage = 0;
    if (favSection) {
        favsOnPage = favSection.querySelectorAll('img').length;
        const favs = [];
        for (const img of favSection.querySelectorAll('img')) {
            const poster = largest(img);
            if (!isRealPoster(poster)) continue;
            const slug = slugFor(img);
            favs.push({
                title: img.alt || slug || '',
                url: slug ? `https://letterboxd.com/film/${slug}/` : '',
                poster,
            });
        }
        if (favs.length) out.favorites = favs.slice(0, 4);
    }

    // Every other poster on the page (recent activity, diary): your chosen version
    for (const img of document.querySelectorAll('img')) {
        if (favSection?.contains(img)) continue;
        const poster = largest(img);
        if (!isRealPoster(poster) || !/poster/i.test(poster + ' ' + (img.closest('[class*="poster"]') ? 'poster' : ''))) continue;
        const slug = slugFor(img);
        if (slug && !out.posters[slug]) out.posters[slug] = poster;
    }

    try { localStorage.setItem(KEY, JSON.stringify(out)); } catch { /* fine */ }

    const text = 'letterboxdOverrides: ' + JSON.stringify(out, null, 4).replace(/\n/g, '\n    ') + ',';
    let copied = false;
    try { if (typeof copy === 'function') { copy(text); copied = true; } } catch { /* fall through */ }
    console.log(text);
    console.log(
        `%cFound: banner ${out.banner ? 'yes' : 'no'}, ${out.favorites.length} favorites, ${Object.keys(out.posters).length} posters. ` +
        (favsOnPage > out.favorites.length ? `(${favsOnPage - out.favorites.length} favorite poster(s) hadn't loaded yet: scroll the page and run this again.) ` : '') +
        (copied ? 'Copied to your clipboard; paste it over letterboxdOverrides in portfolio.js.' : 'Copy the text above into portfolio.js.'),
        'font-weight: bold'
    );
})();
