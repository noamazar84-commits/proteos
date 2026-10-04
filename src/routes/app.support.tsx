import { createFileRoute } from '@tanstack/react-router'
import { HeartPulse, ShieldCheck } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { SupportChatbot } from '@/components/SupportChatbot'
import { getPathway } from '@/lib/fixtures'
import { useAppState } from '@/lib/store'

export const Route = createFileRoute('/app/support')({ component: WellnessSupport })

function WellnessSupport() {
  const state = useAppState()
  const pathway = state.profile ? getPathway(state.profile.pathwayId) : null
  return <div>
      <PageHeader eyebrow={`${pathway?.name ?? 'Pathway'} AI Coach`} title={`${pathway?.name ?? 'Pathway'} guidance, one next step`}>
      {pathway?.id === 'glp1' ? 'Daily clean-protein pacing, structured hydration, appetite, and titration check-ins.' : pathway?.id === 'bariatric' ? 'Post-op texture, tiny whole-food portions, hydration, recovery, and symptom check-ins.' : 'Natural-food macros, movement, hydration, adherence, and plateau-breaking check-ins.'} Proteus is not medical or clinical care.
    </PageHeader>
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <section className="panel p-6">
        <HeartPulse className="h-8 w-8 text-volt-2" />
        <h2 className="font-display mt-5 text-2xl font-bold text-white">Your support focus</h2>
        <p className="mt-3 text-base leading-relaxed text-white">{pathway ? `${pathway.name}: ${pathway.tagline}.` : 'Choose a pathway to tailor support to your goals.'}</p>
        <ul className="mt-6 space-y-3 text-sm text-white">
          <li>• Check in on energy, appetite, mood, and adherence.</li>
          <li>• Get practical next-step guidance for food and training.</li>
          <li>• Escalate medication, surgery, or concerning symptoms to your clinician.</li>
        </ul>
        <div className="mt-7 flex items-start gap-3 rounded-xl border border-volt/30 bg-volt/10 p-4 text-sm text-white"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-volt-2" /><span>Proteus is an AI-powered tracking and educational tool and does NOT replace professional medical or nutritional advice. Always consult with qualified healthcare professionals for medical or dietary decisions.</span></div>
      </section>
      <section className="panel min-h-[28rem] p-6"><SupportChatbot inline pathwayName={pathway?.name} /></section>
    </div>
  </div>
}
