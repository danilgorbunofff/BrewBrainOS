import { RecipeIngredient } from '@/types/database'

/**
 * Scales a list of ingredients linearly based on batch size proportionality.
 */
export function scaleIngredients(
  ingredients: RecipeIngredient[],
  baselineBbls: number,
  targetBbls: number
): RecipeIngredient[] {
  if (baselineBbls <= 0 || targetBbls <= 0) return ingredients
  
  const scalingFactor = targetBbls / baselineBbls

  return ingredients.map(ing => ({
    ...ing,
    amount: Math.round(ing.amount * scalingFactor * 100) / 100
  }))
}
