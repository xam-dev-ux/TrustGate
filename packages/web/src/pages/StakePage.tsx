import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ethers } from "ethers";
import { useWalletStore } from "../stores/walletStore";

// Contract addresses on Base mainnet
const STAKING_POOL_ADDRESS = "0xE275e2cFe9794252a4858d1859a065D1D9768b74";
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

// Minimal ABIs
const USDC_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

const STAKING_POOL_ABI = [
  "function stake(uint256 amount)",
  "function agentStake(address agent) view returns (uint256)",
  "event Staked(address indexed agent, uint256 amount, uint256 newTotal)",
];

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
  const { address, isConnecting, error, connect } = useWalletStore();
  const [stake, setStake] = useState(0);
  const [stakeInput, setStakeInput] = useState("");
  const [maxJobValue, setMaxJobValue] = useState(0);
  const [successRate, setSuccessRate] = useState(0);
  const [isStaking, setIsStaking] = useState(false);
  const [stakingStep, setStakingStep] = useState<"" | "approving" | "staking">("");
  const [showStakeModal, setShowStakeModal] = useState(false);

  // Haptic feedback
  const haptic = (type: "light" | "medium" | "heavy" = "light") => {
    if (navigator.vibrate) {
      const duration = type === "light" ? 10 : type === "medium" ? 20 : 30;
      navigator.vibrate(duration);
    }
  };

  // Fetch agent stake when wallet connects
  useEffect(() => {
    if (address) {
      fetchStakeInfo();
    }
  }, [address]);

  const fetchStakeInfo = async () => {
    if (!address) return;

    try {
      // Read directly from staking contract
      const provider = new ethers.BrowserProvider(window.ethereum);
      const stakingContract = new ethers.Contract(
        STAKING_POOL_ADDRESS,
        STAKING_POOL_ABI,
        provider
      );

      // Get agent's stake
      const stakeAmount = await stakingContract.agentStake(address);
      const stakeFormatted = parseFloat(ethers.formatUnits(stakeAmount, 6));

      setStake(stakeFormatted);

      // Calculate max job value (5x leverage)
      setMaxJobValue(stakeFormatted * 5);

      // Mock success rate for now (would come from job history)
      setSuccessRate(stakeFormatted >= 500 ? 95 : 0);
    } catch (error) {
      console.error("Failed to fetch stake:", error);
    }
  };

  const handleStake = async () => {
    if (!stakeInput || parseFloat(stakeInput) <= 0 || !address) return;

    haptic("medium");
    setIsStaking(true);
    setStakingStep("");

    try {
      // Get provider and signer
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Convert amount to USDC decimals (6 decimals)
      const amount = ethers.parseUnits(stakeInput, 6);

      // Create contract instances
      const usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, signer);
      const stakingContract = new ethers.Contract(STAKING_POOL_ADDRESS, STAKING_POOL_ABI, signer);

      // Check current allowance
      const currentAllowance = await usdcContract.allowance(address, STAKING_POOL_ADDRESS);

      // Approve USDC if needed
      if (currentAllowance < amount) {
        setStakingStep("approving");
        console.log("Approving USDC...");
        const approveTx = await usdcContract.approve(STAKING_POOL_ADDRESS, amount);
        await approveTx.wait();
        console.log("USDC approved");
      }

      // Stake
      setStakingStep("staking");
      console.log("Staking...");
      const stakeTx = await stakingContract.stake(amount);
      await stakeTx.wait();
      console.log("Staked successfully");

      // Update UI
      setStake(stake + parseFloat(stakeInput));
      setStakeInput("");
      setShowStakeModal(false);
      haptic("heavy");

      // Refresh stake info from contract
      await fetchStakeInfo();
    } catch (error: any) {
      console.error("Stake failed:", error);

      // Better error messages
      let errorMsg = "Transacción rechazada";
      if (error.code === "ACTION_REJECTED") {
        errorMsg = "Transacción cancelada por el usuario";
      } else if (error.message?.includes("insufficient funds")) {
        errorMsg = "Saldo insuficiente de USDC o ETH para gas";
      } else if (error.message) {
        errorMsg = error.message;
      }

      alert(`Error: ${errorMsg}`);
    } finally {
      setIsStaking(false);
      setStakingStep("");
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
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-display font-bold text-paper">STAKE</h1>

            {/* Wallet Connect Button */}
            {!address ? (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  haptic("light");
                  connect();
                }}
                disabled={isConnecting}
                className="px-4 py-2 rounded-full bg-gradient-to-r from-trusted to-trustedFg font-mono font-bold text-void text-sm"
              >
                {isConnecting ? "..." : "CONNECT"}
              </motion.button>
            ) : (
              <div className="px-3 py-2 rounded-full bg-surface border border-trustedFg/30 font-mono text-xs text-trustedFg">
                {address.slice(0, 6)}...{address.slice(-4)}
              </div>
            )}
          </div>
          <p className="text-sm text-muted">Lock collateral, unlock jobs</p>

          {/* Error message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 p-3 rounded-xl bg-flagged/10 border border-flaggedFg/20"
            >
              <p className="text-xs font-mono text-flaggedFg">{error}</p>
            </motion.div>
          )}
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
                if (!address) {
                  connect();
                } else {
                  setShowStakeModal(true);
                }
              }}
              className="w-full mt-6 py-4 rounded-full font-mono font-bold text-void text-lg"
              style={{
                background: `linear-gradient(90deg, ${tierInfo.color}, ${tierInfo.glow})`,
              }}
            >
              {!address ? "CONNECT WALLET" : "INCREASE STAKE"}
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
            className="w-full bg-surface rounded-t-[2rem] p-6 pb-28"
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
                {stakingStep === "approving" && "APROBANDO USDC..."}
                {stakingStep === "staking" && "HACIENDO STAKE..."}
                {!isStaking && "STAKE NOW"}
                {isStaking && !stakingStep && "PREPARANDO..."}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
