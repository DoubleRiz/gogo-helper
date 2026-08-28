import { describe, expect, it } from 'vitest'
import type { Ticket } from './ticket'
import { appliquerChangementStatut, dateDuJour } from './statut'

function ticket(champs: Partial<Ticket>): Ticket {
  return {
    id: 1, titre: '', description: '', categorie: '', priorite: '', statut: '',
    demandeur: '', emailDemandeur: '', gestionnaire: '', dateCreation: '',
    dateEcheance: '', dateResolution: '', commentaire: '', modifie: '',
    ...champs,
  }
}

describe('appliquerChangementStatut', () => {
  it('renseigne la date de résolution au passage en Résolu', () => {
    const changements = appliquerChangementStatut(ticket({ statut: 'En cours' }), 'Résolu', '2026-08-28')
    expect(changements).toEqual({ statut: 'Résolu', dateResolution: '2026-08-28' })
  })

  it('conserve une date de résolution déjà renseignée', () => {
    const dejaResolu = ticket({ statut: 'Résolu', dateResolution: '2026-08-20' })
    const changements = appliquerChangementStatut(dejaResolu, 'Résolu', '2026-08-28')
    expect(changements).toEqual({ statut: 'Résolu' })
  })

  it('efface la date de résolution en sortant de Résolu', () => {
    const resolu = ticket({ statut: 'Résolu', dateResolution: '2026-08-20' })
    const changements = appliquerChangementStatut(resolu, 'En cours', '2026-08-28')
    expect(changements).toEqual({ statut: 'En cours', dateResolution: '' })
  })

  it('ne touche pas à la date de résolution entre deux statuts non résolus', () => {
    const changements = appliquerChangementStatut(ticket({ statut: 'Nouveau' }), 'En cours', '2026-08-28')
    expect(changements).toEqual({ statut: 'En cours' })
  })

  it('laisse Clôturé conserver la date de résolution existante', () => {
    const resolu = ticket({ statut: 'Résolu', dateResolution: '2026-08-20' })
    const changements = appliquerChangementStatut(resolu, 'Clôturé', '2026-08-28')
    expect(changements).toEqual({ statut: 'Clôturé' })
  })
})

describe('dateDuJour', () => {
  it('renvoie une date au format yyyy-mm-dd', () => {
    expect(dateDuJour()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
