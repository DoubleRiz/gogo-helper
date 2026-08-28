import { describe, expect, it } from 'vitest'
import type { Tickets_SharePointRead } from '../generated/models/Tickets_SharePointModel'
import { normaliserDate, toTicket, toWriteRecord } from './ticket'

const enregistrementComplet = {
  ID: 42,
  Title: 'Écran noir au démarrage',
  field_2: 'Le poste ne démarre plus depuis la mise à jour.',
  field_3: { '@odata.type': '#Microsoft.Azure.Connectors.SharePoint.SPListExpandedReference', Value: 'Matériel', Id: 1 },
  field_4: { '@odata.type': '#Microsoft.Azure.Connectors.SharePoint.SPListExpandedReference', Value: 'Haute', Id: 3 },
  field_5: { '@odata.type': '#Microsoft.Azure.Connectors.SharePoint.SPListExpandedReference', Value: 'En cours', Id: 2 },
  field_6: 'Alice Martin',
  field_7: 'alice@exemple.fr',
  field_8: 'chef@exemple.fr',
  Datecr_x00e9_ationv2: '2026-08-01T00:00:00Z',
  field_10: '2026-08-10',
  field_11: '',
  field_12: 'Pièce commandée.',
  Modified: '2026-08-05T09:30:00Z',
} as Tickets_SharePointRead

describe('normaliserDate', () => {
  it('tronque un datetime ISO à la date', () => {
    expect(normaliserDate('2026-08-01T00:00:00Z')).toBe('2026-08-01')
  })

  it('laisse une date déjà normalisée intacte', () => {
    expect(normaliserDate('2026-08-10')).toBe('2026-08-10')
  })

  it('renvoie une chaîne vide pour une valeur absente', () => {
    expect(normaliserDate(undefined)).toBe('')
  })
})

describe('toTicket', () => {
  it('traduit tous les champs SharePoint en champs métier', () => {
    expect(toTicket(enregistrementComplet)).toEqual({
      id: 42,
      titre: 'Écran noir au démarrage',
      description: 'Le poste ne démarre plus depuis la mise à jour.',
      categorie: 'Matériel',
      priorite: 'Haute',
      statut: 'En cours',
      demandeur: 'Alice Martin',
      emailDemandeur: 'alice@exemple.fr',
      gestionnaire: 'chef@exemple.fr',
      dateCreation: '2026-08-01',
      dateEcheance: '2026-08-10',
      dateResolution: '',
      commentaire: 'Pièce commandée.',
      modifie: '2026-08-05T09:30:00Z',
    })
  })

  it('remplace les champs absents par des chaînes vides', () => {
    const ticket = toTicket({ ID: 7 } as Tickets_SharePointRead)
    expect(ticket.id).toBe(7)
    expect(ticket.titre).toBe('')
    expect(ticket.categorie).toBe('')
    expect(ticket.statut).toBe('')
    expect(ticket.dateEcheance).toBe('')
  })
})

describe('toWriteRecord', () => {
  it('n’émet que les champs fournis', () => {
    expect(toWriteRecord({ statut: 'Résolu' })).toEqual({ field_5: 'Résolu' })
  })

  it('aplatit les colonnes de choix en chaînes', () => {
    const ecriture = toWriteRecord({ categorie: 'Réseau', priorite: 'Basse', statut: 'Nouveau' })
    expect(ecriture).toEqual({ field_3: 'Réseau', field_4: 'Basse', field_5: 'Nouveau' })
  })

  it('traduit les champs texte et dates', () => {
    const ecriture = toWriteRecord({
      titre: 'VPN indisponible',
      description: 'Erreur 809',
      demandeur: 'Alice Martin',
      emailDemandeur: 'alice@exemple.fr',
      gestionnaire: 'chef@exemple.fr',
      dateCreation: '2026-08-28',
      dateEcheance: '2026-09-04',
      dateResolution: '',
      commentaire: '',
    })
    expect(ecriture).toEqual({
      Title: 'VPN indisponible',
      field_2: 'Erreur 809',
      field_6: 'Alice Martin',
      field_7: 'alice@exemple.fr',
      field_8: 'chef@exemple.fr',
      Datecr_x00e9_ationv2: '2026-08-28',
      field_10: '2026-09-04',
      field_11: '',
      field_12: '',
    })
  })

  it('ignore les champs en lecture seule', () => {
    expect(toWriteRecord({ id: 42, modifie: '2026-08-05T09:30:00Z', statut: 'Clôturé' })).toEqual({
      field_5: 'Clôturé',
    })
  })

  it('fait l’aller-retour depuis un ticket lu', () => {
    const ticket = toTicket(enregistrementComplet)
    const ecriture = toWriteRecord(ticket)
    expect(ecriture.Title).toBe('Écran noir au démarrage')
    expect(ecriture.field_3).toBe('Matériel')
    expect(ecriture.field_5).toBe('En cours')
    expect(ecriture.Datecr_x00e9_ationv2).toBe('2026-08-01')
  })
})
