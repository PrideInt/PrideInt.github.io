import GameOfLifeCSS from './GameOfLife.module.css'

import { use, useEffect } from 'react';
import { useState } from 'react'

const createNewGrid = (grid) => {
  const g = new Array(grid.length);

  for (let i = 0; i < g.length; i++) {
    g[i] = new Array(grid[i].length);
  }

  for (let i = 0; i < g.length; i++) {
    for (let j = 0; j < g[i].length; j++) {
      g[i][j] = 0;
    }
  }
  return g;
}

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

function GameOfLife() {
  let width = document.documentElement.clientWidth;
  let height = document.documentElement.clientHeight;

  const cellSize = 15;

  const [grid, setGrid] = useState([]);
  const [begin, setBegin] = useState(false);

  // Create canvas with grid lines
  useEffect(() => {
    const canvas = document.getElementById('life');

    const initCanvas = () => {
      const canvas = document.getElementById('life');
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
        setGrid(newGenGrid);
      }
    }

    setTimeout(() => {
      requestAnimationFrame(updateCells);
    }, 100);
  }, [grid]);

  return (
    <div>
      <canvas className={GameOfLifeCSS.life} id="life"></canvas>
    </div>
  )
}

export default GameOfLife
