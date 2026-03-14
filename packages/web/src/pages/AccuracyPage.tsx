import { useAccuracy } from '../hooks/useAccuracy'

export default function AccuracyPage() {
  const { data: accuracy, isLoading } = useAccuracy()

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="font-mono text-muted">Loading...</div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      <h1 className="font-display text-[6rem] leading-none text-paper mb-8">
        ACCURACY AUDIT
      </h1>

      <p className="font-mono text-sm text-muted mb-16 max-w-3xl">
        TRUSTGATE's accuracy score is its only moat. Every evaluation and certification
        outcome is tracked onchain, creating a verifiable track record that compounds over time.
      </p>

      {/* Evaluation Accuracy */}
      <div className="border border-border p-8 mb-8">
        <h2 className="font-display text-4xl text-paper mb-4">
          Evaluation Accuracy
        </h2>
        <div className="font-display text-[4rem] leading-none text-trustedFg">
          {accuracy?.evaluationAccuracy.toFixed(2)}%
        </div>
        <div className="font-mono text-sm text-muted mt-4">
          Based on {accuracy?.totalEvaluations} total evaluations
        </div>
      </div>

      {/* Certification Accuracy */}
      <div className="border border-border p-8 mb-8">
        <h2 className="font-display text-4xl text-paper mb-4">
          Certification Accuracy
        </h2>
        <div className="font-display text-[4rem] leading-none text-trustedFg">
          {accuracy?.certificationAccuracy.toFixed(2)}%
        </div>
        <div className="font-mono text-sm text-muted mt-4">
          Based on {accuracy?.totalCertifications} total certifications with tracked outcomes
        </div>
      </div>

      {/* Methodology */}
      <div className="mt-16">
        <h2 className="font-display text-3xl text-paper mb-4">
          Methodology
        </h2>
        <div className="font-mono text-sm text-muted space-y-4">
          <p>
            <strong className="text-paper">Evaluation Accuracy:</strong> Percentage of evaluations
            that were later verified as correct based on job outcomes and dispute resolutions.
          </p>
          <p>
            <strong className="text-paper">Certification Accuracy:</strong> Percentage of certifications
            where the predicted outcome matched the agent's actual performance in subsequent jobs.
          </p>
          <p>
            All accuracy data is stored onchain and can be independently verified via the
            TrustGateRegistry contract on Base mainnet.
          </p>
        </div>
      </div>
    </div>
  )
}
