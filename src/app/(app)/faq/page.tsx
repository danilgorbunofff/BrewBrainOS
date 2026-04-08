import {
  LucideHelpCircle,
  LucideBookOpen,
} from 'lucide-react'
import { HelpTabs } from './HelpTabs'

export const metadata = {
  title: 'Help & Docs | BrewBrain OS',
}

interface Props {
  searchParams: Promise<{ tab?: string }>
}

export default async function FAQPage({ searchParams }: Props) {
  const { tab } = await searchParams
  const activeTab = tab === 'docs' ? 'docs' : 'faq'

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-border bg-card/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              {activeTab === 'docs' ? (
                <LucideBookOpen className="h-5 w-5 text-primary" />
              ) : (
                <LucideHelpCircle className="h-5 w-5 text-primary" />
              )}
            </div>
            <h1 className="text-2xl font-black tracking-tight text-foreground font-heading">
              Help & Documentation
            </h1>
          </div>
          <p className="text-sm text-muted-foreground font-medium mt-2 max-w-2xl">
            Quick answers and in-depth guides for BrewBrain OS. Can&apos;t find what you need? Use the feedback button to reach our team.
          </p>
        </div>
      </div>

      {/* Tabs Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <HelpTabs defaultTab={activeTab} />
      </div>
    </div>
  )
}
