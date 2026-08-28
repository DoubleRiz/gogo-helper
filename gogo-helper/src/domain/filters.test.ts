import { describe, expect, it } from 'vitest'
import type { Ticket } from './ticket'
import { compterParStatut, filterTickets, filtresVides, trierParDateCreationDesc } from './filters'

function ticket(champs: Partial<Ticket>): Ticket {
  return {
    id: 1, titre: '', description: '', categorie: '', priorite: '', statut: '',
    demandeur: '', emailDemandeur: '', gestionnaire: '', dateCreation: '',
    dateEcheance: '', dateResolution: '', commentaire: '', modifie: '',
    ...champs,
  }
}

const tickets = [
  ticket({ id: 1, titre: 'VPN indisponible', description: 'Erreur 809', demandeur: 'Alice Martin', statut: 'Nouveau', priorite: 'Haute', categorie: 'Réseau', gestionnaire: '', dateCreation: '2026-08-01' }),
  ticket({ id: 2, titre: 'Imprimante bloquée', description: 'Bourrage papier', demandeur: 'Bob Durand', statut: 'En cours', priorite: 'Basse', categorie: 'Matériel', gestionnaire: 'chef@exemple.fr', dateCreation: '2026-08-03' }),
  ticket({ id: 3, titre: 'Accès refusé', description: 'Compte verrouillé', demandeur: 'Alice Martin', statut: 'Résolu', priorite: 'Haute', categorie: 'Accès / Compte', gestionnaire: 'autre@exemple.fr', dateCreation: '2026-08-02' }),
]

describe('filterTickets', () => {
  it('renvoie tout avec des filtres vides', () => {
    expect(filterTickets(tickets, filtresVides, 'chef@exemple.fr')).toHaveLength(3)
  })

  it('filtre par statut', () => {
    const resultat = filterTickets(tickets, { ...filtresVides, statut: 'Nouveau' }, 'chef@exemple.fr')
    expect(resultat.map((t) => t.id)).toEqual([1])
  })

  it('filtre par priorité', () => {
    const resultat = filterTickets(tickets, { ...filtresVides, priorite: 'Haute' }, 'chef@exemple.fr')
    expect(resultat.map((t) => t.id)).toEqual([1, 3])
  })

  it('filtre par catégorie', () => {
    const resultat = filterTickets(tickets, { ...filtresVides, categorie: 'Matériel' }, 'chef@exemple.fr')
    expect(resultat.map((t) => t.id)).toEqual([2])
  })

  it('cherche dans le titre, la description et le demandeur, sans tenir compte de la casse', () => {
    expect(filterTickets(tickets, { ...filtresVides, recherche: 'vpn' }, '').map((t) => t.id)).toEqual([1])
    expect(filterTickets(tickets, { ...filtresVides, recherche: 'bourrage' }, '').map((t) => t.id)).toEqual([2])
    expect(filterTickets(tickets, { ...filtresVides, recherche: 'alice' }, '').map((t) => t.id)).toEqual([1, 3])
  })

  it('retient mes tickets assignés', () => {
    const resultat = filterTickets(tickets, { ...filtresVides, assignation: 'moi' }, 'CHEF@exemple.fr')
    expect(resultat.map((t) => t.id)).toEqual([2])
  })

  it('retient les tickets non assignés', () => {
    const resultat = filterTickets(tickets, { ...filtresVides, assignation: 'nonAssignes' }, 'chef@exemple.fr')
    expect(resultat.map((t) => t.id)).toEqual([1])
  })

  it('combine plusieurs filtres', () => {
    const resultat = filterTickets(
      tickets,
      { ...filtresVides, priorite: 'Haute', recherche: 'accès' },
      'chef@exemple.fr',
    )
    expect(resultat.map((t) => t.id)).toEqual([3])
  })

  it('renvoie une liste vide quand rien ne correspond', () => {
    expect(filterTickets(tickets, { ...filtresVides, statut: 'Clôturé' }, '')).toEqual([])
  })
})

describe('trierParDateCreationDesc', () => {
  it('trie du plus récent au plus ancien', () => {
    expect(trierParDateCreationDesc(tickets).map((t) => t.id)).toEqual([2, 3, 1])
  })

  it('ne modifie pas le tableau d’origine', () => {
    const copie = [...tickets]
    trierParDateCreationDesc(tickets)
    expect(tickets).toEqual(copie)
  })

  it('place les tickets sans date de création à la fin', () => {
    const avecVide = [ticket({ id: 9, dateCreation: '' }), ...tickets]
    expect(trierParDateCreationDesc(avecVide).map((t) => t.id)).toEqual([2, 3, 1, 9])
  })
})

describe('compterParStatut', () => {
  it('compte les tickets de chaque statut', () => {
    expect(compterParStatut(tickets)).toEqual({ 'Nouveau': 1, 'En cours': 1, 'Résolu': 1 })
  })

  it('renvoie un objet vide sur une liste vide', () => {
    expect(compterParStatut([])).toEqual({})
  })
})
