import { login, signup, forgotPassword } from './actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const p = await searchParams
  const errorMessage = p?.error
  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 overflow-hidden">
      {/* Dynamic Background Mesh */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-[#030303]">
        <div className="absolute top-0 left-0 h-full w-full bg-[radial-gradient(circle_at_50%_50%,rgba(245,158,11,0.05),transparent_50%)] animate-pulse" />
        <div className="absolute -top-[10%] -left-[10%] h-[40%] w-[40%] rounded-full bg-orange-600/10 blur-[120px] animate-blob" />
        <div className="absolute -bottom-[10%] -right-[10%] h-[40%] w-[40%] rounded-full bg-orange-900/10 blur-[120px] animate-blob animation-delay-2000" />
      </div>

      <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        <div className="text-center group">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-black overflow-hidden mb-6 shadow-[0_0_30px_rgba(245,158,11,0.4)] group-hover:shadow-[0_0_50px_rgba(245,158,11,0.6)] transition-all duration-500 transform group-hover:scale-110">
            <img src="/logo.png" alt="BrewBrain Logo" className="h-full w-full object-cover" />
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-white mb-2">
            BrewBrain <span className="text-primary italic">OS</span>
          </h1>
          <p className="text-zinc-500 font-medium tracking-wide uppercase text-xs">
            Professional Brewery Management Platform
          </p>
        </div>

        <Card className="border-white/5 backdrop-blur-2xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Access Dashboard</CardTitle>
            <CardDescription>
              Securely sign in to your brewery's command center.
            </CardDescription>
          </CardHeader>
          <form action={login}>
            <CardContent className="space-y-4">
              {errorMessage && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm text-center font-bold animate-in zoom-in-95 duration-300">
                  {errorMessage}
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-zinc-500 ml-1">Email Address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@brewery.com"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password" title='Password' className="text-xs font-bold uppercase tracking-widest text-zinc-500 ml-1">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3 pt-2">
              <Button formAction={login} type="submit" className="w-full">
                Log In
              </Button>
              <Button formAction={signup} type="submit" variant="outline" className="w-full">
                Register New facility
              </Button>
              <Button formAction={forgotPassword} type="submit" variant="link" className="text-xs text-zinc-600 hover:text-primary transition-colors">
                Forgot your password?
              </Button>
            </CardFooter>
          </form>
        </Card>

        <p className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-700">
          Precision Engineering for Brewers • © MMXXVI
        </p>
      </div>
    </div>
  )
}
