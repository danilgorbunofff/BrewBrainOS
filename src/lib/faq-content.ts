export interface FAQQuestion {
  q: string
  a: string
  keywords: string
}

export interface FAQCategory {
  category: string
  questions: FAQQuestion[]
}

export const faqContent: FAQCategory[] = [
  {
    category: "Getting Started",
    questions: [
      {
        q: "How do I set up my first brewery?",
        a: "After signing up, you'll be prompted to create a brewery profile. Enter your brewery name and license number. You can add more breweries later from the Settings page.",
        keywords: "setup onboarding account create new brewery profile",
      },
      {
        q: "How do I add vessels and tanks?",
        a: "Navigate to the Vessels page and click \u201cAdd Tank\u201d. Enter a name, type (fermenter, brite, etc.), and capacity. Your tanks will then be available for batch assignments and QR scanning.",
        keywords: "vessel tank fermenter brite add create new equipment",
      },
      {
        q: "How do I create a new batch?",
        a: "Go to the Batches page and click \u201cNew Batch\u201d. Select a recipe, assign a tank, and enter your original gravity. The batch will start in Planning status and you can move it through the brewing workflow.",
        keywords: "batch brew new create recipe gravity",
      },
    ],
  },
  {
    category: "Batches & Fermentation",
    questions: [
      {
        q: "What do the batch statuses mean?",
        a: "Planning: batch is being prepared. Brewing: actively in progress. Fermenting: in a fermentation vessel. Conditioning: post-fermentation rest. Completed: finished and packaged. Archived: historical record.",
        keywords: "status workflow planning brewing fermenting conditioning completed archived",
      },
      {
        q: "How do I log manual readings?",
        a: "Open a batch detail page and use the \u201cAdd Reading\u201d form. Enter gravity, temperature, pH, and any notes. Readings are timestamped automatically and can be logged offline.",
        keywords: "reading gravity temperature pH log manual record",
      },
      {
        q: "What are fermentation alerts?",
        a: "BrewBrain monitors your batch readings and can alert you when gravity stalls, temperature drifts outside range, or other anomalies are detected. Configure alert thresholds in Settings.",
        keywords: "alert notification fermentation stall temperature drift anomaly threshold",
      },
    ],
  },
  {
    category: "Inventory & Ingredients",
    questions: [
      {
        q: "How does ingredient degradation tracking work?",
        a: "BrewBrain tracks the Hop Storage Index (HSI) and grain moisture levels over time. As ingredients age, their quality scores update automatically so you know when to reorder or discard stock.",
        keywords: "degradation HSI hop storage index grain moisture quality freshness expiry",
      },
      {
        q: "Can I import inventory from a spreadsheet?",
        a: "Yes \u2014 go to Inventory and use the CSV import feature. Your file should include columns for name, type, quantity, and unit. A template is available for download on the import page.",
        keywords: "import CSV spreadsheet upload bulk inventory",
      },
      {
        q: "How do reorder alerts work?",
        a: "Set a reorder point for each ingredient. When stock falls below that level, BrewBrain flags it as low and estimates days until stockout based on recent usage patterns.",
        keywords: "reorder alert low stock threshold notification supply",
      },
    ],
  },
  {
    category: "Offline & Mobile",
    questions: [
      {
        q: "Does BrewBrain work offline?",
        a: "Yes. BrewBrain is a Progressive Web App. Manual readings, voice logs, and key pages are cached for offline use. Queued actions sync automatically when you reconnect.",
        keywords: "offline PWA cache sync progressive web app internet connection",
      },
      {
        q: "What is Glove Mode?",
        a: "Glove Mode enlarges touch targets and simplifies the interface for use with brewery gloves. Toggle it from the sidebar or Settings page.",
        keywords: "glove mode touch target accessibility brewery gloves mobile",
      },
      {
        q: "How do I install BrewBrain on my phone?",
        a: "Open BrewBrain in your mobile browser, tap the share/menu button, and select \u201cAdd to Home Screen\u201d. The app will install as a PWA with offline support.",
        keywords: "install phone mobile PWA home screen app",
      },
      {
        q: "What happens to my data when I go offline?",
        a: "Any manual readings or voice logs you submit are queued locally in your browser. When connectivity returns, BrewBrain automatically syncs them to the server with retry and conflict handling.",
        keywords: "offline queue sync data loss retry conflict",
      },
    ],
  },
  {
    category: "Compliance & Reports",
    questions: [
      {
        q: "What reports does BrewBrain generate?",
        a: "BrewBrain generates TTB-style production reports, FSMA sanitation compliance reports, and monthly production summaries. All reports are available from the Reports page.",
        keywords: "report TTB FSMA compliance production monthly summary",
      },
      {
        q: "How do I use QR scanning?",
        a: "Each tank can have a QR code. Use the QR Scan page to scan a code with your device camera \u2014 it takes you directly to the tank detail page for quick readings and status checks.",
        keywords: "QR code scan camera tank quick access",
      },
      {
        q: "How does sanitation tracking work?",
        a: "Log sanitation events on each tank. BrewBrain records who cleaned each vessel and when, producing FSMA-ready compliance logs you can export from the Reports page.",
        keywords: "sanitation cleaning FSMA compliance log track CIP",
      },
    ],
  },
  {
    category: "Billing & Account",
    questions: [
      {
        q: "How do I upgrade my plan?",
        a: "Visit the Billing page to view available plans and upgrade. Your subscription is managed through Stripe, and changes take effect immediately.",
        keywords: "upgrade plan subscription pricing billing Stripe payment",
      },
      {
        q: "Can I switch between breweries?",
        a: "Yes \u2014 use the brewery switcher in the sidebar to switch your active brewery. All data, batches, and inventory are scoped to the selected brewery.",
        keywords: "switch brewery multi-brewery active scope",
      },
      {
        q: "How do I cancel or downgrade?",
        a: "Go to the Billing page and manage your subscription through the Stripe customer portal. Downgrades take effect at the end of your current billing period.",
        keywords: "cancel downgrade subscription billing period end",
      },
    ],
  },
]
