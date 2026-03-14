import { useQuery } from '@tanstack/react-query'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export function useAccuracy() {
  return useQuery({
    queryKey: ['accuracy'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/accuracy`)
      if (!res.ok) throw new Error('Failed to fetch accuracy')
      return res.json()
    },
    refetchInterval: 10000, // 10s
  })
}
