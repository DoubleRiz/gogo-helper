import { useState } from 'react'
import {
  Button, Dialog, DialogActions, DialogBody, DialogContent, DialogSurface,
  DialogTitle, Dropdown, Field, Input, Option, Textarea,
} from '@fluentui/react-components'
import { appConfig } from '../config/app.config'
import type { UtilisateurCourant } from '../auth/useCurrentUser'
import type { Choix } from '../domain/choices'
import type { NouveauTicket } from '../domain/ticket'
import { dateDuJour } from '../domain/statut'

interface Props {
  ouvert: boolean
  choix: Choix
  utilisateur: UtilisateurCourant
  onFermer: () => void
  onSoumettre: (nouveau: NouveauTicket) => Promise<void>
}

export function NewTicketForm({ ouvert, choix, utilisateur, onFermer, onSoumettre }: Props) {
  const [titre, setTitre] = useState('')
  const [description, setDescription] = useState('')
  const [categorie, setCategorie] = useState(choix.categories[0] ?? '')
  const [priorite, setPriorite] = useState(appConfig.priorites[1] ?? '')
  const [envoiEnCours, setEnvoiEnCours] = useState(false)

  const titreValide = titre.trim() !== ''

  async function soumettre() {
    if (!titreValide || envoiEnCours) return
    setEnvoiEnCours(true)
    try {
      await onSoumettre({
        titre: titre.trim(),
        description: description.trim(),
        categorie,
        priorite,
        statut: appConfig.statutInitial,
        demandeur: utilisateur.nom,
        emailDemandeur: utilisateur.email,
        gestionnaire: '',
        dateCreation: dateDuJour(),
        dateEcheance: '',
        dateResolution: '',
        commentaire: '',
      })
      setTitre('')
      setDescription('')
      onFermer()
    } catch {
      // L'erreur est affichée par la MessageBar globale ; la saisie est conservée.
    } finally {
      setEnvoiEnCours(false)
    }
  }

  return (
    <Dialog open={ouvert} onOpenChange={(_, d) => { if (!d.open) onFermer() }}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Nouvelle demande de support</DialogTitle>
          <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Field label="Titre" required validationState={titreValide ? 'none' : 'warning'}
              validationMessage={titreValide ? undefined : 'Le titre est obligatoire.'}>
              <Input value={titre} onChange={(_, d) => setTitre(d.value)} />
            </Field>
            <Field label="Description">
              <Textarea rows={5} value={description} onChange={(_, d) => setDescription(d.value)} />
            </Field>
            <Field label="Catégorie">
              <Dropdown value={categorie} selectedOptions={[categorie]}
                onOptionSelect={(_, d) => setCategorie(d.optionValue ?? '')}>
                {choix.categories.map((c) => <Option key={c} value={c}>{c}</Option>)}
              </Dropdown>
            </Field>
            <Field label="Priorité">
              <Dropdown value={priorite} selectedOptions={[priorite]}
                onOptionSelect={(_, d) => setPriorite(d.optionValue ?? '')}>
                {choix.priorites.map((p) => <Option key={p} value={p}>{p}</Option>)}
              </Dropdown>
            </Field>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onFermer}>Annuler</Button>
            <Button appearance="primary" disabled={!titreValide || envoiEnCours} onClick={() => void soumettre()}>
              {envoiEnCours ? 'Envoi…' : 'Soumettre'}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  )
}
