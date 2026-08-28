import type { IOperationResult } from '@microsoft/power-apps/data'
import { Tickets_SharePointService } from '../generated/services/Tickets_SharePointService'
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
  return toTicket(deballer(resultat, 'Impossible de créer le ticket.'))
}

export async function majTicket(id: number, changements: Partial<Ticket>): Promise<Ticket> {
  const resultat = await Tickets_SharePointService.update(String(id), toWriteRecord(changements))
  return toTicket(deballer(resultat, 'Impossible de mettre à jour le ticket.'))
}

export async function supprimerTicket(id: number): Promise<void> {
  await Tickets_SharePointService.delete(String(id))
}
