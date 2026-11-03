import { useEffect, useRef, useState } from 'react'

import Styles from './LifeBackground.module.css'

/*
 * Conway's Game of Life, running behind every page section.
 * The simulation itself is unchanged from the original Home page;
 * it now lives here so the portfolio markup stays readable.
 */

const patterns = {
    first: [
        [0, 0],
        [1, 0],
        [2, 0],
        [1, -1],
        [2, 1]
    ],
    second: [
        [0, 0],
        [-1, 0],
        [-2, 0],
        [-1, 1],
        [-2, -1]
    ],
    third: [
        [0, 0],
        [1, 0],
        [2, 0],
        [1, 1],
        [2, -1]
        ],
    fourth: [
        [0, 0],
        [-1, 0],
        [-2, 0],
        [-1, -1],
        [-2, 1]
    ],
    fifth: [
        [0, 0],
        [0, -1],
        [0, -2],
        [1, -2],
        [-1, -1]
    ],
    sixth: [
        [0, 0],
        [0, 1],
        [0, 2],
        [1, 2],
        [-1, 1]
    ],
    seventh: [
        [0, 0],
        [0, -1],
        [0, -2],
        [-1, -2],
        [1, -1]
    ],
    eighth: [
        [0, 0],
        [0, 1],
        [0, 2],
        [-1, 2],
        [1, 1]
    ],
}

function useGameOfLife() {
    let width = document.documentElement.clientWidth;
    let height = document.documentElement.clientHeight;

    const cellSize = 30;

    const [grid, setGrid] = useState([]);
    const [begin, setBegin] = useState(false);

    // Lets the cursor/tap interaction read and nudge the live grid
    const gridRef = useRef(grid);
    gridRef.current = grid;

    // Create canvas with grid lines
    useEffect(() => {
        const canvas = document.getElementById('life');

        const initCanvas = () => {
            const ctx = canvas.getContext('2d');
            
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        
            for (let i = 0; i < canvas.width; i += cellSize) {
                ctx.beginPath();
                ctx.moveTo(i, 0);
                ctx.lineTo(i, canvas.height);
                ctx.stroke();
            }
            for (let i = 0; i < canvas.height; i += cellSize) {
                ctx.beginPath();
                ctx.moveTo(0, i);
                ctx.lineTo(canvas.width, i);
                ctx.stroke();
            }
            requestAnimationFrame(initCanvas);
        }
        requestAnimationFrame(initCanvas);

        const resize = () => {
            width = document.documentElement.clientWidth;
            height = document.documentElement.clientHeight;
            canvas.width = width;
            canvas.height = height;
        }
        resize();
        window.addEventListener('resize', resize);

        const g = new Array(Math.floor(height / cellSize) * 2);
        for (let i = 0; i < g.length; i++) {
            g[i] = new Array(Math.floor(width / cellSize));
        }

        for (let i = 0; i < g.length; i++) {
            for (let j = 0; j < g[i].length; j++) {
                g[i][j] = 0;
            }
        }

        setGrid(g);

        return () => {
            window.removeEventListener('resize', resize);
        }
    }, []);

    /**
     * Here, we will initialize the grid with a pattern
     * called a "seed". This seed will be used to start
     * the game of life.
     */
    useEffect(() => {
        const initPattern = () => {
            const canvas = document.getElementById('life');
            const ctx = canvas.getContext('2d');

            const fillStyle = 'rgba(255, 255, 255, 0.62)';
            ctx.fillStyle = fillStyle;
            ctx.globalAlpha = 0.62;

            if (grid !== undefined && grid.length > 0) {
                
                // Make n patterns of population 5
                for (let n = 0; n < 4; n++) {
                    const row = Math.floor(Math.random() * grid.length);
                    const col = Math.floor(Math.random() * grid[row].length);

                    const pattern = patterns[Object.keys(patterns)[Math.floor(Math.random() * Object.keys(patterns).length)]];

                    for (let i = 0; i < pattern.length; i++) {
                        const r = row + pattern[i][0];
                        const c = col + pattern[i][1];

                        if (r >= 0 && r < grid.length && c >= 0 && c < grid[r].length) {
                            grid[r][c] = 1;
                        }
                    }
                }
        
                for (let row = 0; row < grid.length; row++) {
                    for (let col = 0; col < grid[row].length; col++) {
                        if (grid[row][col] === 1) {
                            ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
                        }
                    }
                }
            }
        }
        initPattern();  
        setBegin(true);
    }, [begin]);

    /**
     * Conway's Game of Life
     * 
     * Rules:
     * 
     * 1. Any live cell with fewer than 2 live neighbors dies
     * 2. Any live cell with 2 or 3 live neighbors lives on to the next generation
     * 3. Any live cell with more than 3 live neighbors dies
     * 4. Any dead cell with exactly 3 live neighbors becomes a live cell
     * 
     * Here, we will implement these rules to update the grid every 100 milliseconds,
     * applying the rules to each cell in the grid, thus creating the next generation,
     * and so on.
     */
    useEffect(() => {
        const canvas = document.getElementById('life');
        const ctx = canvas.getContext('2d');

        const fillStyle = 'rgba(255, 255, 255, 0.62)';
        ctx.fillStyle = fillStyle;

        /**
         * Helper function to get number of neighbors of a cell
         * 
         * @param {*} row 
         * @param {*} col 
         * @returns numNeighbors : number of neighbors in the cell at row, col
         */
        const getNumNeighbors = (row, col) => {
            let numNeighbors = 0;

            if (row - 1 >= 0 && col - 1 >= 0 && grid[row - 1][col - 1] === 1) {
                numNeighbors++;
            }
            if (row - 1 >= 0 && grid[row - 1][col] === 1) {
                numNeighbors++;
            }
            if (row - 1 >= 0 && col + 1 < grid.length && grid[row - 1][col + 1] === 1) {
                numNeighbors++;
            }
            if (col - 1 >= 0 && grid[row][col - 1] === 1) {
                numNeighbors++;
            }
            if (col + 1 < grid.length && grid[row][col + 1] === 1) {
                numNeighbors++;
            }
            if (row + 1 < grid.length && col - 1 >= 0 && grid[row + 1][col - 1] === 1) {
                numNeighbors++;
            }
            if (row + 1 < grid.length && grid[row + 1][col] === 1) {
                numNeighbors++;
            }
            if (row + 1 < grid.length && col + 1 < grid.length && grid[row + 1][col + 1] === 1) {
                numNeighbors++;
            }
            return numNeighbors;
        }

        /**
         * Helper function to get neighbors of a cell
         * 
         * @param {*} row 
         * @param {*} col 
         * @returns neighbors : array of neighbors of the cell at row, col
         */
        const getNeighbors = (row, col) => {
            let neighbors = [];

            if (row - 1 >= 0 && col - 1 >= 0 && grid[row - 1][col - 1] === 1) {
                neighbors.push([row - 1, col - 1]);
            }
            if (row - 1 >= 0 && grid[row - 1][col] === 1) {
                neighbors.push([row - 1, col]);
            }
            if (row - 1 >= 0 && col + 1 < grid.length && grid[row - 1][col + 1] === 1) {
                neighbors.push([row - 1, col + 1]);
            }
            if (col - 1 >= 0 && grid[row][col - 1] === 1) {
                neighbors.push([row, col - 1]);
            }
            if (col + 1 < grid.length && grid[row][col + 1] === 1) {
                neighbors.push([row, col + 1]);
            }
            if (row + 1 < grid.length && col - 1 >= 0 && grid[row + 1][col - 1] === 1) {
                neighbors.push([row + 1, col - 1]);
            }
            if (row + 1 < grid.length && grid[row + 1][col] === 1) {
                neighbors.push([row + 1, col]);
            }
            if (row + 1 < grid.length && col + 1 < grid.length && grid[row + 1][col + 1] === 1) {
                neighbors.push([row + 1, col + 1]);
            }
            return neighbors;
        }

        // Rule 1: Any live cell with fewer than 2 live neighbors dies
        const ruleOne = (row, col) => {
            if (grid[row][col] === 1 && getNumNeighbors(row, col) < 2) {
                return true;
            }
            return false;
        }

        // Rule 2: Any live cell with 2 or 3 live neighbors lives on to the next generation
        const ruleTwo = (row, col) => {
            if (grid[row][col] === 1 && (getNumNeighbors(row, col) === 2 || getNumNeighbors(row, col) === 3)) {
                return true;
            }
            return false;
        }

        // Rule 3: Any live cell with more than 3 live neighbors dies
        const ruleThree = (row, col) => {
            if (grid[row][col] === 1 && getNumNeighbors(row, col) > 3) {
                return true;
            }
            return false;
        }

        // Rule 4: Any dead cell with exactly 3 live neighbors becomes a live cell
        const ruleFour = (row, col) => {
            if (grid[row][col] === 0 && getNumNeighbors(row, col) === 3) {
                return true;
            }
            return false;
        }

        const updateCells = () => {
            if (grid !== undefined && grid.length > 0) {
                const newGenGrid = [];

                for (let row = 0; row < grid.length; row++) {
                    newGenGrid[row] = [];

                    for (let col = 0; col < grid[row].length; col++) {
                        if (ruleOne(row, col) || ruleThree(row, col)) {
                            newGenGrid[row][col] = 0;
                            ctx.clearRect(col * cellSize, row * cellSize, cellSize, cellSize);
                        } else if (ruleFour(row, col)) {
                            newGenGrid[row][col] = 1;
                            ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
                        } else {
                            newGenGrid[row][col] = grid[row][col];
                        }
                    }
                }
                gridRef.current = newGenGrid;
                setGrid(newGenGrid);
            }
        }
        setTimeout(() => {
            requestAnimationFrame(updateCells);
        }, 100);
    }, [grid]);

    return { gridRef, cellSize };
}

/*
 * Interaction: a forcefield pulse.
 *
 * Move the cursor onto a live cell (or tap / click anywhere) and a ring of
 * light expands from that point. Cells don't just get nudged: the ring's
 * edge sweeps them outward with it, so when the pulse finishes every cell
 * it caught is sitting at its edge and the middle has been cleared.
 */

const PULSE_COOLDOWN_MS = 1000;  // one pulse per second at most
const PULSE_RADIUS = 4;          // reach of a hover pulse, in cells
const TAP_PULSE_RADIUS = 5;      // taps and clicks reach a little further
const PULSE_MS = 650;            // time for the ring to reach its edge
const HOLD_MS = 350;             // the field holds at full size this long before fading
const HOVER_TRIGGER = 0.8;       // the cursor must be this close to a live cell, in cells
const QUIET_CELLS = 10;          // if fewer live cells than this are on screen...
const RESEED_MS = 4000;          // ...drop in a new glider this often
const CELL_FILL = 'rgba(255, 255, 255, 0.62)'; // same as the simulation

// Same curve as the ring's CSS animation (ease-out cubic), so cells ride its edge
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const RING_START = 0.05; // the ring starts at 5% of its size

function useLifeInteraction(gridRef, cellSize, lightsRef) {
    useEffect(() => {
        let lastPulse = -Infinity;
        let frame = 0;
        const timers = new Set();
        const context = () => document.getElementById('life')?.getContext('2d');

        const showPulse = (x, y, radiusPx) => {
            const layer = lightsRef.current;
            if (!layer) return;
            const el = document.createElement('span');
            el.className = Styles.pulse;
            el.style.left = `${x}px`;
            el.style.top = `${y}px`;
            el.style.setProperty('--size', `${radiusPx * 2}px`);
            el.style.setProperty('--duration', `${PULSE_MS}ms`);
            layer.appendChild(el);
            const id = setTimeout(() => { timers.delete(id); el.remove(); }, PULSE_MS + 900);
            timers.add(id);
        };

        // Move a cell to the first free square at `reach` cells (or a little beyond)
        // from the centre, along its own direction.
        const moveTo = (grid, ctx, cell, cx, cy, reach) => {
            for (let extra = 0; extra <= 2; extra++) {
                const d = reach + extra;
                const tr = Math.floor(cy + cell.uy * d);
                const tc = Math.floor(cx + cell.ux * d);
                if (tr === cell.r && tc === cell.c) return true;
                if (tr < 0 || tc < 0 || tr >= grid.length || tc >= grid[tr].length) return false;
                if (grid[tr][tc] === 1) continue;
                grid[cell.r][cell.c] = 0;
                grid[tr][tc] = 1;
                ctx.clearRect(cell.c * cellSize, cell.r * cellSize, cellSize, cellSize);
                ctx.fillRect(tc * cellSize, tr * cellSize, cellSize, cellSize);
                cell.r = tr;
                cell.c = tc;
                return true;
            }
            return true; // boxed in: stay put this frame and try again next frame
        };

        const pulse = (x, y, radius) => {
            const grid = gridRef.current;
            const ctx = context();
            const now = performance.now();
            if (!grid?.length || !ctx || now - lastPulse < PULSE_COOLDOWN_MS) return;
            lastPulse = now;

            showPulse(x, y, radius * cellSize);

            // Each frame the ring's edge moves out, and every live cell inside it (including
            // any born since the pulse began) is swept out to the edge. The field then holds
            // at full size for a moment so the middle stays clear.
            const cx = x / cellSize, cy = y / cellSize;
            cancelAnimationFrame(frame);
            const start = performance.now();
            const tick = (t) => {
                const live = gridRef.current;
                const elapsed = t - start;
                const p = Math.max(0, Math.min(1, elapsed / PULSE_MS));
                const edge = radius * (RING_START + (1 - RING_START) * easeOut(p));
                ctx.fillStyle = CELL_FILL;

                const inside = [];
                const reach = Math.ceil(edge) + 1;
                for (let r = Math.floor(cy) - reach; r <= Math.floor(cy) + reach; r++) {
                    for (let c = Math.floor(cx) - reach; c <= Math.floor(cx) + reach; c++) {
                        if (live[r]?.[c] !== 1) continue;
                        let ux = c + 0.5 - cx, uy = r + 0.5 - cy;
                        const dist = Math.hypot(ux, uy);
                        if (dist >= edge) continue;
                        if (dist < 0.05) { const a = Math.random() * Math.PI * 2; ux = Math.cos(a); uy = Math.sin(a); }
                        else { ux /= dist; uy /= dist; }
                        inside.push({ r, c, ux, uy, dist });
                    }
                }
                // Outer cells first, so the ones behind them have somewhere to land
                inside.sort((a, b) => b.dist - a.dist);
                for (const cell of inside) moveTo(live, ctx, cell, cx, cy, edge + 0.5);

                if (elapsed < PULSE_MS + HOLD_MS) frame = requestAnimationFrame(tick);
            };
            frame = requestAnimationFrame(tick);
        };

        const touchingLiveCell = (x, y) => {
            const grid = gridRef.current;
            if (!grid?.length) return false;
            const row0 = Math.floor(y / cellSize), col0 = Math.floor(x / cellSize);
            for (let r = row0 - 1; r <= row0 + 1; r++) {
                for (let c = col0 - 1; c <= col0 + 1; c++) {
                    if (grid[r]?.[c] !== 1) continue;
                    if (Math.hypot((c + 0.5) * cellSize - x, (r + 0.5) * cellSize - y) / cellSize <= HOVER_TRIGGER) return true;
                }
            }
            return false;
        };

        const onMove = (e) => {
            if (e.pointerType === 'touch') return;
            if (touchingLiveCell(e.clientX, e.clientY)) pulse(e.clientX, e.clientY, PULSE_RADIUS);
        };
        const onDown = (e) => pulse(e.clientX, e.clientY, TAP_PULSE_RADIUS);

        // Keep the board alive: gliders drift off-screen over time
        const reseed = setInterval(() => {
            const grid = gridRef.current;
            const ctx = context();
            if (!grid?.length || !ctx || document.hidden) return;
            const rows = Math.min(grid.length, Math.ceil(window.innerHeight / cellSize));
            const cols = Math.min(grid[0].length, Math.ceil(window.innerWidth / cellSize));
            let live = 0;
            for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) live += grid[r][c] === 1;
            if (live >= QUIET_CELLS) return;

            const keys = Object.keys(patterns);
            const pattern = patterns[keys[Math.floor(Math.random() * keys.length)]];
            const row = 3 + Math.floor(Math.random() * Math.max(1, rows - 6));
            const col = 3 + Math.floor(Math.random() * Math.max(1, cols - 6));
            ctx.fillStyle = CELL_FILL;
            for (const [dr, dc] of pattern) {
                const r = row + dr, c = col + dc;
                if (grid[r]?.[c] === 0) {
                    grid[r][c] = 1;
                    ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
                }
            }
        }, RESEED_MS);

        window.addEventListener('pointermove', onMove, { passive: true });
        window.addEventListener('pointerdown', onDown, { passive: true });
        return () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerdown', onDown);
            clearInterval(reseed);
            cancelAnimationFrame(frame);
            timers.forEach(clearTimeout);
        };
    }, [gridRef, cellSize, lightsRef]);
}

/**
 * Fixed, full-screen background: dim layer -> live cells -> dark overlay -> pulses.
 * The overlay (rgba(0, 0, 0, 0.8)) is what keeps the cells from being
 * fully visible behind the content.
 */
function LifeBackground() {
    const { gridRef, cellSize } = useGameOfLife();
    const lightsRef = useRef(null);
    useLifeInteraction(gridRef, cellSize, lightsRef);

    return (
        <div className={Styles.background} aria-hidden="true">
            <canvas className={Styles.life} id="life"></canvas>
            <div className={Styles.overlay}></div>
            <div className={Styles.lights} ref={lightsRef}></div>
        </div>
    )
}

export default LifeBackground
