const ADMIN_EMAIL = 'noamazar84@gmail.com'
const ADMIN_EMAILS = [ADMIN_EMAIL, 'novatrax25@gmail.com']

export const integrations = {
  auth: { provider: 'Google Identity Services + Email and Password' as const },
  checkout: { provider: 'Whop' as const },
  pricing: { trialDays: 7, priceCents: 1990, label: '$19.90' },
  admin: { email: ADMIN_EMAIL, emails: ADMIN_EMAILS },
}

export const isAdmin = (email?: string | null) =>
  !!email && integrations.admin.emails.includes(email.trim().toLowerCase())

/** The owner button is visible only for the verified Google owner in both Preview and production. */
export const showAdminLink = (user?: { email?: string | null; emailVerified?: boolean; provider?: 'google' | 'password' } | null) =>
  !!user?.emailVerified && user.provider === 'google' && isAdmin(user.email)
