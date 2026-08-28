import { Body1, Caption1, Divider, Text } from '@fluentui/react-components'
import type { Ticket } from '../domain/ticket'
import { BadgePriorite, BadgeStatut } from './Badges'

function Ligne({ libelle, valeur }: { libelle: string; valeur: string }) {
  return (
    <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
      <Caption1 style={{ minWidth: '140px', opacity: 0.7 }}>{libelle}</Caption1>
      <Text size={300}>{valeur || '—'}</Text>
    </div>
  )
}

export function TicketDetails({ ticket }: { ticket: Ticket }) {
  return (
    <div>
      <Body1><strong>#{ticket.id} — {ticket.titre || 'Sans titre'}</strong></Body1>
      <div style={{ display: 'flex', gap: '6px', margin: '8px 0' }}>
        <BadgeStatut valeur={ticket.statut} />
        <BadgePriorite valeur={ticket.priorite} />
      </div>
      <Text size={300} style={{ whiteSpace: 'pre-wrap', display: 'block', marginBottom: '12px' }}>
        {ticket.description || 'Aucune description.'}
      </Text>
      <Divider style={{ margin: '12px 0' }} />
      <Ligne libelle="Catégorie" valeur={ticket.categorie} />
      <Ligne libelle="Demandeur" valeur={ticket.demandeur} />
      <Ligne libelle="Email demandeur" valeur={ticket.emailDemandeur} />
      <Ligne libelle="Gestionnaire" valeur={ticket.gestionnaire} />
      <Ligne libelle="Date de création" valeur={ticket.dateCreation} />
      <Ligne libelle="Échéance" valeur={ticket.dateEcheance} />
      <Ligne libelle="Date de résolution" valeur={ticket.dateResolution} />
      <Divider style={{ margin: '12px 0' }} />
      <Caption1 style={{ opacity: 0.7 }}>Commentaire du gestionnaire</Caption1>
      <Text size={300} style={{ whiteSpace: 'pre-wrap', display: 'block' }}>
        {ticket.commentaire || 'Aucun commentaire pour le moment.'}
      </Text>
    </div>
  )
}
