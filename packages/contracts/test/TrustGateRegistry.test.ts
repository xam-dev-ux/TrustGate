import { expect } from "chai";
import { ethers } from "hardhat";
import { TrustGateRegistry } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("TrustGateRegistry", function () {
  let trustgate: TrustGateRegistry;
  let owner: SignerWithAddress;
  let operator: SignerWithAddress;
  let treasury: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let agent1: SignerWithAddress;
  let agent2: SignerWithAddress;

  const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  const CERTIFICATION_FEE = ethers.parseUnits("0.10", 6);

  beforeEach(async function () {
    [owner, operator, treasury, user1, user2, agent1, agent2] = await ethers.getSigners();

    const TrustGateRegistry = await ethers.getContractFactory("TrustGateRegistry");
    trustgate = await TrustGateRegistry.deploy(
      USDC_ADDRESS,
      operator.address,
      treasury.address,
      CERTIFICATION_FEE
    );
    await trustgate.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await trustgate.owner()).to.equal(owner.address);
    });

    it("Should set the right operator", async function () {
      expect(await trustgate.operator()).to.equal(operator.address);
    });

    it("Should set the right treasury", async function () {
      expect(await trustgate.treasury()).to.equal(treasury.address);
    });

    it("Should set the right certification fee", async function () {
      expect(await trustgate.certificationFee()).to.equal(CERTIFICATION_FEE);
    });

    it("Should set the right USDC address", async function () {
      expect(await trustgate.USDC()).to.equal(USDC_ADDRESS);
    });
  });

  describe("Record Certification", function () {
    const certHash = ethers.keccak256(ethers.toUtf8Bytes("cert-1"));
    const jobId = ethers.keccak256(ethers.toUtf8Bytes("job-1"));
    const expiresAt = Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60;

    it("Should allow operator to record certification", async function () {
      await expect(
        trustgate
          .connect(operator)
          .recordCertification(agent1.address, 2, 95, certHash, jobId, expiresAt)
      )
        .to.emit(trustgate, "CertificationIssued")
        .withArgs(agent1.address, 2, 95, certHash, expiresAt);

      const cert = await trustgate.getLatestCertification(agent1.address);
      expect(cert.level).to.equal(2); // TRUSTED
      expect(cert.scoreUint).to.equal(95);
      expect(cert.certHash).to.equal(certHash);
    });

    it("Should revert if non-operator tries to record", async function () {
      await expect(
        trustgate
          .connect(user1)
          .recordCertification(agent1.address, 2, 95, certHash, jobId, expiresAt)
      ).to.be.revertedWith("Only operator");
    });

    it("Should revert for invalid level", async function () {
      await expect(
        trustgate
          .connect(operator)
          .recordCertification(agent1.address, 4, 95, certHash, jobId, expiresAt)
      ).to.be.revertedWith("Invalid level");
    });

    it("Should revert for invalid score", async function () {
      await expect(
        trustgate
          .connect(operator)
          .recordCertification(agent1.address, 2, 101, certHash, jobId, expiresAt)
      ).to.be.revertedWith("Invalid score");
    });

    it("Should increment total certifications", async function () {
      await trustgate
        .connect(operator)
        .recordCertification(agent1.address, 2, 95, certHash, jobId, expiresAt);

      expect(await trustgate.totalCertifications()).to.equal(1);

      const certHash2 = ethers.keccak256(ethers.toUtf8Bytes("cert-2"));
      const jobId2 = ethers.keccak256(ethers.toUtf8Bytes("job-2"));

      await trustgate
        .connect(operator)
        .recordCertification(agent2.address, 1, 70, certHash2, jobId2, expiresAt);

      expect(await trustgate.totalCertifications()).to.equal(2);
    });
  });

  describe("Certification History", function () {
    it("Should track multiple certifications for same agent", async function () {
      const expiresAt = Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60;

      await trustgate
        .connect(operator)
        .recordCertification(
          agent1.address,
          1,
          65,
          ethers.keccak256(ethers.toUtf8Bytes("cert-1")),
          ethers.keccak256(ethers.toUtf8Bytes("job-1")),
          expiresAt
        );

      await trustgate
        .connect(operator)
        .recordCertification(
          agent1.address,
          2,
          85,
          ethers.keccak256(ethers.toUtf8Bytes("cert-2")),
          ethers.keccak256(ethers.toUtf8Bytes("job-2")),
          expiresAt
        );

      const history = await trustgate.getCertificationHistory(agent1.address);
      expect(history.length).to.equal(2);
      expect(history[0].level).to.equal(1); // First was CONDITIONAL
      expect(history[1].level).to.equal(2); // Second was TRUSTED
    });

    it("Should return latest certification", async function () {
      const expiresAt = Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60;

      await trustgate
        .connect(operator)
        .recordCertification(
          agent1.address,
          1,
          65,
          ethers.keccak256(ethers.toUtf8Bytes("cert-1")),
          ethers.keccak256(ethers.toUtf8Bytes("job-1")),
          expiresAt
        );

      await trustgate
        .connect(operator)
        .recordCertification(
          agent1.address,
          2,
          95,
          ethers.keccak256(ethers.toUtf8Bytes("cert-2")),
          ethers.keccak256(ethers.toUtf8Bytes("job-2")),
          expiresAt
        );

      const latest = await trustgate.getLatestCertification(agent1.address);
      expect(latest.level).to.equal(2); // Latest is TRUSTED
      expect(latest.scoreUint).to.equal(95);
    });
  });

  describe("Hook Interface - getCertificationLevel", function () {
    it("Should return UNVERIFIED for uncertified agent", async function () {
      const [level, expiresAt, active] = await trustgate.getCertificationLevel(
        agent1.address
      );
      expect(level).to.equal(0); // UNVERIFIED
      expect(active).to.be.false;
    });

    it("Should return correct level for certified agent", async function () {
      const expiresAt = Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60;

      await trustgate
        .connect(operator)
        .recordCertification(
          agent1.address,
          2,
          95,
          ethers.keccak256(ethers.toUtf8Bytes("cert-1")),
          ethers.keccak256(ethers.toUtf8Bytes("job-1")),
          expiresAt
        );

      const [level, expires, active] = await trustgate.getCertificationLevel(
        agent1.address
      );
      expect(level).to.equal(2); // TRUSTED
      expect(active).to.be.true;
    });

    it("Should return inactive for expired certification", async function () {
      const expiresAt = Math.floor(Date.now() / 1000) + 100; // Expires in 100 seconds

      await trustgate
        .connect(operator)
        .recordCertification(
          agent1.address,
          2,
          95,
          ethers.keccak256(ethers.toUtf8Bytes("cert-1")),
          ethers.keccak256(ethers.toUtf8Bytes("job-1")),
          expiresAt
        );

      // Fast forward time past expiry
      await ethers.provider.send("evm_increaseTime", [200]);
      await ethers.provider.send("evm_mine", []);

      const [level, expires, active] = await trustgate.getCertificationLevel(
        agent1.address
      );
      expect(level).to.equal(2); // Still TRUSTED level
      expect(active).to.be.false; // But not active
    });
  });

  describe("Hook Interface - isTrusted", function () {
    it("Should return false for uncertified agent", async function () {
      expect(await trustgate.isTrusted(agent1.address)).to.be.false;
    });

    it("Should return true for TRUSTED agent", async function () {
      const expiresAt = Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60;

      await trustgate
        .connect(operator)
        .recordCertification(
          agent1.address,
          2,
          95,
          ethers.keccak256(ethers.toUtf8Bytes("cert-1")),
          ethers.keccak256(ethers.toUtf8Bytes("job-1")),
          expiresAt
        );

      expect(await trustgate.isTrusted(agent1.address)).to.be.true;
    });

    it("Should return false for CONDITIONAL agent", async function () {
      const expiresAt = Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60;

      await trustgate
        .connect(operator)
        .recordCertification(
          agent1.address,
          1,
          70,
          ethers.keccak256(ethers.toUtf8Bytes("cert-1")),
          ethers.keccak256(ethers.toUtf8Bytes("job-1")),
          expiresAt
        );

      expect(await trustgate.isTrusted(agent1.address)).to.be.false;
    });

    it("Should return false for FLAGGED agent", async function () {
      const expiresAt = Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60;

      await trustgate
        .connect(operator)
        .recordCertification(
          agent1.address,
          3,
          20,
          ethers.keccak256(ethers.toUtf8Bytes("cert-1")),
          ethers.keccak256(ethers.toUtf8Bytes("job-1")),
          expiresAt
        );

      expect(await trustgate.isTrusted(agent1.address)).to.be.false;
    });

    it("Should return false for expired TRUSTED agent", async function () {
      const block = await ethers.provider.getBlock("latest");
      const expiresAt = block!.timestamp + 100;

      await trustgate
        .connect(operator)
        .recordCertification(
          agent1.address,
          2,
          95,
          ethers.keccak256(ethers.toUtf8Bytes("cert-1")),
          ethers.keccak256(ethers.toUtf8Bytes("job-1")),
          expiresAt
        );

      // Fast forward time past expiry
      await ethers.provider.send("evm_increaseTime", [200]);
      await ethers.provider.send("evm_mine", []);

      expect(await trustgate.isTrusted(agent1.address)).to.be.false;
    });
  });

  describe("Evaluations", function () {
    const jobId = ethers.keccak256(ethers.toUtf8Bytes("eval-job-1"));
    const deliverableHash = ethers.keccak256(ethers.toUtf8Bytes("deliverable-1"));

    it("Should allow operator to record evaluation", async function () {
      const tx = await trustgate
        .connect(operator)
        .recordEvaluation(
          jobId,
          agent1.address,
          user1.address,
          true,
          deliverableHash,
          "Deliverable is correct"
        );

      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);

      await expect(tx)
        .to.emit(trustgate, "EvaluationRecorded")
        .withArgs(jobId, agent1.address, true, block!.timestamp);

      const evaluation = await trustgate.getEvaluation(jobId);
      expect(evaluation.provider).to.equal(agent1.address);
      expect(evaluation.decision).to.be.true;
    });

    it("Should revert if non-operator tries to record evaluation", async function () {
      await expect(
        trustgate
          .connect(user1)
          .recordEvaluation(
            jobId,
            agent1.address,
            user1.address,
            true,
            deliverableHash,
            "Test"
          )
      ).to.be.revertedWith("Only operator");
    });

    it("Should prevent duplicate evaluations", async function () {
      await trustgate
        .connect(operator)
        .recordEvaluation(
          jobId,
          agent1.address,
          user1.address,
          true,
          deliverableHash,
          "First"
        );

      await expect(
        trustgate
          .connect(operator)
          .recordEvaluation(
            jobId,
            agent1.address,
            user1.address,
            false,
            deliverableHash,
            "Second"
          )
      ).to.be.revertedWith("Already evaluated");
    });
  });

  describe("Accuracy Tracking", function () {
    it("Should calculate evaluation accuracy correctly", async function () {
      const jobId1 = ethers.keccak256(ethers.toUtf8Bytes("job-1"));
      const jobId2 = ethers.keccak256(ethers.toUtf8Bytes("job-2"));
      const jobId3 = ethers.keccak256(ethers.toUtf8Bytes("job-3"));
      const deliverableHash = ethers.keccak256(ethers.toUtf8Bytes("deliverable"));

      // Record 3 evaluations
      await trustgate
        .connect(operator)
        .recordEvaluation(jobId1, agent1.address, user1.address, true, deliverableHash, "");
      await trustgate
        .connect(operator)
        .recordEvaluation(jobId2, agent1.address, user1.address, true, deliverableHash, "");
      await trustgate
        .connect(operator)
        .recordEvaluation(jobId3, agent1.address, user1.address, false, deliverableHash, "");

      // Resolve: 2 correct, 1 incorrect
      await trustgate.connect(operator).resolveEvaluationAccuracy(jobId1, true);
      await trustgate.connect(operator).resolveEvaluationAccuracy(jobId2, true);
      await trustgate.connect(operator).resolveEvaluationAccuracy(jobId3, false);

      const [evalRate, certRate, totalEvals, totalCerts] = await trustgate.getAccuracyScore();

      // 2 correct out of 3 = 66.66% = 6666 (percentage * 100)
      expect(evalRate).to.equal(6666);
      expect(totalEvals).to.equal(3);
    });

    it("Should prevent double resolution", async function () {
      const jobId = ethers.keccak256(ethers.toUtf8Bytes("job-1"));
      const deliverableHash = ethers.keccak256(ethers.toUtf8Bytes("deliverable"));

      await trustgate
        .connect(operator)
        .recordEvaluation(jobId, agent1.address, user1.address, true, deliverableHash, "");

      await trustgate.connect(operator).resolveEvaluationAccuracy(jobId, true);

      await expect(
        trustgate.connect(operator).resolveEvaluationAccuracy(jobId, true)
      ).to.be.revertedWith("Already resolved");
    });

    it("Should calculate certification accuracy correctly", async function () {
      const certHash1 = ethers.keccak256(ethers.toUtf8Bytes("cert-1"));
      const certHash2 = ethers.keccak256(ethers.toUtf8Bytes("cert-2"));

      // Record outcomes: 1 success, 1 failure
      await trustgate.connect(operator).recordCertificationOutcome(certHash1, true);
      await trustgate.connect(operator).recordCertificationOutcome(certHash2, false);

      const [evalRate, certRate, totalEvals, totalCerts] = await trustgate.getAccuracyScore();

      // 1 success out of 2 = 50% = 5000
      expect(certRate).to.equal(5000);
    });

    it("Should prevent duplicate outcome recording", async function () {
      const certHash = ethers.keccak256(ethers.toUtf8Bytes("cert-1"));

      await trustgate.connect(operator).recordCertificationOutcome(certHash, true);

      await expect(
        trustgate.connect(operator).recordCertificationOutcome(certHash, true)
      ).to.be.revertedWith("Outcome already recorded");
    });
  });

  describe("Access Control", function () {
    it("Should allow owner to update fee", async function () {
      const newFee = ethers.parseUnits("0.20", 6);
      await expect(trustgate.connect(owner).updateFee(newFee))
        .to.emit(trustgate, "FeeUpdated")
        .withArgs(CERTIFICATION_FEE, newFee);

      expect(await trustgate.certificationFee()).to.equal(newFee);
    });

    it("Should revert if non-owner tries to update fee", async function () {
      const newFee = ethers.parseUnits("0.20", 6);
      await expect(
        trustgate.connect(user1).updateFee(newFee)
      ).to.be.revertedWithCustomError(trustgate, "OwnableUnauthorizedAccount");
    });

    it("Should allow owner to update operator", async function () {
      await expect(trustgate.connect(owner).updateOperator(user1.address))
        .to.emit(trustgate, "OperatorUpdated")
        .withArgs(operator.address, user1.address);

      expect(await trustgate.operator()).to.equal(user1.address);
    });

    it("Should allow owner to pause and unpause", async function () {
      await trustgate.connect(owner).pause();
      expect(await trustgate.paused()).to.be.true;

      await trustgate.connect(owner).unpause();
      expect(await trustgate.paused()).to.be.false;
    });

    it("Should prevent operations when paused", async function () {
      await trustgate.connect(owner).pause();

      const certHash = ethers.keccak256(ethers.toUtf8Bytes("cert-1"));
      const jobId = ethers.keccak256(ethers.toUtf8Bytes("job-1"));
      const expiresAt = Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60;

      await expect(
        trustgate
          .connect(operator)
          .recordCertification(agent1.address, 2, 95, certHash, jobId, expiresAt)
      ).to.be.revertedWithCustomError(trustgate, "EnforcedPause");
    });
  });

  describe("Expiry", function () {
    it("Should correctly identify expired certifications", async function () {
      const block = await ethers.provider.getBlock("latest");
      const expiresAt = block!.timestamp + 100;

      await trustgate
        .connect(operator)
        .recordCertification(
          agent1.address,
          2,
          95,
          ethers.keccak256(ethers.toUtf8Bytes("cert-1")),
          ethers.keccak256(ethers.toUtf8Bytes("job-1")),
          expiresAt
        );

      // Fast forward time past expiry
      await ethers.provider.send("evm_increaseTime", [200]);
      await ethers.provider.send("evm_mine", []);

      expect(await trustgate.isExpired(agent1.address)).to.be.true;
    });

    it("Should correctly identify non-expired certifications", async function () {
      const expiresAt = Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60;

      await trustgate
        .connect(operator)
        .recordCertification(
          agent1.address,
          2,
          95,
          ethers.keccak256(ethers.toUtf8Bytes("cert-1")),
          ethers.keccak256(ethers.toUtf8Bytes("job-1")),
          expiresAt
        );

      expect(await trustgate.isExpired(agent1.address)).to.be.false;
    });
  });
});
