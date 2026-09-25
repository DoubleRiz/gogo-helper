import type { IOperationResult } from '@microsoft/power-apps/data'
import { Tickets_SharePointService } from '../generated/services/Tickets_SharePointService'
import { NotifierunnouveauticketService } from '../generated/services/NotifierunnouveauticketService'
import type { Tickets_SharePointRead } from '../generated/models/Tickets_SharePointModel'
import type { NouveauTicket, Ticket } from '../domain/ticket'
import { toTicket, toWriteRecord } from '../domain/ticket'

/** Déballe un résultat d'opération, ou lève une erreur lisible par l'utilisateur. */
function deballer<T>(resultat: IOperationResult<T>, messageParDefaut: string): T {
  if (!resultat.success) {
    throw new Error(resultat.error?.message ?? messageParDefaut)
  }
  return resultat.data
}

export async function listerTickets(): Promise<Ticket[]> {
  const resultat = await Tickets_SharePointService.getAll({
    orderBy: ['Datecr_x00e9_ationv2 desc'],
  })
  const enregistrements = deballer(resultat, 'Impossible de charger les tickets.')
  return (enregistrements ?? []).map((record: Tickets_SharePointRead) => toTicket(record))
}

export async function creerTicket(nouveau: NouveauTicket): Promise<Ticket> {
  const resultat = await Tickets_SharePointService.create(toWriteRecord(nouveau))
  const enregistrement = deballer(resultat, 'Impossible de créer le ticket.')
  // Le connecteur SharePoint ne renvoie fiablement que l'identifiant (et parfois
  // le titre) sur une création, pas l'enregistrement complet : on garde donc les
  // champs qu'on vient d'envoyer et on ne prend du serveur que l'id et la date
  // de modification.
  return { ...nouveau, id: enregistrement.ID ?? 0, modifie: enregistrement.Modified ?? '' }
}

export async function majTicket(id: number, changements: Partial<Ticket>): Promise<Ticket> {
  const resultat = await Tickets_SharePointService.update(String(id), toWriteRecord(changements))
  return toTicket(deballer(resultat, 'Impossible de mettre à jour le ticket.'))
}

export async function supprimerTicket(id: number): Promise<void> {
  await Tickets_SharePointService.delete(String(id))
}

/** Déclenche le flow de test « Notifier un nouveau ticket » pour vérifier qu'il fonctionne. */
export async function alerterEquipeIT(): Promise<void> {
  const resultat = await NotifierunnouveauticketService.Run({ text: 'gautier.baleda@alegria.academy' })
  deballer(resultat, "Impossible de contacter l'équipe IT.")
}
