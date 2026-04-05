import { createClient } from '@/utils/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { LucideArrowLeft, LucidePlus, LucideList } from 'lucide-react'
import { getActiveBrewery } from '@/lib/active-brewery'
import { addRecipeIngredient } from '../actions'
import { RecipeScaler } from '@/components/RecipeScaler'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function RecipeDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const brewery = await getActiveBrewery()
  if (!brewery) redirect('/dashboard')

  const { data: recipe, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('id', id)
    .eq('brewery_id', brewery.id)
    .single()

  if (error || !recipe) notFound()

  const { data: ingredients } = await supabase
    .from('recipe_ingredients')
    .select('*')
    .eq('recipe_id', id)
    .order('ingredient_type')

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-8 pt-8 pb-32 md:pb-8 selection:bg-primary/30">
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
        
        <div className="border-b border-border pb-8">
          <Link href="/recipes" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors mb-4">
            <LucideArrowLeft className="h-3.5 w-3.5" /> Back to Directory
          </Link>
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-black tracking-tighter text-foreground">{recipe.name}</h1>
              <p className="text-primary font-bold text-sm uppercase tracking-widest mt-1">{recipe.style || 'Unspecified Style'}</p>
            </div>
            <div className="text-right">
               <span className="text-[10px] font-black uppercase text-muted-foreground block">Base Yield</span>
               <span className="text-2xl font-black text-foreground">{recipe.batch_size_bbls} <span className="text-sm text-muted-foreground">BBL</span></span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecipeScaler ingredients={ingredients || []} baseVolume={recipe.batch_size_bbls} />

          <div className="bg-surface border border-border rounded-2xl p-6">
            <h2 className="text-lg font-black tracking-tight mb-4 flex items-center gap-2">
              <LucidePlus className="h-4 w-4 text-primary" /> Add Ingredient
            </h2>
            <form action={async (formData) => {
              'use server';
              await addRecipeIngredient(recipe.id, {
                ingredient_type: formData.get('ingredient_type') as string,
                amount: parseFloat(formData.get('amount') as string),
                unit: formData.get('unit') as string,
                timing: formData.get('timing') as string
              })
            }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-[10px] font-black uppercase text-muted-foreground">Type</span>
                  <select name="ingredient_type" className="mt-1 w-full bg-black/40 border border-border rounded-lg text-sm px-3 py-2 text-foreground focus:ring-1 focus:ring-primary outline-none">
                    <option value="grain">Grain</option>
                    <option value="hop">Hop</option>
                    <option value="yeast">Yeast</option>
                    <option value="adjunct">Adjunct</option>
                    <option value="water_treatment">Water Treatment</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-[10px] font-black uppercase text-muted-foreground">Timing / Phase</span>
                  <input type="text" name="timing" placeholder="e.g. 60 min boil" className="mt-1 w-full bg-black/40 border border-border rounded-lg text-sm px-3 py-2 text-foreground focus:ring-1 focus:ring-primary outline-none placeholder:text-muted-foreground/50" />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-[10px] font-black uppercase text-muted-foreground">Amount</span>
                  <input type="number" step="0.01" name="amount" required className="mt-1 w-full bg-black/40 border border-border rounded-lg text-sm px-3 py-2 text-foreground focus:ring-1 focus:ring-primary outline-none" />
                </label>
                <label className="block">
                  <span className="text-[10px] font-black uppercase text-muted-foreground">Unit</span>
                  <select name="unit" className="mt-1 w-full bg-black/40 border border-border rounded-lg text-sm px-3 py-2 text-foreground focus:ring-1 focus:ring-primary outline-none">
                    <option value="lbs">Lbs</option>
                    <option value="oz">Ou</option>
                    <option value="g">Grams</option>
                    <option value="kg">Kg</option>
                    <option value="cells">Cells/mL</option>
                  </select>
                </label>
              </div>
              
              <button type="submit" className="w-full py-2 bg-secondary text-foreground font-black text-xs uppercase tracking-wider rounded-xl hover:bg-white hover:text-black transition-all mt-4">
                Add To Base Recipe
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  )
}
