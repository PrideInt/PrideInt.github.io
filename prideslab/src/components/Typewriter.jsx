import { useLayoutEffect, useRef } from 'react'

import Styles from './Typewriter.module.css'
import { hasBegun, onBegin } from '../lib/intro'

/*
 * <Typewriter> types a block in when it scrolls into view and erases it
 * as it leaves, so coming back to a section types it in fresh. If you
 * scroll back mid-erase, it simply turns around and types forward.
 *
 * "In view" means overlapping the middle band of the screen (between the
 * TOP_LINE and BOTTOM_LINE below), so erasing starts while a good part of
 * the section is still visible. Nothing types until the visitor has clicked
 * "begin" on the intro.
 *
 * Every text node inside is split into a typed part and a not-yet-typed
 * part. The untyped part stays in the layout with `visibility: hidden`,
 * so nothing jumps around. Once fully typed, the original text nodes are
 * put back exactly as React rendered them.
 */

const HEADING_MS_PER_CHAR = 45; // the first line types slowly, like a prompt
const BODY_MS_PER_CHAR = 7;     // the rest types fast
const BODY_MAX_MS = 1800;       // ...but never takes longer than this
const ERASE_MS = 900;           // erasing a whole block takes about this long
const TOP_LINE = '25%';         // a section scrolled up past this line erases...
const BOTTOM_LINE = '20%';      // ...and so does one pushed below this far from the bottom

const prefersReducedMotion = () =>
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function Typewriter({ as: Tag = 'section', className = '', children, ...rest }) {
    const ref = useRef(null);

    useLayoutEffect(() => {
        const root = ref.current;
        if (!root || prefersReducedMotion() || !('IntersectionObserver' in window)) {
            root?.setAttribute('data-typed', 'done');
            return;
        }

        const caret = document.createElement('span');
        caret.className = Styles.caret;
        caret.setAttribute('aria-hidden', 'true');

        let pieces = null;   // split text nodes, or null when the originals are in place
        let total = 0;       // characters in the block
        let headLen = 0;     // characters in the first line (typed slowly)
        let bodyRate = 0;    // characters per ms for the rest
        let count = 0;       // characters currently shown (fractional while animating)
        let target = 0;      // where `count` is heading: 0 or total
        let frame = 0;
        let last = 0;

        // Split every visible text node into [typed][hidden remainder]
        const split = () => {
            if (pieces) return;
            const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
                acceptNode: (n) => (n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
            });
            const originals = [];
            while (walker.nextNode()) originals.push(walker.currentNode);

            pieces = originals.map((node) => {
                const text = node.nodeValue;
                const typed = document.createTextNode(text);
                const remainder = document.createElement('span');
                remainder.className = Styles.remainder;
                node.parentNode.insertBefore(typed, node);
                node.parentNode.insertBefore(remainder, node);
                node.remove();
                return { node, text, typed, remainder };
            });

            total = pieces.reduce((n, p) => n + p.text.length, 0);
            headLen = pieces[0]?.text.length ?? 0;
            const bodyLen = total - headLen;
            bodyRate = bodyLen / Math.max(1, Math.min(BODY_MAX_MS, bodyLen * BODY_MS_PER_CHAR));
        };

        // Put the original text nodes back
        const unsplit = () => {
            if (!pieces) return;
            caret.remove();
            for (const p of pieces) {
                if (p.typed.parentNode) {
                    p.typed.parentNode.insertBefore(p.node, p.typed);
                    p.typed.remove();
                    p.remainder.remove();
                }
            }
            pieces = null;
        };

        const render = (shown) => {
            let left = shown;
            let caretPlaced = false;
            for (const p of pieces) {
                const n = Math.max(0, Math.min(p.text.length, left));
                left -= p.text.length;
                if (p.typed.nodeValue.length !== n) {
                    p.typed.nodeValue = p.text.slice(0, n);
                    p.remainder.textContent = p.text.slice(n);
                }
                if (!caretPlaced && n < p.text.length) {
                    p.remainder.before(caret);
                    caretPlaced = true;
                }
            }
            if (!caretPlaced) caret.remove();
        };

        const step = (now) => {
            const dt = last ? Math.min(64, now - last) : 16;
            last = now;

            if (target > count) {
                const rate = count < headLen ? 1 / HEADING_MS_PER_CHAR : bodyRate;
                count = Math.min(target, count + rate * dt);
            } else {
                count = Math.max(target, count - (total / ERASE_MS) * dt);
            }

            if (target === total && count >= total) {
                unsplit();
                root.setAttribute('data-typed', 'done');
                frame = 0;
                return;
            }
            if (target === 0 && count <= 0) {
                render(0);
                caret.remove();
                root.setAttribute('data-typed', 'hidden');
                frame = 0;
                return;
            }
            render(Math.floor(count));
            frame = requestAnimationFrame(step);
        };

        const typeIn = () => {
            split();
            target = total;
            root.setAttribute('data-typed', 'typing');
            if (!frame) { last = 0; frame = requestAnimationFrame(step); }
        };

        const erase = () => {
            if (count <= 0 && !frame) return; // already blank
            split();
            render(Math.floor(count));
            target = 0;
            if (!frame) { last = 0; frame = requestAnimationFrame(step); }
        };

        // Start blank
        split();
        render(0);
        root.setAttribute('data-typed', 'hidden');

        let visible = false;
        const apply = () => {
            if (!hasBegun()) return;
            if (visible) typeIn();
            else erase();
        };

        const observer = new IntersectionObserver((entries) => {
            visible = entries[entries.length - 1].isIntersecting;
            apply();
        }, { rootMargin: `-${TOP_LINE} 0px -${BOTTOM_LINE} 0px` });
        observer.observe(root);
        const stopWaiting = onBegin(apply);

        return () => {
            stopWaiting();
            observer.disconnect();
            cancelAnimationFrame(frame);
            unsplit();
        };
    }, []);

    return (
        <Tag ref={ref} className={`${Styles.block} ${className}`} {...rest}>
            {children}
        </Tag>
    )
}

export default Typewriter
