import type { ManualTriggerInput } from '../generated/models/NotifierunnouveauticketModel'
import type { Ticket } from './ticket'

/**
 * Ce module est le SEUL endroit qui connaît les noms de paramètres du flow
 * « Notifier un nouveau ticket ». Le déclencheur Power Apps V2 les expose sous
 * la forme `text`, `text_1`, `text_2`… dans l'ordre où ils ont été ajoutés au
 * flow : ajouter ou réordonner un paramètre ne doit toucher que ce fichier.
 */
export type ChampsNotifies = Pick<Ticket, 'titre' | 'description' | 'priorite'>

export function toNotificationInput(
  ticket: ChampsNotifies,
  emailEquipeIT: string,
): ManualTriggerInput {
  return {
    text: emailEquipeIT,
    text_1: ticket.description,
    text_2: ticket.priorite,
    text_3: ticket.titre,
  }
}
