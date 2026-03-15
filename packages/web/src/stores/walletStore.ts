import { create } from "zustand";
import { ethers } from "ethers";

interface WalletState {
  address: string | null;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  address: null,
  isConnecting: false,
  error: null,

  connect: async () => {
    set({ isConnecting: true, error: null });

    try {
      // Check if MetaMask is installed
      if (!window.ethereum) {
        throw new Error("MetaMask no está instalada. Instálala desde metamask.io");
      }

      // Request account access
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);

      if (!accounts || accounts.length === 0) {
        throw new Error("No se encontraron cuentas en MetaMask");
      }

      const address = accounts[0];

      // Check if on Base mainnet (chain ID 8453)
      const network = await provider.getNetwork();
      if (network.chainId !== 8453n) {
        // Try to switch to Base mainnet
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0x2105" }], // 8453 in hex
          });
        } catch (switchError: any) {
          // Chain not added, add it
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: "0x2105",
                  chainName: "Base Mainnet",
                  nativeCurrency: {
                    name: "Ethereum",
                    symbol: "ETH",
                    decimals: 18,
                  },
                  rpcUrls: ["https://mainnet.base.org"],
                  blockExplorerUrls: ["https://basescan.org"],
                },
              ],
            });
          } else {
            throw switchError;
          }
        }
      }

      set({ address, isConnecting: false, error: null });

      // Listen for account changes
      window.ethereum.on("accountsChanged", (accounts: string[]) => {
        if (accounts.length === 0) {
          set({ address: null });
        } else {
          set({ address: accounts[0] });
        }
      });

      // Listen for chain changes
      window.ethereum.on("chainChanged", () => {
        window.location.reload();
      });
    } catch (error: any) {
      console.error("Error connecting wallet:", error);
      set({
        error: error.message || "Error al conectar MetaMask",
        isConnecting: false,
      });
    }
  },

  disconnect: () => {
    set({ address: null, error: null });
  },
}));

// Extend window type for ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}
