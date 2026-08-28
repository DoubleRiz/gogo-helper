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
