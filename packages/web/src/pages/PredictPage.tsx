import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * PredictPage - Job Success Predictor
 *
 * Mobile-first interface for predicting job success probability
 * Uses ML-based prediction engine
 */
export default function PredictPage() {
  const [agentAddress, setAgentAddress] = useState("");
  const [jobValue, setJobValue] = useState("");
  const [jobComplexity, setJobComplexity] = useState(5);
  const [prediction, setPrediction] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handlePredict = async () => {
    if (!agentAddress || !jobValue) return;

    setLoading(true);
    setPrediction(null);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentAddress,
          jobValue: parseFloat(jobValue),
          jobComplexity,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setPrediction(data);
      }
    } catch (error) {
      console.error("Prediction failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRecommendationColor = (rec: string) => {
    if (rec === "PROCEED") return { bg: "#10b981", text: "#050505" };
    if (rec === "CAUTION") return { bg: "#f59e0b", text: "#050505" };
    return { bg: "#ef4444", text: "#fafafa" };
  };

  return (
    <div className="min-h-screen bg-void pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-void/80 border-b border-border">
        <div className="px-4 py-6">
          <h1 className="text-2xl font-display font-bold text-paper">JOB PREDICTOR</h1>
          <p className="text-sm text-muted mt-1 font-mono">AI-powered success prediction</p>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Input Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface rounded-3xl p-6 border border-border space-y-5"
        >
          {/* Agent Address */}
          <div>
            <label className="text-sm text-muted font-mono mb-2 block">
              AGENT ADDRESS
            </label>
            <input
              type="text"
              value={agentAddress}
              onChange={(e) => setAgentAddress(e.target.value)}
              placeholder="0x... or agent.base.eth"
              className="w-full bg-void border border-border rounded-2xl px-4 py-3 font-mono text-paper focus:outline-none focus:border-trustedFg"
            />
          </div>

          {/* Job Value */}
          <div>
            <label className="text-sm text-muted font-mono mb-2 block">
              JOB VALUE (USDC)
            </label>
            <div className="relative">
              <input
                type="number"
                value={jobValue}
                onChange={(e) => setJobValue(e.target.value)}
                placeholder="0.00"
                className="w-full bg-void border border-border rounded-2xl px-4 py-3 text-xl font-mono text-paper focus:outline-none focus:border-trustedFg"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted font-mono">
                USDC
              </span>
            </div>
          </div>

          {/* Job Complexity Slider */}
          <div>
            <label className="text-sm text-muted font-mono mb-2 block">
              JOB COMPLEXITY: {jobComplexity}/10
            </label>
            <div className="relative">
              <input
                type="range"
                min="1"
                max="10"
                value={jobComplexity}
                onChange={(e) => setJobComplexity(parseInt(e.target.value))}
                className="w-full h-2 bg-void rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #10b981 0%, #10b981 ${(jobComplexity - 1) * 11.11}%, #1f1f1f ${(jobComplexity - 1) * 11.11}%, #1f1f1f 100%)`,
                }}
              />
              <div className="flex justify-between mt-2">
                <span className="text-xs text-muted font-mono">Simple</span>
                <span className="text-xs text-muted font-mono">Complex</span>
              </div>
            </div>
          </div>

          {/* Predict Button */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handlePredict}
            disabled={loading || !agentAddress || !jobValue}
            className="w-full py-4 rounded-full font-mono font-bold text-void text-lg bg-gradient-to-r from-trusted to-trustedFg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "ANALYZING..." : "PREDICT SUCCESS"}
          </motion.button>
        </motion.div>

        {/* Prediction Result */}
        <AnimatePresence>
          {prediction && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-4"
            >
              {/* Success Probability */}
              <div className="relative overflow-hidden rounded-3xl p-[2px] bg-gradient-to-r from-trusted to-trustedFg">
                <div className="bg-surface rounded-3xl p-6">
                  <p className="text-sm text-muted mb-2 font-mono">SUCCESS PROBABILITY</p>
                  <div className="flex items-baseline gap-2 mb-4">
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", damping: 10 }}
                      className="text-6xl font-display font-bold bg-gradient-to-r from-trusted to-trustedFg bg-clip-text text-transparent"
                    >
                      {prediction.prediction.toFixed(1)}
                    </motion.span>
                    <span className="text-3xl font-mono text-muted">%</span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-3 bg-void rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${prediction.prediction}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-trusted to-trustedFg"
                    />
                  </div>

                  {/* Recommendation */}
                  <div className="mt-4">
                    <div
                      className="inline-block px-4 py-2 rounded-full font-mono font-bold"
                      style={{
                        backgroundColor: getRecommendationColor(prediction.recommendation).bg,
                        color: getRecommendationColor(prediction.recommendation).text,
                      }}
                    >
                      {prediction.recommendation}
                    </div>
                  </div>
                </div>
              </div>

              {/* Confidence */}
              <div className="bg-surface rounded-3xl p-6 border border-border">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-muted font-mono">CONFIDENCE</p>
                  <p className="text-2xl font-mono font-bold text-paper">
                    {prediction.confidence.toFixed(1)}%
                  </p>
                </div>
                <div className="h-2 bg-void rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${prediction.confidence}%` }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="h-full bg-gradient-to-r from-conditional to-conditionalFg"
                  />
                </div>
              </div>

              {/* Risk Factors */}
              {prediction.factors.riskFlags.length > 0 && (
                <div className="bg-surface rounded-3xl p-6 border border-border">
                  <h3 className="text-lg font-display font-bold text-paper mb-4">
                    RISK FACTORS
                  </h3>
                  <div className="space-y-2">
                    {prediction.factors.riskFlags.map((flag: string, i: number) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-center gap-3 p-3 bg-flagged/10 border border-flaggedFg/20 rounded-xl"
                      >
                        <span className="text-flaggedFg">⚠️</span>
                        <p className="font-mono text-sm text-paper">
                          {flag.replace(/_/g, " ")}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Factor Breakdown */}
              <div className="bg-surface rounded-3xl p-6 border border-border">
                <h3 className="text-lg font-display font-bold text-paper mb-4">
                  FACTOR BREAKDOWN
                </h3>
                <div className="space-y-4">
                  {[
                    { label: "Historical Success", value: prediction.factors.historicalSuccess },
                    { label: "Certification Level", value: prediction.factors.certificationLevel },
                    { label: "Stake Ratio", value: prediction.factors.stakeRatio },
                    { label: "Experience Level", value: prediction.factors.experienceLevel },
                    { label: "Recency", value: prediction.factors.recency },
                  ].map((factor, i) => (
                    <div key={i}>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-mono text-muted">{factor.label}</span>
                        <span className="text-sm font-mono font-bold text-paper">
                          {(factor.value / 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 bg-void rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${factor.value / 100}%` }}
                          transition={{ duration: 0.6, delay: i * 0.1 }}
                          className="h-full bg-gradient-to-r from-trusted to-trustedFg"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info */}
        {!prediction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-surface rounded-3xl p-6 border border-border"
          >
            <h3 className="text-lg font-display font-bold text-paper mb-4">
              HOW IT WORKS
            </h3>
            <div className="space-y-3 text-sm text-muted font-mono leading-relaxed">
              <p>Our AI analyzes multiple factors:</p>
              <p>• Agent's historical success rate</p>
              <p>• Certification level and stake amount</p>
              <p>• Job complexity vs agent experience</p>
              <p>• Recent activity and track record</p>
              <p>• Market pricing and risk flags</p>
            </div>
            <div className="mt-4 p-4 bg-void/50 rounded-2xl">
              <p className="text-xs text-muted font-mono">
                💡 Higher predictions mean safer bets. Use this before hiring agents or accepting jobs.
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
