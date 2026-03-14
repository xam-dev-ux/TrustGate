import * as dotenv from "dotenv";

dotenv.config();

export const config = {
  // XMTP
  xmtp: {
    walletKey: process.env.XMTP_WALLET_KEY || "",
    dbEncryptionKey: process.env.XMTP_DB_ENCRYPTION_KEY || "",
    env: (process.env.XMTP_ENV || "production") as "production" | "dev",
  },

  // Neynar
  neynarApiKey: process.env.NEYNAR_API_KEY || "",

  // Contract addresses
  contracts: {
    trustgate: process.env.CONTRACT_ADDRESS || "",
    erc8004Registry: process.env.ERC8004_REGISTRY_ADDRESS || "",
    erc8183Factory: process.env.ERC8183_FACTORY_ADDRESS || "",
  },

  // Blockchain
  blockchain: {
    rpcUrl: process.env.RPC_URL || "https://mainnet.base.org",
    basescanApiKey: process.env.BASESCAN_API_KEY || "",
    chainId: 8453, // Base mainnet
  },

  // Operator
  operator: {
    privateKey: process.env.OPERATOR_PRIVATE_KEY || "",
  },

  // Fees (in USDC with 6 decimals)
  fees: {
    certificationUsdc: parseFloat(process.env.CERTIFICATION_FEE_USDC || "0.10"),
    evaluationUsdc: parseFloat(process.env.EVALUATION_FEE_USDC || "0.05"),
  },

  // Certification
  cert: {
    expiryDays: parseInt(process.env.CERT_EXPIRY_DAYS || "90"),
  },

  // Treasury
  treasuryAddress: process.env.TREASURY_ADDRESS || "",

  // Server
  server: {
    port: parseInt(process.env.PORT || "3001"),
  },

  // Timeouts
  timeouts: {
    skillFetchMs: parseInt(process.env.SKILL_FETCH_TIMEOUT_MS || "5000"),
  },

  // Evaluator JSON updater
  evaluator: {
    updateIntervalMs: parseInt(process.env.EVALUATOR_UPDATE_INTERVAL_MS || (60 * 60 * 1000).toString()), // 1 hour default
    jsonPath: process.env.EVALUATOR_JSON_PATH || "",
  },
};

export function validateConfig() {
  const required = [
    "XMTP_WALLET_KEY",
    "XMTP_DB_ENCRYPTION_KEY",
    "CONTRACT_ADDRESS",
    "OPERATOR_PRIVATE_KEY",
    "RPC_URL",
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}
