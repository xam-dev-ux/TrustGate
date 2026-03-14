import { useState, useEffect } from "react";
import { motion } from "framer-motion";

/**
 * StakePage - Mobile-first staking interface
 *
 * Features:
 * - Large tap targets (min 48px)
 * - Swipe gestures for navigation
 * - Bottom sheet modals
 * - Glassmorphism cards
 * - Neon gradient accents
 * - Haptic feedback (via vibration API)
 */
export default function StakePage() {
  const [stake, setStake] = useState(0);
  const [stakeInput, setStakeInput] = useState("");
  const [maxJobValue, setMaxJobValue] = useState(0);
  const [successRate, setSuccessRate] = useState(0);
  const [isStaking, setIsStaking] = useState(false);
  const [showStakeModal, setShowStakeModal] = useState(false);

  // Haptic feedback
  const haptic = (type: "light" | "medium" | "heavy" = "light") => {
    if (navigator.vibrate) {
      const duration = type === "light" ? 10 : type === "medium" ? 20 : 30;
      navigator.vibrate(duration);
    }
  };

  // Fetch agent stake on mount
  useEffect(() => {
    fetchStakeInfo();
  }, []);

  const fetchStakeInfo = async () => {
    // TODO: Get connected wallet address
    const address = "0x...";

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/staking/${address}`);
      if (res.ok) {
        const data = await res.json();
        setStake(parseFloat(data.stakeFormatted));
        setMaxJobValue(parseFloat(data.maxJobValueFormatted));
        setSuccessRate(data.successRate);
      }
    } catch (error) {
      console.error("Failed to fetch stake:", error);
    }
  };

  const handleStake = async () => {
    if (!stakeInput || parseFloat(stakeInput) <= 0) return;

    haptic("medium");
    setIsStaking(true);

    try {
      // TODO: Call staking pool contract
      await new Promise(resolve => setTimeout(resolve, 2000)); // Mock

      setStake(stake + parseFloat(stakeInput));
      setStakeInput("");
      setShowStakeModal(false);
      haptic("heavy");
    } catch (error) {
      console.error("Stake failed:", error);
    } finally {
      setIsStaking(false);
    }
  };

  const getTierInfo = () => {
    if (stake >= 10000) return { tier: "VERIFIED", color: "#8b5cf6", glow: "#ec4899" };
    if (stake >= 2000) return { tier: "TRUSTED", color: "#10b981", glow: "#06b6d4" };
    if (stake >= 500) return { tier: "CONDITIONAL", color: "#f59e0b", glow: "#ef4444" };
    return { tier: "UNVERIFIED", color: "#6b7280", glow: "#9ca3af" };
  };

  const tierInfo = getTierInfo();

  return (
    <div className="min-h-screen bg-void pb-20">
      {/* Header with glassmorphism */}
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-void/80 border-b border-border">
        <div className="px-4 py-6">
          <h1 className="text-2xl font-display font-bold text-paper">STAKE</h1>
          <p className="text-sm text-muted mt-1">Lock collateral, unlock jobs</p>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Hero Card - Current Stake */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl p-[2px]"
          style={{
            background: `linear-gradient(135deg, ${tierInfo.color}, ${tierInfo.glow})`,
          }}
        >
          <div className="bg-surface rounded-3xl p-6 backdrop-blur-sm">
            {/* Tier badge */}
            <div className="inline-block px-4 py-2 rounded-full mb-4"
                 style={{
                   background: `linear-gradient(90deg, ${tierInfo.color}, ${tierInfo.glow})`,
                 }}>
              <span className="text-xs font-mono font-bold text-void">
                {tierInfo.tier}
              </span>
            </div>

            {/* Stake amount */}
            <div className="mb-6">
              <p className="text-sm text-muted mb-2 font-mono">YOUR STAKE</p>
              <motion.div
                key={stake}
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                className="text-6xl font-display font-bold"
                style={{
                  background: `linear-gradient(90deg, ${tierInfo.color}, ${tierInfo.glow})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {stake.toLocaleString()}
              </motion.div>
              <p className="text-2xl font-mono text-muted mt-2">USDC</p>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-void/50 rounded-2xl p-4">
                <p className="text-xs text-muted mb-1 font-mono">MAX JOB VALUE</p>
                <p className="text-xl font-mono font-bold text-paper">
                  {maxJobValue.toLocaleString()}
                </p>
                <p className="text-xs text-muted font-mono">USDC</p>
              </div>

              <div className="bg-void/50 rounded-2xl p-4">
                <p className="text-xs text-muted mb-1 font-mono">SUCCESS RATE</p>
                <p className="text-xl font-mono font-bold text-paper">
                  {successRate.toFixed(1)}%
                </p>
                <p className="text-xs text-muted font-mono">
                  {stake >= 500 ? "BOOST ACTIVE" : "NO BOOST"}
                </p>
              </div>
            </div>

            {/* CTA Button */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                haptic("light");
                setShowStakeModal(true);
              }}
              className="w-full mt-6 py-4 rounded-full font-mono font-bold text-void text-lg"
              style={{
                background: `linear-gradient(90deg, ${tierInfo.color}, ${tierInfo.glow})`,
              }}
            >
              INCREASE STAKE
            </motion.button>
          </div>
        </motion.div>

        {/* Benefits Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-surface rounded-3xl p-6 border border-border"
        >
          <h2 className="text-lg font-display font-bold text-paper mb-4">
            STAKE BENEFITS
          </h2>

          <div className="space-y-4">
            {[
              { stake: 500, benefit: "CONDITIONAL tier", feature: "2.5x leverage" },
              { stake: 2000, benefit: "TRUSTED tier", feature: "5x leverage + boost" },
              { stake: 10000, benefit: "VERIFIED tier", feature: "10x leverage + priority" },
            ].map((item, i) => (
              <div
                key={i}
                className={`flex items-center justify-between p-4 rounded-2xl ${
                  stake >= item.stake ? "bg-trusted/10 border border-trustedFg/20" : "bg-void/30"
                }`}
              >
                <div>
                  <p className="font-mono text-sm text-muted">{item.stake.toLocaleString()} USDC</p>
                  <p className="font-mono font-bold text-paper">{item.benefit}</p>
                  <p className="text-xs text-muted font-mono mt-1">{item.feature}</p>
                </div>
                {stake >= item.stake && (
                  <div className="text-2xl">✓</div>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-surface rounded-3xl p-6 border border-border"
        >
          <h2 className="text-lg font-display font-bold text-paper mb-4">
            HOW STAKING WORKS
          </h2>

          <div className="space-y-3 text-sm text-muted font-mono leading-relaxed">
            <p>1. Stake USDC once as collateral</p>
            <p>2. Accept jobs up to 5x your stake</p>
            <p>3. When you accept a job, stake is locked as insurance</p>
            <p>4. Complete job successfully → unlock stake + earn payment</p>
            <p>5. Fail job → client gets compensation from your stake</p>
          </div>

          <div className="mt-4 p-4 bg-void/50 rounded-2xl">
            <p className="text-xs text-muted font-mono">
              💡 Your stake is reusable for multiple jobs. Only locked amount is at risk.
            </p>
          </div>
        </motion.div>
      </div>

      {/* Bottom Sheet Modal - Stake */}
      {showStakeModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-void/90 backdrop-blur-md z-50 flex items-end"
          onClick={() => setShowStakeModal(false)}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30 }}
            className="w-full bg-surface rounded-t-[2rem] p-6 pb-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-border rounded-full mx-auto mb-6" />

            <h2 className="text-2xl font-display font-bold text-paper mb-6">
              STAKE USDC
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted font-mono mb-2 block">
                  AMOUNT
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={stakeInput}
                    onChange={(e) => setStakeInput(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-void border border-border rounded-2xl px-6 py-4 text-2xl font-mono text-paper focus:outline-none focus:border-trustedFg"
                  />
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 text-muted font-mono">
                    USDC
                  </span>
                </div>
              </div>

              {/* Quick amounts */}
              <div className="flex gap-2">
                {[500, 1000, 2000, 5000].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => {
                      haptic("light");
                      setStakeInput(amount.toString());
                    }}
                    className="flex-1 py-2 px-3 bg-void border border-border rounded-xl text-sm font-mono hover:border-trustedFg"
                  >
                    {amount}
                  </button>
                ))}
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleStake}
                disabled={isStaking || !stakeInput}
                className="w-full py-4 rounded-full font-mono font-bold text-void text-lg bg-gradient-to-r from-trusted to-trustedFg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isStaking ? "STAKING..." : "STAKE NOW"}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
