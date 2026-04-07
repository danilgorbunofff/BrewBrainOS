import { describe, expect, it } from 'vitest'

import { scaleIngredients } from '@/lib/recipe-math'
import type { RecipeIngredient } from '@/types/database'

const ingredients: RecipeIngredient[] = [
  {
    id: 'grain-1',
    recipe_id: 'recipe-1',
    inventory_item_id: 'inventory-1',
    ingredient_type: 'grain',
    amount: 12.5,
    unit: 'lb',
    timing: null,
    notes: null,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'hop-1',
    recipe_id: 'recipe-1',
    inventory_item_id: 'inventory-2',
    ingredient_type: 'hop',
    amount: 1.335,
    unit: 'oz',
    timing: '60 min',
    notes: null,
    created_at: '2026-01-01T00:00:00.000Z',
  },
]

describe('scaleIngredients', () => {
  it('scales ingredient amounts proportionally and rounds to two decimals when scaling up', () => {
    expect(scaleIngredients(ingredients, 5, 10)).toEqual([
      {
        ...ingredients[0],
        amount: 25,
      },
      {
        ...ingredients[1],
        amount: 2.67,
      },
    ])
  })

  it('scales ingredient amounts proportionally when scaling down', () => {
    expect(scaleIngredients(ingredients, 10, 2.5)).toEqual([
      {
        ...ingredients[0],
        amount: 3.13,
      },
      {
        ...ingredients[1],
        amount: 0.33,
      },
    ])
  })

  it('returns the original array reference when either batch size is not positive', () => {
    expect(scaleIngredients(ingredients, 0, 10)).toBe(ingredients)
    expect(scaleIngredients(ingredients, 10, 0)).toBe(ingredients)
  })
})