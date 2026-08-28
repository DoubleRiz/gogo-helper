# GoGo Helper — Solution de ticketing helpdesk (Power Apps Code App)

Date : 2026-08-28
Statut : design validé, prêt pour la planification

## Objectif

Une Code App Power Apps permettant :

- à un **demandeur** de soumettre une demande de support informatique et de suivre l'avancement de ses tickets ;
- à un **gestionnaire** de suivre tous les tickets avec filtres, en vue kanban ou liste, et de les traiter.

## Source de données

Liste SharePoint `tickets_sharepoint`, déjà connectée (voir `power.config.json`).
Le service et les modèles TypeScript sont générés dans `src/generated/`.

Correspondance des colonnes :

| Interne | Affiché | Type |
|---|---|---|
| `ID` | ID | entier |
| `Title` | Titre | texte |
| `field_2` | Description | texte |
| `field_3` | Catégorie | choix (`{ Value, Id }`) |
| `field_4` | Priorité | choix |
| `field_5` | Statut | choix |
| `field_6` | Demandeur | texte |
| `field_7` | Email demandeur | texte |
| `field_8` | Gestionnaire | texte |
| `Datecr_x00e9_ationv2` | Date création | date |
| `field_10` | Date échéance | date |
| `field_11` | Date résolution | date |
| `field_12` | Commentaire | texte |

En lecture, les colonnes de choix arrivent en objet (`field_3.Value`) ; en écriture, elles
attendent une chaîne (`field_3: "Matériel"`). Le mapper absorbe cette asymétrie.

## Décisions

1. **Rôles** — déterminés par une liste d'emails de gestionnaires dans la config de l'app.
   L'utilisateur connecté est obtenu via `getContext()` du SDK Power Apps.
2. **Valeurs de choix** — jeu de valeurs par défaut dans la config, **fusionné** avec toute
   valeur inédite rencontrée dans les tickets chargés. La config seule ne suffit pas (elle
   dériverait de la liste réelle) ; la déduction seule non plus (liste vide ⇒ aucune colonne
   kanban ni choix au formulaire).
3. **UI** — Fluent UI v9 (`@fluentui/react-components`), pour un rendu natif Power Platform,
   le thème clair/sombre et des composants accessibles.
4. **Actions gestionnaire** — changer le statut (y compris par glisser-déposer), s'assigner ou
   assigner, éditer priorité / échéance / commentaire, supprimer avec confirmation.

## Arborescence

Le dossier `my-first-app` est renommé `gogo-helper` ; `appDisplayName` devient « GoGo Helper ».

```
src/
  config/app.config.ts        emails gestionnaires, valeurs de choix par défaut, ordre + couleurs des statuts
  domain/ticket.ts            type Ticket métier + mapper field_N <-> Ticket
  domain/choices.ts           fusion valeurs config + valeurs rencontrées
  domain/filters.ts           logique de filtrage et de recherche
  data/ticketRepository.ts    enrobe Tickets_SharePointService (list/create/update/delete)
  data/useTickets.ts          hook : chargement, refresh, mutations optimistes
  auth/useCurrentUser.ts      getContext() -> { email, nom, role }
  components/                 TicketCard, TicketList, TicketKanban, TicketFilters,
                              TicketPanel, NewTicketForm, StatusBadge, PriorityBadge
  views/RequesterView.tsx     vue demandeur
  views/ManagerView.tsx       vue gestionnaire
  App.tsx                     shell Fluent, en-tête, bascule entre vues
```

Le mapper isole `field_2`, `field_3.Value`, `Datecr_x00e9_ationv2` du reste de l'application :
le code applicatif ne manipule que `ticket.description`, `ticket.categorie`, `ticket.dateCreation`.
Une évolution de la liste SharePoint ne touche qu'un fichier.

## Type métier

```ts
interface Ticket {
  id: number
  titre: string
  description: string
  categorie: string
  priorite: string
  statut: string
  demandeur: string
  emailDemandeur: string
  gestionnaire: string
  dateCreation?: string      // ISO yyyy-mm-dd
  dateEcheance?: string
  dateResolution?: string
  commentaire: string
  modifie?: string           // Modified, ISO datetime
}
```

## Configuration

```ts
export const appConfig = {
  managerEmails: ['<à confirmer : l'email du compte Power Apps>'],
  statuts: ['Nouveau', 'En cours', 'En attente', 'Résolu', 'Clôturé'],
  statutResolu: 'Résolu',
  statutInitial: 'Nouveau',
  priorites: ['Basse', 'Moyenne', 'Haute', 'Critique'],
  categories: ['Matériel', 'Logiciel', 'Réseau', 'Accès / Compte', 'Autre'],
}
```

L'email gestionnaire est à confirmer : le compte du tenant SharePoint (`gautier_baleda_alegria_academy`)
n'est pas forcément l'adresse `gautier@doreka.eu`. La valeur exacte est celle que renvoie
`getContext().user.userPrincipalName` ; l'en-tête de l'app l'affiche pour permettre de la relever.

Les valeurs de choix sont ajustées après le premier lancement, une fois connues les valeurs réelles de
la liste SharePoint. Toute valeur rencontrée dans un ticket et absente de la config est ajoutée
en fin de liste à l'exécution.

## Vue demandeur

- « Mes tickets » : uniquement ses tickets, filtrés sur `emailDemandeur` = email courant,
  en cartes triées par date de création décroissante.
- Compteur par statut en tête de page.
- Bouton **Nouvelle demande** : formulaire titre, description, catégorie, priorité.
  Demandeur, email, date de création et statut initial sont remplis automatiquement.
- Clic sur un ticket : panneau latéral en lecture seule — avancement, commentaire du
  gestionnaire, dates, gestionnaire assigné.

## Vue gestionnaire

Tous les tickets, avec bascule **Kanban / Liste** :

- **Kanban** — une colonne par statut, dans l'ordre de la config. Glisser-déposer d'une colonne
  à l'autre pour changer le statut. Le passage au statut « Résolu » renseigne automatiquement
  la date de résolution ; sortir de « Résolu » l'efface.
- **Liste** — DataGrid Fluent triable : titre, demandeur, catégorie, priorité, statut,
  échéance, gestionnaire.
- **Filtres** communs aux deux vues : recherche texte (titre + description + demandeur),
  statut, priorité, catégorie, et gestionnaire (mes tickets / non assignés / tous).
- Clic sur un ticket : panneau d'édition — statut, priorité, gestionnaire (avec bouton
  « M'assigner »), échéance, commentaire. Suppression avec dialogue de confirmation.

Un gestionnaire dispose en plus d'un onglet « Mes demandes » donnant la vue demandeur sur
ses propres tickets.

## Données, erreurs, états

- Chargement unique via `getAll`, tri serveur sur la date de création décroissante.
  Filtres et recherche appliqués côté client : le filtrage OData sur les colonnes de choix
  SharePoint est fragile et le volume d'un helpdesk ne le justifie pas. Au-delà de quelques
  milliers de tickets, repasser au filtrage serveur.
- Mutations **optimistes** avec restauration de l'état précédent en cas d'échec — le
  glisser-déposer doit être instantané.
- Tout `IOperationResult` en échec affiche un `MessageBar` Fluent avec le message d'erreur,
  sans perdre la saisie en cours.
- États explicites : chargement, liste vide, aucun résultat après filtrage, erreur de connexion
  avec bouton « Réessayer ».

## Tests

Vitest, écrits avant le code (TDD), sur les modules purs :

- mapper aller-retour `Ticket` <-> `Tickets_SharePointWrite` / `Tickets_SharePointRead` ;
- résolution du rôle depuis l'email et la config ;
- fusion des valeurs de choix (config seule, tickets seuls, doublons, ordre) ;
- filtrage et recherche ;
- règle « statut Résolu ⇒ date de résolution renseignée ; sortie de Résolu ⇒ effacée ».

L'UI Fluent n'est pas testée unitairement ; vérification par lancement de l'app (`npm run dev`).

## Hors périmètre

Notifications e-mail, pièces jointes, SLA et escalade automatique, tableaux de bord
statistiques, historique d'audit des changements.
