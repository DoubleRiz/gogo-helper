import { useEffect, useState } from 'react'
import {
  Button, Dialog, DialogActions, DialogBody, DialogContent, DialogSurface, DialogTitle,
  Divider, Drawer, DrawerBody, DrawerHeader, DrawerHeaderTitle, Dropdown, Field,
  Input, Option, Textarea,
} from '@fluentui/react-components'
import type { UtilisateurCourant } from '../auth/useCurrentUser'
import type { Choix } from '../domain/choices'
import { appliquerChangementStatut, dateDuJour } from '../domain/statut'
import type { Ticket } from '../domain/ticket'
import { TicketDetails } from './TicketDetails'

interface Props {
  ticket: Ticket | null
  choix: Choix
  utilisateur: UtilisateurCourant
  onFermer: () => void
  onEnregistrer: (id: number, changements: Partial<Ticket>) => Promise<void>
  onSupprimer: (id: number) => Promise<void>
}

export function TicketPanel({ ticket, choix, utilisateur, onFermer, onEnregistrer, onSupprimer }: Props) {
  const [statut, setStatut] = useState('')
  const [priorite, setPriorite] = useState('')
  const [gestionnaire, setGestionnaire] = useState('')
  const [echeance, setEcheance] = useState('')
  const [commentaire, setCommentaire] = useState('')
  const [confirmationOuverte, setConfirmationOuverte] = useState(false)

  // Réinitialise le formulaire chaque fois qu'un autre ticket est ouvert.
  // La règle react-hooks déconseille un setState synchrone dans un effet ;
  // ici il s'agit d'aligner un formulaire local sur la prop qui change, et le
  // rendu supplémentaire est sans conséquence sur un panneau ponctuel.
  useEffect(() => {
    if (!ticket) return
    /* eslint-disable react-hooks/set-state-in-effect */
    setStatut(ticket.statut)
    setPriorite(ticket.priorite)
    setGestionnaire(ticket.gestionnaire)
    setEcheance(ticket.dateEcheance)
    setCommentaire(ticket.commentaire)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [ticket])

  async function enregistrer() {
    if (!ticket) return
    const changements: Partial<Ticket> = {
      ...appliquerChangementStatut(ticket, statut, dateDuJour()),
      priorite,
      gestionnaire,
      dateEcheance: echeance,
      commentaire,
    }
    await onEnregistrer(ticket.id, changements)
    onFermer()
  }

  async function supprimer() {
    if (!ticket) return
    setConfirmationOuverte(false)
    await onSupprimer(ticket.id)
    onFermer()
  }

  return (
    <>
      <Drawer
        type="overlay"
        position="end"
        open={ticket !== null}
        onOpenChange={(_, d) => { if (!d.open) onFermer() }}
        style={{ width: '460px' }}
      >
        <DrawerHeader>
          <DrawerHeaderTitle
            action={<Button appearance="subtle" onClick={onFermer}>Fermer</Button>}
          >
            Traiter le ticket
          </DrawerHeaderTitle>
        </DrawerHeader>
        <DrawerBody>
          {ticket && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <TicketDetails ticket={ticket} />
              <Divider />
              <Field label="Statut">
                <Dropdown value={statut} selectedOptions={[statut]}
                  onOptionSelect={(_, d) => setStatut(d.optionValue ?? '')}>
                  {choix.statuts.map((s) => <Option key={s} value={s}>{s}</Option>)}
                </Dropdown>
              </Field>
              <Field label="Priorité">
                <Dropdown value={priorite} selectedOptions={[priorite]}
                  onOptionSelect={(_, d) => setPriorite(d.optionValue ?? '')}>
                  {choix.priorites.map((p) => <Option key={p} value={p}>{p}</Option>)}
                </Dropdown>
              </Field>
              <Field label="Gestionnaire (email)">
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Input style={{ flex: 1 }} value={gestionnaire}
                    onChange={(_, d) => setGestionnaire(d.value)} />
                  <Button onClick={() => setGestionnaire(utilisateur.email)}>M’assigner</Button>
                </div>
              </Field>
              <Field label="Échéance">
                <Input type="date" value={echeance} onChange={(_, d) => setEcheance(d.value)} />
              </Field>
              <Field label="Commentaire">
                <Textarea rows={4} value={commentaire} onChange={(_, d) => setCommentaire(d.value)} />
              </Field>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
                <Button appearance="primary" onClick={() => void enregistrer()}>Enregistrer</Button>
                <Button appearance="subtle" onClick={() => setConfirmationOuverte(true)}>Supprimer</Button>
              </div>
            </div>
          )}
        </DrawerBody>
      </Drawer>

      <Dialog open={confirmationOuverte} onOpenChange={(_, d) => setConfirmationOuverte(d.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Supprimer ce ticket ?</DialogTitle>
            <DialogContent>
              Le ticket #{ticket?.id} sera définitivement supprimé de la liste SharePoint.
              Cette action est irréversible.
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setConfirmationOuverte(false)}>Annuler</Button>
              <Button appearance="primary" onClick={() => void supprimer()}>Supprimer</Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </>
  )
}
