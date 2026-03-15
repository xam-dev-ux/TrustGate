import { Client } from "@xmtp/node-sdk";
import { Wallet, getBytes, hexlify, toUtf8Bytes, keccak256 } from "ethers";
import { existsSync, mkdirSync, accessSync, constants } from "fs";
import { config } from "../config";
import { getTrustGateContract } from "../utils/contract";

export class XMTPHandler {
  private client: Client | null = null;
  private wallet: Wallet | null = null;
  private isRunning = false;

  async start() {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("[XMTP] Starting XMTP handler...");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    try {
      // Step 1: Create wallet
      console.log("[XMTP] Step 1/5: Creating wallet from private key...");
      console.log(`[XMTP] - Wallet key length: ${config.xmtp.walletKey.length} chars`);
      console.log(`[XMTP] - Wallet key prefix: ${config.xmtp.walletKey.substring(0, 6)}...`);

      this.wallet = new Wallet(config.xmtp.walletKey);
      console.log(`[XMTP] ✓ Wallet created successfully`);
      console.log(`[XMTP] - Agent address: ${this.wallet.address}`);
      console.log(`[XMTP] - Address checksum: ${this.wallet.address.toLowerCase()}`);

      // Step 2: Create EOA signer
      console.log("\n[XMTP] Step 2/5: Creating EOA signer...");
      const signer = {
        type: "EOA" as const,
        signMessage: async (message: string): Promise<Uint8Array> => {
          console.log(`[XMTP] - Signing message: "${message.substring(0, 50)}..."`);
          if (!this.wallet) throw new Error("Wallet not initialized");
          const signature = await this.wallet.signMessage(message);
          console.log(`[XMTP] - Signature created: ${signature.substring(0, 20)}...`);
          return getBytes(signature);
        },
        getIdentifier: () => {
          if (!this.wallet) throw new Error("Wallet not initialized");
          const identifier = {
            identifier: this.wallet.address.toLowerCase(),
            identifierKind: 0, // 0 = Ethereum
          };
          console.log(`[XMTP] - getIdentifier called, returning:`, identifier);
          return identifier;
        },
      };
      console.log("[XMTP] ✓ EOA signer created");

      // Step 3: Log XMTP configuration
      console.log("\n[XMTP] Step 3/5: XMTP Configuration:");
      console.log(`[XMTP] - Environment: ${config.xmtp.env}`);
      console.log(`[XMTP] - DB encryption key set: ${!!config.xmtp.dbEncryptionKey}`);
      console.log(`[XMTP] - DB encryption key length: ${config.xmtp.dbEncryptionKey.length} chars`);

      // Step 4: Verify /tmp directory
      console.log("\n[XMTP] Step 4/6: Verifying /tmp directory...");
      try {
        accessSync("/tmp", constants.W_OK);
        console.log("[XMTP] ✓ /tmp directory is writable");
      } catch (error: any) {
        console.error("[XMTP] ✗ /tmp directory is not writable:", error.message);
        throw new Error("Cannot write to /tmp directory");
      }

      // Step 5: Create XMTP client
      console.log("\n[XMTP] Step 5/6: Creating XMTP client...");

      // Convert encryption key (simple Buffer like AgenBoard)
      const dbEncKey = config.xmtp.dbEncryptionKey.startsWith('0x')
        ? Buffer.from(config.xmtp.dbEncryptionKey.slice(2), 'hex')
        : Buffer.from(config.xmtp.dbEncryptionKey, 'hex');

      console.log(`[XMTP] - Environment: ${config.xmtp.env}`);
      console.log(`[XMTP] - Encryption key: ${dbEncKey.length} bytes`);
      console.log(`[XMTP] - Calling Client.create()...`);
      console.log(`[XMTP] - This may take 10-30 seconds on first run...`);

      const createStartTime = Date.now();

      this.client = await Client.create(signer, {
        env: config.xmtp.env,
        dbEncryptionKey: dbEncKey,
      });

      const createDuration = Date.now() - createStartTime;
      console.log(`[XMTP] ✓ Client created successfully in ${createDuration}ms`);
      console.log(`[XMTP] - Client inbox ID: ${this.client.inboxId}`);
      console.log(`[XMTP] - Client is registered: ${this.client.isRegistered}`);

      // Step 6: Start streaming
      console.log("\n[XMTP] Step 6/6: Starting message stream...");
      this.isRunning = true;

      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("[XMTP] ✓✓✓ XMTP HANDLER READY ✓✓✓");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

      await this.streamMessages();
    } catch (error: any) {
      console.error("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.error("[XMTP] ✗✗✗ FAILED TO START XMTP ✗✗✗");
      console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.error("[XMTP] Error type:", error.constructor.name);
      console.error("[XMTP] Error message:", error.message);
      console.error("[XMTP] Error code:", error.code);
      console.error("[XMTP] Error stack:", error.stack);

      if (error.cause) {
        console.error("\n[XMTP] Error cause:");
        console.error("[XMTP] - Cause type:", error.cause.constructor?.name);
        console.error("[XMTP] - Cause message:", error.cause.message);
        console.error("[XMTP] - Cause stack:", error.cause.stack);
      }

      if (error.errors) {
        console.error("\n[XMTP] Multiple errors:", error.errors);
      }

      // Log full error object
      console.error("\n[XMTP] Full error object:");
      console.error(JSON.stringify(error, Object.getOwnPropertyNames(error), 2));

      console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

      throw error;
    }
  }

  stop() {
    console.log("[XMTP] Stopping XMTP handler...");
    this.isRunning = false;
  }

  private async streamMessages() {
    if (!this.client || !this.wallet) {
      throw new Error("XMTP client not initialized");
    }

    console.log("[XMTP] Setting up message streaming...");

    try {
      console.log("[XMTP] - Fetching existing conversations...");
      const conversations = await this.client.conversations.list();
      console.log(`[XMTP] - Found ${conversations.length} existing conversations`);

      // Stream all conversations
      console.log("[XMTP] - Creating message stream...");
      const stream = await this.client.conversations.streamAllMessages();
      console.log("[XMTP] - Stream created successfully");
      console.log("[XMTP] - Listening for incoming messages...");

      let messageCount = 0;
      for await (const message of stream) {
        if (!this.isRunning) {
          console.log("[XMTP] - Stream stopped (isRunning = false)");
          break;
        }

        try {
          messageCount++;
          // Get sender from message
          const senderInboxId = message.senderInboxId;

          // Skip messages from self (compare inbox IDs)
          if (senderInboxId === this.client.inboxId) {
            console.log(`[XMTP] - Skipping own message #${messageCount}`);
            continue;
          }

          console.log(`[XMTP] - Message #${messageCount} from ${senderInboxId}: ${message.content}`);

          // Handle the message
          await this.handleMessage(message, senderInboxId);
        } catch (error: any) {
          console.error("[XMTP] Error handling message:", error.message);
          console.error("[XMTP] Error stack:", error.stack);
        }
      }

      console.log("[XMTP] - Stream ended normally");
    } catch (error: any) {
      console.error("\n[XMTP] ✗ Error in message streaming:");
      console.error("[XMTP] - Error type:", error.constructor.name);
      console.error("[XMTP] - Error message:", error.message);
      console.error("[XMTP] - Error stack:", error.stack);

      // Retry after 5 seconds
      if (this.isRunning) {
        console.log("[XMTP] - Retrying stream in 5 seconds...");
        setTimeout(() => this.streamMessages(), 5000);
      }
    }
  }

  private async handleMessage(message: any, senderInboxId: string) {
    const content = (message.content as string)?.toLowerCase().trim() || "";

    try {
      let response = "";

      // Natural language command handling
      if (content.includes("how does this work") || content.includes("how it works")) {
        response = this.getHowItWorksMessage();
      } else if (content.includes("accuracy")) {
        response = await this.getAccuracyMessage();
      } else if (content.match(/certify\s+(\S+)/)) {
        const match = content.match(/certify\s+(\S+)/);
        const basename = match ? match[1] : "";
        response = await this.getCertifyMessage(basename);
      } else if (content.match(/is\s+(\S+)\s+trusted/)) {
        const match = content.match(/is\s+(\S+)\s+trusted/);
        const basename = match ? match[1] : "";
        response = await this.getTrustedCheckMessage(basename);
      } else if (content.match(/report\s+(\S+)/)) {
        const match = content.match(/report\s+(\S+)/);
        const basename = match ? match[1] : "";
        response = await this.getReportMessage(basename);
      } else if (content.match(/history\s+(\S+)/)) {
        const match = content.match(/history\s+(\S+)/);
        const basename = match ? match[1] : "";
        response = await this.getHistoryMessage(basename);
      } else if (content.includes("help") || content.includes("commands")) {
        response = this.getHelpMessage();
      } else {
        // Default welcome message
        response = this.getWelcomeMessage();
      }

      // Send response back to the same conversation
      await message.conversation.send(response);
      console.log(`[XMTP] Sent response to ${senderInboxId}`);
    } catch (error: any) {
      console.error(`[XMTP] Error processing command:`, error.message);
      try {
        await message.conversation.send("Sorry, I encountered an error processing your request. Please try again.");
      } catch (sendError: any) {
        console.error(`[XMTP] Failed to send error message:`, sendError.message);
      }
    }
  }

  private getWelcomeMessage(): string {
    return `Welcome to TRUSTGATE!

I'm an onchain certification system for AI agents on Base mainnet.

Commands:
• "how does this work" - Learn about TRUSTGATE
• "accuracy" - View my accuracy score
• "certify [address]" - Request certification
• "is [address] trusted" - Check trust status
• "help" - Show all commands

What would you like to do?`;
  }

  private getHowItWorksMessage(): string {
    return `TRUSTGATE: Onchain Agent Certification

How it works:
1. Agents request certification by staking USDC
2. I analyze their ERC-8004 registration, ERC-8183 job history, and capabilities
3. I assign a trust level: TRUSTED, CONDITIONAL, UNVERIFIED, or FLAGGED
4. The certification is stored immutably onchain with a 90-day expiry
5. Other contracts can query isTrusted(address) via Base mainnet hooks

I also evaluate ERC-8183 jobs and track outcomes to build my accuracy score.

My accuracy increases as I prove correct over time, creating a reputation flywheel.

Visit https://trustgate.vercel.app for more info!`;
  }

  private async getAccuracyMessage(): Promise<string> {
    try {
      const trustgate = getTrustGateContract();
      const accuracy = await trustgate.getAccuracyScore();

      const evalAccuracy = Number(accuracy.evaluationAccuracy) / 100;
      const certAccuracy = Number(accuracy.certificationAccuracy) / 100;
      const totalEvals = Number(accuracy.totalEvaluations);
      const totalCerts = Number(accuracy.totalCertifications);

      return `TRUSTGATE Accuracy Score

Evaluation Accuracy: ${evalAccuracy.toFixed(2)}%
(${totalEvals} evaluations)

Certification Accuracy: ${certAccuracy > 0 ? certAccuracy.toFixed(2) + '%' : 'No data yet'}
(${totalCerts} certifications tracked)

My accuracy is verified onchain and updates automatically as outcomes are recorded.

Contract: ${config.contracts.trustgate}`;
    } catch (error: any) {
      console.error("[XMTP] Error fetching accuracy:", error.message);
      return "Unable to fetch accuracy score. Please try again later.";
    }
  }

  private async getCertifyMessage(address: string): Promise<string> {
    if (!address || !address.startsWith("0x")) {
      return `Please provide a valid Ethereum address.

Example: certify 0x1234...5678

Or visit https://trustgate.vercel.app/certify to request certification via the web UI.`;
    }

    try {
      const trustgate = getTrustGateContract();
      const cert = await trustgate.getLatestCertification(address);

      if (cert.active && Number(cert.expiresAt) > Date.now() / 1000) {
        const levelNames = ["FLAGGED", "UNVERIFIED", "CONDITIONAL", "TRUSTED"];
        const level = levelNames[Number(cert.level)];

        return `Agent ${address} already has an active certification:

Level: ${level}
Score: ${Number(cert.score)}/100
Expires: ${new Date(Number(cert.expiresAt) * 1000).toLocaleDateString()}

Visit https://trustgate.vercel.app/agent/${address} for full details.`;
      }

      return `To certify ${address}:

1. Visit https://trustgate.vercel.app/certify
2. Enter the agent address
3. Approve USDC spend (${config.fees.certificationUsdc} USDC)
4. Submit certification request
5. I'll analyze and record the result onchain

Certification includes:
✓ ERC-8004 registry analysis
✓ ERC-8183 job history
✓ Risk assessment
✓ 90-day onchain certificate`;
    } catch (error: any) {
      console.error("[XMTP] Error checking certification:", error.message);
      return "Unable to check certification status. Please try again later.";
    }
  }

  private async getTrustedCheckMessage(address: string): Promise<string> {
    if (!address || !address.startsWith("0x")) {
      return "Please provide a valid Ethereum address.";
    }

    try {
      const trustgate = getTrustGateContract();
      const isTrusted = await trustgate.isTrusted(address);
      const cert = await trustgate.getLatestCertification(address);

      const levelNames = ["FLAGGED", "UNVERIFIED", "CONDITIONAL", "TRUSTED"];
      const level = levelNames[Number(cert.level)];

      if (isTrusted) {
        return `✓ YES - ${address} is TRUSTED

Level: ${level}
Score: ${Number(cert.score)}/100
Expires: ${new Date(Number(cert.expiresAt) * 1000).toLocaleDateString()}

This agent has an active TRUSTED certification onchain.`;
      } else {
        return `✗ NO - ${address} is NOT trusted

${cert.active ? `Current level: ${level}\nScore: ${Number(cert.score)}/100` : 'No active certification found.'}

Only agents with TRUSTED level and active certifications return true for isTrusted().`;
      }
    } catch (error: any) {
      console.error("[XMTP] Error checking trust:", error.message);
      return "Unable to check trust status. Please try again later.";
    }
  }

  private async getReportMessage(address: string): Promise<string> {
    if (!address || !address.startsWith("0x")) {
      return "Please provide a valid Ethereum address.";
    }

    return `Full certification report for ${address}:

Visit https://trustgate.vercel.app/agent/${address} to view:
• Trust level and score
• Risk analysis
• Job history metrics
• Certification timeline
• Onchain verification

The web UI provides the complete analysis with all details.`;
  }

  private async getHistoryMessage(address: string): Promise<string> {
    if (!address || !address.startsWith("0x")) {
      return "Please provide a valid Ethereum address.";
    }

    return `Certification history for ${address}:

Visit https://trustgate.vercel.app/agent/${address} to view:
• All certifications chronologically
• Level changes over time
• Score progression
• Outcome verification

All records are immutable and verified onchain.`;
  }

  private getHelpMessage(): string {
    return `TRUSTGATE Commands

General:
• "how does this work" - System explanation
• "accuracy" - My accuracy score
• "help" - This message

Certification:
• "certify [address]" - Request certification
• "is [address] trusted" - Check trust status
• "report [address]" - Full analysis
• "history [address]" - Certification timeline

Examples:
• "accuracy"
• "certify 0x1234...5678"
• "is 0x1234...5678 trusted"

Web UI: https://trustgate.vercel.app
Contract: ${config.contracts.trustgate}
Chain: Base Mainnet (${config.blockchain.chainId})`;
  }
}
