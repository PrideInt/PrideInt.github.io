import { useEffect, useRef, useState } from 'react'

import Styles from './Intro.module.css'
import { begin } from '../lib/intro'
import { hasMusic, play, toggleMute, useMusic } from '../lib/music'
import { music as config } from '../data/portfolio'

/*
 * Shown every time the site loads. Clicking (or tapping, or pressing Enter)
 * reveals the page, starts the typing, and starts the music. Browsers only
 * allow sound after a click like this one, so the music can start right away.
 */

const LEAVE_MS = 700;

function Intro() {
    const [phase, setPhase] = useState('shown'); // shown -> leaving -> gone
    const buttonRef = useRef(null);
    const { muted } = useMusic();

    useEffect(() => {
        // The page starts under a black cover (index.html); the intro fades in from black itself
        document.getElementById('boot-cover')?.remove();
        buttonRef.current?.focus({ preventScroll: true });
        const root = document.documentElement;
        const previous = root.style.overflow;
        root.style.overflow = 'hidden'; // no scrolling behind the intro
        return () => { root.style.overflow = previous; };
    }, []);

    const enter = (withSound) => {
        if (phase !== 'shown') return;
        if (hasMusic && config.autoplay) {
            if (!withSound && !muted) toggleMute(); // still plays, silently, so unmuting picks it up
            play(); // inside the click, so the browser allows it
        }
        begin();
        document.documentElement.style.overflow = '';
        setPhase('leaving');
        setTimeout(() => setPhase('gone'), LEAVE_MS);
    };

    if (phase === 'gone') return null;

    return (
        <div
            className={`${Styles.intro} ${phase === 'leaving' ? Styles.leaving : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label="Welcome to Pride's Lab"
            data-music-ignore
            onClick={() => enter(true)}>
            <div className={Styles.inner}>
                <p className={Styles.brand}>PRIDE'S LAB</p>

                <button
                    ref={buttonRef}
                    type="button"
                    className={Styles.begin}
                    onClick={(e) => { e.stopPropagation(); enter(true); }}>
                    <span className={Styles.pointer}>click to begin</span>
                    <span className={Styles.touch}>tap to begin</span>
                    <span className={Styles.caret} aria-hidden="true" />
                </button>

                {hasMusic && config.autoplay && (
                    <button
                        type="button"
                        className={Styles.quiet}
                        onClick={(e) => { e.stopPropagation(); enter(false); }}>
                        {muted ? 'sound is off' : 'enter without sound'}
                    </button>
                )}
            </div>
        </div>
    )
}

export default Intro
