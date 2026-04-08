import type { LucideIcon } from "lucide-react"
import {
  LucideRocket,
  LucideWaves,
  LucideClipboardList,
  LucidePackageSearch,
  LucideWifi,
  LucideShieldCheck,
  LucideCreditCard,
  LucideBarChart3,
} from "lucide-react"

// ── Content node types ──────────────────────────────────────────────

export type DocNode =
  | { type: "prose"; text: string }
  | { type: "subheading"; text: string }
  | { type: "step"; steps: string[] }
  | { type: "callout"; variant: "info" | "warning" | "tip"; text: string }

export interface DocArticle {
  slug: string
  title: string
  section: string
  icon: LucideIcon
  description: string
  content: DocNode[]
}

// ── Sections (used for grouping in the side nav) ────────────────────

export const docSections = [
  "Getting Started",
  "Core Features",
  "Advanced",
] as const

export type DocSection = (typeof docSections)[number]

// ── Articles ────────────────────────────────────────────────────────

export const docsContent: DocArticle[] = [
  // ─── Getting Started ──────────────────────────────────────────────
  {
    slug: "setup",
    title: "Initial Setup",
    section: "Getting Started",
    icon: LucideRocket,
    description: "Create your account, set up your first brewery, and configure your workspace.",
    content: [
      { type: "prose", text: "BrewBrain OS is designed to get you from sign-up to first batch in under five minutes. This guide walks through each step." },
      { type: "subheading", text: "Creating your account" },
      { type: "step", steps: [
        "Navigate to the BrewBrain sign-up page and enter your email.",
        "Verify your email through the confirmation link.",
        "Log in and you will be redirected to the brewery creation form.",
      ]},
      { type: "subheading", text: "Setting up your first brewery" },
      { type: "step", steps: [
        "Enter your brewery name and license number (optional at this stage).",
        "Choose your timezone and preferred units (metric or imperial).",
        "Click \u201cCreate Brewery\u201d \u2014 your dashboard is now ready.",
      ]},
      { type: "callout", variant: "tip", text: "You can add multiple breweries later from the Settings page and switch between them using the sidebar brewery switcher." },
      { type: "subheading", text: "Next steps" },
      { type: "prose", text: "Once your brewery is created, add your tanks and vessels, import your ingredient inventory, and create your first batch. Each of these workflows has its own guide in this documentation." },
    ],
  },
  {
    slug: "vessels",
    title: "Vessels & Tanks",
    section: "Getting Started",
    icon: LucideWaves,
    description: "Add fermenters, brite tanks, and other vessels to your brewery profile.",
    content: [
      { type: "prose", text: "Vessels are the physical containers in your brewery \u2014 fermenters, brite tanks, kettles, and more. BrewBrain tracks their status, capacity, and assigned batches." },
      { type: "subheading", text: "Adding a tank" },
      { type: "step", steps: [
        "Go to the Vessels page from the sidebar.",
        "Click \u201cAdd Tank\u201d to open the creation form.",
        "Enter a name (e.g. \u201cFV-01\u201d), select the tank type, and set the capacity in your preferred units.",
        "Save \u2014 the tank now appears in your vessel list and is available for batch assignments.",
      ]},
      { type: "callout", variant: "info", text: "Each tank can be assigned a QR code. Print and attach it to the physical vessel for instant mobile scanning." },
      { type: "subheading", text: "Tank statuses" },
      { type: "prose", text: "Tanks automatically reflect the status of their assigned batch: Available (empty), In Use (batch assigned), Cleaning (sanitation in progress), or Maintenance (out of service). You can also manually set the status from the tank detail page." },
      { type: "subheading", text: "Sanitation logging" },
      { type: "prose", text: "Log cleaning events directly on the tank detail page. BrewBrain records who cleaned the vessel, when, and any notes. These logs feed into the FSMA compliance reports available on the Reports page." },
    ],
  },

  // ─── Core Features ────────────────────────────────────────────────
  {
    slug: "batches",
    title: "Batches & Brewing",
    section: "Core Features",
    icon: LucideClipboardList,
    description: "Create batches, track fermentation, and manage your brewing workflow.",
    content: [
      { type: "prose", text: "Batches are the core unit of work in BrewBrain. Each batch represents a single production run from planning through packaging." },
      { type: "subheading", text: "Creating a batch" },
      { type: "step", steps: [
        "Navigate to the Batches page and click \u201cNew Batch\u201d.",
        "Enter a recipe name, select a target tank, and set your original gravity (OG).",
        "The batch starts in Planning status.",
      ]},
      { type: "subheading", text: "Batch workflow" },
      { type: "prose", text: "Move the batch through statuses as production progresses: Planning \u2192 Brewing \u2192 Fermenting \u2192 Conditioning \u2192 Completed \u2192 Archived. Each transition is logged with a timestamp." },
      { type: "subheading", text: "Manual readings" },
      { type: "prose", text: "On the batch detail page, use the \u201cAdd Reading\u201d form to record gravity, temperature, pH, and notes. Readings are timestamped automatically and work offline \u2014 they queue locally and sync when you reconnect." },
      { type: "callout", variant: "tip", text: "Use the QR Scan feature to jump directly to a tank's batch detail page from the brewery floor." },
      { type: "subheading", text: "Fermentation alerts" },
      { type: "prose", text: "BrewBrain can detect gravity stalls, temperature drift, and other anomalies in your reading data. Configure alert thresholds in Settings to receive notifications when something needs attention." },
    ],
  },
  {
    slug: "inventory",
    title: "Inventory Management",
    section: "Core Features",
    icon: LucidePackageSearch,
    description: "Track ingredients, monitor degradation, and manage reorder alerts.",
    content: [
      { type: "prose", text: "BrewBrain tracks every ingredient in your brewery \u2014 hops, grain, yeast, adjuncts, and packaging materials. The inventory system monitors quantities, freshness, and reorder needs." },
      { type: "subheading", text: "Adding inventory" },
      { type: "step", steps: [
        "Go to the Inventory page from the sidebar.",
        "Click \u201cAdd Item\u201d to create a new ingredient entry.",
        "Enter name, type, quantity, unit, and optionally a lot number and expiration date.",
        "For bulk import, use the CSV import feature with the downloadable template.",
      ]},
      { type: "subheading", text: "Degradation tracking" },
      { type: "prose", text: "Hops are tracked via the Hop Storage Index (HSI) \u2014 a measure of alpha-acid degradation over time. Grain is tracked via moisture percentage. Both update automatically based on age and storage conditions, giving you real-time quality indicators." },
      { type: "callout", variant: "warning", text: "When an ingredient's degradation score crosses the warning threshold, it is flagged in the inventory list. Plan to use or replace it before quality drops further." },
      { type: "subheading", text: "Reorder alerts" },
      { type: "prose", text: "Set a reorder point for each item. When current stock falls below that level, BrewBrain flags it as low stock and estimates days until stockout based on recent usage velocity." },
    ],
  },
  {
    slug: "offline",
    title: "Offline & PWA",
    section: "Core Features",
    icon: LucideWifi,
    description: "Use BrewBrain without an internet connection and sync when you reconnect.",
    content: [
      { type: "prose", text: "BrewBrain is built as a Progressive Web App (PWA) with full offline support. Key pages, manual readings, and voice logs all work without connectivity." },
      { type: "subheading", text: "Installing the PWA" },
      { type: "step", steps: [
        "Open BrewBrain in Chrome, Safari, or Edge on your mobile device.",
        "Tap the browser menu (share icon on iOS, three-dot menu on Android).",
        "Select \u201cAdd to Home Screen\u201d or \u201cInstall App\u201d.",
        "The app icon appears on your home screen and launches in standalone mode.",
      ]},
      { type: "subheading", text: "Offline queue" },
      { type: "prose", text: "When you submit a manual reading or voice log without connectivity, it is stored in your browser's IndexedDB. When you come back online, BrewBrain automatically syncs queued items with exponential backoff and retry logic." },
      { type: "callout", variant: "info", text: "A banner at the top of the app indicates when you are offline and shows the number of queued items waiting to sync." },
      { type: "subheading", text: "Glove Mode" },
      { type: "prose", text: "Toggle Glove Mode from the sidebar or Settings page. It enlarges all touch targets and simplifies the interface for use with thick brewery gloves." },
    ],
  },

  // ─── Advanced ─────────────────────────────────────────────────────
  {
    slug: "compliance",
    title: "Compliance & Reports",
    section: "Advanced",
    icon: LucideShieldCheck,
    description: "Generate TTB reports, track sanitation, and stay FSMA-compliant.",
    content: [
      { type: "prose", text: "BrewBrain automates compliance reporting so you can focus on brewing. Production data flows into structured reports that meet TTB and FSMA requirements." },
      { type: "subheading", text: "TTB production reports" },
      { type: "prose", text: "Monthly TTB-style reports aggregate your batch data \u2014 total barrels produced, packaged, and on-hand. Access them from the Reports page; they can be exported for filing." },
      { type: "subheading", text: "FSMA sanitation reports" },
      { type: "prose", text: "Sanitation logs recorded on individual tanks are compiled into FSMA-ready compliance reports. These include cleaning dates, responsible parties, and any notes." },
      { type: "callout", variant: "tip", text: "Log sanitation events immediately after cleaning to keep your compliance trail accurate and audit-ready." },
      { type: "subheading", text: "QR-based workflows" },
      { type: "prose", text: "Print QR codes for your tanks and scan them from the brewery floor. Each scan opens the tank's detail page where you can log readings, sanitation events, or check batch status \u2014 all in seconds." },
    ],
  },
  {
    slug: "analytics",
    title: "Analytics & Insights",
    section: "Advanced",
    icon: LucideBarChart3,
    description: "Understand trends in production, inventory, and batch performance.",
    content: [
      { type: "prose", text: "The Analytics page surfaces data-driven insights from your brewery operations. All charts and KPIs update in real time as you log batches, readings, and inventory changes." },
      { type: "subheading", text: "Key metrics" },
      { type: "prose", text: "The analytics dashboard shows three core KPIs: total batches produced, active fermentations, and inventory utilization rate. Each card includes a trend indicator comparing to the previous period." },
      { type: "subheading", text: "Charts" },
      { type: "prose", text: "Two primary charts are available: an inventory trend line showing stock levels over time, and a batch performance chart comparing OG, FG, and attenuation across recent batches." },
      { type: "callout", variant: "info", text: "Charts resize responsively and render as fill-height cards. On mobile, they stack vertically for easier reading." },
    ],
  },
  {
    slug: "billing",
    title: "Billing & Subscriptions",
    section: "Advanced",
    icon: LucideCreditCard,
    description: "Manage your plan, payment method, and billing history.",
    content: [
      { type: "prose", text: "BrewBrain offers tiered plans that scale with your brewery's production. All billing is handled securely through Stripe." },
      { type: "subheading", text: "Viewing your plan" },
      { type: "prose", text: "Visit the Billing page to see your current plan, billing interval (monthly or annual), and next renewal date. The page also shows available upgrade options." },
      { type: "subheading", text: "Upgrading or downgrading" },
      { type: "step", steps: [
        "Go to the Billing page from the sidebar.",
        "Choose your desired plan and billing interval.",
        "Complete the checkout through Stripe's secure portal.",
        "Upgrades take effect immediately; downgrades apply at the end of the current billing period.",
      ]},
      { type: "callout", variant: "info", text: "You can manage your payment method, download invoices, and cancel your subscription from the Stripe customer portal linked on the Billing page." },
      { type: "subheading", text: "Multi-brewery billing" },
      { type: "prose", text: "Your subscription covers all breweries under your account. Add as many brewery profiles as your plan allows and switch between them using the sidebar brewery switcher." },
    ],
  },
]
