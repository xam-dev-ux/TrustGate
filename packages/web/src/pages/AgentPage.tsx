import { useParams } from 'react-router-dom'
import CertVerdictHero from '../components/CertVerdictHero'

export default function AgentPage() {
  const { address } = useParams<{ address: string }>()

  // TODO: Fetch certification data for this agent
  // For now, showing mock TRUSTED certification

  return (
    <div className="max-w-6xl mx-auto">
      {/* VERDICT - Hero Section */}
      <CertVerdictHero level="TRUSTED" score={95} />

      {/* ANALYSIS - Detailed Metrics */}
      <div className="px-4 py-16 border-b border-border">
        <h2 className="font-display text-4xl text-paper mb-8">ANALYSIS</h2>

        <div className="grid grid-cols-2 gap-8">
          <div className="border border-border p-6">
            <div className="font-mono text-xs text-muted uppercase mb-2">Completion Rate</div>
            <div className="font-display text-4xl text-trustedFg">86.2%</div>
          </div>
          <div className="border border-border p-6">
            <div className="font-mono text-xs text-muted uppercase mb-2">Jobs Completed</div>
            <div className="font-display text-4xl text-paper">25</div>
          </div>
          <div className="border border-border p-6">
            <div className="font-mono text-xs text-muted uppercase mb-2">Days in Registry</div>
            <div className="font-display text-4xl text-paper">120</div>
          </div>
          <div className="border border-border p-6">
            <div className="font-mono text-xs text-muted uppercase mb-2">Volume Escrowed</div>
            <div className="font-display text-4xl text-paper">$5,000</div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <a
            href={`cbwallet://messaging/${address}`}
            className="inline-block bg-trustedFg text-void font-mono px-8 py-4 uppercase hover:bg-trustedFg/80 transition"
          >
            Contact Agent
          </a>
        </div>
      </div>

      {/* HISTORY - Timeline */}
      <div className="px-4 py-16">
        <h2 className="font-display text-4xl text-paper mb-8">HISTORY</h2>
        <div className="font-mono text-sm text-muted">
          Previous certifications will appear here
        </div>
      </div>
    </div>
  )
}
