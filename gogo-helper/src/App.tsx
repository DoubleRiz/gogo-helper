import {
  FluentProvider,
  MessageBar,
  MessageBarBody,
  MessageBarActions,
  Button,
  Spinner,
  Subtitle2,
  Caption1,
  webLightTheme,
} from '@fluentui/react-components'
import { useCurrentUser } from './auth/useCurrentUser'
import { useTickets } from './data/useTickets'

export default function App() {
  const utilisateur = useCurrentUser()
  const donnees = useTickets()

  return (
    <FluentProvider theme={webLightTheme}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '16px' }}>
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <Subtitle2>GoGo Helper</Subtitle2>
          <Caption1>
            {utilisateur.nom || 'Utilisateur inconnu'} — {utilisateur.email || 'email indisponible'} (
            {utilisateur.role})
          </Caption1>
        </header>

        {donnees.erreur !== '' && (
          <MessageBar intent="error" style={{ marginBottom: '12px' }}>
            <MessageBarBody>{donnees.erreur}</MessageBarBody>
            <MessageBarActions>
              <Button size="small" onClick={() => void donnees.recharger()}>Réessayer</Button>
              <Button size="small" appearance="subtle" onClick={donnees.effacerErreur}>Fermer</Button>
            </MessageBarActions>
          </MessageBar>
        )}

        {!donnees.charge || !utilisateur.charge ? (
          <Spinner label="Chargement des tickets…" />
        ) : (
          <Caption1>{donnees.tickets.length} ticket(s) chargé(s).</Caption1>
        )}
      </div>
    </FluentProvider>
  )
}
