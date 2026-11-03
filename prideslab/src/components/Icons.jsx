// Small line icons for the music controls (16px, currentColor)

const base = {
    width: 16,
    height: 16,
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.4,
    strokeLinecap: 'square',
    strokeLinejoin: 'miter',
    'aria-hidden': true,
};

export const PlayIcon = () => (
    <svg {...base}><path d="M4.5 3v10l8-5z" fill="currentColor" stroke="none" /></svg>
);

export const PauseIcon = () => (
    <svg {...base}><path d="M5 3.5v9M11 3.5v9" strokeWidth="2" /></svg>
);

export const PrevIcon = () => (
    <svg {...base}><path d="M4 3.5v9" /><path d="M12.5 3.5v9L6 8z" fill="currentColor" stroke="none" /></svg>
);

export const ShuffleIcon = () => (
    <svg {...base}>
        <path d="M2 4.5h2.5l6 7H14M2 11.5h2.5l1.7-2M9.3 6.5l1.2-2H14" />
        <path d="M12 2.5l2 2-2 2M12 9.5l2 2-2 2" />
    </svg>
);

export const SoundIcon = () => (
    <svg {...base}>
        <path d="M2.5 6v4h2.5l3.5 3V3L5 6z" fill="currentColor" stroke="none" />
        <path d="M10.8 5.6a3.4 3.4 0 0 1 0 4.8M12.6 3.8a6 6 0 0 1 0 8.4" />
    </svg>
);

export const MutedIcon = () => (
    <svg {...base}>
        <path d="M2.5 6v4h2.5l3.5 3V3L5 6z" fill="currentColor" stroke="none" />
        <path d="M10.5 6l3.5 4M14 6l-3.5 4" />
    </svg>
);
