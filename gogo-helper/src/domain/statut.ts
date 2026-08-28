import { appConfig } from '../config/app.config'
import type { Ticket } from './ticket'

/** Date locale au format yyyy-mm-dd (`toISOString` donnerait la date UTC). */
export function dateDuJour(): string {
  const maintenant = new Date()
  const mois = String(maintenant.getMonth() + 1).padStart(2, '0')
  const jour = String(maintenant.getDate()).padStart(2, '0')
  return `${maintenant.getFullYear()}-${mois}-${jour}`
}

/**
 * Calcule les champs à écrire lors d'un changement de statut.
 *
 * Passer à « Résolu » date la résolution du jour, sauf si une date était déjà
 * posée. Quitter « Résolu » pour un statut antérieur l'efface : un ticket
 * rouvert n'est plus résolu. « Clôturé » vient après « Résolu » et conserve
 * la date.
 */
export function appliquerChangementStatut(
  ticket: Ticket,
  nouveauStatut: string,
  aujourdHui: string,
): Partial<Ticket> {
  const changements: Partial<Ticket> = { statut: nouveauStatut }
  const indexNouveau = appConfig.statuts.indexOf(nouveauStatut)
  const indexResolu = appConfig.statuts.indexOf(appConfig.statutResolu)
  const atteintResolution = indexNouveau >= indexResolu && indexNouveau !== -1

  if (nouveauStatut === appConfig.statutResolu && ticket.dateResolution === '') {
    changements.dateResolution = aujourdHui
  } else if (!atteintResolution && ticket.dateResolution !== '') {
    changements.dateResolution = ''
  }
  return changements
}
