# prideslab-feeds (optional)

The Letterboxd panel works without this. Every `npm run build` saves your latest
diary entries into the site (`prideslab/scripts/fetch-letterboxd.mjs`), so the
panel updates each time you deploy.

Deploy this small Cloudflare Worker if you want the panel to update on its own,
within about 15 minutes of logging a film, without redeploying. The free plan is plenty.

## Deploy

```bash
cd worker
npx wrangler login
npx wrangler deploy
```

Wrangler prints a URL like `https://prideslab-feeds.<you>.workers.dev`. Opening
`/letterboxd` on it should show your recent films as JSON.

Then, in `prideslab/src/data/portfolio.js`:

```js
export const integrations = {
    letterboxdUser: 'pridelightbourn',
    endpoint: 'https://prideslab-feeds.<you>.workers.dev',
}
```

Rebuild and deploy the site (`npm run deploy`). If the Worker is ever down,
the panel falls back to the copy saved at build time.

## Notes

- Your username is set in `wrangler.toml` (`LETTERBOXD_USER`).
- Only the origins in `ALLOWED_ORIGINS` (plus localhost, for `npm run dev`) get access.
