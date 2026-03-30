import { login, signup } from './actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] p-4 font-sans">
      <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
        <div className="text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-orange-600 mb-4 shadow-[0_0_20px_rgba(234,88,12,0.3)]">
            <span className="text-2xl font-bold text-white">B</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-100">BrewBrain OS</h1>
          <p className="mt-2 text-zinc-400">The digital floor-assistant for craft breweries.</p>
        </div>

        <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur-xl transition-all hover:border-orange-600/30">
          <CardHeader>
            <CardTitle className="text-xl text-zinc-100">Sign In</CardTitle>
            <CardDescription className="text-zinc-500">
              Enter your credentials to access your brewery dashboard.
            </CardDescription>
          </CardHeader>
          <form action={login}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-zinc-300">Email Address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@brewery.com"
                  required
                  className="border-zinc-800 bg-zinc-950 text-zinc-200 focus-visible:ring-orange-600"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" title='Password' className="text-zinc-300">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="border-zinc-800 bg-zinc-950 text-zinc-200 focus-visible:ring-orange-600"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-2">
              <Button formAction={login} type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium">
                Log In
              </Button>
              <Button formAction={signup} type="submit" variant="outline" className="w-full border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200">
                Register Brewery
              </Button>
            </CardFooter>
          </form>
        </Card>

        <p className="text-center text-xs text-zinc-600">
          Built for brewers, by brewers. © 2026 BrewBrain Technologies.
        </p>
      </div>
    </div>
  )
}
