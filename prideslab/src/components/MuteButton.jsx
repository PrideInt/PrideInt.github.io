import { MutedIcon, SoundIcon } from './Icons'
import Styles from './MuteButton.module.css'
import { hasMusic, toggleMute, useMusic } from '../lib/music'

/*
 * Always-visible mute toggle in the bottom-right corner, so a visitor
 * who wasn't expecting sound can turn it off right away.
 */
function MuteButton() {
    const { muted, playing } = useMusic();
    if (!hasMusic) return null;

    return (
        <button
            type="button"
            data-music-ignore
            className={`${Styles.mute} ${playing && !muted ? Styles.live : ''}`}
            onClick={toggleMute}
            aria-pressed={muted}
            aria-label={muted ? 'Unmute site music' : 'Mute site music'}>
            {muted ? <MutedIcon /> : <SoundIcon />}
            <span>{muted ? 'muted' : 'sound'}</span>
        </button>
    )
}

export default MuteButton
