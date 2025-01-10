import './App.css'

import { useState } from 'react'
import { Route, Routes } from 'react-router-dom'

import Home from './pages/Home'
import About from './pages/About'
import Contact from './pages/Contact'
import Papers from './pages/Papers'
import GameOfLife from './pages/GameOfLife'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home/>} />
      <Route path="/about" element={<About/>} />
      <Route path="/contact" element={<Contact/>} />
      <Route path="/papers" element={<Papers/>} />
      <Route path="/gameoflife" element={<GameOfLife/>} />
    </Routes>
  )
}

export default App
