'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { FAQTab } from '@/components/FAQTab'
import { DocsTab } from '@/components/DocsTab'

interface HelpTabsProps {
  defaultTab: string
}

export function HelpTabs({ defaultTab }: HelpTabsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [activeTab, setActiveTab] = useState(defaultTab)

  useEffect(() => {
    setActiveTab(defaultTab)
  }, [defaultTab])

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => {
        setActiveTab(value)
        router.replace(`${pathname}?tab=${value}`, { scroll: false })
      }}
    >
      <TabsList variant="line" className="mb-6">
        <TabsTrigger value="faq" className="text-sm font-bold">
          FAQ
        </TabsTrigger>
        <TabsTrigger value="docs" className="text-sm font-bold">
          Documentation
        </TabsTrigger>
      </TabsList>

      <TabsContent value="faq">
        <FAQTab />
      </TabsContent>

      <TabsContent value="docs">
        <DocsTab />
      </TabsContent>
    </Tabs>
  )
}
