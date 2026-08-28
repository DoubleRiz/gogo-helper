# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commandes

```bash
npm run dev                       # Vite sur http://localhost:3000 (le port DOIT rester 3000 : voir ci-dessous)
npm run build                     # tsc -b puis vite build → dist/
npm run lint                      # ESLint (flat config)
npm test                          # Vitest, une passe
npm run test:watch
npx vitest run src/domain/statut.test.ts          # un seul fichier
npx vitest run -t "nom du test"                   # un seul test
```

Régénérer la couche SharePoint après une évolution de la liste (écrase `src/generated/` et `.power/`) :

```bash
pac code add-data-source -a shared_sharepointonline \
  -c shared-sharepointonl-c904333d-3d36-4a2b-871a-947be380fdc0 \
  -t 3a99496a-6600-4de9-b15c-847d4f5ee1bc \
  -d https://alegriaacademy23-my.sharepoint.com/personal/gautier_baleda_alegria_academy
```

## Nature du projet

Power Apps **Code App** : SPA React 19 + Vite, sans backend propre. Toutes les données passent par
le SDK `@microsoft/power-apps` vers une liste SharePoint « Tickets ». L'app tourne dans le host
Power Apps ; hors de ce host, `getContext()` échoue et [useCurrentUser.ts](src/auth/useCurrentUser.ts)
retombe sur un demandeur anonyme plutôt que de bloquer l'interface — c'est ce qui rend `npm run dev`
utilisable en local.

Le plugin `powerApps()` de [vite.config.ts](vite.config.ts) impose que le port de dev corresponde à
`localAppUrl` de [power.config.json](power.config.json). Changer l'un oblige à changer l'autre.

## Architecture

```
src/config/app.config.ts   valeurs de référence + emails gestionnaires
src/domain/                modules purs, testés en Vitest (aucun import React ni SDK)
src/data/                  ticketRepository (SDK) + useTickets (état, mutations optimistes)
src/auth/                  utilisateur courant via le SDK Power Apps
src/components/            composants Fluent v9 réutilisables
src/views/                 ManagerView / RequesterView
src/generated/, .power/    générés par `pac code` — NE JAMAIS MODIFIER
```

Le flux est unidirectionnel : `App` monte `useCurrentUser` + `useTickets` et passe `utilisateur` et
`donnees` aux deux vues ; il n'y a pas d'autre source d'état partagé. `App` choisit la vue à partir
du rôle et de l'onglet d'espace (un gestionnaire peut basculer sur « Mes demandes »).

### Règles structurantes

- **[src/domain/ticket.ts](src/domain/ticket.ts) est le seul fichier qui connaît les noms de colonnes
  SharePoint** (`field_2`, `field_3`, `Datecr_x00e9_ationv2`…). `toTicket` / `toWriteRecord` font la
  traduction dans les deux sens. Une évolution de la liste ne doit toucher que ce fichier. `toWriteRecord`
  n'émet que les clés présentes dans son argument : c'est ce qui rend les mises à jour partielles sûres.
- **`domain/` reste pur** — pas de React, pas de SDK, pas d'horloge implicite (`appliquerChangementStatut`
  reçoit `aujourdHui` en paramètre). C'est là que va toute logique testable, et chaque module a son
  `*.test.ts` voisin. Vitest ne collecte que `src/**/*.test.ts` en environnement `node` : les composants
  ne sont pas testés.
- **Mutations optimistes** dans [useTickets.ts](src/data/useTickets.ts) : `modifier` et `supprimer`
  appliquent le changement localement, puis restaurent l'état précédent si le serveur refuse. Le
  glisser-déposer du kanban en dépend.
- **Filtrage et tri côté client** ([domain/filters.ts](src/domain/filters.ts)) : le filtrage OData sur les
  colonnes de choix SharePoint est peu fiable, et le volume d'un helpdesk le permet.
- **Choix fusionnés** ([domain/choices.ts](src/domain/choices.ts)) : les valeurs de `app.config.ts` donnent
  l'ordre de référence (colonnes du kanban, listes déroulantes) ; toute valeur rencontrée dans un ticket
  mais absente de la config est ajoutée en fin de liste à l'exécution.
- **Rôles** : gestionnaire si l'email figure dans `appConfig.managerEmails`, demandeur sinon. L'en-tête
  affiche l'email connecté, ce qui permet de relever la valeur exacte à configurer.
- **Dates** : les dates métier sont des chaînes `yyyy-mm-dd` (`dateDuJour()` renvoie la date *locale*,
  pas `toISOString`) ; seul `modifie` est un ISO datetime complet.

## Conventions

- **Tout est en français** : noms de variables métier, commentaires, messages utilisateur, libellés d'UI.
- TypeScript strict avec `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax` → les imports de
  types s'écrivent `import type { X } from '...'`.
- UI en Fluent v9 uniquement ; le thème est `webLightTheme`, appliqué une fois dans `App`.
- Les chaînes vides (`''`) servent de valeur « absente » partout — pas de `null`/`undefined` dans `Ticket`.

## Documents

- Spécification : [docs/superpowers/specs/2026-08-28-gogo-helper-design.md](docs/superpowers/specs/2026-08-28-gogo-helper-design.md)
- Plan d'implémentation : [docs/superpowers/plans/2026-08-28-gogo-helper.md](docs/superpowers/plans/2026-08-28-gogo-helper.md)
