import { useEffect, useRef, useState } from 'react'

import EdgePanel from './EdgePanel'
import { MutedIcon, PauseIcon, PlayIcon, PrevIcon, ShuffleIcon, SoundIcon } from './Icons'
import Styles from './SidePanels.module.css'
import { assetUrl, fetchLetterboxd, profileUrl } from '../lib/feeds'
import { hasMusic, next, previous, seek, toggle, toggleMute, useMusic } from '../lib/music'

// ---------- helpers ----------

const clock = (seconds) => {
    const s = Math.max(0, Math.floor(seconds || 0));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

const shortDate = (iso) =>
    iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';

const stars = (rating) => (rating == null ? '' : '★'.repeat(Math.floor(rating)) + (rating % 1 ? '½' : ''));

function Header({ children, href, linkLabel }) {
    return (
        <div className={Styles.header}>
            <span className={Styles.label}>{children}</span>
            {href && <a className={Styles.small} href={href} target="_blank" rel="noreferrer">{linkLabel} ↗</a>}
        </div>
    )
}

// ---------- music (right edge) ----------

// A glider that actually runs on a 6x6 wrap-around grid while music plays
const GLIDER = [[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]];
const SIZE = 6;

const stepLife = (cells) => {
    const alive = new Set(cells.map(([x, y]) => `${x},${y}`));
    const counts = new Map();
    for (const [x, y] of cells) {
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
            if (!dx && !dy) continue;
            const k = `${(x + dx + SIZE) % SIZE},${(y + dy + SIZE) % SIZE}`;
            counts.set(k, (counts.get(k) || 0) + 1);
        }
    }
    return [...counts].filter(([k, n]) => n === 3 || (n === 2 && alive.has(k))).map(([k]) => k.split(',').map(Number));
}

function LiveGlider({ running }) {
    const [cells, setCells] = useState(GLIDER);
    useEffect(() => {
        if (!running || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
        const id = setInterval(() => setCells(stepLife), 420);
        return () => clearInterval(id);
    }, [running]);
    const alive = new Set(cells.map(([x, y]) => `${x},${y}`));
    return (
        <div className={Styles.cellArt} aria-hidden="true">
            {Array.from({ length: SIZE * SIZE }, (_, i) => (
                <span key={i} className={alive.has(`${i % SIZE},${Math.floor(i / SIZE)}`) ? Styles.alive : ''} />
            ))}
        </div>
    )
}

function Equalizer({ on }) {
    return (
        <span className={`${Styles.eq} ${on ? '' : Styles.eqOff}`} aria-hidden="true">
            <span /><span /><span />
        </span>
    )
}

function MusicPlayer() {
    const { tracks, index, playing, muted, waiting, time, duration } = useMusic();
    const barRef = useRef(null);
    const track = tracks[Math.max(0, index)];

    const onSeek = (e) => {
        const rect = barRef.current.getBoundingClientRect();
        seek(((e.clientX - rect.left) / rect.width) * duration);
    };

    return (
        <div data-music-ignore>
            <Header>
                <Equalizer on={playing && !muted} />
                {playing ? 'Now playing' : waiting ? 'Ready to play' : 'Site theme'}
            </Header>

            <div className={Styles.track}>
                <LiveGlider running={playing} />
                <div className={Styles.trackText}>
                    <span className={Styles.title}>{track.title}</span>
                    {track.artist && <span className={Styles.artist}>{track.artist}</span>}
                    <span className={Styles.muted}>
                        {tracks.length > 1 ? `${index + 1} of ${tracks.length}` : 'site theme'}
                    </span>
                </div>
            </div>

            <div className={Styles.progressWrap}>
                <div
                    ref={barRef}
                    className={`${Styles.progress} ${Styles.seekable}`}
                    onClick={onSeek}
                    role="slider"
                    aria-label="Seek"
                    aria-valuemin={0}
                    aria-valuemax={Math.round(duration)}
                    aria-valuenow={Math.round(time)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === 'ArrowRight') seek(time + 5);
                        if (e.key === 'ArrowLeft') seek(time - 5);
                    }}>
                    <span style={{ width: duration ? `${(time / duration) * 100}%` : 0 }} />
                </div>
                <div className={Styles.times}>
                    <span>{clock(time)}</span>
                    <span>{clock(duration)}</span>
                </div>
            </div>

            <div className={Styles.controls}>
                <button type="button" className={Styles.control} onClick={previous} aria-label="Previous song">
                    <PrevIcon />
                </button>
                <button type="button" className={`${Styles.control} ${Styles.primary}`} onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
                    {playing ? <PauseIcon /> : <PlayIcon />}
                </button>
                <button type="button" className={Styles.control} onClick={next} disabled={tracks.length < 2} aria-label="Shuffle to another song">
                    <ShuffleIcon />
                </button>
                <span className={Styles.spacer} />
                <button type="button" className={Styles.control} onClick={toggleMute} aria-pressed={muted} aria-label={muted ? 'Unmute' : 'Mute'}>
                    {muted ? <MutedIcon /> : <SoundIcon />}
                </button>
            </div>

            {waiting && <p className={Styles.hint}>Music starts on your first click or tap.</p>}
        </div>
    )
}

// ---------- Letterboxd (left edge) ----------

function useLetterboxd() {
    const [data, setData] = useState(undefined);
    useEffect(() => {
        let alive = true;
        fetchLetterboxd()
            .then((d) => alive && setData(d))
            .catch(() => alive && setData(null));
        return () => { alive = false; };
    }, []);
    return data;
}

function Poster({ src, title, className }) {
    return src
        ? <img className={className} src={assetUrl(src)} alt="" loading="lazy" />
        : <span className={`${className} ${Styles.posterBlank}`} aria-hidden="true">{title?.[0] ?? ''}</span>;
}

function Letterboxd({ data }) {
    const profile = data?.profileUrl || profileUrl;
    const user = data?.user || profile?.match(/letterboxd\.com\/([^/]+)/)?.[1];

    if (data === undefined) return (<><Header>Letterboxd</Header><p className={Styles.muted}>Rolling film…</p></>);

    const favorites = data?.favorites ?? [];
    const films = data?.films ?? [];

    return (
        <>
            {data?.banner ? (
                <a className={Styles.banner} href={profile} target="_blank" rel="noreferrer">
                    <img src={assetUrl(data.banner)} alt="" />
                    <span className={Styles.bannerText}>
                        <span className={Styles.bannerUser}>{user}</span>
                        <span className={Styles.small}>letterboxd ↗</span>
                    </span>
                </a>
            ) : (
                <Header href={profile} linkLabel="letterboxd">{user || 'Letterboxd'}</Header>
            )}

            {favorites.length > 0 && (
                <>
                    <p className={`${Styles.label} ${Styles.subhead}`}>Favorites</p>
                    <ul className={Styles.favorites}>
                        {favorites.map((f, i) => (
                            <li key={`${f.title}-${i}`}>
                                <a href={f.url || profile} target="_blank" rel="noreferrer" title={f.title} aria-label={f.title}>
                                    <Poster src={f.poster} title={f.title} className={Styles.favPoster} />
                                </a>
                            </li>
                        ))}
                    </ul>
                </>
            )}

            <p className={`${Styles.label} ${Styles.subhead}`}>Recently watched</p>
            {!films.length ? (
                <p className={Styles.muted}>Nothing logged here yet. See everything on Letterboxd.</p>
            ) : (
                <ol className={Styles.films}>
                    {films.slice(0, 4).map((f) => (
                        <li key={`${f.title}-${f.watchedDate}`} className={Styles.film}>
                            <Poster src={f.poster} title={f.title} className={Styles.poster} />
                            <div className={Styles.filmText}>
                                <a className={Styles.title} href={f.url} target="_blank" rel="noreferrer">
                                    {f.title} <span className={Styles.muted}>{f.year}</span>
                                </a>
                                <span className={Styles.rating}>
                                    {stars(f.rating)}
                                    {f.liked && <span className={Styles.heart} aria-label="liked"> ♥</span>}
                                    {f.rewatch && <span className={Styles.muted} title="rewatch"> ↻</span>}
                                </span>
                                <span className={Styles.small}>{shortDate(f.watchedDate)}</span>
                            </div>
                        </li>
                    ))}
                </ol>
            )}
        </>
    )
}

// ---------- both ----------

function SidePanels() {
    const films = useLetterboxd();
    const { playing, muted } = useMusic();

    return (
        <>
            <EdgePanel side="left" label="Letterboxd: favorites and recently watched" wide>
                <Letterboxd data={films} />
            </EdgePanel>
            {hasMusic && (
                <EdgePanel side="right" label="Site music player" lively={playing && !muted}>
                    <MusicPlayer />
                </EdgePanel>
            )}
        </>
    )
}

export default SidePanels
