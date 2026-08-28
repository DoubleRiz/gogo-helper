import { Badge } from '@fluentui/react-components'
import { appConfig } from '../config/app.config'

const gris = '#616161'

function BadgeColore({ valeur, couleur }: { valeur: string; couleur: string }) {
  if (valeur === '') return null
  return (
    <Badge
      appearance="filled"
      shape="rounded"
      style={{ backgroundColor: couleur, color: '#ffffff' }}
    >
      {valeur}
    </Badge>
  )
}

export function BadgeStatut({ valeur }: { valeur: string }) {
  return <BadgeColore valeur={valeur} couleur={appConfig.couleursStatut[valeur] ?? gris} />
}

export function BadgePriorite({ valeur }: { valeur: string }) {
  return <BadgeColore valeur={valeur} couleur={appConfig.couleursPriorite[valeur] ?? gris} />
}
