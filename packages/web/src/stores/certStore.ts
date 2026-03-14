import { create } from 'zustand'
import type { AgentCertification } from '@trustgate/shared'

interface CertStore {
  certifications: Record<string, AgentCertification>
  setCertification: (address: string, cert: AgentCertification) => void
  getCertification: (address: string) => AgentCertification | undefined
}

export const useCertStore = create<CertStore>((set, get) => ({
  certifications: {},
  setCertification: (address, cert) =>
    set((state) => ({
      certifications: { ...state.certifications, [address]: cert },
    })),
  getCertification: (address) => get().certifications[address],
}))
