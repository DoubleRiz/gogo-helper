import { appConfig } from '../config/app.config'
import type { Ticket } from './ticket'

export interface Choix {
  statuts: string[]
  priorites: string[]
  categories: string[]
}

/**
 * Les valeurs de la config donnent l'ordre de référence ; toute valeur
 * rencontrée dans les tickets mais absente de la config est ajoutée à la fin.
 * La config seule laisserait passer un libellé SharePoint non prévu ; les
 * tickets seuls laisseraient l'app vide au premier lancement.
 */
export function mergeChoices(configurees: string[], rencontrees: string[]): string[] {
  const resultat: string[] = []
  const vues = new Set<string>()
  for (const valeur of [...configurees, ...rencontrees]) {
    const propre = valeur.trim()
    if (propre === '' || vues.has(propre)) continue
    vues.add(propre)
    resultat.push(propre)
  }
  return resultat
}

export function collectChoices(tickets: Ticket[]): Choix {
  return {
    statuts: mergeChoices(appConfig.statuts, tickets.map((t) => t.statut)),
    priorites: mergeChoices(appConfig.priorites, tickets.map((t) => t.priorite)),
    categories: mergeChoices(appConfig.categories, tickets.map((t) => t.categorie)),
  }
}
