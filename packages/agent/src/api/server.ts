import express from "express";
import cors from "cors";
import NodeCache from "node-cache";
import { getTrustGateContract, certLevelToString } from "../utils/contract";
import { config } from "../config";

const app = express();
const cache = new NodeCache({ stdTTL: 10 }); // 10 second cache

app.use(cors());
app.use(express.json());

const contract = getTrustGateContract();

// GET /api/certifications/:address - latest active cert
app.get("/api/certifications/:address", async (req, res) => {
  try {
    const { address } = req.params;
    const cacheKey = `cert-${address}`;

    // Check cache
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Fetch from contract
    const cert = await contract.getLatestCertification(address);

    const result = {
      agentAddress: cert.agentAddress,
      level: certLevelToString(cert.level),
      score: Number(cert.scoreUint),
      issuedAt: Number(cert.issuedAt),
      expiresAt: Number(cert.expiresAt),
      certHash: cert.certHash,
      jobId: cert.jobId,
      active: cert.active,
    };

    cache.set(cacheKey, result);
    res.json(result);
  } catch (error: any) {
    console.error("Error fetching certification:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/certifications/:address/history - all certs timeline
app.get("/api/certifications/:address/history", async (req, res) => {
  try {
    const { address } = req.params;
    const history = await contract.getCertificationHistory(address);

    const result = history.map((cert: any) => ({
      agentAddress: cert.agentAddress,
      level: certLevelToString(cert.level),
      score: Number(cert.scoreUint),
      issuedAt: Number(cert.issuedAt),
      expiresAt: Number(cert.expiresAt),
      certHash: cert.certHash,
      jobId: cert.jobId,
      active: cert.active,
    }));

    res.json(result);
  } catch (error: any) {
    console.error("Error fetching certification history:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/accuracy - TRUSTGATE accuracy score
app.get("/api/accuracy", async (req, res) => {
  try {
    const cacheKey = "accuracy";
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const accuracy = await contract.getAccuracyScore();

    const result = {
      evaluationAccuracy: Number(accuracy[0]) / 100,
      certificationAccuracy: Number(accuracy[1]) / 100,
      totalEvaluations: Number(accuracy[2]),
      totalCertifications: Number(accuracy[3]),
    };

    cache.set(cacheKey, result);
    res.json(result);
  } catch (error: any) {
    console.error("Error fetching accuracy:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/stats - global stats
app.get("/api/stats", async (req, res) => {
  try {
    const cacheKey = "stats";
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const [totalCerts, totalEvals, accuracy] = await Promise.all([
      contract.totalCertifications(),
      contract.totalEvaluations(),
      contract.getAccuracyScore(),
    ]);

    const result = {
      totalCertifications: Number(totalCerts),
      totalEvaluations: Number(totalEvals),
      accuracyScore: {
        evaluationAccuracy: Number(accuracy[0]) / 100,
        certificationAccuracy: Number(accuracy[1]) / 100,
      },
    };

    cache.set(cacheKey, result);
    res.json(result);
  } catch (error: any) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/certifications/:address/report - full analysis
app.get("/api/certifications/:address/report", async (req, res) => {
  try {
    const { address } = req.params;

    // Get latest certification
    const cert = await contract.getLatestCertification(address);

    if (cert.issuedAt === 0n || cert.issuedAt === 0) {
      return res.status(404).json({
        error: "No certification found for this agent",
        address
      });
    }

    // Full report with analysis (in production, this would fetch from database)
    const result = {
      agentAddress: cert.agentAddress,
      level: certLevelToString(cert.level),
      score: Number(cert.scoreUint),
      issuedAt: Number(cert.issuedAt),
      expiresAt: Number(cert.expiresAt),
      certHash: cert.certHash,
      jobId: cert.jobId,
      active: cert.active,
      analysis: {
        // TODO: Fetch real analysis from database/IPFS using certHash
        message: "Full analysis available after certification engine integration"
      },
      riskFlags: [],
      history: await contract.getCertificationHistory(address).then((history: any[]) =>
        history.map((h) => ({
          level: certLevelToString(h.level),
          score: Number(h.scoreUint),
          issuedAt: Number(h.issuedAt),
        }))
      ),
    };

    res.json(result);
  } catch (error: any) {
    console.error("Error fetching certification report:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/batch-certifications - batch check multiple agents
app.get("/api/batch-certifications", async (req, res) => {
  try {
    const addressesParam = req.query.addresses as string;

    if (!addressesParam) {
      return res.status(400).json({
        error: "Missing addresses parameter. Format: ?addresses=0x1,0x2,0x3"
      });
    }

    const addresses = addressesParam.split(",").map((a) => a.trim());

    if (addresses.length === 0) {
      return res.status(400).json({ error: "No addresses provided" });
    }

    if (addresses.length > 50) {
      return res.status(400).json({ error: "Maximum 50 addresses per request" });
    }

    // Free up to 5 addresses
    const freeLimit = 5;
    const paidCount = Math.max(0, addresses.length - freeLimit);
    const feePerAddress = 0.001; // USDC

    // TODO: Implement x402 payment check for addresses above 5
    if (paidCount > 0) {
      const requiredFee = paidCount * feePerAddress;
      // Check X-PAYMENT header and verify x402 payment
      // For now, just note it in response
      console.log(`[Batch] Would require ${requiredFee} USDC for ${paidCount} addresses`);
    }

    // Fetch certifications in parallel
    const results = await Promise.all(
      addresses.map(async (address) => {
        try {
          const [level, expiresAt, active] = await contract.getCertificationLevel(address);
          const cert = await contract.getLatestCertification(address);

          return {
            address,
            level: certLevelToString(level),
            levelCode: Number(level),
            score: cert.issuedAt ? Number(cert.scoreUint) : 0,
            active,
            expiresAt: Number(expiresAt),
            certHash: cert.certHash || null,
          };
        } catch (error) {
          return {
            address,
            level: "UNVERIFIED",
            levelCode: 0,
            score: 0,
            active: false,
            expiresAt: 0,
            certHash: null,
            error: "Failed to fetch certification",
          };
        }
      })
    );

    res.json({
      results,
      count: results.length,
      free: Math.min(addresses.length, freeLimit),
      paid: paidCount,
      fee: paidCount > 0 ? paidCount * feePerAddress : 0,
    });
  } catch (error: any) {
    console.error("Error in batch certifications:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/certifications/request - request new certification
app.post("/api/certifications/request", express.json(), async (req, res) => {
  try {
    const { agentAddress, requesterAddress } = req.body;

    if (!agentAddress || !requesterAddress) {
      return res.status(400).json({
        error: "Missing required fields: agentAddress, requesterAddress"
      });
    }

    // TODO: Implement x402 payment check (0.10 USDC)
    // TODO: Create ERC-8183 job onchain
    // TODO: Emit event for certification engine to pick up

    res.json({
      jobId: "0x" + Date.now().toString(16), // Mock job ID
      txHash: null,
      estimatedMinutes: 5,
      fee: 0.10,
      status: "pending",
      message: "Certification engine integration pending. Mock response.",
    });
  } catch (error: any) {
    console.error("Error requesting certification:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/fees - current fees
app.get("/api/fees", async (req, res) => {
  try {
    const fee = await contract.getFee();

    res.json({
      certificationFee: Number(fee) / 1e6, // Convert from 6 decimals to USDC
    });
  } catch (error: any) {
    console.error("Error fetching fees:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============ STAKING ENDPOINTS ============

// GET /api/staking/:address - agent staking info
app.get("/api/staking/:address", async (req, res) => {
  try {
    const { address } = req.params;

    if (!process.env.STAKING_POOL_ADDRESS) {
      return res.status(503).json({ error: "Staking pool not configured" });
    }

    const { StakingMonitor } = await import("../engines/stakingMonitor");
    const monitor = new StakingMonitor();
    const info = await monitor.getAgentStakingInfo(address);

    if (!info) {
      return res.status(404).json({ error: "Agent not found or has no stake" });
    }

    res.json(info);
  } catch (error: any) {
    console.error("Error fetching staking info:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/predict - predict job success
app.post("/api/predict", async (req, res) => {
  try {
    const { agentAddress, jobValue, jobComplexity, requiredSkills } = req.body;

    if (!agentAddress || !jobValue) {
      return res.status(400).json({
        error: "Missing required fields: agentAddress, jobValue"
      });
    }

    const { PredictionEngine } = await import("../engines/predictionEngine");
    const engine = new PredictionEngine();

    const result = await engine.predictJobSuccess({
      agentAddress,
      jobValue: Math.round(jobValue * 1e6), // Convert to 6 decimals
      jobComplexity,
      requiredSkills,
    });

    res.json({
      prediction: result.prediction / 100, // Convert to percentage
      confidence: result.confidence / 100,
      factors: result.factors,
      recommendation: result.prediction >= 8000 ? "PROCEED" :
                     result.prediction >= 6000 ? "CAUTION" : "HIGH_RISK",
    });
  } catch (error: any) {
    console.error("Error predicting job success:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/nft/:address - get TrustScore NFT metadata
app.get("/api/nft/:address", async (req, res) => {
  try {
    const { address } = req.params;

    // TODO: Fetch NFT token ID from address
    // TODO: Get tokenURI from contract
    // TODO: Return metadata

    res.json({
      message: "NFT metadata endpoint - implementation pending",
      address
    });
  } catch (error: any) {
    console.error("Error fetching NFT:", error);
    res.status(500).json({ error: error.message });
  }
});

export function startServer(): void {
  const port = config.server.port;

  app.listen(port, () => {
    console.log(`[API] Server listening on port ${port}`);
    console.log(`[API] Health check: http://localhost:${port}/api/accuracy`);
  });
}
