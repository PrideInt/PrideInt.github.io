import { useEffect, useRef, useState } from 'react'

import Styles from './EdgePanel.module.css'

/*
 * A panel hidden off one edge of the screen.
 *
 * - Mouse: move the cursor to that edge to open it; it stays open while
 *   the cursor is over the panel and closes when you move away.
 * - Touch / keyboard: the glowing strip at the edge is a button.
 * - Escape closes it.
 *
 * The soft, slowly resonating light at the edge is what tells visitors
 * something is there.
 */

const EDGE_PX = 56;   // how close to the edge the cursor must be to open
const SLACK_PX = 48;  // extra room past the panel before it closes

function EdgePanel({ side, label, lively = false, wide = false, children }) {
    const [open, setOpen] = useState(false);
    const panelRef = useRef(null);

    useEffect(() => {
        const distanceFromEdge = (x) => (side === 'left' ? x : window.innerWidth - x);

        const onMove = (e) => {
            if (e.pointerType && e.pointerType !== 'mouse') return;
            const d = distanceFromEdge(e.clientX);
            const reach = (panelRef.current?.getBoundingClientRect().width ?? 320) + 20 + SLACK_PX;
            setOpen((wasOpen) => d <= EDGE_PX || (wasOpen && d <= reach));
        };
        const onLeaveWindow = () => setOpen(false);
        const onKey = (e) => e.key === 'Escape' && setOpen(false);

        window.addEventListener('pointermove', onMove, { passive: true });
        document.documentElement.addEventListener('mouseleave', onLeaveWindow);
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('pointermove', onMove);
            document.documentElement.removeEventListener('mouseleave', onLeaveWindow);
            window.removeEventListener('keydown', onKey);
        };
    }, [side]);

    // Tapping outside closes it on touch screens
    useEffect(() => {
        if (!open) return;
        const onDown = (e) => {
            if (e.pointerType === 'mouse') return;
            if (!panelRef.current?.contains(e.target) && !e.target.closest?.(`.${Styles.trigger}`)) setOpen(false);
        };
        window.addEventListener('pointerdown', onDown);
        return () => window.removeEventListener('pointerdown', onDown);
    }, [open]);

    const sideClass = side === 'left' ? Styles.left : Styles.right;

    return (
        <>
            <div
                className={`${Styles.glow} ${sideClass} ${open ? Styles.glowOpen : ''} ${lively ? Styles.lively : ''}`}
                aria-hidden="true">
                <span className={Styles.ring} />
                <span className={`${Styles.ring} ${Styles.ringLate}`} />
            </div>

            <button
                type="button"
                className={`${Styles.trigger} ${sideClass}`}
                aria-label={`${open ? 'Close' : 'Open'} ${label}`}
                aria-expanded={open}
                onClick={() => setOpen((o) => !o)}
            />

            <aside
                ref={panelRef}
                className={`${Styles.panel} ${sideClass} ${wide ? Styles.wide : ''} ${open ? Styles.open : ''}`}
                aria-label={label}
                aria-hidden={!open}>
                {children}
            </aside>
        </>
    )
}

export default EdgePanel
