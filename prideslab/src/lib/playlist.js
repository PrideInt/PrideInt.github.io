/*
 * Every audio file in src/assets/music/, found at build time.
 * Drop files in that folder; nothing else to update.
 *
 * "Artist - Title.mp3" -> { artist: 'Artist', title: 'Title' }
 * "Title.mp3"          -> { artist: '',       title: 'Title' }
 */

const files = import.meta.glob('../assets/music/*.{mp3,m4a,ogg,wav}', {
    eager: true,
    query: '?url',
    import: 'default',
});

export const tracks = Object.entries(files)
    .map(([path, url]) => {
        const file = decodeURIComponent(path.split('/').pop());
        const name = file.replace(/\.[^.]+$/, '').replace(/_/g, ' ');
        const [artist, ...rest] = name.split(' - ');
        return rest.length
            ? { file, url, artist: artist.trim(), title: rest.join(' - ').trim() }
            : { file, url, artist: '', title: name.trim() };
    })
    .sort((a, b) => a.file.localeCompare(b.file));
