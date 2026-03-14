import type { CertificationLevel } from '@trustgate/shared'

interface Props {
  level: CertificationLevel
  score: number
}

const levelColors = {
  TRUSTED: 'text-trustedFg',
  CONDITIONAL: 'text-conditionalFg',
  UNVERIFIED: 'text-unverifiedFg',
  FLAGGED: 'text-flaggedFg',
}

export default function CertVerdictHero({ level, score }: Props) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] border-b border-border">
      <div className={`font-display text-[12rem] leading-none ${levelColors[level]}`}>
        {level}
      </div>
      <div className="font-mono text-4xl text-muted mt-4">
        {score}/100
      </div>
    </div>
  )
}
