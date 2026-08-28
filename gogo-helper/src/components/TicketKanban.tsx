import { useState } from 'react'
import { Caption1, Text } from '@fluentui/react-components'
import type { Ticket } from '../domain/ticket'
import { TicketCard } from './TicketCard'

interface Props {
  tickets: Ticket[]
  statuts: string[]
  onOuvrir: (ticket: Ticket) => void
  onChangerStatut: (ticket: Ticket, statut: string) => void
}

export function TicketKanban({ tickets, statuts, onOuvrir, onChangerStatut }: Props) {
  const [ticketTire, setTicketTire] = useState<Ticket | null>(null)
  const [colonneSurvolee, setColonneSurvolee] = useState<string | null>(null)

  function deposer(statut: string) {
    if (ticketTire && ticketTire.statut !== statut) {
      onChangerStatut(ticketTire, statut)
    }
    setTicketTire(null)
    setColonneSurvolee(null)
  }

  return (
    <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', alignItems: 'flex-start' }}>
      {statuts.map((statut) => {
        const colonne = tickets.filter((t) => t.statut === statut)
        return (
          <div
            key={statut}
            onDragOver={(e) => { e.preventDefault(); setColonneSurvolee(statut) }}
            onDragLeave={() => setColonneSurvolee((c) => (c === statut ? null : c))}
            onDrop={(e) => { e.preventDefault(); deposer(statut) }}
            style={{
              minWidth: '280px',
              flex: '1 0 280px',
              padding: '8px',
              borderRadius: '8px',
              background: colonneSurvolee === statut ? '#e8f0fe' : '#f5f5f5',
              transition: 'background 120ms',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <Text weight="semibold">{statut}</Text>
              <Caption1>{colonne.length}</Caption1>
            </div>
            {colonne.length === 0 ? (
              <Caption1 style={{ opacity: 0.6 }}>Aucun ticket</Caption1>
            ) : (
              colonne.map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  onOuvrir={onOuvrir}
                  draggable
                  onDragStart={setTicketTire}
                />
              ))
            )}
          </div>
        )
      })}
    </div>
  )
}
