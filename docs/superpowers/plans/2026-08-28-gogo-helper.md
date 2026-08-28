# GoGo Helper — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construire une Code App Power Apps de ticketing helpdesk offrant une vue demandeur (soumettre et suivre ses demandes) et une vue gestionnaire (filtrer, trier, traiter les tickets en kanban ou en liste) sur une liste SharePoint existante.

**Architecture :** Une SPA React 19 + Vite. Une couche `domain/` de modules purs (mapper `field_N` ↔ `Ticket`, rôles, fusion des choix, filtres, règle de résolution) entièrement testée en Vitest, une couche `data/` qui enrobe le service SharePoint généré, et une couche UI Fluent v9 découpée en composants au-dessus de deux vues. Aucun backend : toutes les données transitent par le SDK Power Apps.

**Tech Stack :** React 19, TypeScript 5.9, Vite 7, `@microsoft/power-apps` 1.2, `@fluentui/react-components` v9, Vitest.

**Spec :** `docs/superpowers/specs/2026-08-28-gogo-helper-design.md`

## Global Constraints

- Le dossier de l'app est `gogo-helper/` (renommé depuis `my-first-app/`). Toutes les commandes s'exécutent depuis ce dossier.
- Interface, noms de variables métier et messages utilisateur **en français**.
- Ne jamais modifier `src/generated/` ni `.power/` : fichiers auto-générés, écrasés par `pac code`.
- Le code applicatif ne référence jamais `field_2`, `field_3`… hors de `src/domain/ticket.ts`.
- TypeScript strict : `strict`, `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax` sont activés. Les imports de types s'écrivent `import type { X } from '...'`.
- Le champ SharePoint « Gestionnaire » (`field_8`) stocke l'**email** du gestionnaire, pas son nom.
- Toutes les dates métier sont des chaînes `yyyy-mm-dd` ; `dateCreation`, `dateEcheance`, `dateResolution` suivent ce format. `modifie` est un ISO datetime complet.
- Chaque tâche se termine par un commit.

---

### Task 1 : Fondations — renommage, dépendances, Vitest, git

**Files:**
- Renommer : `my-first-app/` → `gogo-helper/`
- Modify: `gogo-helper/package.json`, `gogo-helper/power.config.json`, `gogo-helper/index.html`, `gogo-helper/vite.config.ts`
- Create: `gogo-helper/src/domain/__tests__/smoke.test.ts`

**Interfaces:**
- Consumes: rien
- Produces: le script `npm test` (Vitest) et `npm run lint`, disponibles pour toutes les tâches suivantes.

- [ ] **Step 1 : Initialiser git à la racine du dépôt et renommer le dossier**

```bash
cd /Users/gautier/powerapps
git init
mv my-first-app gogo-helper
```

- [ ] **Step 2 : Installer les dépendances**

```bash
cd /Users/gautier/powerapps/gogo-helper
npm install @fluentui/react-components
npm install -D vitest
```

- [ ] **Step 3 : Ajouter le script de test dans `package.json`**

Dans `"scripts"`, ajouter après `"lint"` :

```json
    "test": "vitest run",
    "test:watch": "vitest"
```

- [ ] **Step 4 : Déclarer Vitest dans `vite.config.ts`**

Remplacer le contenu du fichier par :

```ts
/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { powerApps } from "@microsoft/power-apps-vite/plugin"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), powerApps()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 5 : Renommer l'application**

Dans `power.config.json`, remplacer `"appDisplayName": "App Name"` par `"appDisplayName": "GoGo Helper"` et `"description": " "` par `"description": "Solution de ticketing helpdesk"`.

Dans `index.html`, remplacer `<html lang="en">` par `<html lang="fr">` et `<title>vite</title>` par `<title>GoGo Helper</title>`.

- [ ] **Step 6 : Écrire un test fumigène pour vérifier la chaîne Vitest**

Créer `src/domain/__tests__/smoke.test.ts` :

```ts
import { describe, expect, it } from 'vitest'

describe('chaîne de test', () => {
  it('exécute les tests Vitest', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 7 : Lancer les tests**

Run: `npm test`
Expected: PASS, 1 test.

- [ ] **Step 8 : Commit**

```bash
cd /Users/gautier/powerapps
git add -A
git commit -m "chore: renomme l'app en gogo-helper, ajoute Fluent UI et Vitest"
```

---

### Task 2 : Configuration et résolution des rôles

**Files:**
- Create: `gogo-helper/src/config/app.config.ts`
- Create: `gogo-helper/src/domain/roles.ts`
- Test: `gogo-helper/src/domain/roles.test.ts`

**Interfaces:**
- Consumes: rien
- Produces:
  - `appConfig` : `{ managerEmails: string[]; statuts: string[]; statutInitial: string; statutResolu: string; priorites: string[]; categories: string[]; couleursStatut: Record<string, string>; couleursPriorite: Record<string, string> }`
  - `type Role = 'demandeur' | 'gestionnaire'`
  - `resolveRole(email: string | undefined, managerEmails: string[]): Role`

- [ ] **Step 1 : Écrire le fichier de configuration**

Créer `src/config/app.config.ts` :

```ts
/**
 * Configuration de GoGo Helper.
 *
 * Les listes de valeurs ci-dessous servent de référence : elles alimentent les
 * formulaires, les filtres et les colonnes du kanban dès le premier lancement,
 * même si la liste SharePoint est vide. Toute valeur rencontrée dans un ticket
 * mais absente d'ici est ajoutée automatiquement en fin de liste à l'exécution
 * (voir src/domain/choices.ts).
 */
export const appConfig = {
  /** Emails des gestionnaires. Tout autre utilisateur est un demandeur. */
  managerEmails: ['gautier.baleda@alegria.academy'],

  /** Statuts, dans l'ordre des colonnes du kanban. */
  statuts: ['Nouveau', 'En cours', 'En attente', 'Résolu', 'Clôturé'],
  statutInitial: 'Nouveau',
  statutResolu: 'Résolu',

  priorites: ['Basse', 'Moyenne', 'Haute', 'Critique'],
  categories: ['Matériel', 'Logiciel', 'Réseau', 'Accès / Compte', 'Autre'],

  /** Couleurs des badges. Une valeur absente retombe sur un gris neutre. */
  couleursStatut: {
    'Nouveau': '#0f6cbd',
    'En cours': '#8764b8',
    'En attente': '#c19c00',
    'Résolu': '#107c10',
    'Clôturé': '#616161',
  } as Record<string, string>,
  couleursPriorite: {
    'Basse': '#616161',
    'Moyenne': '#0f6cbd',
    'Haute': '#c19c00',
    'Critique': '#c50f1f',
  } as Record<string, string>,
}
```

- [ ] **Step 2 : Écrire le test de résolution des rôles**

Créer `src/domain/roles.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { resolveRole } from './roles'

describe('resolveRole', () => {
  const gestionnaires = ['chef@exemple.fr', 'Support@Exemple.fr']

  it('reconnaît un gestionnaire listé', () => {
    expect(resolveRole('chef@exemple.fr', gestionnaires)).toBe('gestionnaire')
  })

  it('ignore la casse de l’email', () => {
    expect(resolveRole('SUPPORT@exemple.fr', gestionnaires)).toBe('gestionnaire')
  })

  it('ignore les espaces autour de l’email', () => {
    expect(resolveRole('  chef@exemple.fr  ', gestionnaires)).toBe('gestionnaire')
  })

  it('traite tout autre utilisateur comme un demandeur', () => {
    expect(resolveRole('alice@exemple.fr', gestionnaires)).toBe('demandeur')
  })

  it('traite un email inconnu comme un demandeur', () => {
    expect(resolveRole(undefined, gestionnaires)).toBe('demandeur')
  })

  it('traite une liste de gestionnaires vide comme aucun gestionnaire', () => {
    expect(resolveRole('chef@exemple.fr', [])).toBe('demandeur')
  })
})
```

- [ ] **Step 3 : Lancer le test pour vérifier qu'il échoue**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "./roles"`.

- [ ] **Step 4 : Implémenter la résolution des rôles**

Créer `src/domain/roles.ts` :

```ts
export type Role = 'demandeur' | 'gestionnaire'

/** Normalise un email pour comparaison : minuscules, sans espaces autour. */
export function normaliserEmail(email: string | undefined): string {
  return (email ?? '').trim().toLowerCase()
}

/**
 * Un utilisateur est gestionnaire si son email figure dans la liste de la
 * config. Tout le reste — y compris un email inconnu — est demandeur.
 */
export function resolveRole(email: string | undefined, managerEmails: string[]): Role {
  const normalise = normaliserEmail(email)
  if (normalise === '') return 'demandeur'
  const gestionnaires = managerEmails.map(normaliserEmail)
  return gestionnaires.includes(normalise) ? 'gestionnaire' : 'demandeur'
}
```

- [ ] **Step 5 : Lancer les tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6 : Supprimer le test fumigène**

La chaîne Vitest est désormais prouvée par un vrai test ; le fumigène de la Task 1 n'a plus d'objet.

```bash
cd /Users/gautier/powerapps/gogo-helper
rm -rf src/domain/__tests__
npm test
```

Expected: PASS, seuls les tests de `roles.test.ts` s'exécutent.

- [ ] **Step 7 : Commit**

```bash
cd /Users/gautier/powerapps
git add -A
git commit -m "feat: config de l'app et résolution des rôles demandeur/gestionnaire"
```

---

### Task 3 : Type métier Ticket et mapper SharePoint

**Files:**
- Create: `gogo-helper/src/domain/ticket.ts`
- Test: `gogo-helper/src/domain/ticket.test.ts`

**Interfaces:**
- Consumes: rien
- Produces:
  - `interface Ticket { id: number; titre: string; description: string; categorie: string; priorite: string; statut: string; demandeur: string; emailDemandeur: string; gestionnaire: string; dateCreation: string; dateEcheance: string; dateResolution: string; commentaire: string; modifie: string }`
  - `type NouveauTicket = Omit<Ticket, 'id' | 'modifie'>`
  - `toTicket(record: Tickets_SharePointRead): Ticket`
  - `toWriteRecord(champs: Partial<Ticket>): Partial<Tickets_SharePointWrite>`
  - `normaliserDate(valeur: string | undefined): string`

Toutes les propriétés de `Ticket` sont non-optionnelles : le mapper remplace toute
valeur absente par une chaîne vide. Le reste de l'app n'a ainsi jamais à gérer
`undefined`, et un champ vide reste distinguable d'un champ absent côté écriture
(seules les clés présentes dans l'argument de `toWriteRecord` sont émises).

- [ ] **Step 1 : Écrire les tests du mapper**

Créer `src/domain/ticket.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import type { Tickets_SharePointRead } from '../generated/models/Tickets_SharePointModel'
import { normaliserDate, toTicket, toWriteRecord } from './ticket'

const enregistrementComplet = {
  ID: 42,
  Title: 'Écran noir au démarrage',
  field_2: 'Le poste ne démarre plus depuis la mise à jour.',
  field_3: { '@odata.type': '#Microsoft.Azure.Connectors.SharePoint.SPListExpandedReference', Value: 'Matériel', Id: 1 },
  field_4: { '@odata.type': '#Microsoft.Azure.Connectors.SharePoint.SPListExpandedReference', Value: 'Haute', Id: 3 },
  field_5: { '@odata.type': '#Microsoft.Azure.Connectors.SharePoint.SPListExpandedReference', Value: 'En cours', Id: 2 },
  field_6: 'Alice Martin',
  field_7: 'alice@exemple.fr',
  field_8: 'chef@exemple.fr',
  Datecr_x00e9_ationv2: '2026-08-01T00:00:00Z',
  field_10: '2026-08-10',
  field_11: '',
  field_12: 'Pièce commandée.',
  Modified: '2026-08-05T09:30:00Z',
} as Tickets_SharePointRead

describe('normaliserDate', () => {
  it('tronque un datetime ISO à la date', () => {
    expect(normaliserDate('2026-08-01T00:00:00Z')).toBe('2026-08-01')
  })

  it('laisse une date déjà normalisée intacte', () => {
    expect(normaliserDate('2026-08-10')).toBe('2026-08-10')
  })

  it('renvoie une chaîne vide pour une valeur absente', () => {
    expect(normaliserDate(undefined)).toBe('')
  })
})

describe('toTicket', () => {
  it('traduit tous les champs SharePoint en champs métier', () => {
    expect(toTicket(enregistrementComplet)).toEqual({
      id: 42,
      titre: 'Écran noir au démarrage',
      description: 'Le poste ne démarre plus depuis la mise à jour.',
      categorie: 'Matériel',
      priorite: 'Haute',
      statut: 'En cours',
      demandeur: 'Alice Martin',
      emailDemandeur: 'alice@exemple.fr',
      gestionnaire: 'chef@exemple.fr',
      dateCreation: '2026-08-01',
      dateEcheance: '2026-08-10',
      dateResolution: '',
      commentaire: 'Pièce commandée.',
      modifie: '2026-08-05T09:30:00Z',
    })
  })

  it('remplace les champs absents par des chaînes vides', () => {
    const ticket = toTicket({ ID: 7 } as Tickets_SharePointRead)
    expect(ticket.id).toBe(7)
    expect(ticket.titre).toBe('')
    expect(ticket.categorie).toBe('')
    expect(ticket.statut).toBe('')
    expect(ticket.dateEcheance).toBe('')
  })
})

describe('toWriteRecord', () => {
  it('n’émet que les champs fournis', () => {
    expect(toWriteRecord({ statut: 'Résolu' })).toEqual({ field_5: 'Résolu' })
  })

  it('aplatit les colonnes de choix en chaînes', () => {
    const ecriture = toWriteRecord({ categorie: 'Réseau', priorite: 'Basse', statut: 'Nouveau' })
    expect(ecriture).toEqual({ field_3: 'Réseau', field_4: 'Basse', field_5: 'Nouveau' })
  })

  it('traduit les champs texte et dates', () => {
    const ecriture = toWriteRecord({
      titre: 'VPN indisponible',
      description: 'Erreur 809',
      demandeur: 'Alice Martin',
      emailDemandeur: 'alice@exemple.fr',
      gestionnaire: 'chef@exemple.fr',
      dateCreation: '2026-08-28',
      dateEcheance: '2026-09-04',
      dateResolution: '',
      commentaire: '',
    })
    expect(ecriture).toEqual({
      Title: 'VPN indisponible',
      field_2: 'Erreur 809',
      field_6: 'Alice Martin',
      field_7: 'alice@exemple.fr',
      field_8: 'chef@exemple.fr',
      Datecr_x00e9_ationv2: '2026-08-28',
      field_10: '2026-09-04',
      field_11: '',
      field_12: '',
    })
  })

  it('ignore les champs en lecture seule', () => {
    expect(toWriteRecord({ id: 42, modifie: '2026-08-05T09:30:00Z', statut: 'Clôturé' })).toEqual({
      field_5: 'Clôturé',
    })
  })

  it('fait l’aller-retour depuis un ticket lu', () => {
    const ticket = toTicket(enregistrementComplet)
    const ecriture = toWriteRecord(ticket)
    expect(ecriture.Title).toBe('Écran noir au démarrage')
    expect(ecriture.field_3).toBe('Matériel')
    expect(ecriture.field_5).toBe('En cours')
    expect(ecriture.Datecr_x00e9_ationv2).toBe('2026-08-01')
  })
})
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "./ticket"`.

- [ ] **Step 3 : Implémenter le mapper**

Créer `src/domain/ticket.ts` :

```ts
import type {
  Tickets_SharePointRead,
  Tickets_SharePointWrite,
} from '../generated/models/Tickets_SharePointModel'

/**
 * Le ticket tel que le manipule l'application. Ce module est le SEUL endroit
 * où apparaissent les noms de colonnes SharePoint (field_2, field_3…). Si la
 * liste évolue, seul ce fichier change.
 */
export interface Ticket {
  id: number
  titre: string
  description: string
  categorie: string
  priorite: string
  statut: string
  demandeur: string
  emailDemandeur: string
  gestionnaire: string
  /** yyyy-mm-dd */
  dateCreation: string
  /** yyyy-mm-dd */
  dateEcheance: string
  /** yyyy-mm-dd, vide tant que le ticket n'est pas résolu */
  dateResolution: string
  commentaire: string
  /** ISO datetime, renseigné par SharePoint */
  modifie: string
}

export type NouveauTicket = Omit<Ticket, 'id' | 'modifie'>

/** Ramène un datetime ISO ou une date SharePoint à yyyy-mm-dd. */
export function normaliserDate(valeur: string | undefined): string {
  if (!valeur) return ''
  return valeur.slice(0, 10)
}

export function toTicket(record: Tickets_SharePointRead): Ticket {
  return {
    id: record.ID ?? 0,
    titre: record.Title ?? '',
    description: record.field_2 ?? '',
    categorie: record.field_3?.Value ?? '',
    priorite: record.field_4?.Value ?? '',
    statut: record.field_5?.Value ?? '',
    demandeur: record.field_6 ?? '',
    emailDemandeur: record.field_7 ?? '',
    gestionnaire: record.field_8 ?? '',
    dateCreation: normaliserDate(record.Datecr_x00e9_ationv2),
    dateEcheance: normaliserDate(record.field_10),
    dateResolution: normaliserDate(record.field_11),
    commentaire: record.field_12 ?? '',
    modifie: record.Modified ?? '',
  }
}

/**
 * Traduit un sous-ensemble de champs métier en enregistrement SharePoint.
 * Seules les clés présentes dans `champs` sont émises : l'appelant peut donc
 * envoyer une mise à jour partielle sans écraser le reste du ticket.
 * `id` et `modifie` sont en lecture seule et sont ignorés.
 */
export function toWriteRecord(champs: Partial<Ticket>): Partial<Tickets_SharePointWrite> {
  const record: Partial<Tickets_SharePointWrite> = {}
  if (champs.titre !== undefined) record.Title = champs.titre
  if (champs.description !== undefined) record.field_2 = champs.description
  if (champs.categorie !== undefined) record.field_3 = champs.categorie
  if (champs.priorite !== undefined) record.field_4 = champs.priorite
  if (champs.statut !== undefined) record.field_5 = champs.statut
  if (champs.demandeur !== undefined) record.field_6 = champs.demandeur
  if (champs.emailDemandeur !== undefined) record.field_7 = champs.emailDemandeur
  if (champs.gestionnaire !== undefined) record.field_8 = champs.gestionnaire
  if (champs.dateCreation !== undefined) record.Datecr_x00e9_ationv2 = champs.dateCreation
  if (champs.dateEcheance !== undefined) record.field_10 = champs.dateEcheance
  if (champs.dateResolution !== undefined) record.field_11 = champs.dateResolution
  if (champs.commentaire !== undefined) record.field_12 = champs.commentaire
  return record
}
```

- [ ] **Step 4 : Lancer les tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5 : Commit**

```bash
cd /Users/gautier/powerapps
git add -A
git commit -m "feat: type métier Ticket et mapper SharePoint"
```

---

### Task 4 : Fusion des valeurs de choix

**Files:**
- Create: `gogo-helper/src/domain/choices.ts`
- Test: `gogo-helper/src/domain/choices.test.ts`

**Interfaces:**
- Consumes: `Ticket` (Task 3), `appConfig` (Task 2)
- Produces:
  - `mergeChoices(configurees: string[], rencontrees: string[]): string[]`
  - `interface Choix { statuts: string[]; priorites: string[]; categories: string[] }`
  - `collectChoices(tickets: Ticket[]): Choix`

- [ ] **Step 1 : Écrire les tests**

Créer `src/domain/choices.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import type { Ticket } from './ticket'
import { collectChoices, mergeChoices } from './choices'

function ticket(champs: Partial<Ticket>): Ticket {
  return {
    id: 1, titre: '', description: '', categorie: '', priorite: '', statut: '',
    demandeur: '', emailDemandeur: '', gestionnaire: '', dateCreation: '',
    dateEcheance: '', dateResolution: '', commentaire: '', modifie: '',
    ...champs,
  }
}

describe('mergeChoices', () => {
  it('conserve l’ordre de la configuration', () => {
    expect(mergeChoices(['Nouveau', 'En cours'], [])).toEqual(['Nouveau', 'En cours'])
  })

  it('ajoute les valeurs inédites en fin de liste', () => {
    expect(mergeChoices(['Nouveau'], ['En cours', 'Nouveau'])).toEqual(['Nouveau', 'En cours'])
  })

  it('ne duplique pas une valeur rencontrée plusieurs fois', () => {
    expect(mergeChoices([], ['Haute', 'Haute', 'Basse'])).toEqual(['Haute', 'Basse'])
  })

  it('ignore les valeurs vides', () => {
    expect(mergeChoices(['Nouveau'], ['', '  '])).toEqual(['Nouveau'])
  })

  it('renvoie la configuration seule quand aucun ticket n’existe', () => {
    expect(mergeChoices(['Basse', 'Haute'], [])).toEqual(['Basse', 'Haute'])
  })
})

describe('collectChoices', () => {
  it('fusionne les trois dimensions avec la configuration', () => {
    const choix = collectChoices([
      ticket({ statut: 'Archivé', priorite: 'Haute', categorie: 'Téléphonie' }),
    ])
    expect(choix.statuts[choix.statuts.length - 1]).toBe('Archivé')
    expect(choix.statuts).toContain('Nouveau')
    expect(choix.categories[choix.categories.length - 1]).toBe('Téléphonie')
    expect(choix.priorites).toEqual(['Basse', 'Moyenne', 'Haute', 'Critique'])
  })

  it('renvoie les valeurs de configuration sur une liste vide', () => {
    const choix = collectChoices([])
    expect(choix.statuts).toEqual(['Nouveau', 'En cours', 'En attente', 'Résolu', 'Clôturé'])
    expect(choix.categories).toEqual(['Matériel', 'Logiciel', 'Réseau', 'Accès / Compte', 'Autre'])
  })
})
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "./choices"`.

- [ ] **Step 3 : Implémenter la fusion**

Créer `src/domain/choices.ts` :

```ts
import { appConfig } from '../config/app.config'
import type { Ticket } from './ticket'

export interface Choix {
  statuts: string[]
  priorites: string[]
  categories: string[]
}

/**
 * Les valeurs de la config donnent l'ordre de référence ; toute valeur
 * rencontrée dans les tickets mais absente de la config est ajoutée à la fin.
 * La config seule laisserait passer un libellé SharePoint non prévu ; les
 * tickets seuls laisseraient l'app vide au premier lancement.
 */
export function mergeChoices(configurees: string[], rencontrees: string[]): string[] {
  const resultat: string[] = []
  const vues = new Set<string>()
  for (const valeur of [...configurees, ...rencontrees]) {
    const propre = valeur.trim()
    if (propre === '' || vues.has(propre)) continue
    vues.add(propre)
    resultat.push(propre)
  }
  return resultat
}

export function collectChoices(tickets: Ticket[]): Choix {
  return {
    statuts: mergeChoices(appConfig.statuts, tickets.map((t) => t.statut)),
    priorites: mergeChoices(appConfig.priorites, tickets.map((t) => t.priorite)),
    categories: mergeChoices(appConfig.categories, tickets.map((t) => t.categorie)),
  }
}
```

- [ ] **Step 4 : Lancer les tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5 : Commit**

```bash
cd /Users/gautier/powerapps
git add -A
git commit -m "feat: fusion des valeurs de choix config + tickets existants"
```

---

### Task 5 : Filtrage et recherche

**Files:**
- Create: `gogo-helper/src/domain/filters.ts`
- Test: `gogo-helper/src/domain/filters.test.ts`

**Interfaces:**
- Consumes: `Ticket` (Task 3), `normaliserEmail` (Task 2)
- Produces:
  - `type Assignation = 'tous' | 'moi' | 'nonAssignes'`
  - `interface EtatFiltres { recherche: string; statut: string; priorite: string; categorie: string; assignation: Assignation }` — chaîne vide = « tous »
  - `const filtresVides: EtatFiltres`
  - `filterTickets(tickets: Ticket[], filtres: EtatFiltres, emailUtilisateur: string): Ticket[]`
  - `trierParDateCreationDesc(tickets: Ticket[]): Ticket[]`
  - `compterParStatut(tickets: Ticket[]): Record<string, number>`

- [ ] **Step 1 : Écrire les tests**

Créer `src/domain/filters.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import type { Ticket } from './ticket'
import { compterParStatut, filterTickets, filtresVides, trierParDateCreationDesc } from './filters'

function ticket(champs: Partial<Ticket>): Ticket {
  return {
    id: 1, titre: '', description: '', categorie: '', priorite: '', statut: '',
    demandeur: '', emailDemandeur: '', gestionnaire: '', dateCreation: '',
    dateEcheance: '', dateResolution: '', commentaire: '', modifie: '',
    ...champs,
  }
}

const tickets = [
  ticket({ id: 1, titre: 'VPN indisponible', description: 'Erreur 809', demandeur: 'Alice Martin', statut: 'Nouveau', priorite: 'Haute', categorie: 'Réseau', gestionnaire: '', dateCreation: '2026-08-01' }),
  ticket({ id: 2, titre: 'Imprimante bloquée', description: 'Bourrage papier', demandeur: 'Bob Durand', statut: 'En cours', priorite: 'Basse', categorie: 'Matériel', gestionnaire: 'chef@exemple.fr', dateCreation: '2026-08-03' }),
  ticket({ id: 3, titre: 'Accès refusé', description: 'Compte verrouillé', demandeur: 'Alice Martin', statut: 'Résolu', priorite: 'Haute', categorie: 'Accès / Compte', gestionnaire: 'autre@exemple.fr', dateCreation: '2026-08-02' }),
]

describe('filterTickets', () => {
  it('renvoie tout avec des filtres vides', () => {
    expect(filterTickets(tickets, filtresVides, 'chef@exemple.fr')).toHaveLength(3)
  })

  it('filtre par statut', () => {
    const resultat = filterTickets(tickets, { ...filtresVides, statut: 'Nouveau' }, 'chef@exemple.fr')
    expect(resultat.map((t) => t.id)).toEqual([1])
  })

  it('filtre par priorité', () => {
    const resultat = filterTickets(tickets, { ...filtresVides, priorite: 'Haute' }, 'chef@exemple.fr')
    expect(resultat.map((t) => t.id)).toEqual([1, 3])
  })

  it('filtre par catégorie', () => {
    const resultat = filterTickets(tickets, { ...filtresVides, categorie: 'Matériel' }, 'chef@exemple.fr')
    expect(resultat.map((t) => t.id)).toEqual([2])
  })

  it('cherche dans le titre, la description et le demandeur, sans tenir compte de la casse', () => {
    expect(filterTickets(tickets, { ...filtresVides, recherche: 'vpn' }, '').map((t) => t.id)).toEqual([1])
    expect(filterTickets(tickets, { ...filtresVides, recherche: 'bourrage' }, '').map((t) => t.id)).toEqual([2])
    expect(filterTickets(tickets, { ...filtresVides, recherche: 'alice' }, '').map((t) => t.id)).toEqual([1, 3])
  })

  it('retient mes tickets assignés', () => {
    const resultat = filterTickets(tickets, { ...filtresVides, assignation: 'moi' }, 'CHEF@exemple.fr')
    expect(resultat.map((t) => t.id)).toEqual([2])
  })

  it('retient les tickets non assignés', () => {
    const resultat = filterTickets(tickets, { ...filtresVides, assignation: 'nonAssignes' }, 'chef@exemple.fr')
    expect(resultat.map((t) => t.id)).toEqual([1])
  })

  it('combine plusieurs filtres', () => {
    const resultat = filterTickets(
      tickets,
      { ...filtresVides, priorite: 'Haute', recherche: 'accès' },
      'chef@exemple.fr',
    )
    expect(resultat.map((t) => t.id)).toEqual([3])
  })

  it('renvoie une liste vide quand rien ne correspond', () => {
    expect(filterTickets(tickets, { ...filtresVides, statut: 'Clôturé' }, '')).toEqual([])
  })
})

describe('trierParDateCreationDesc', () => {
  it('trie du plus récent au plus ancien', () => {
    expect(trierParDateCreationDesc(tickets).map((t) => t.id)).toEqual([2, 3, 1])
  })

  it('ne modifie pas le tableau d’origine', () => {
    const copie = [...tickets]
    trierParDateCreationDesc(tickets)
    expect(tickets).toEqual(copie)
  })

  it('place les tickets sans date de création à la fin', () => {
    const avecVide = [ticket({ id: 9, dateCreation: '' }), ...tickets]
    expect(trierParDateCreationDesc(avecVide).map((t) => t.id)).toEqual([2, 3, 1, 9])
  })
})

describe('compterParStatut', () => {
  it('compte les tickets de chaque statut', () => {
    expect(compterParStatut(tickets)).toEqual({ 'Nouveau': 1, 'En cours': 1, 'Résolu': 1 })
  })

  it('renvoie un objet vide sur une liste vide', () => {
    expect(compterParStatut([])).toEqual({})
  })
})
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "./filters"`.

- [ ] **Step 3 : Implémenter les filtres**

Créer `src/domain/filters.ts` :

```ts
import { normaliserEmail } from './roles'
import type { Ticket } from './ticket'

export type Assignation = 'tous' | 'moi' | 'nonAssignes'

/** Une chaîne vide signifie « pas de filtre sur cette dimension ». */
export interface EtatFiltres {
  recherche: string
  statut: string
  priorite: string
  categorie: string
  assignation: Assignation
}

export const filtresVides: EtatFiltres = {
  recherche: '',
  statut: '',
  priorite: '',
  categorie: '',
  assignation: 'tous',
}

function correspondAssignation(ticket: Ticket, assignation: Assignation, emailUtilisateur: string): boolean {
  const gestionnaire = normaliserEmail(ticket.gestionnaire)
  if (assignation === 'moi') return gestionnaire === normaliserEmail(emailUtilisateur)
  if (assignation === 'nonAssignes') return gestionnaire === ''
  return true
}

/**
 * Filtrage côté client : le volume d'un helpdesk le permet, et le filtrage
 * OData sur les colonnes de choix SharePoint est peu fiable.
 */
export function filterTickets(
  tickets: Ticket[],
  filtres: EtatFiltres,
  emailUtilisateur: string,
): Ticket[] {
  const recherche = filtres.recherche.trim().toLowerCase()
  return tickets.filter((ticket) => {
    if (filtres.statut !== '' && ticket.statut !== filtres.statut) return false
    if (filtres.priorite !== '' && ticket.priorite !== filtres.priorite) return false
    if (filtres.categorie !== '' && ticket.categorie !== filtres.categorie) return false
    if (!correspondAssignation(ticket, filtres.assignation, emailUtilisateur)) return false
    if (recherche !== '') {
      const cible = `${ticket.titre} ${ticket.description} ${ticket.demandeur}`.toLowerCase()
      if (!cible.includes(recherche)) return false
    }
    return true
  })
}

/** Les tickets sans date de création vont à la fin. */
export function trierParDateCreationDesc(tickets: Ticket[]): Ticket[] {
  return [...tickets].sort((a, b) => {
    if (a.dateCreation === b.dateCreation) return 0
    if (a.dateCreation === '') return 1
    if (b.dateCreation === '') return -1
    return a.dateCreation < b.dateCreation ? 1 : -1
  })
}

export function compterParStatut(tickets: Ticket[]): Record<string, number> {
  const compteurs: Record<string, number> = {}
  for (const ticket of tickets) {
    compteurs[ticket.statut] = (compteurs[ticket.statut] ?? 0) + 1
  }
  return compteurs
}
```

- [ ] **Step 4 : Lancer les tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5 : Commit**

```bash
cd /Users/gautier/powerapps
git add -A
git commit -m "feat: filtrage, recherche, tri et comptage des tickets"
```

---

### Task 6 : Règle de changement de statut

**Files:**
- Create: `gogo-helper/src/domain/statut.ts`
- Test: `gogo-helper/src/domain/statut.test.ts`

**Interfaces:**
- Consumes: `Ticket` (Task 3), `appConfig` (Task 2)
- Produces:
  - `dateDuJour(): string` — yyyy-mm-dd en heure locale
  - `appliquerChangementStatut(ticket: Ticket, nouveauStatut: string, aujourdHui: string): Partial<Ticket>`

- [ ] **Step 1 : Écrire les tests**

Créer `src/domain/statut.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import type { Ticket } from './ticket'
import { appliquerChangementStatut, dateDuJour } from './statut'

function ticket(champs: Partial<Ticket>): Ticket {
  return {
    id: 1, titre: '', description: '', categorie: '', priorite: '', statut: '',
    demandeur: '', emailDemandeur: '', gestionnaire: '', dateCreation: '',
    dateEcheance: '', dateResolution: '', commentaire: '', modifie: '',
    ...champs,
  }
}

describe('appliquerChangementStatut', () => {
  it('renseigne la date de résolution au passage en Résolu', () => {
    const changements = appliquerChangementStatut(ticket({ statut: 'En cours' }), 'Résolu', '2026-08-28')
    expect(changements).toEqual({ statut: 'Résolu', dateResolution: '2026-08-28' })
  })

  it('conserve une date de résolution déjà renseignée', () => {
    const dejaResolu = ticket({ statut: 'Résolu', dateResolution: '2026-08-20' })
    const changements = appliquerChangementStatut(dejaResolu, 'Résolu', '2026-08-28')
    expect(changements).toEqual({ statut: 'Résolu' })
  })

  it('efface la date de résolution en sortant de Résolu', () => {
    const resolu = ticket({ statut: 'Résolu', dateResolution: '2026-08-20' })
    const changements = appliquerChangementStatut(resolu, 'En cours', '2026-08-28')
    expect(changements).toEqual({ statut: 'En cours', dateResolution: '' })
  })

  it('ne touche pas à la date de résolution entre deux statuts non résolus', () => {
    const changements = appliquerChangementStatut(ticket({ statut: 'Nouveau' }), 'En cours', '2026-08-28')
    expect(changements).toEqual({ statut: 'En cours' })
  })

  it('laisse Clôturé conserver la date de résolution existante', () => {
    const resolu = ticket({ statut: 'Résolu', dateResolution: '2026-08-20' })
    const changements = appliquerChangementStatut(resolu, 'Clôturé', '2026-08-28')
    expect(changements).toEqual({ statut: 'Clôturé' })
  })
})

describe('dateDuJour', () => {
  it('renvoie une date au format yyyy-mm-dd', () => {
    expect(dateDuJour()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "./statut"`.

- [ ] **Step 3 : Implémenter la règle**

Créer `src/domain/statut.ts` :

```ts
import { appConfig } from '../config/app.config'
import type { Ticket } from './ticket'

/** Date locale au format yyyy-mm-dd (`toISOString` donnerait la date UTC). */
export function dateDuJour(): string {
  const maintenant = new Date()
  const mois = String(maintenant.getMonth() + 1).padStart(2, '0')
  const jour = String(maintenant.getDate()).padStart(2, '0')
  return `${maintenant.getFullYear()}-${mois}-${jour}`
}

/**
 * Calcule les champs à écrire lors d'un changement de statut.
 *
 * Passer à « Résolu » date la résolution du jour, sauf si une date était déjà
 * posée. Quitter « Résolu » pour un statut antérieur l'efface : un ticket
 * rouvert n'est plus résolu. « Clôturé » vient après « Résolu » et conserve
 * la date.
 */
export function appliquerChangementStatut(
  ticket: Ticket,
  nouveauStatut: string,
  aujourdHui: string,
): Partial<Ticket> {
  const changements: Partial<Ticket> = { statut: nouveauStatut }
  const indexNouveau = appConfig.statuts.indexOf(nouveauStatut)
  const indexResolu = appConfig.statuts.indexOf(appConfig.statutResolu)
  const atteintResolution = indexNouveau >= indexResolu && indexNouveau !== -1

  if (nouveauStatut === appConfig.statutResolu && ticket.dateResolution === '') {
    changements.dateResolution = aujourdHui
  } else if (!atteintResolution && ticket.dateResolution !== '') {
    changements.dateResolution = ''
  }
  return changements
}
```

- [ ] **Step 4 : Lancer les tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5 : Commit**

```bash
cd /Users/gautier/powerapps
git add -A
git commit -m "feat: règle de datation automatique à la résolution"
```

---

### Task 7 : Dépôt de tickets (accès SharePoint)

**Files:**
- Create: `gogo-helper/src/data/ticketRepository.ts`
- Test: `gogo-helper/src/data/ticketRepository.test.ts`

**Interfaces:**
- Consumes: `Ticket`, `NouveauTicket`, `toTicket`, `toWriteRecord` (Task 3)
- Produces:
  - `listerTickets(): Promise<Ticket[]>`
  - `creerTicket(nouveau: NouveauTicket): Promise<Ticket>`
  - `majTicket(id: number, changements: Partial<Ticket>): Promise<Ticket>`
  - `supprimerTicket(id: number): Promise<void>`

Chaque fonction lève une `Error` porteuse d'un message en français si `success` est faux.

- [ ] **Step 1 : Écrire les tests avec le service généré simulé**

Créer `src/data/ticketRepository.test.ts` :

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

const getAll = vi.fn()
const create = vi.fn()
const update = vi.fn()
const supprime = vi.fn()

vi.mock('../generated/services/Tickets_SharePointService', () => ({
  Tickets_SharePointService: {
    getAll: (...args: unknown[]) => getAll(...args),
    create: (...args: unknown[]) => create(...args),
    update: (...args: unknown[]) => update(...args),
    delete: (...args: unknown[]) => supprime(...args),
  },
}))

const { creerTicket, listerTickets, majTicket, supprimerTicket } = await import('./ticketRepository')

beforeEach(() => {
  getAll.mockReset()
  create.mockReset()
  update.mockReset()
  supprime.mockReset()
})

describe('listerTickets', () => {
  it('traduit les enregistrements en tickets métier', async () => {
    getAll.mockResolvedValue({
      success: true,
      data: [{ ID: 1, Title: 'VPN', field_5: { Value: 'Nouveau', Id: 1, '@odata.type': '' } }],
    })
    const tickets = await listerTickets()
    expect(tickets).toHaveLength(1)
    expect(tickets[0].titre).toBe('VPN')
    expect(tickets[0].statut).toBe('Nouveau')
  })

  it('renvoie une liste vide quand la source ne renvoie rien', async () => {
    getAll.mockResolvedValue({ success: true, data: null })
    expect(await listerTickets()).toEqual([])
  })

  it('lève une erreur explicite en cas d’échec', async () => {
    getAll.mockResolvedValue({ success: false, data: null, error: new Error('403 interdit') })
    await expect(listerTickets()).rejects.toThrow('403 interdit')
  })

  it('lève un message par défaut quand l’échec n’a pas d’erreur', async () => {
    getAll.mockResolvedValue({ success: false, data: null })
    await expect(listerTickets()).rejects.toThrow('Impossible de charger les tickets.')
  })
})

describe('creerTicket', () => {
  it('envoie l’enregistrement traduit et renvoie le ticket créé', async () => {
    create.mockResolvedValue({ success: true, data: { ID: 5, Title: 'Imprimante' } })
    const ticket = await creerTicket({
      titre: 'Imprimante', description: 'Bourrage', categorie: 'Matériel',
      priorite: 'Basse', statut: 'Nouveau', demandeur: 'Alice', emailDemandeur: 'alice@exemple.fr',
      gestionnaire: '', dateCreation: '2026-08-28', dateEcheance: '', dateResolution: '', commentaire: '',
    })
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ Title: 'Imprimante', field_5: 'Nouveau' }))
    expect(ticket.id).toBe(5)
  })

  it('lève une erreur explicite en cas d’échec', async () => {
    create.mockResolvedValue({ success: false, data: null })
    await expect(
      creerTicket({
        titre: '', description: '', categorie: '', priorite: '', statut: '', demandeur: '',
        emailDemandeur: '', gestionnaire: '', dateCreation: '', dateEcheance: '',
        dateResolution: '', commentaire: '',
      }),
    ).rejects.toThrow('Impossible de créer le ticket.')
  })
})

describe('majTicket', () => {
  it('n’envoie que les champs modifiés, avec un identifiant en chaîne', async () => {
    update.mockResolvedValue({ success: true, data: { ID: 5, field_5: { Value: 'Résolu', Id: 4, '@odata.type': '' } } })
    const ticket = await majTicket(5, { statut: 'Résolu', dateResolution: '2026-08-28' })
    expect(update).toHaveBeenCalledWith('5', { field_5: 'Résolu', field_11: '2026-08-28' })
    expect(ticket.statut).toBe('Résolu')
  })

  it('lève une erreur explicite en cas d’échec', async () => {
    update.mockResolvedValue({ success: false, data: null })
    await expect(majTicket(5, { statut: 'Résolu' })).rejects.toThrow('Impossible de mettre à jour le ticket.')
  })
})

describe('supprimerTicket', () => {
  it('supprime par identifiant en chaîne', async () => {
    supprime.mockResolvedValue(undefined)
    await supprimerTicket(5)
    expect(supprime).toHaveBeenCalledWith('5')
  })
})
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "./ticketRepository"`.

- [ ] **Step 3 : Implémenter le dépôt**

Créer `src/data/ticketRepository.ts` :

```ts
import type { IOperationResult } from '@microsoft/power-apps/data'
import { Tickets_SharePointService } from '../generated/services/Tickets_SharePointService'
import type { Tickets_SharePointRead } from '../generated/models/Tickets_SharePointModel'
import type { NouveauTicket, Ticket } from '../domain/ticket'
import { toTicket, toWriteRecord } from '../domain/ticket'

/** Déballe un résultat d'opération, ou lève une erreur lisible par l'utilisateur. */
function deballer<T>(resultat: IOperationResult<T>, messageParDefaut: string): T {
  if (!resultat.success) {
    throw new Error(resultat.error?.message ?? messageParDefaut)
  }
  return resultat.data
}

export async function listerTickets(): Promise<Ticket[]> {
  const resultat = await Tickets_SharePointService.getAll({
    orderBy: ['Datecr_x00e9_ationv2 desc'],
  })
  const enregistrements = deballer(resultat, 'Impossible de charger les tickets.')
  return (enregistrements ?? []).map((record: Tickets_SharePointRead) => toTicket(record))
}

export async function creerTicket(nouveau: NouveauTicket): Promise<Ticket> {
  const resultat = await Tickets_SharePointService.create(toWriteRecord(nouveau))
  return toTicket(deballer(resultat, 'Impossible de créer le ticket.'))
}

export async function majTicket(id: number, changements: Partial<Ticket>): Promise<Ticket> {
  const resultat = await Tickets_SharePointService.update(String(id), toWriteRecord(changements))
  return toTicket(deballer(resultat, 'Impossible de mettre à jour le ticket.'))
}

export async function supprimerTicket(id: number): Promise<void> {
  await Tickets_SharePointService.delete(String(id))
}
```

- [ ] **Step 4 : Lancer les tests**

Run: `npm test`
Expected: PASS.

Si `orderBy` provoque une erreur au premier lancement réel de l'app (colonne non triable côté SharePoint), retirer l'option : `trierParDateCreationDesc` assure déjà le tri côté client.

- [ ] **Step 5 : Commit**

```bash
cd /Users/gautier/powerapps
git add -A
git commit -m "feat: dépôt de tickets au-dessus du service SharePoint généré"
```

---

### Task 8 : Utilisateur courant et hook de données

**Files:**
- Create: `gogo-helper/src/auth/useCurrentUser.ts`
- Create: `gogo-helper/src/data/useTickets.ts`

**Interfaces:**
- Consumes: `resolveRole`, `appConfig` (Task 2) ; dépôt (Task 7) ; `Ticket`, `NouveauTicket` (Task 3) ; `collectChoices` (Task 4) ; `trierParDateCreationDesc` (Task 5)
- Produces:
  - `interface UtilisateurCourant { email: string; nom: string; role: Role; charge: boolean }`
  - `useCurrentUser(): UtilisateurCourant`
  - `interface EtatTickets { tickets: Ticket[]; choix: Choix; charge: boolean; erreur: string; recharger: () => Promise<void>; creer: (n: NouveauTicket) => Promise<void>; modifier: (id: number, c: Partial<Ticket>) => Promise<void>; supprimer: (id: number) => Promise<void>; effacerErreur: () => void }`
  - `useTickets(): EtatTickets`

Pas de test unitaire sur ces deux hooks : ce sont des adaptateurs React sans logique
propre — toute leur logique métier vit dans `domain/`, déjà testée. Ils sont
vérifiés au lancement de l'app en Task 15.

- [ ] **Step 1 : Implémenter le hook utilisateur**

Créer `src/auth/useCurrentUser.ts` :

```ts
import { useEffect, useState } from 'react'
import { getContext } from '@microsoft/power-apps/app'
import { appConfig } from '../config/app.config'
import type { Role } from '../domain/roles'
import { resolveRole } from '../domain/roles'

export interface UtilisateurCourant {
  email: string
  nom: string
  role: Role
  charge: boolean
}

const utilisateurInconnu: UtilisateurCourant = {
  email: '',
  nom: '',
  role: 'demandeur',
  charge: false,
}

/**
 * Récupère l'utilisateur connecté via le SDK Power Apps et en déduit son rôle.
 * En cas d'échec (app lancée hors du host Power Apps), on retombe sur un
 * demandeur anonyme plutôt que de bloquer l'interface.
 */
export function useCurrentUser(): UtilisateurCourant {
  const [utilisateur, setUtilisateur] = useState<UtilisateurCourant>(utilisateurInconnu)

  useEffect(() => {
    let annule = false
    async function charger() {
      try {
        const contexte = await getContext()
        if (annule) return
        const email = contexte.user.userPrincipalName ?? ''
        setUtilisateur({
          email,
          nom: contexte.user.fullName ?? email,
          role: resolveRole(email, appConfig.managerEmails),
          charge: true,
        })
      } catch {
        if (!annule) setUtilisateur({ ...utilisateurInconnu, charge: true })
      }
    }
    void charger()
    return () => {
      annule = true
    }
  }, [])

  return utilisateur
}
```

- [ ] **Step 2 : Vérifier la signature de `getContext`**

Run: `npx tsc -b`
Expected: aucune erreur. Si `getContext` est synchrone, `await` sur une valeur non-promesse reste valide — le code compile dans les deux cas.

- [ ] **Step 3 : Implémenter le hook de données**

Créer `src/data/useTickets.ts` :

```ts
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Choix } from '../domain/choices'
import { collectChoices } from '../domain/choices'
import { trierParDateCreationDesc } from '../domain/filters'
import type { NouveauTicket, Ticket } from '../domain/ticket'
import { creerTicket, listerTickets, majTicket, supprimerTicket } from './ticketRepository'

export interface EtatTickets {
  tickets: Ticket[]
  choix: Choix
  charge: boolean
  erreur: string
  recharger: () => Promise<void>
  creer: (nouveau: NouveauTicket) => Promise<void>
  modifier: (id: number, changements: Partial<Ticket>) => Promise<void>
  supprimer: (id: number) => Promise<void>
  effacerErreur: () => void
}

function messageDe(erreur: unknown, parDefaut: string): string {
  return erreur instanceof Error && erreur.message ? erreur.message : parDefaut
}

export function useTickets(): EtatTickets {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [charge, setCharge] = useState(false)
  const [erreur, setErreur] = useState('')

  const recharger = useCallback(async () => {
    setCharge(false)
    setErreur('')
    try {
      setTickets(trierParDateCreationDesc(await listerTickets()))
    } catch (e) {
      setErreur(messageDe(e, 'Impossible de charger les tickets.'))
    } finally {
      setCharge(true)
    }
  }, [])

  useEffect(() => {
    void recharger()
  }, [recharger])

  const creer = useCallback(async (nouveau: NouveauTicket) => {
    setErreur('')
    try {
      const cree = await creerTicket(nouveau)
      setTickets((precedents) => trierParDateCreationDesc([cree, ...precedents]))
    } catch (e) {
      setErreur(messageDe(e, 'Impossible de créer le ticket.'))
      throw e
    }
  }, [])

  /**
   * Mise à jour optimiste : l'écran réagit immédiatement (indispensable pour
   * le glisser-déposer du kanban) et l'état précédent est restauré si le
   * serveur refuse.
   */
  const modifier = useCallback(async (id: number, changements: Partial<Ticket>) => {
    setErreur('')
    let precedents: Ticket[] = []
    setTickets((actuels) => {
      precedents = actuels
      return actuels.map((t) => (t.id === id ? { ...t, ...changements } : t))
    })
    try {
      const aJour = await majTicket(id, changements)
      setTickets((actuels) => actuels.map((t) => (t.id === id ? aJour : t)))
    } catch (e) {
      setTickets(precedents)
      setErreur(messageDe(e, 'Impossible de mettre à jour le ticket.'))
    }
  }, [])

  const supprimer = useCallback(async (id: number) => {
    setErreur('')
    let precedents: Ticket[] = []
    setTickets((actuels) => {
      precedents = actuels
      return actuels.filter((t) => t.id !== id)
    })
    try {
      await supprimerTicket(id)
    } catch (e) {
      setTickets(precedents)
      setErreur(messageDe(e, 'Impossible de supprimer le ticket.'))
    }
  }, [])

  const choix = useMemo(() => collectChoices(tickets), [tickets])
  const effacerErreur = useCallback(() => setErreur(''), [])

  return { tickets, choix, charge, erreur, recharger, creer, modifier, supprimer, effacerErreur }
}
```

- [ ] **Step 4 : Vérifier la compilation et le lint**

Run: `npx tsc -b && npm run lint`
Expected: aucune erreur.

- [ ] **Step 5 : Commit**

```bash
cd /Users/gautier/powerapps
git add -A
git commit -m "feat: hooks utilisateur courant et chargement/mutation des tickets"
```

---

### Task 9 : Badges et carte de ticket

**Files:**
- Create: `gogo-helper/src/components/Badges.tsx`
- Create: `gogo-helper/src/components/TicketCard.tsx`

**Interfaces:**
- Consumes: `appConfig` (Task 2), `Ticket` (Task 3)
- Produces:
  - `<BadgeStatut valeur={string} />`
  - `<BadgePriorite valeur={string} />`
  - `<TicketCard ticket={Ticket} onOuvrir={(t: Ticket) => void} draggable?: boolean onDragStart?: (t: Ticket) => void />`

- [ ] **Step 1 : Créer les badges**

Créer `src/components/Badges.tsx` :

```tsx
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
```

- [ ] **Step 2 : Créer la carte de ticket**

Créer `src/components/TicketCard.tsx` :

```tsx
import { Body1, Caption1, Card, CardHeader, Text } from '@fluentui/react-components'
import type { Ticket } from '../domain/ticket'
import { BadgePriorite, BadgeStatut } from './Badges'

interface Props {
  ticket: Ticket
  onOuvrir: (ticket: Ticket) => void
  draggable?: boolean
  onDragStart?: (ticket: Ticket) => void
}

export function TicketCard({ ticket, onOuvrir, draggable = false, onDragStart }: Props) {
  return (
    <Card
      role="button"
      tabIndex={0}
      draggable={draggable}
      onDragStart={() => onDragStart?.(ticket)}
      onClick={() => onOuvrir(ticket)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOuvrir(ticket)
        }
      }}
      style={{ cursor: 'pointer', marginBottom: '8px' }}
    >
      <CardHeader
        header={<Body1><strong>#{ticket.id} — {ticket.titre || 'Sans titre'}</strong></Body1>}
        description={<Caption1>{ticket.demandeur || ticket.emailDemandeur}</Caption1>}
      />
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
        <BadgeStatut valeur={ticket.statut} />
        <BadgePriorite valeur={ticket.priorite} />
        {ticket.categorie !== '' && <Caption1>{ticket.categorie}</Caption1>}
      </div>
      {ticket.dateEcheance !== '' && (
        <Text size={200}>Échéance : {ticket.dateEcheance}</Text>
      )}
    </Card>
  )
}
```

- [ ] **Step 3 : Vérifier la compilation**

Run: `npx tsc -b && npm run lint`
Expected: aucune erreur.

- [ ] **Step 4 : Commit**

```bash
cd /Users/gautier/powerapps
git add -A
git commit -m "feat: badges de statut/priorité et carte de ticket"
```

---

### Task 10 : Shell de l'application

**Files:**
- Modify: `gogo-helper/src/App.tsx` (remplacement complet)
- Modify: `gogo-helper/src/main.tsx`
- Modify: `gogo-helper/src/index.css` (remplacement complet)
- Delete: `gogo-helper/src/App.css`, `gogo-helper/src/assets/react.svg`

**Interfaces:**
- Consumes: `useCurrentUser` (Task 8), `useTickets` (Task 8)
- Produces: l'ossature dans laquelle les vues des Tasks 11 et 15 s'insèrent. `App` rend un `FluentProvider`, un en-tête affichant nom, email et rôle, la `MessageBar` d'erreur globale, et un placeholder de contenu.

- [ ] **Step 1 : Simplifier les styles globaux**

Remplacer le contenu de `src/index.css` par :

```css
:root {
  font-family: 'Segoe UI', system-ui, sans-serif;
}

body {
  margin: 0;
}

#root {
  min-height: 100vh;
}
```

- [ ] **Step 2 : Supprimer les restes du gabarit Vite**

```bash
cd /Users/gautier/powerapps/gogo-helper
rm -f src/App.css src/assets/react.svg public/vite.svg
```

Dans `index.html`, supprimer la ligne `<link rel="icon" type="image/svg+xml" href="/vite.svg" />`.

- [ ] **Step 3 : Écrire le shell**

Remplacer le contenu de `src/App.tsx` par :

```tsx
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
```

L'en-tête affiche volontairement l'email et le rôle : c'est ainsi que la valeur exacte
à placer dans `appConfig.managerEmails` est relevée au premier lancement.

- [ ] **Step 4 : Nettoyer `main.tsx`**

Remplacer le contenu de `src/main.tsx` par :

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 5 : Vérifier la compilation et le build**

Run: `npx tsc -b && npm run lint && npm run build`
Expected: aucune erreur, build réussi.

- [ ] **Step 6 : Commit**

```bash
cd /Users/gautier/powerapps
git add -A
git commit -m "feat: shell Fluent avec en-tête, erreurs globales et état de chargement"
```

---

### Task 11 : Formulaire de nouvelle demande et vue demandeur

**Files:**
- Create: `gogo-helper/src/components/NewTicketForm.tsx`
- Create: `gogo-helper/src/components/TicketDetails.tsx`
- Create: `gogo-helper/src/views/RequesterView.tsx`
- Modify: `gogo-helper/src/App.tsx`

**Interfaces:**
- Consumes: `Choix` (Task 4), `NouveauTicket`/`Ticket` (Task 3), `appConfig` (Task 2), `dateDuJour` (Task 6), `compterParStatut` (Task 5), `TicketCard`/badges (Task 9), `UtilisateurCourant`/`EtatTickets` (Task 8)
- Produces:
  - `<NewTicketForm ouvert={boolean} choix={Choix} utilisateur={UtilisateurCourant} onFermer={() => void} onSoumettre={(n: NouveauTicket) => Promise<void>} />`
  - `<TicketDetails ticket={Ticket} />` — bloc de lecture seule réutilisé par le panneau gestionnaire
  - `<RequesterView utilisateur={UtilisateurCourant} donnees={EtatTickets} />`

- [ ] **Step 1 : Créer le formulaire de création**

Créer `src/components/NewTicketForm.tsx` :

```tsx
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
```

- [ ] **Step 2 : Créer le bloc de détail en lecture seule**

Créer `src/components/TicketDetails.tsx` :

```tsx
import { Body1, Caption1, Divider, Text } from '@fluentui/react-components'
import type { Ticket } from '../domain/ticket'
import { BadgePriorite, BadgeStatut } from './Badges'

function Ligne({ libelle, valeur }: { libelle: string; valeur: string }) {
  return (
    <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
      <Caption1 style={{ minWidth: '140px', opacity: 0.7 }}>{libelle}</Caption1>
      <Text size={300}>{valeur || '—'}</Text>
    </div>
  )
}

export function TicketDetails({ ticket }: { ticket: Ticket }) {
  return (
    <div>
      <Body1><strong>#{ticket.id} — {ticket.titre || 'Sans titre'}</strong></Body1>
      <div style={{ display: 'flex', gap: '6px', margin: '8px 0' }}>
        <BadgeStatut valeur={ticket.statut} />
        <BadgePriorite valeur={ticket.priorite} />
      </div>
      <Text size={300} style={{ whiteSpace: 'pre-wrap', display: 'block', marginBottom: '12px' }}>
        {ticket.description || 'Aucune description.'}
      </Text>
      <Divider style={{ margin: '12px 0' }} />
      <Ligne libelle="Catégorie" valeur={ticket.categorie} />
      <Ligne libelle="Demandeur" valeur={ticket.demandeur} />
      <Ligne libelle="Email demandeur" valeur={ticket.emailDemandeur} />
      <Ligne libelle="Gestionnaire" valeur={ticket.gestionnaire} />
      <Ligne libelle="Date de création" valeur={ticket.dateCreation} />
      <Ligne libelle="Échéance" valeur={ticket.dateEcheance} />
      <Ligne libelle="Date de résolution" valeur={ticket.dateResolution} />
      <Divider style={{ margin: '12px 0' }} />
      <Caption1 style={{ opacity: 0.7 }}>Commentaire du gestionnaire</Caption1>
      <Text size={300} style={{ whiteSpace: 'pre-wrap', display: 'block' }}>
        {ticket.commentaire || 'Aucun commentaire pour le moment.'}
      </Text>
    </div>
  )
}
```

- [ ] **Step 3 : Créer la vue demandeur**

Créer `src/views/RequesterView.tsx` :

```tsx
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
```

- [ ] **Step 4 : Brancher la vue dans le shell**

Dans `src/App.tsx`, ajouter l'import `import { RequesterView } from './views/RequesterView'`, puis remplacer le bloc :

```tsx
        ) : (
          <Caption1>{donnees.tickets.length} ticket(s) chargé(s).</Caption1>
        )}
```

par :

```tsx
        ) : (
          <RequesterView utilisateur={utilisateur} donnees={donnees} />
        )}
```

- [ ] **Step 5 : Vérifier la compilation et le build**

Run: `npx tsc -b && npm run lint && npm run build`
Expected: aucune erreur.

- [ ] **Step 6 : Commit**

```bash
cd /Users/gautier/powerapps
git add -A
git commit -m "feat: vue demandeur avec création et suivi des tickets"
```

---

### Task 12 : Barre de filtres

**Files:**
- Create: `gogo-helper/src/components/TicketFilters.tsx`

**Interfaces:**
- Consumes: `Choix` (Task 4), `EtatFiltres`/`Assignation`/`filtresVides` (Task 5)
- Produces: `<TicketFilters filtres={EtatFiltres} choix={Choix} onChanger={(f: EtatFiltres) => void} nbResultats={number} />`

- [ ] **Step 1 : Créer la barre de filtres**

Créer `src/components/TicketFilters.tsx` :

```tsx
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
```

- [ ] **Step 2 : Vérifier la compilation**

Run: `npx tsc -b && npm run lint`
Expected: aucune erreur.

- [ ] **Step 3 : Commit**

```bash
cd /Users/gautier/powerapps
git add -A
git commit -m "feat: barre de filtres et de recherche des tickets"
```

---

### Task 13 : Vues liste et kanban

**Files:**
- Create: `gogo-helper/src/components/TicketList.tsx`
- Create: `gogo-helper/src/components/TicketKanban.tsx`

**Interfaces:**
- Consumes: `Ticket` (Task 3), `Choix` (Task 4), `TicketCard`/badges (Task 9)
- Produces:
  - `<TicketList tickets={Ticket[]} onOuvrir={(t: Ticket) => void} />`
  - `<TicketKanban tickets={Ticket[]} statuts={string[]} onOuvrir={(t: Ticket) => void} onChangerStatut={(t: Ticket, statut: string) => void} />`

Le glisser-déposer utilise l'API HTML5 native — pas de dépendance supplémentaire.

- [ ] **Step 1 : Créer la vue liste**

Créer `src/components/TicketList.tsx` :

```tsx
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
```

- [ ] **Step 2 : Créer la vue kanban**

Créer `src/components/TicketKanban.tsx` :

```tsx
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
```

- [ ] **Step 3 : Vérifier la compilation**

Run: `npx tsc -b && npm run lint`
Expected: aucune erreur.

- [ ] **Step 4 : Commit**

```bash
cd /Users/gautier/powerapps
git add -A
git commit -m "feat: vues liste (DataGrid) et kanban avec glisser-déposer"
```

---

### Task 14 : Panneau d'édition gestionnaire

**Files:**
- Create: `gogo-helper/src/components/TicketPanel.tsx`

**Interfaces:**
- Consumes: `Ticket` (Task 3), `Choix` (Task 4), `appliquerChangementStatut`/`dateDuJour` (Task 6), `UtilisateurCourant` (Task 8), `TicketDetails` (Task 11)
- Produces: `<TicketPanel ticket={Ticket | null} choix={Choix} utilisateur={UtilisateurCourant} onFermer={() => void} onEnregistrer={(id: number, c: Partial<Ticket>) => Promise<void>} onSupprimer={(id: number) => Promise<void>} />`

- [ ] **Step 1 : Créer le panneau d'édition**

Créer `src/components/TicketPanel.tsx` :

```tsx
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
  useEffect(() => {
    if (!ticket) return
    setStatut(ticket.statut)
    setPriorite(ticket.priorite)
    setGestionnaire(ticket.gestionnaire)
    setEcheance(ticket.dateEcheance)
    setCommentaire(ticket.commentaire)
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
```

- [ ] **Step 2 : Vérifier la compilation**

Run: `npx tsc -b && npm run lint`
Expected: aucune erreur.

- [ ] **Step 3 : Commit**

```bash
cd /Users/gautier/powerapps
git add -A
git commit -m "feat: panneau de traitement des tickets côté gestionnaire"
```

---

### Task 15 : Vue gestionnaire et bascule des rôles

**Files:**
- Create: `gogo-helper/src/views/ManagerView.tsx`
- Modify: `gogo-helper/src/App.tsx`

**Interfaces:**
- Consumes: tout ce qui précède
- Produces: `<ManagerView utilisateur={UtilisateurCourant} donnees={EtatTickets} />` — application complète.

- [ ] **Step 1 : Créer la vue gestionnaire**

Créer `src/views/ManagerView.tsx` :

```tsx
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
```

- [ ] **Step 2 : Brancher les deux vues dans le shell**

Remplacer le contenu de `src/App.tsx` par :

```tsx
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
```

- [ ] **Step 3 : Vérifier tests, types, lint et build**

Run: `npm test && npx tsc -b && npm run lint && npm run build`
Expected: tous les tests passent, aucune erreur de type ni de lint, build réussi.

- [ ] **Step 4 : Lancer l'application et vérifier manuellement**

Run: `npm run dev`

Vérifier dans le navigateur :
1. L'en-tête affiche un nom, un email et un rôle. **Relever l'email exact** — s'il diffère de `gautier.baleda@alegria.academy`, corriger `appConfig.managerEmails` dans `src/config/app.config.ts`.
2. En gestionnaire : le kanban affiche une colonne par statut, la bascule Liste fonctionne, les filtres réduisent le nombre affiché, le glisser-déposer déplace une carte et le changement persiste après rechargement de la page.
3. Ouvrir un ticket, cliquer « M'assigner », enregistrer, vérifier que le gestionnaire apparaît dans la liste.
4. Passer un ticket en « Résolu » et vérifier que la date de résolution se remplit.
5. En « Mes demandes » : créer une demande, vérifier qu'elle apparaît dans la liste et dans SharePoint.
6. **Relever les valeurs réelles** de Statut, Priorité et Catégorie affichées, et aligner `appConfig` si elles diffèrent des valeurs par défaut.

- [ ] **Step 5 : Commit**

```bash
cd /Users/gautier/powerapps
git add -A
git commit -m "feat: vue gestionnaire kanban/liste et bascule entre espaces"
```

---

### Task 16 : Documentation du projet

**Files:**
- Modify: `gogo-helper/README.md` (remplacement complet)

**Interfaces:**
- Consumes: rien
- Produces: rien

- [ ] **Step 1 : Réécrire le README**

Remplacer le contenu de `gogo-helper/README.md` par :

````markdown
# GoGo Helper

Solution de ticketing helpdesk construite en Power Apps Code App, au-dessus d'une
liste SharePoint « Tickets ».

## Fonctionnalités

- **Demandeur** — soumettre une demande de support et suivre l'avancement de ses tickets.
- **Gestionnaire** — suivre tous les tickets en kanban ou en liste, filtrer et rechercher,
  assigner, changer le statut par glisser-déposer, éditer et supprimer.

## Démarrage

```bash
npm install
npm run dev      # développement local
npm test         # tests unitaires (Vitest)
npm run lint     # ESLint
npm run build    # build de production
```

## Configuration

Tout se règle dans `src/config/app.config.ts` :

- `managerEmails` — les emails des gestionnaires ; tout autre utilisateur est demandeur.
  L'en-tête de l'app affiche l'email de l'utilisateur connecté, ce qui permet de relever
  la valeur exacte à y placer.
- `statuts`, `priorites`, `categories` — les valeurs de référence, qui donnent l'ordre des
  colonnes du kanban et remplissent les listes déroulantes. Toute valeur rencontrée dans un
  ticket mais absente d'ici est ajoutée automatiquement en fin de liste.
- `couleursStatut`, `couleursPriorite` — les couleurs des badges.

## Architecture

```
src/config/     configuration de l'app
src/domain/     modules purs, testés : mapper, rôles, choix, filtres, règle de statut
src/data/       accès SharePoint et hook de chargement/mutation
src/auth/       utilisateur courant via le SDK Power Apps
src/components/ composants Fluent réutilisables
src/views/      vue demandeur et vue gestionnaire
src/generated/  service et modèles générés par `pac code` — NE PAS MODIFIER
```

`src/domain/ticket.ts` est le seul fichier qui connaît les noms de colonnes SharePoint
(`field_2`, `field_3`…). Une évolution de la liste ne touche que ce fichier.

## Documents

- Spécification : `../docs/superpowers/specs/2026-08-28-gogo-helper-design.md`
- Plan d'implémentation : `../docs/superpowers/plans/2026-08-28-gogo-helper.md`
````

- [ ] **Step 2 : Commit**

```bash
cd /Users/gautier/powerapps
git add -A
git commit -m "docs: README de GoGo Helper"
```
