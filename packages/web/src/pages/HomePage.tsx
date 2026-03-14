import { useAccuracy } from '../hooks/useAccuracy'

export default function HomePage() {
  const { data: accuracy, isLoading } = useAccuracy()

  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      {/* Header */}
      <header className="text-center mb-16">
        <h1 className="font-display text-[8rem] leading-none text-paper">
          TRUSTGATE
        </h1>
        <p className="font-mono text-sm text-muted mt-4 uppercase tracking-wider">
          The Onchain Certification Layer for AI Agents on Base
        </p>
        <p className="font-mono text-xs text-muted mt-2">
          ERC-8004 · ERC-8183
        </p>
      </header>

      {/* Accuracy Score - Hero Number */}
      <div className="text-center mb-16">
        {isLoading ? (
          <div className="font-display text-[6rem] text-muted">Loading...</div>
        ) : (
          <>
            <div className="font-display text-[6rem] leading-none text-trustedFg">
              {accuracy?.evaluationAccuracy.toFixed(1)}% ACCURACY
            </div>
            <p className="font-mono text-sm text-muted mt-4">
              Based on {accuracy?.totalEvaluations} evaluations
            </p>
          </>
        )}
      </div>

      {/* Stats */}
      {accuracy && (
        <div className="grid grid-cols-3 gap-8 mb-16">
          <div className="text-center border border-border p-6">
            <div className="font-display text-5xl text-paper">
              {accuracy.totalCertifications}
            </div>
            <div className="font-mono text-xs text-muted mt-2 uppercase">
              Total Certifications
            </div>
          </div>
          <div className="text-center border border-border p-6">
            <div className="font-display text-5xl text-paper">
              {accuracy.totalEvaluations}
            </div>
            <div className="font-mono text-xs text-muted mt-2 uppercase">
              Total Evaluations
            </div>
          </div>
          <div className="text-center border border-border p-6">
            <div className="font-display text-5xl text-trustedFg">
              {accuracy.certificationAccuracy.toFixed(1)}%
            </div>
            <div className="font-mono text-xs text-muted mt-2 uppercase">
              Certification Accuracy
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="text-center">
        <input
          type="text"
          placeholder="enter agent address or basename"
          className="bg-surface border border-border text-paper font-mono px-6 py-4 w-full max-w-2xl text-center focus:outline-none focus:border-trustedFg"
        />
        <p className="font-mono text-xs text-muted mt-4">
          Check certification status or request new certification
        </p>
      </div>
    </div>
  )
}
