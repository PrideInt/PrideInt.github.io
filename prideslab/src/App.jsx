import './App.css'

import { useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'

import Home from './pages/Home'
import GameOfLife from './pages/GameOfLife'
import Intro from './components/Intro'
import MuteButton from './components/MuteButton'
import { start as startMusic } from './lib/music'

function App() {
  // Site music lives outside the pages so it keeps playing between them.
  // This only loads the song; it starts when the visitor clicks "begin".
  useEffect(() => { startMusic(); }, []);

  return (
    <>
      <Routes>
        <Route path="/" element={<Home/>} />
        <Route path="/home" element={<Home/>} />
        <Route path="/gameoflife" element={<GameOfLife/>} />
      </Routes>
      <MuteButton />
      <Intro />
    </>
  )
}

export default App
