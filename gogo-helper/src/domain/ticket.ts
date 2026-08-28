import type {
  Tickets_SharePointRead,
  Tickets_SharePointWrite,
} from '../generated/models/Tickets_SharePointModel'

/**
 * Le ticket tel que le manipule l'application. Ce module est le SEUL endroit
 * où apparaissent les noms de colonnes SharePoint (field_2, field_3…). Si la
 * liste évolue, seul ce fichier change.
 */
export interface Ticket {
  id: number
  titre: string
  description: string
  categorie: string
  priorite: string
  statut: string
  demandeur: string
  emailDemandeur: string
  gestionnaire: string
  /** yyyy-mm-dd */
  dateCreation: string
  /** yyyy-mm-dd */
  dateEcheance: string
  /** yyyy-mm-dd, vide tant que le ticket n'est pas résolu */
  dateResolution: string
  commentaire: string
  /** ISO datetime, renseigné par SharePoint */
  modifie: string
}

export type NouveauTicket = Omit<Ticket, 'id' | 'modifie'>

/** Ramène un datetime ISO ou une date SharePoint à yyyy-mm-dd. */
export function normaliserDate(valeur: string | undefined): string {
  if (!valeur) return ''
  return valeur.slice(0, 10)
}

export function toTicket(record: Tickets_SharePointRead): Ticket {
  return {
    id: record.ID ?? 0,
    titre: record.Title ?? '',
    description: record.field_2 ?? '',
    categorie: record.field_3?.Value ?? '',
    priorite: record.field_4?.Value ?? '',
    statut: record.field_5?.Value ?? '',
    demandeur: record.field_6 ?? '',
    emailDemandeur: record.field_7 ?? '',
    gestionnaire: record.field_8 ?? '',
    dateCreation: normaliserDate(record.Datecr_x00e9_ationv2),
    dateEcheance: normaliserDate(record.field_10),
    dateResolution: normaliserDate(record.field_11),
    commentaire: record.field_12 ?? '',
    modifie: record.Modified ?? '',
  }
}

/**
 * Traduit un sous-ensemble de champs métier en enregistrement SharePoint.
 * Seules les clés présentes dans `champs` sont émises : l'appelant peut donc
 * envoyer une mise à jour partielle sans écraser le reste du ticket.
 * `id` et `modifie` sont en lecture seule et sont ignorés.
 */
export function toWriteRecord(champs: Partial<Ticket>): Partial<Tickets_SharePointWrite> {
  const record: Partial<Tickets_SharePointWrite> = {}
  if (champs.titre !== undefined) record.Title = champs.titre
  if (champs.description !== undefined) record.field_2 = champs.description
  if (champs.categorie !== undefined) record.field_3 = champs.categorie
  if (champs.priorite !== undefined) record.field_4 = champs.priorite
  if (champs.statut !== undefined) record.field_5 = champs.statut
  if (champs.demandeur !== undefined) record.field_6 = champs.demandeur
  if (champs.emailDemandeur !== undefined) record.field_7 = champs.emailDemandeur
  if (champs.gestionnaire !== undefined) record.field_8 = champs.gestionnaire
  if (champs.dateCreation !== undefined) record.Datecr_x00e9_ationv2 = champs.dateCreation
  if (champs.dateEcheance !== undefined) record.field_10 = champs.dateEcheance
  if (champs.dateResolution !== undefined) record.field_11 = champs.dateResolution
  if (champs.commentaire !== undefined) record.field_12 = champs.commentaire
  return record
}
