import { describe, expect, it } from 'vitest'
import { toNotificationInput } from './notification'

describe('toNotificationInput', () => {
  it('place chaque champ du ticket sur le paramètre attendu du flow', () => {
    const input = toNotificationInput(
      { titre: 'Écran noir', description: 'Le poste ne démarre plus', priorite: 'Haute' },
      'it@exemple.fr',
    )
    expect(input).toEqual({
      text: 'it@exemple.fr',
      text_1: 'Le poste ne démarre plus',
      text_2: 'Haute',
      text_3: 'Écran noir',
    })
  })

  it('transmet des chaînes vides plutôt que des valeurs absentes', () => {
    const input = toNotificationInput({ titre: 'Titre', description: '', priorite: '' }, '')
    expect(input).toEqual({ text: '', text_1: '', text_2: '', text_3: 'Titre' })
  })
})
