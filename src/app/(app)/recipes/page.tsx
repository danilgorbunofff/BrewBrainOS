import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LucideBook, LucidePlus, LucideArrowRight } from 'lucide-react'
import { getActiveBrewery } from '@/lib/active-brewery'
import { createRecipe } from './actions'

export const metadata = {
  title: 'Recipe Directory | BrewBrain OS',
}

function parseOptionalNumber(value: FormDataEntryValue | null) {
  if (typeof value !== 'string' || value.trim() === '') {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export default async function RecipesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const brewery = await getActiveBrewery()
  if (!brewery) redirect('/dashboard')

  const { data: recipes } = await supabase
    .from('recipes')
    .select('*')
    .eq('brewery_id', brewery.id)
    .order('name')

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-8 pt-8 pb-32 md:pb-8 selection:bg-primary/30">
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-border pb-10">
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-foreground flex items-center gap-3">
              <LucideBook className="h-8 w-8 text-primary" /> Recipe Directory
            </h1>
            <p className="text-muted-foreground font-medium mt-2">Manage production recipes, ingredient loads, and automatic scaling metrics.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {recipes && recipes.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {recipes.map(recipe => (
                  <Link href={`/recipes/${recipe.id}`} key={recipe.id} className="block group">
                    <div className="p-5 rounded-2xl bg-surface border border-border hover:border-primary/50 transition-colors h-full flex flex-col justify-between">
                      <div>
                        <h3 className="text-lg font-black tracking-tight">{recipe.name}</h3>
                        <p className="text-xs font-bold text-muted-foreground uppercase">{recipe.style || 'No Style Defined'}</p>
                        
                        <div className="grid grid-cols-2 gap-2 mt-4 text-xs font-mono text-muted-foreground">
                          <div><span className="text-foreground/50">Target OG:</span> {recipe.target_og || '--'}</div>
                          <div><span className="text-foreground/50">Target IBU:</span> {recipe.target_ibu || '--'}</div>
                          <div><span className="text-foreground/50">Target ABV:</span> {recipe.target_abv ? `${recipe.target_abv}%` : '--'}</div>
                          <div><span className="text-foreground/50">Base Yield:</span> {recipe.batch_size_bbls} BBL</div>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-border flex justify-end text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        <LucideArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-surface border border-border rounded-2xl">
                <p className="text-muted-foreground font-medium">No recipes defined yet.</p>
              </div>
            )}
          </div>
          
          <div className="space-y-4">
            <div className="bg-surface border border-border rounded-2xl p-6">
              <h2 className="text-lg font-black tracking-tight mb-4 flex items-center gap-2">
                <LucidePlus className="h-4 w-4 text-primary" /> Create Recipe
              </h2>
              <form
                action={async (formData) => {
                  'use server'
                  await createRecipe({
                    name: String(formData.get('name') || '').trim(),
                    style: String(formData.get('style') || '').trim(),
                    batch_size_bbls: Number(formData.get('batch_size_bbls') || 0),
                    target_og: parseOptionalNumber(formData.get('target_og')),
                    target_fg: parseOptionalNumber(formData.get('target_fg')),
                    target_ibu: parseOptionalNumber(formData.get('target_ibu')),
                    target_abv: parseOptionalNumber(formData.get('target_abv')),
                  })
                }}
                className="space-y-4"
              >
                <label className="block">
                  <span className="text-[10px] font-black uppercase text-muted-foreground">Recipe Name</span>
                  <input type="text" name="name" required className="mt-1 w-full bg-black/40 border border-border rounded-lg text-sm px-3 py-2 text-foreground focus:ring-1 focus:ring-primary outline-none" />
                </label>
                <label className="block">
                  <span className="text-[10px] font-black uppercase text-muted-foreground">Style Profile</span>
                  <input type="text" name="style" className="mt-1 w-full bg-black/40 border border-border rounded-lg text-sm px-3 py-2 text-foreground focus:ring-1 focus:ring-primary outline-none" />
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-[10px] font-black uppercase text-muted-foreground">Target OG</span>
                    <input type="number" step="0.001" name="target_og" className="mt-1 w-full bg-black/40 border border-border rounded-lg text-sm px-3 py-2 text-foreground focus:ring-1 focus:ring-primary outline-none" />
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-black uppercase text-muted-foreground">Target FG</span>
                    <input type="number" step="0.001" name="target_fg" className="mt-1 w-full bg-black/40 border border-border rounded-lg text-sm px-3 py-2 text-foreground focus:ring-1 focus:ring-primary outline-none" />
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-black uppercase text-muted-foreground">Target ABV %</span>
                    <input type="number" step="0.1" name="target_abv" className="mt-1 w-full bg-black/40 border border-border rounded-lg text-sm px-3 py-2 text-foreground focus:ring-1 focus:ring-primary outline-none" />
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-black uppercase text-muted-foreground">Base Vol (BBLs)</span>
                    <input type="number" step="0.5" defaultValue="10" name="batch_size_bbls" required className="mt-1 w-full bg-black/40 border border-border rounded-lg text-sm px-3 py-2 text-foreground focus:ring-1 focus:ring-primary outline-none" />
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-black uppercase text-muted-foreground">Target IBU</span>
                    <input type="number" step="1" name="target_ibu" className="mt-1 w-full bg-black/40 border border-border rounded-lg text-sm px-3 py-2 text-foreground focus:ring-1 focus:ring-primary outline-none" />
                  </label>
                </div>
                <button type="submit" className="w-full py-2 bg-primary text-black font-black text-sm uppercase tracking-wider rounded-xl hover:bg-primary/90 transition-all mt-4">
                  Save Recipe
                </button>
              </form>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
