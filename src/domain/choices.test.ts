import { describe, expect, it } from 'vitest'
import type { Ticket } from './ticket'
import { collectChoices, mergeChoices } from './choices'

function ticket(champs: Partial<Ticket>): Ticket {
  return {
    id: 1, titre: '', description: '', categorie: '', priorite: '', statut: '',
    demandeur: '', emailDemandeur: '', gestionnaire: '', dateCreation: '',
    dateEcheance: '', dateResolution: '', commentaire: '', modifie: '',
    ...champs,
  }
}

describe('mergeChoices', () => {
  it('conserve l’ordre de la configuration', () => {
    expect(mergeChoices(['Nouveau', 'En cours'], [])).toEqual(['Nouveau', 'En cours'])
  })

  it('ajoute les valeurs inédites en fin de liste', () => {
    expect(mergeChoices(['Nouveau'], ['En cours', 'Nouveau'])).toEqual(['Nouveau', 'En cours'])
  })

  it('ne duplique pas une valeur rencontrée plusieurs fois', () => {
    expect(mergeChoices([], ['Haute', 'Haute', 'Basse'])).toEqual(['Haute', 'Basse'])
  })

  it('ignore les valeurs vides', () => {
    expect(mergeChoices(['Nouveau'], ['', '  '])).toEqual(['Nouveau'])
  })

  it('renvoie la configuration seule quand aucun ticket n’existe', () => {
    expect(mergeChoices(['Basse', 'Haute'], [])).toEqual(['Basse', 'Haute'])
  })
})

describe('collectChoices', () => {
  it('fusionne les trois dimensions avec la configuration', () => {
    const choix = collectChoices([
      ticket({ statut: 'Archivé', priorite: 'Haute', categorie: 'Téléphonie' }),
    ])
    expect(choix.statuts[choix.statuts.length - 1]).toBe('Archivé')
    expect(choix.statuts).toContain('Nouveau')
    expect(choix.categories[choix.categories.length - 1]).toBe('Téléphonie')
    expect(choix.priorites).toEqual(['Basse', 'Moyenne', 'Haute', 'Critique'])
  })

  it('renvoie les valeurs de configuration sur une liste vide', () => {
    const choix = collectChoices([])
    expect(choix.statuts).toEqual(['Nouveau', 'En cours', 'En attente', 'Résolu', 'Clôturé'])
    expect(choix.categories).toEqual(['Matériel', 'Logiciel', 'Réseau', 'Accès / Compte', 'Autre'])
  })
})
