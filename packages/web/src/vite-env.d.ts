/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_CONTRACT_ADDRESS: string
  readonly VITE_ERC8004_REGISTRY_ADDRESS: string
  readonly VITE_ERC8183_FACTORY_ADDRESS: string
  readonly VITE_CHAIN_ID: string
  readonly VITE_USDC_ADDRESS: string
  readonly VITE_BASESCAN_URL: string
  readonly VITE_AGENT_ADDRESS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
