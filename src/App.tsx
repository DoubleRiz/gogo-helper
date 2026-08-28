import { useState } from 'react'
import {
  Button, Caption1, FluentProvider, MessageBar, MessageBarActions, MessageBarBody,
  Spinner, Subtitle2, Tab, TabList, webLightTheme,
} from '@fluentui/react-components'
import { useCurrentUser } from './auth/useCurrentUser'
import { useTickets } from './data/useTickets'
import { ManagerView } from './views/ManagerView'
import { RequesterView } from './views/RequesterView'

type Espace = 'gestion' | 'mesDemandes'

export default function App() {
  const utilisateur = useCurrentUser()
  const donnees = useTickets()
  const [espace, setEspace] = useState<Espace>('gestion')

  const estGestionnaire = utilisateur.role === 'gestionnaire'
  const pret = donnees.charge && utilisateur.charge

  return (
    <FluentProvider theme={webLightTheme}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '16px' }}>
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <Subtitle2>GoGo Helper</Subtitle2>
          <Caption1>
            {utilisateur.nom || 'Utilisateur inconnu'} — {utilisateur.email || 'email indisponible'} (
            {utilisateur.role})
          </Caption1>
        </header>

        {estGestionnaire && (
          <TabList
            selectedValue={espace}
            onTabSelect={(_, d) => setEspace(d.value as Espace)}
            style={{ marginBottom: '12px' }}
          >
            <Tab value="gestion">Tous les tickets</Tab>
            <Tab value="mesDemandes">Mes demandes</Tab>
          </TabList>
        )}

        {donnees.erreur !== '' && (
          <MessageBar intent="error" style={{ marginBottom: '12px' }}>
            <MessageBarBody>{donnees.erreur}</MessageBarBody>
            <MessageBarActions>
              <Button size="small" onClick={() => void donnees.recharger()}>Réessayer</Button>
              <Button size="small" appearance="subtle" onClick={donnees.effacerErreur}>Fermer</Button>
            </MessageBarActions>
          </MessageBar>
        )}

        {!pret ? (
          <Spinner label="Chargement des tickets…" />
        ) : estGestionnaire && espace === 'gestion' ? (
          <ManagerView utilisateur={utilisateur} donnees={donnees} />
        ) : (
          <RequesterView utilisateur={utilisateur} donnees={donnees} />
        )}
      </div>
    </FluentProvider>
  )
}
