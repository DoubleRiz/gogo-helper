import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Choix } from '../domain/choices'
import { collectChoices } from '../domain/choices'
import { trierParDateCreationDesc } from '../domain/filters'
import type { NouveauTicket, Ticket } from '../domain/ticket'
import { creerTicket, listerTickets, majTicket, supprimerTicket } from './ticketRepository'

export interface EtatTickets {
  tickets: Ticket[]
  choix: Choix
  charge: boolean
  erreur: string
  recharger: () => Promise<void>
  creer: (nouveau: NouveauTicket) => Promise<void>
  modifier: (id: number, changements: Partial<Ticket>) => Promise<void>
  supprimer: (id: number) => Promise<void>
  effacerErreur: () => void
}

function messageDe(erreur: unknown, parDefaut: string): string {
  return erreur instanceof Error && erreur.message ? erreur.message : parDefaut
}

export function useTickets(): EtatTickets {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [charge, setCharge] = useState(false)
  const [erreur, setErreur] = useState('')

  const recharger = useCallback(async () => {
    setCharge(false)
    setErreur('')
    try {
      setTickets(trierParDateCreationDesc(await listerTickets()))
    } catch (e) {
      setErreur(messageDe(e, 'Impossible de charger les tickets.'))
    } finally {
      setCharge(true)
    }
  }, [])

  useEffect(() => {
    // Chargement initial : `recharger` remet l'indicateur de chargement à zéro
    // de façon synchrone, ce que la règle react-hooks interdit dans un effet.
    // C'est ici volontaire — l'effet ne sert qu'à amorcer la première lecture.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void recharger()
  }, [recharger])

  const creer = useCallback(async (nouveau: NouveauTicket) => {
    setErreur('')
    try {
      const cree = await creerTicket(nouveau)
      setTickets((precedents) => trierParDateCreationDesc([cree, ...precedents]))
    } catch (e) {
      setErreur(messageDe(e, 'Impossible de créer le ticket.'))
      throw e
    }
  }, [])

  /**
   * Mise à jour optimiste : l'écran réagit immédiatement (indispensable pour
   * le glisser-déposer du kanban) et l'état précédent est restauré si le
   * serveur refuse.
   */
  const modifier = useCallback(async (id: number, changements: Partial<Ticket>) => {
    setErreur('')
    let precedents: Ticket[] = []
    setTickets((actuels) => {
      precedents = actuels
      return actuels.map((t) => (t.id === id ? { ...t, ...changements } : t))
    })
    try {
      const aJour = await majTicket(id, changements)
      setTickets((actuels) => actuels.map((t) => (t.id === id ? aJour : t)))
    } catch (e) {
      setTickets(precedents)
      setErreur(messageDe(e, 'Impossible de mettre à jour le ticket.'))
    }
  }, [])

  const supprimer = useCallback(async (id: number) => {
    setErreur('')
    let precedents: Ticket[] = []
    setTickets((actuels) => {
      precedents = actuels
      return actuels.filter((t) => t.id !== id)
    })
    try {
      await supprimerTicket(id)
    } catch (e) {
      setTickets(precedents)
      setErreur(messageDe(e, 'Impossible de supprimer le ticket.'))
    }
  }, [])

  const choix = useMemo(() => collectChoices(tickets), [tickets])
  const effacerErreur = useCallback(() => setErreur(''), [])

  return { tickets, choix, charge, erreur, recharger, creer, modifier, supprimer, effacerErreur }
}
