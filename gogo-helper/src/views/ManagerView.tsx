import { useMemo, useState } from 'react'
import { Caption1, Tab, TabList } from '@fluentui/react-components'
import type { UtilisateurCourant } from '../auth/useCurrentUser'
import type { EtatTickets } from '../data/useTickets'
import type { EtatFiltres } from '../domain/filters'
import { filterTickets, filtresVides } from '../domain/filters'
import { appliquerChangementStatut, dateDuJour } from '../domain/statut'
import type { Ticket } from '../domain/ticket'
import { TicketFilters } from '../components/TicketFilters'
import { TicketKanban } from '../components/TicketKanban'
import { TicketList } from '../components/TicketList'
import { TicketPanel } from '../components/TicketPanel'

type Affichage = 'kanban' | 'liste'

interface Props {
  utilisateur: UtilisateurCourant
  donnees: EtatTickets
}

export function ManagerView({ utilisateur, donnees }: Props) {
  const [affichage, setAffichage] = useState<Affichage>('kanban')
  const [filtres, setFiltres] = useState<EtatFiltres>(filtresVides)
  const [ticketOuvert, setTicketOuvert] = useState<Ticket | null>(null)

  const visibles = useMemo(
    () => filterTickets(donnees.tickets, filtres, utilisateur.email),
    [donnees.tickets, filtres, utilisateur.email],
  )

  function changerStatut(ticket: Ticket, statut: string) {
    void donnees.modifier(ticket.id, appliquerChangementStatut(ticket, statut, dateDuJour()))
  }

  return (
    <div>
      <TabList selectedValue={affichage} onTabSelect={(_, d) => setAffichage(d.value as Affichage)}>
        <Tab value="kanban">Kanban</Tab>
        <Tab value="liste">Liste</Tab>
      </TabList>

      <div style={{ marginTop: '12px' }}>
        <TicketFilters
          filtres={filtres}
          choix={donnees.choix}
          onChanger={setFiltres}
          nbResultats={visibles.length}
        />

        {donnees.tickets.length === 0 ? (
          <Caption1>Aucun ticket dans la liste pour le moment.</Caption1>
        ) : visibles.length === 0 ? (
          <Caption1>Aucun ticket ne correspond aux filtres sélectionnés.</Caption1>
        ) : affichage === 'kanban' ? (
          <TicketKanban
            tickets={visibles}
            statuts={donnees.choix.statuts}
            onOuvrir={setTicketOuvert}
            onChangerStatut={changerStatut}
          />
        ) : (
          <TicketList tickets={visibles} onOuvrir={setTicketOuvert} />
        )}
      </div>

      <TicketPanel
        ticket={ticketOuvert}
        choix={donnees.choix}
        utilisateur={utilisateur}
        onFermer={() => setTicketOuvert(null)}
        onEnregistrer={donnees.modifier}
        onSupprimer={donnees.supprimer}
      />
    </div>
  )
}
