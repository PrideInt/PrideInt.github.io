#!/usr/bin/env node
/*
 * One-time helper: gets a Spotify refresh token for the worker.
 *
 *   SPOTIFY_CLIENT_ID=... SPOTIFY_CLIENT_SECRET=... node get-spotify-token.mjs
 *
 * Then open the printed link, approve, and copy the refresh token it prints.
 * Your Spotify app must list this exact Redirect URI:
 *   http://127.0.0.1:8888/callback
 */
import http from 'node:http';

const { SPOTIFY_CLIENT_ID: id, SPOTIFY_CLIENT_SECRET: secret } = process.env;
if (!id || !secret) {
    console.error('Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET first.');
    process.exit(1);
}

const redirect = 'http://127.0.0.1:8888/callback';
const scope = 'user-read-currently-playing user-read-recently-played';
const authUrl =
    'https://accounts.spotify.com/authorize?' +
    new URLSearchParams({ client_id: id, response_type: 'code', redirect_uri: redirect, scope });

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1:8888');
    if (url.pathname !== '/callback') return res.end();
    const code = url.searchParams.get('code');
    if (!code) {
        res.end('No code returned: ' + (url.searchParams.get('error') || 'unknown error'));
        return;
    }

    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            Authorization: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirect }),
    });
    const data = await tokenRes.json();

    if (data.refresh_token) {
        res.end('Done. You can close this tab and go back to the terminal.');
        console.log('\nRefresh token:\n\n' + data.refresh_token + '\n');
        console.log('Save it with:  npx wrangler secret put SPOTIFY_REFRESH_TOKEN');
    } else {
        res.end('Something went wrong; see the terminal.');
        console.error(data);
    }
    server.close();
});

server.listen(8888, '127.0.0.1', () => {
    console.log('Open this link and approve access:\n\n' + authUrl + '\n');
});
