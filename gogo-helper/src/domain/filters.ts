import { normaliserEmail } from './roles'
import type { Ticket } from './ticket'

export type Assignation = 'tous' | 'moi' | 'nonAssignes'

/** Une chaîne vide signifie « pas de filtre sur cette dimension ». */
export interface EtatFiltres {
  recherche: string
  statut: string
  priorite: string
  categorie: string
  assignation: Assignation
}

export const filtresVides: EtatFiltres = {
  recherche: '',
  statut: '',
  priorite: '',
  categorie: '',
  assignation: 'tous',
}

function correspondAssignation(ticket: Ticket, assignation: Assignation, emailUtilisateur: string): boolean {
  const gestionnaire = normaliserEmail(ticket.gestionnaire)
  if (assignation === 'moi') return gestionnaire === normaliserEmail(emailUtilisateur)
  if (assignation === 'nonAssignes') return gestionnaire === ''
  return true
}

/**
 * Filtrage côté client : le volume d'un helpdesk le permet, et le filtrage
 * OData sur les colonnes de choix SharePoint est peu fiable.
 */
export function filterTickets(
  tickets: Ticket[],
  filtres: EtatFiltres,
  emailUtilisateur: string,
): Ticket[] {
  const recherche = filtres.recherche.trim().toLowerCase()
  return tickets.filter((ticket) => {
    if (filtres.statut !== '' && ticket.statut !== filtres.statut) return false
    if (filtres.priorite !== '' && ticket.priorite !== filtres.priorite) return false
    if (filtres.categorie !== '' && ticket.categorie !== filtres.categorie) return false
    if (!correspondAssignation(ticket, filtres.assignation, emailUtilisateur)) return false
    if (recherche !== '') {
      const cible = `${ticket.titre} ${ticket.description} ${ticket.demandeur}`.toLowerCase()
      if (!cible.includes(recherche)) return false
    }
    return true
  })
}

/** Les tickets sans date de création vont à la fin. */
export function trierParDateCreationDesc(tickets: Ticket[]): Ticket[] {
  return [...tickets].sort((a, b) => {
    if (a.dateCreation === b.dateCreation) return 0
    if (a.dateCreation === '') return 1
    if (b.dateCreation === '') return -1
    return a.dateCreation < b.dateCreation ? 1 : -1
  })
}

export function compterParStatut(tickets: Ticket[]): Record<string, number> {
  const compteurs: Record<string, number> = {}
  for (const ticket of tickets) {
    compteurs[ticket.statut] = (compteurs[ticket.statut] ?? 0) + 1
  }
  return compteurs
}
