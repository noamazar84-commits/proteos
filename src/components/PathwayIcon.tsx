import { Flame, HeartPulse, Syringe } from 'lucide-react'
import type { PathwayId } from '@/lib/fixtures'

const ICONS = { glp1: Syringe, bariatric: HeartPulse, general: Flame } as const

export function PathwayIcon({ id, className }: { id: PathwayId; className?: string }) {
  const Icon = ICONS[id]
  return <Icon className={className} />
}
