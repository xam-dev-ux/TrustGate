import { useState, useEffect } from "react";
import { motion } from "framer-motion";

/**
 * NFTPage - View TrustScore NFT
 *
 * Mobile-first design showing:
 * - Animated NFT preview
 * - Live stats
 * - Share functionality
 * - Download SVG
 */
export default function NFTPage() {
  const [nftData, setNftData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    fetchNFT();
  }, []);

  const fetchNFT = async () => {
    // TODO: Get connected wallet address
    const address = "0x...";

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/nft/${address}`);
      if (res.ok) {
        const data = await res.json();
        setNftData(data);
      }
    } catch (error) {
      console.error("Failed to fetch NFT:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "My TrustScore NFT",
          text: "Check out my agent reputation NFT on TRUSTGATE",
          url: window.location.href,
        });
      } catch (error) {
        console.log("Share cancelled");
      }
    } else {
      // Fallback: copy link
      navigator.clipboard.writeText(window.location.href);
      setShowShare(true);
      setTimeout(() => setShowShare(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-trustedFg border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted font-mono">Loading NFT...</p>
        </div>
      </div>
    );
  }

  // Mock data for demo
  const mockData = {
    tokenId: 1,
    stake: 2500,
    successRate: 94.2,
    jobsCompleted: 42,
    totalValue: 125000,
    tier: "TRUSTED",
    colors: {
      primary: "#10b981",
      accent: "#06b6d4",
    },
  };

  // Use mockData if nftData is missing required fields
  const data = (nftData?.colors && nftData?.tier) ? nftData : mockData;

  return (
    <div className="min-h-screen bg-void pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-void/80 border-b border-border">
        <div className="px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-paper">
              TRUSTSCORE #{data.tokenId}
            </h1>
            <p className="text-sm text-muted mt-1 font-mono">Soulbound NFT</p>
          </div>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleShare}
            className="w-12 h-12 rounded-full bg-surface border border-border flex items-center justify-center"
          >
            <svg className="w-5 h-5 text-paper" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </motion.button>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* NFT Preview Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative aspect-[2/3] rounded-3xl overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${data.colors.primary}, ${data.colors.accent})`,
          }}
        >
          <div className="absolute inset-[2px] bg-surface rounded-3xl p-8 flex flex-col">
            {/* NFT Content */}
            <div className="text-center mb-6">
              <h2 className="text-4xl font-display font-bold"
                  style={{
                    background: `linear-gradient(90deg, ${data.colors.primary}, ${data.colors.accent})`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}>
                TRUSTSCORE
              </h2>
            </div>

            {/* Tier Badge */}
            <div className="mb-8">
              <div className="inline-block px-6 py-3 rounded-2xl mx-auto"
                   style={{
                     background: `linear-gradient(90deg, ${data.colors.primary}, ${data.colors.accent})`,
                   }}>
                <span className="text-xl font-mono font-bold text-void">
                  {data.tier}
                </span>
              </div>
            </div>

            {/* Stats */}
            <div className="space-y-6 flex-1">
              <div>
                <p className="text-xs text-muted mb-1 font-mono">STAKE</p>
                <p className="text-3xl font-mono font-bold text-paper">
                  {data.stake.toLocaleString()} USDC
                </p>
              </div>

              <div>
                <p className="text-xs text-muted mb-1 font-mono">SUCCESS RATE</p>
                <p className="text-3xl font-mono font-bold"
                   style={{ color: data.colors.primary }}>
                  {data.successRate}%
                </p>
              </div>

              <div>
                <p className="text-xs text-muted mb-1 font-mono">JOBS COMPLETED</p>
                <p className="text-3xl font-mono font-bold text-paper">
                  {data.jobsCompleted}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted mb-1 font-mono">TOTAL VALUE</p>
                <p className="text-3xl font-mono font-bold text-paper">
                  {(data.totalValue / 1000).toFixed(0)}K USDC
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-auto text-center space-y-1">
              <p className="text-xs text-muted font-mono">TRUSTGATE PROTOCOL</p>
              <p className="text-[10px] text-muted font-mono">BASE MAINNET</p>
            </div>
          </div>

          {/* Animated glow effect */}
          <motion.div
            animate={{
              opacity: [0.3, 0.6, 0.3],
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute inset-0 blur-3xl"
            style={{
              background: `radial-gradient(circle at center, ${data.colors.primary}, transparent)`,
            }}
          />
        </motion.div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-4">
          <motion.button
            whileTap={{ scale: 0.98 }}
            className="py-4 rounded-2xl bg-surface border border-border font-mono font-bold text-paper"
          >
            VIEW ON BASESCAN
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.98 }}
            className="py-4 rounded-2xl font-mono font-bold text-void"
            style={{
              background: `linear-gradient(90deg, ${data.colors.primary}, ${data.colors.accent})`,
            }}
          >
            DOWNLOAD SVG
          </motion.button>
        </div>

        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-surface rounded-3xl p-6 border border-border"
        >
          <h3 className="text-lg font-display font-bold text-paper mb-4">
            ABOUT TRUSTSCORE NFT
          </h3>

          <div className="space-y-3 text-sm text-muted font-mono leading-relaxed">
            <p>✓ Soulbound (non-transferable)</p>
            <p>✓ Updates automatically with your performance</p>
            <p>✓ Can be used as view-only collateral in DeFi</p>
            <p>✓ SVG generated fully onchain</p>
            <p>✓ One NFT per agent address</p>
          </div>

          <div className="mt-4 p-4 bg-void/50 rounded-2xl">
            <p className="text-xs text-muted font-mono">
              💡 This NFT represents your reputation. It cannot be sold or transferred, ensuring authentic agent identity.
            </p>
          </div>
        </motion.div>

        {/* Use Cases */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-surface rounded-3xl p-6 border border-border"
        >
          <h3 className="text-lg font-display font-bold text-paper mb-4">
            USE YOUR NFT
          </h3>

          <div className="space-y-3">
            {[
              { icon: "🔗", title: "Showcase on profile", desc: "Display on X, Farcaster, etc." },
              { icon: "💼", title: "Job applications", desc: "Prove reputation to clients" },
              { icon: "🏦", title: "DeFi collateral", desc: "View-only in protocols" },
              { icon: "📊", title: "Analytics", desc: "Track performance over time" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-void/30 rounded-xl">
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <p className="font-mono font-bold text-paper text-sm">{item.title}</p>
                  <p className="text-xs text-muted font-mono">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Share toast */}
      {showShare && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-24 left-4 right-4 bg-trusted text-void py-3 px-4 rounded-2xl font-mono text-center font-bold"
        >
          Link copied to clipboard!
        </motion.div>
      )}
    </div>
  );
}
