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
