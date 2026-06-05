import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Leaderboard from './pages/Leaderboard'
import Admin from './pages/Admin'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Leaderboard />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  )
}
