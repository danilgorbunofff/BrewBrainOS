# Bundle Top 10

Generated from .next/analyze/client.html on 2026-04-08T06:25:02.760Z.

Top 10 combined parsed size: 1159.1 KiB.

| Rank | Module | Parsed | Gzip | Source hint | Action | Chunks |
| --- | --- | ---: | ---: | --- | --- | --- |
| 1 | ./node_modules/jspdf/dist/jspdf.es.min.js | 322.7 KiB | 102.7 KiB | src/components/TTBReportTable.tsx | Keep the PDF stack behind the export button via dynamic import. | static/chunks/164f4fb6.49bb98ef11f0133e.js |
| 2 | ./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.production.js | 195.1 KiB | 61.2 KiB | framework runtime | Framework runtime cost. Focus on app-owned modules first. | static/chunks/4bd1b696-e356ca5ba0218e27.js |
| 3 | ./node_modules/html2canvas/dist/html2canvas.js | 192.5 KiB | 44.2 KiB | src/components/TTBReportTable.tsx | Keep the PDF stack behind the export button via dynamic import. | static/chunks/ad2866b8.6c51983a1eb56136.js |
| 4 | ./node_modules/react-dom/cjs/react-dom-client.production.js | 170.5 KiB | 53.6 KiB | framework runtime | Framework runtime cost. Focus on app-owned modules first. | static/chunks/framework-711ef29bc66f648c.js |
| 5 | ./node_modules/canvg/lib/index.es.js | 79.5 KiB | 22.8 KiB | src/components/TTBReportTable.tsx | Keep the PDF stack behind the export button via dynamic import. | static/chunks/bc98253f.b50765b70c666750.js |
| 6 | ./node_modules/@supabase/auth-js/dist/module/GoTrueClient.js | 51.7 KiB | 11.5 KiB | src/app/(app)/inventory/[id]/page.tsx | Move this route toward server-side data fetches or defer browser auth client creation. | static/chunks/44530001-f17eb3e5d513c546.js |
| 7 | ./node_modules/pako/dist/pako.esm.mjs | 44.2 KiB | 13.7 KiB | src/components/TTBReportTable.tsx | Keep the PDF stack behind the export button via dynamic import. | static/chunks/2f0b94e8.ce53c98b232310fc.js |
| 8 | ./node_modules/@yudiel/react-qr-scanner/dist/index.esm.mjs + 13 modules (concatenated)/node_modules/barcode-detector/dist/es/ponyfill.js | 36.7 KiB | 14.9 KiB | src/components/MobileFloatingActions.tsx, src/components/QRScanner.tsx | Load the QR scanner only when a scan surface is actually shown. | static/chunks/2050.2f63507438f204b0.js |
| 9 | ./node_modules/@yudiel/react-qr-scanner/dist/index.esm.mjs + 13 modules (concatenated)/node_modules/@yudiel/react-qr-scanner/dist/index.esm.mjs | 33.5 KiB | 13.7 KiB | src/components/MobileFloatingActions.tsx, src/components/QRScanner.tsx | Load the QR scanner only when a scan surface is actually shown. | static/chunks/2050.2f63507438f204b0.js |
| 10 | ./node_modules/sonner/dist/index.mjs | 32.7 KiB | 9.0 KiB | review required | Inspect the owning route or component before changing behavior. | static/chunks/6609-078a8cdc853f87c6.js |

## Notes

- Parsed size is used for ranking because it best reflects code the browser must execute.
- These entries are extracted from the analyzer HTML because Next 16 did not emit JSON stats in this repo.
- Focus remediation on app-controlled modules before framework runtime entries.

## Main Chunk Check

Main chunk: static/chunks/main-c19973557b8eead0.js (267.2 KiB parsed).
- PDF export stack: not present in main chunk.
- QR scanner stack: not present in main chunk.
- Browser Supabase auth client: not present in main chunk.
