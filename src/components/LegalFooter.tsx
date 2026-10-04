import { Link } from '@tanstack/react-router'

export function LegalFooter({ className = '' }: { className?: string }) {
  return <footer className={`relative z-10 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 pb-0 text-sm font-semibold text-white ${className}`}><span className="font-bold text-white">© {new Date().getFullYear()} Proteus</span><Link className="text-white hover:text-volt-2" to="/support" hash="faq">FAQ</Link><Link className="text-white hover:text-volt-2" to="/support" hash="connect">Connect Us</Link><Link className="text-white hover:text-volt-2" to="/privacy">Privacy Policy</Link><Link className="text-white hover:text-volt-2" to="/terms">Terms of Use</Link></footer>
}
