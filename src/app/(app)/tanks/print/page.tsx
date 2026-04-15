import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getActiveBrewery } from '@/lib/active-brewery'
import { QRCodeSVG } from 'qrcode.react'
import { LucideArrowLeft, LucidePrinter } from 'lucide-react'
import { PrintButton } from '@/components/PrintButton'

export const metadata = {
  title: 'Print QR Labels | BrewBrain OS',
}

export default async function PrintQRLabelsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const brewery = await getActiveBrewery()
  if (!brewery) redirect('/dashboard')

  const { data: tanks } = await supabase
    .from('tanks')
    .select('*')
    .eq('brewery_id', brewery.id)
    .order('name')

  const vessels = tanks || []

  const printCss = `
    @media print {
      @page {
        margin: 0; /* Hides browser URL and page numbers */
      }
      body, html {
        background: white !important;
        color: black !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      /* Hide the main layout tracking/feedback/dev components forcefully */
      aside, nav, header, footer, [role="dialog"], [data-radix-popper-content-wrapper], .fixed, .sticky, #devtools-container, .feedback-btn {
        display: none !important;
        opacity: 0 !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }
      /* Prevent main content from shifting */
      main {
        margin-left: 0 !important;
        padding: 0 !important;
      }
      .printable-page {
        background: white !important;
        min-height: auto !important;
        padding: 0 !important;
      }
      .print-grid {
        display: grid !important;
        grid-template-columns: repeat(3, 1fr) !important;
        gap: 0.5in !important;
        padding: 0.5in !important;
        width: 100%;
      }
      .print-label {
        display: flex !important;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        page-break-inside: avoid;
        text-align: center;
        color: black !important;
        border: 1px dashed #ccc;
        padding: 0.5in;
        height: 2.5in;
        box-sizing: border-box;
      }
    }
  `

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-8 pt-8 printable-page">
      {/* Non-printable header */}
      <div className="max-w-4xl mx-auto space-y-6 print:hidden">
        <div className="border-b border-border pb-6">
          <Link href="/tanks" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors mb-4">
            <LucideArrowLeft className="h-3.5 w-3.5" />
            Back to Vessels
          </Link>
          <div className="flex items-center gap-4 mt-2">
            <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
              <LucidePrinter className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tighter text-foreground">Print Labels</h1>
              <p className="text-muted-foreground font-medium mt-1">Generate self-service QR codes for your tanks.</p>
            </div>
          </div>
        </div>

        <div className="bg-surface border border-border p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-lg font-bold mb-2">Printing Instructions</h2>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mb-4 md:mb-0">
              <li>Press <strong>Cmd + P</strong> or click the Print dialog button.</li>
              <li>Ensure <strong>Background graphics</strong> is disabled or printed cleanly.</li>
              <li>For best results, use standard Avery 2&quot;x2&quot; square label sheets.</li>
              <li>Set margins to <strong>None</strong> for maximum use of space.</li>
            </ul>
          </div>
          <PrintButton />
        </div>
      </div>

      {/* Printable Area - Global print overrides injected here to hide app shells */}
      <style dangerouslySetInnerHTML={{ __html: printCss }} />

      {/* Only visible when printing, or we can make it visible always but styled differently? No, keep it hidden from screen to avoid doubling, OR visible on screen for preview? */}
      {/* Actually let's make it visible on screen as a preview so they see what they print! */}
      <div className="mt-8 bg-white text-black p-8 rounded-2xl print:block print:p-0 print:m-0 print:rounded-none">
        <h2 className="text-xl font-bold mb-6 text-center print:hidden border-b pb-4">Document Preview</h2>
        
        {vessels.length === 0 ? (
          <p className="text-center text-gray-400 py-12">No tanks found. Add some tanks first.</p>
        ) : (
          <div className="print-grid grid grid-cols-2 md:grid-cols-3 gap-6">
            {vessels.map(tank => {
              // Target URL for scan – derive from NEXT_PUBLIC_SITE_URL so
              // dev/staging labels don't point at production.
              const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
              const tankUrl = `${baseUrl}/tank/${tank.id}`
              
              return (
                <div key={tank.id} className="print-label flex flex-col items-center justify-center border dashed border-gray-300 p-6 rounded-xl print:rounded-none aspect-square md:aspect-auto h-auto md:h-64">
                  <QRCodeSVG value={tankUrl} size={120} level="M" className="mb-4" />
                  <h3 className="text-lg md:text-xl font-black text-black">{tank.name}</h3>
                  <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest">{tank.capacity ? `${tank.capacity} BBL` : 'Vessel'}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}
