import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";

/**
 * MobileNav - Bottom navigation for mobile
 *
 * Sticky bottom navigation with:
 * - Large tap targets
 * - Active state indicators
 * - Haptic feedback
 * - Glassmorphism
 */
export default function MobileNav() {
  const location = useLocation();

  const haptic = () => {
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  const navItems = [
    { path: "/", icon: "🏠", label: "Home" },
    { path: "/stake", icon: "💰", label: "Stake" },
    { path: "/predict", icon: "🎯", label: "Predict" },
    { path: "/nft", icon: "🖼️", label: "NFT" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-xl bg-void/90 border-t border-border pb-safe">
      <div className="grid grid-cols-4 gap-1 px-2 py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={haptic}
              className="relative"
            >
              <motion.div
                whileTap={{ scale: 0.9 }}
                className={`flex flex-col items-center justify-center py-3 px-2 rounded-2xl transition-colors ${
                  isActive ? "bg-trusted/10" : "hover:bg-surface"
                }`}
              >
                {/* Icon */}
                <span className="text-2xl mb-1">{item.icon}</span>

                {/* Label */}
                <span
                  className={`text-xs font-mono font-bold ${
                    isActive ? "text-trustedFg" : "text-muted"
                  }`}
                >
                  {item.label}
                </span>

                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-x-0 -bottom-[1px] h-[3px] bg-gradient-to-r from-trusted to-trustedFg rounded-t-full"
                  />
                )}
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
