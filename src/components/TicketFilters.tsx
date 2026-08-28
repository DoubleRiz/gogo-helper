import { Button, Caption1, Dropdown, Input, Option } from '@fluentui/react-components'
import type { Choix } from '../domain/choices'
import type { Assignation, EtatFiltres } from '../domain/filters'
import { filtresVides } from '../domain/filters'

interface Props {
  filtres: EtatFiltres
  choix: Choix
  onChanger: (filtres: EtatFiltres) => void
  nbResultats: number
}

const libellesAssignation: Record<Assignation, string> = {
  tous: 'Tous les gestionnaires',
  moi: 'Mes tickets',
  nonAssignes: 'Non assignés',
}

/** Une option « Tous » de valeur vide en tête de chaque liste déroulante. */
function SelecteurChoix({
  libelle, valeur, valeurs, onChanger,
}: { libelle: string; valeur: string; valeurs: string[]; onChanger: (v: string) => void }) {
  return (
    <Dropdown
      placeholder={libelle}
      value={valeur === '' ? `${libelle} : tous` : valeur}
      selectedOptions={[valeur]}
      onOptionSelect={(_, d) => onChanger(d.optionValue ?? '')}
      style={{ minWidth: '160px' }}
    >
      <Option value="">{`${libelle} : tous`}</Option>
      {valeurs.map((v) => <Option key={v} value={v}>{v}</Option>)}
    </Dropdown>
  )
}

export function TicketFilters({ filtres, choix, onChanger, nbResultats }: Props) {
  const actifs =
    filtres.recherche !== '' || filtres.statut !== '' || filtres.priorite !== '' ||
    filtres.categorie !== '' || filtres.assignation !== 'tous'

  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '12px' }}>
      <Input
        placeholder="Rechercher un titre, une description, un demandeur…"
        value={filtres.recherche}
        onChange={(_, d) => onChanger({ ...filtres, recherche: d.value })}
        style={{ minWidth: '280px' }}
      />
      <SelecteurChoix libelle="Statut" valeur={filtres.statut} valeurs={choix.statuts}
        onChanger={(v) => onChanger({ ...filtres, statut: v })} />
      <SelecteurChoix libelle="Priorité" valeur={filtres.priorite} valeurs={choix.priorites}
        onChanger={(v) => onChanger({ ...filtres, priorite: v })} />
      <SelecteurChoix libelle="Catégorie" valeur={filtres.categorie} valeurs={choix.categories}
        onChanger={(v) => onChanger({ ...filtres, categorie: v })} />
      <Dropdown
        value={libellesAssignation[filtres.assignation]}
        selectedOptions={[filtres.assignation]}
        onOptionSelect={(_, d) => onChanger({ ...filtres, assignation: (d.optionValue ?? 'tous') as Assignation })}
        style={{ minWidth: '180px' }}
      >
        {(Object.keys(libellesAssignation) as Assignation[]).map((cle) => (
          <Option key={cle} value={cle}>{libellesAssignation[cle]}</Option>
        ))}
      </Dropdown>
      {actifs && (
        <Button appearance="subtle" onClick={() => onChanger(filtresVides)}>Réinitialiser</Button>
      )}
      <Caption1>{nbResultats} ticket(s)</Caption1>
    </div>
  )
}
