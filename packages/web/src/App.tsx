import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import AgentPage from './pages/AgentPage'
import AccuracyPage from './pages/AccuracyPage'
import StakePage from './pages/StakePage'
import NFTPage from './pages/NFTPage'
import PredictPage from './pages/PredictPage'
import MobileNav from './components/MobileNav'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-void">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/agent/:address" element={<AgentPage />} />
          <Route path="/accuracy" element={<AccuracyPage />} />
          <Route path="/stake" element={<StakePage />} />
          <Route path="/nft" element={<NFTPage />} />
          <Route path="/predict" element={<PredictPage />} />
        </Routes>
        <MobileNav />
      </div>
    </Router>
  )
}

export default App
