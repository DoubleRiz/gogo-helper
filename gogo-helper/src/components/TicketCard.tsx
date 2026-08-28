import { Body1, Caption1, Card, CardHeader, Text } from '@fluentui/react-components'
import type { Ticket } from '../domain/ticket'
import { BadgePriorite, BadgeStatut } from './Badges'

interface Props {
  ticket: Ticket
  onOuvrir: (ticket: Ticket) => void
  draggable?: boolean
  onDragStart?: (ticket: Ticket) => void
}

export function TicketCard({ ticket, onOuvrir, draggable = false, onDragStart }: Props) {
  return (
    <Card
      role="button"
      tabIndex={0}
      draggable={draggable}
      onDragStart={() => onDragStart?.(ticket)}
      onClick={() => onOuvrir(ticket)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOuvrir(ticket)
        }
      }}
      style={{ cursor: 'pointer', marginBottom: '8px' }}
    >
      <CardHeader
        header={<Body1><strong>#{ticket.id} — {ticket.titre || 'Sans titre'}</strong></Body1>}
        description={<Caption1>{ticket.demandeur || ticket.emailDemandeur}</Caption1>}
      />
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
        <BadgeStatut valeur={ticket.statut} />
        <BadgePriorite valeur={ticket.priorite} />
        {ticket.categorie !== '' && <Caption1>{ticket.categorie}</Caption1>}
      </div>
      {ticket.dateEcheance !== '' && (
        <Text size={200}>Échéance : {ticket.dateEcheance}</Text>
      )}
    </Card>
  )
}
