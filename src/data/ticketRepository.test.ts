import { beforeEach, describe, expect, it, vi } from 'vitest'

const getAll = vi.fn()
const create = vi.fn()
const update = vi.fn()
const supprime = vi.fn()

vi.mock('../generated/services/Tickets_SharePointService', () => ({
  Tickets_SharePointService: {
    getAll: (...args: unknown[]) => getAll(...args),
    create: (...args: unknown[]) => create(...args),
    update: (...args: unknown[]) => update(...args),
    delete: (...args: unknown[]) => supprime(...args),
  },
}))

const { creerTicket, listerTickets, majTicket, supprimerTicket } = await import('./ticketRepository')

beforeEach(() => {
  getAll.mockReset()
  create.mockReset()
  update.mockReset()
  supprime.mockReset()
})

describe('listerTickets', () => {
  it('traduit les enregistrements en tickets métier', async () => {
    getAll.mockResolvedValue({
      success: true,
      data: [{ ID: 1, Title: 'VPN', field_5: { Value: 'Nouveau', Id: 1, '@odata.type': '' } }],
    })
    const tickets = await listerTickets()
    expect(tickets).toHaveLength(1)
    expect(tickets[0].titre).toBe('VPN')
    expect(tickets[0].statut).toBe('Nouveau')
  })

  it('renvoie une liste vide quand la source ne renvoie rien', async () => {
    getAll.mockResolvedValue({ success: true, data: null })
    expect(await listerTickets()).toEqual([])
  })

  it('lève une erreur explicite en cas d’échec', async () => {
    getAll.mockResolvedValue({ success: false, data: null, error: new Error('403 interdit') })
    await expect(listerTickets()).rejects.toThrow('403 interdit')
  })

  it('lève un message par défaut quand l’échec n’a pas d’erreur', async () => {
    getAll.mockResolvedValue({ success: false, data: null })
    await expect(listerTickets()).rejects.toThrow('Impossible de charger les tickets.')
  })
})

describe('creerTicket', () => {
  it('envoie l’enregistrement traduit et renvoie le ticket créé', async () => {
    create.mockResolvedValue({ success: true, data: { ID: 5, Title: 'Imprimante' } })
    const nouveau = {
      titre: 'Imprimante', description: 'Bourrage', categorie: 'Matériel',
      priorite: 'Basse', statut: 'Nouveau', demandeur: 'Alice', emailDemandeur: 'alice@exemple.fr',
      gestionnaire: '', dateCreation: '2026-08-28', dateEcheance: '', dateResolution: '', commentaire: '',
    }
    const ticket = await creerTicket(nouveau)
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ Title: 'Imprimante', field_5: 'Nouveau' }))
    expect(ticket).toEqual({ ...nouveau, id: 5, modifie: '' })
  })

  it('ne perd pas les champs envoyés quand le connecteur ne renvoie que l’identifiant', async () => {
    create.mockResolvedValue({ success: true, data: { ID: 9, Modified: '2026-08-28T10:00:00Z' } })
    const ticket = await creerTicket({
      titre: 'Écran cassé', description: 'Fissure sur le coin', categorie: 'Matériel',
      priorite: 'Haute', statut: 'Nouveau', demandeur: 'Bob', emailDemandeur: 'bob@exemple.fr',
      gestionnaire: '', dateCreation: '2026-08-28', dateEcheance: '', dateResolution: '', commentaire: '',
    })
    expect(ticket.statut).toBe('Nouveau')
    expect(ticket.categorie).toBe('Matériel')
    expect(ticket.description).toBe('Fissure sur le coin')
    expect(ticket.id).toBe(9)
    expect(ticket.modifie).toBe('2026-08-28T10:00:00Z')
  })

  it('lève une erreur explicite en cas d’échec', async () => {
    create.mockResolvedValue({ success: false, data: null })
    await expect(
      creerTicket({
        titre: '', description: '', categorie: '', priorite: '', statut: '', demandeur: '',
        emailDemandeur: '', gestionnaire: '', dateCreation: '', dateEcheance: '',
        dateResolution: '', commentaire: '',
      }),
    ).rejects.toThrow('Impossible de créer le ticket.')
  })
})

describe('majTicket', () => {
  it('n’envoie que les champs modifiés, avec un identifiant en chaîne', async () => {
    update.mockResolvedValue({ success: true, data: { ID: 5, field_5: { Value: 'Résolu', Id: 4, '@odata.type': '' } } })
    const ticket = await majTicket(5, { statut: 'Résolu', dateResolution: '2026-08-28' })
    expect(update).toHaveBeenCalledWith('5', { field_5: 'Résolu', field_11: '2026-08-28' })
    expect(ticket.statut).toBe('Résolu')
  })

  it('lève une erreur explicite en cas d’échec', async () => {
    update.mockResolvedValue({ success: false, data: null })
    await expect(majTicket(5, { statut: 'Résolu' })).rejects.toThrow('Impossible de mettre à jour le ticket.')
  })
})

describe('supprimerTicket', () => {
  it('supprime par identifiant en chaîne', async () => {
    supprime.mockResolvedValue(undefined)
    await supprimerTicket(5)
    expect(supprime).toHaveBeenCalledWith('5')
  })
})
