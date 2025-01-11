import './App.css'

import { useState } from 'react'
import { Route, Routes } from 'react-router-dom'

import Home from './pages/Home'
import GameOfLife from './pages/GameOfLife'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home/>} />
      <Route path="/home" element={<Home/>} />
      <Route path="/gameoflife" element={<GameOfLife/>} />
    </Routes>
  )
}

export default App
