import { useEffect, useState } from 'react'
import { getContext } from '@microsoft/power-apps/app'
import { appConfig } from '../config/app.config'
import type { Role } from '../domain/roles'
import { resolveRole } from '../domain/roles'

export interface UtilisateurCourant {
  email: string
  nom: string
  role: Role
  charge: boolean
}

const utilisateurInconnu: UtilisateurCourant = {
  email: '',
  nom: '',
  role: 'demandeur',
  charge: false,
}

/**
 * Récupère l'utilisateur connecté via le SDK Power Apps et en déduit son rôle.
 * En cas d'échec (app lancée hors du host Power Apps), on retombe sur un
 * demandeur anonyme plutôt que de bloquer l'interface.
 */
export function useCurrentUser(): UtilisateurCourant {
  const [utilisateur, setUtilisateur] = useState<UtilisateurCourant>(utilisateurInconnu)

  useEffect(() => {
    let annule = false
    async function charger() {
      try {
        const contexte = await getContext()
        if (annule) return
        const email = contexte.user.userPrincipalName ?? ''
        setUtilisateur({
          email,
          nom: contexte.user.fullName ?? email,
          role: resolveRole(email, appConfig.managerEmails),
          charge: true,
        })
      } catch {
        if (!annule) setUtilisateur({ ...utilisateurInconnu, charge: true })
      }
    }
    void charger()
    return () => {
      annule = true
    }
  }, [])

  return utilisateur
}
