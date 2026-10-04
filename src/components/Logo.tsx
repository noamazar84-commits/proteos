export function Logo({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const box = size === 'sm' ? 'h-8 w-8' : 'h-9 w-9'
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className={`${box} grid place-items-center rounded-xl border border-volt/60 bg-volt/15 shadow-[0_0_18px_rgba(61,139,255,0.55)]`}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#bfe0ff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 17 9 11l4 4 7-9" />
          <path d="M15 6h5v5" />
        </svg>
      </span>
      <span className="font-display text-lg font-extrabold tracking-tight text-white">
        Proteus
      </span>
    </span>
  )
}
