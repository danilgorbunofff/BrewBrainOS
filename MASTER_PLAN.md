📝 BrewBrain OS: The Complete 2026 Master Plan

1. Executive Summary
Product: Vertical SaaS / PWA for Craft Breweries.
Mission: Replace "Whiteboard & Excel" chaos with an AI-driven, offline-first production "Brain."
Value Prop: Automated TTB/FSMA compliance and agentic inventory tracking.
Revenue Target: $15,000 MRR (60 customers @ $250/avg).

2. The 2026 Technology Stack
Framework: Next.js 16+ (App Router, Server Actions).
Database: Supabase (PostgreSQL with Row Level Security).
UI/UX: Tailwind CSS + Shadcn/UI (High-contrast "Brewery Dark" theme).
Offline Logic: Service Workers + IndexedDB (via next-pwa).
AI Engine: OpenAI Whisper (Audio) & GPT-4o-mini (Structured Extraction).
Deployment: Vercel (Edge Functions for low-latency floor ops).

3. Technical Build Blueprint (Git-Ready)

Phase A: Database Schema (SQL)
```sql
-- ENABLE RLS (Row Level Security) ON ALL TABLES
CREATE TABLE breweries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  license_number TEXT,
  owner_id UUID REFERENCES auth.users(id)
);

CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brewery_id UUID REFERENCES breweries(id),
  item_type TEXT CHECK (item_type IN ('Hops', 'Grain', 'Yeast', 'Adjunct')),
  name TEXT NOT NULL,
  current_stock DECIMAL NOT NULL,
  unit TEXT DEFAULT 'kg',
  reorder_point DECIMAL
);

CREATE TABLE tanks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brewery_id UUID REFERENCES breweries(id),
  name TEXT NOT NULL, -- e.g., "FV-01"
  capacity_bbl DECIMAL,
  current_batch_id UUID -- Null if empty
);

CREATE TABLE batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brewery_id UUID REFERENCES breweries(id),
  recipe_name TEXT NOT NULL,
  status TEXT DEFAULT 'Fermenting', -- 'Mashing', 'Fermenting', 'Conditioning', 'Finished'
  og DECIMAL, -- Original Gravity
  fg DECIMAL  -- Final Gravity
);
```

Phase B: Agentic AI Integration
Feature: Hands-Free Batch Logging
Input: Worker hits "Record" and says: "Batch 402 is at 68 degrees, gravity is 1.012."
Processing:
Capture audio via MediaRecorder API.
Send to /api/transcribe (Whisper API).
Pass text to GPT-4o-mini with this System Prompt:
"You are a brewery data assistant. Extract JSON from the transcript. Target: {'temp': float, 'gravity': float, 'batch_id': string}. Ignore filler words."
Update batches table via Server Action.

4. Hardware & Physical Setup
To survive a wet, cold brewery floor, you must recommend/provide:
Station Tablet: Emdoor EM-T195 (Rugged Android) or iPad in a ShieldCase Waterproof Mount.
QR Labels: 3M Waterproof Vinyl (Tear-proof).
Scan Logic: Every Tank QR points to app.brewbrain.io/tank/[id].
Scale Integration: Recommendations for A&D Bluetooth-enabled scales to sync grain weights via Web Bluetooth API.

5. Compliance & Regulatory (The "Lock-In")
This is why they stay. You automate the work they hate most.
TTB Form 5130.9 / 5130.26: Build a "Reporting" tab that aggregates monthly production in Barrels (BBL).
Formula: 1 BBL = 31 Gallons.
FSMA / HACCP Logs: Create a digital "Sanitation Log." Workers scan a tank QR and hit "Cleaned." The app logs the timestamp and user for FDA audits.

6. Pricing Strategy (The "Boring" Math)
Tier 1: Nanobrewery ($149/mo) - Up to 5 tanks, basic inventory.
Tier 2: Production ($299/mo) - Unlimited tanks, AI Voice logs, TTB reports.
Tier 3: Multi-Site ($599/mo) - Regional hubs, complex supply chain.
Setup Fee ($750): Mandatory "White Glove" setup where you import their Excel data and ship them 100 QR stickers.

7. GTM: Asymmetric Marketing Strategy
Solo founders don't use ads; they use precision strikes.
The "Competitor Refugee" Loop:
Monitor Reddit (r/TheBrewery) for complaints about "Ekos" or "Ollie" pricing.
DM the user: "Hey, I'm a solo dev building a faster, lightweight version of Ekos for $200 less. Want to see a 2-min demo?"
Programmatic SEO:
Create 50 landing pages for: "How to calculate TTB Form 5130.9 in [State Name]".
Provide a free calculator that leads to your SaaS sign-up.
The "Loom" Outreach:
Find local breweries. Record a video of you using their logo in your app's "Draft Mode."
Email: "I built a digital brain for [Brewery Name]. It handles your TTB forms. Here is how it looks with your beers already in it."

8. Launch Checklist (Day 1 - Day 14)
[ ] Day 1-3: Build DB Schema & Auth.
[ ] Day 4-7: Build QR Scanner & Inventory Logic.
[ ] Day 8-10: Implement Whisper Voice Logs & AI Extraction.
[ ] Day 11: Test PWA Offline Mode (Turn off Wi-Fi, log a batch, turn on Wi-Fi).
[ ] Day 12: Build TTB Export (CSV/PDF).
[ ] Day 13: Setup Stripe Billing.
[ ] Day 14: Cold outreach to 10 local breweries.

🚨 Final Solo Founder Warning:
Do not over-engineer. The brewer does not care if you use the latest Javascript framework. They care if the app works when their hands are wet and they are in a basement with bad signal. Prioritize Offline-First and Speed.
End of Master File.
