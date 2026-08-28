import {
  createTableColumn, DataGrid, DataGridBody, DataGridCell, DataGridHeader,
  DataGridHeaderCell, DataGridRow, type TableColumnDefinition,
} from '@fluentui/react-components'
import type { Ticket } from '../domain/ticket'
import { BadgePriorite, BadgeStatut } from './Badges'

const colonnes: TableColumnDefinition<Ticket>[] = [
  createTableColumn<Ticket>({
    columnId: 'titre',
    compare: (a, b) => a.titre.localeCompare(b.titre),
    renderHeaderCell: () => 'Titre',
    renderCell: (t) => `#${t.id} — ${t.titre || 'Sans titre'}`,
  }),
  createTableColumn<Ticket>({
    columnId: 'demandeur',
    compare: (a, b) => a.demandeur.localeCompare(b.demandeur),
    renderHeaderCell: () => 'Demandeur',
    renderCell: (t) => t.demandeur || t.emailDemandeur,
  }),
  createTableColumn<Ticket>({
    columnId: 'categorie',
    compare: (a, b) => a.categorie.localeCompare(b.categorie),
    renderHeaderCell: () => 'Catégorie',
    renderCell: (t) => t.categorie,
  }),
  createTableColumn<Ticket>({
    columnId: 'priorite',
    compare: (a, b) => a.priorite.localeCompare(b.priorite),
    renderHeaderCell: () => 'Priorité',
    renderCell: (t) => <BadgePriorite valeur={t.priorite} />,
  }),
  createTableColumn<Ticket>({
    columnId: 'statut',
    compare: (a, b) => a.statut.localeCompare(b.statut),
    renderHeaderCell: () => 'Statut',
    renderCell: (t) => <BadgeStatut valeur={t.statut} />,
  }),
  createTableColumn<Ticket>({
    columnId: 'echeance',
    compare: (a, b) => a.dateEcheance.localeCompare(b.dateEcheance),
    renderHeaderCell: () => 'Échéance',
    renderCell: (t) => t.dateEcheance || '—',
  }),
  createTableColumn<Ticket>({
    columnId: 'gestionnaire',
    compare: (a, b) => a.gestionnaire.localeCompare(b.gestionnaire),
    renderHeaderCell: () => 'Gestionnaire',
    renderCell: (t) => t.gestionnaire || 'Non assigné',
  }),
]

export function TicketList({ tickets, onOuvrir }: { tickets: Ticket[]; onOuvrir: (t: Ticket) => void }) {
  return (
    <DataGrid items={tickets} columns={colonnes} sortable getRowId={(t) => t.id} focusMode="composite">
      <DataGridHeader>
        <DataGridRow>
          {({ renderHeaderCell }) => <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>}
        </DataGridRow>
      </DataGridHeader>
      <DataGridBody<Ticket>>
        {({ item, rowId }) => (
          <DataGridRow<Ticket>
            key={rowId}
            onClick={() => onOuvrir(item)}
            style={{ cursor: 'pointer' }}
          >
            {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
          </DataGridRow>
        )}
      </DataGridBody>
    </DataGrid>
  )
}
