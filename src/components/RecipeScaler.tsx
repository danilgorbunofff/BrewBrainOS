'use client'

import { useState } from 'react'
import { LucideScale } from 'lucide-react'
import { RecipeIngredient } from '@/types/database'
import { scaleIngredients } from '@/lib/recipe-math'

export function RecipeScaler({ 
  ingredients, 
  baseVolume 
}: { 
  ingredients: RecipeIngredient[], 
  baseVolume: number 
}) {
  const [targetVolume, setTargetVolume] = useState<number>(baseVolume)

  const scaledIngredients = scaleIngredients(ingredients, baseVolume, targetVolume)

  return (
    <div className="bg-surface border border-border rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
          <LucideScale className="h-5 w-5 text-primary" /> Recipe Scaler
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase text-muted-foreground">Target (BBLs)</span>
          <input 
            type="number" 
            value={targetVolume}
            onChange={(e) => setTargetVolume(Number(e.target.value) || baseVolume)}
            className="w-20 bg-black/40 border border-border rounded text-center text-sm py-1 font-mono text-primary font-bold focus:outline-none"
          />
        </div>
      </div>

      {scaledIngredients.length > 0 ? (
        <div className="divide-y divide-border/50">
          {scaledIngredients.map(ing => (
            <div key={ing.id} className="py-3 flex justify-between items-center group">
              <div>
                <p className="text-sm font-bold text-foreground capitalize">{ing.ingredient_type}</p>
                <p className="text-[10px] text-muted-foreground uppercase">{ing.timing || 'No timing specified'}</p>
              </div>
              <div className="text-right">
                <span className="font-mono text-lg font-black text-foreground">{ing.amount.toFixed(2)}</span>
                <span className="text-xs text-muted-foreground ml-1 lowercase">{ing.unit}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">Add ingredients to calculate scaling.</p>
      )}
    </div>
  )
}
