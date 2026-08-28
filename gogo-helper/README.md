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
- Plan d'implémentation : `docs/superpowers/plans/2026-08-28-gogo-helper.md`
