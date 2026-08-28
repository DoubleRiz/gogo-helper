export type Role = 'demandeur' | 'gestionnaire'

/** Normalise un email pour comparaison : minuscules, sans espaces autour. */
export function normaliserEmail(email: string | undefined): string {
  return (email ?? '').trim().toLowerCase()
}

/**
 * Un utilisateur est gestionnaire si son email figure dans la liste de la
 * config. Tout le reste — y compris un email inconnu — est demandeur.
 */
export function resolveRole(email: string | undefined, managerEmails: string[]): Role {
  const normalise = normaliserEmail(email)
  if (normalise === '') return 'demandeur'
  const gestionnaires = managerEmails.map(normaliserEmail)
  return gestionnaires.includes(normalise) ? 'gestionnaire' : 'demandeur'
}
