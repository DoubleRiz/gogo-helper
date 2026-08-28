import { useMemo, useState } from 'react'
import {
  Body1, Button, Caption1, Drawer, DrawerBody, DrawerHeader, DrawerHeaderTitle,
} from '@fluentui/react-components'
import type { UtilisateurCourant } from '../auth/useCurrentUser'
import type { EtatTickets } from '../data/useTickets'
import { compterParStatut } from '../domain/filters'
import { normaliserEmail } from '../domain/roles'
import type { Ticket } from '../domain/ticket'
import { BadgeStatut } from '../components/Badges'
import { NewTicketForm } from '../components/NewTicketForm'
import { TicketCard } from '../components/TicketCard'
import { TicketDetails } from '../components/TicketDetails'

interface Props {
  utilisateur: UtilisateurCourant
  donnees: EtatTickets
}

export function RequesterView({ utilisateur, donnees }: Props) {
  const [formulaireOuvert, setFormulaireOuvert] = useState(false)
  const [ticketOuvert, setTicketOuvert] = useState<Ticket | null>(null)

  const mesTickets = useMemo(
    () =>
      donnees.tickets.filter(
        (t) => normaliserEmail(t.emailDemandeur) === normaliserEmail(utilisateur.email),
      ),
    [donnees.tickets, utilisateur.email],
  )
  const compteurs = useMemo(() => compterParStatut(mesTickets), [mesTickets])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Body1><strong>Mes tickets ({mesTickets.length})</strong></Body1>
          {Object.entries(compteurs).map(([statut, nombre]) => (
            <span key={statut} style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <BadgeStatut valeur={statut} />
              <Caption1>{nombre}</Caption1>
            </span>
          ))}
        </div>
        <Button appearance="primary" onClick={() => setFormulaireOuvert(true)}>
          Nouvelle demande
        </Button>
      </div>

      {mesTickets.length === 0 ? (
        <Caption1>
          Vous n’avez aucun ticket. Cliquez sur « Nouvelle demande » pour soumettre une demande de support.
        </Caption1>
      ) : (
        mesTickets.map((ticket) => (
          <TicketCard key={ticket.id} ticket={ticket} onOuvrir={setTicketOuvert} />
        ))
      )}

      <NewTicketForm
        ouvert={formulaireOuvert}
        choix={donnees.choix}
        utilisateur={utilisateur}
        onFermer={() => setFormulaireOuvert(false)}
        onSoumettre={donnees.creer}
      />

      <Drawer
        type="overlay"
        position="end"
        open={ticketOuvert !== null}
        onOpenChange={(_, d) => { if (!d.open) setTicketOuvert(null) }}
        style={{ width: '420px' }}
      >
        <DrawerHeader>
          <DrawerHeaderTitle
            action={<Button appearance="subtle" onClick={() => setTicketOuvert(null)}>Fermer</Button>}
          >
            Suivi du ticket
          </DrawerHeaderTitle>
        </DrawerHeader>
        <DrawerBody>{ticketOuvert && <TicketDetails ticket={ticketOuvert} />}</DrawerBody>
      </Drawer>
    </div>
  )
}
