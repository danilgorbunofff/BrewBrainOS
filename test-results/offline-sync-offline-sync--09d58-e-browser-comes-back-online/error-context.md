# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: offline-sync.spec.ts >> offline sync fixture >> flushes a queued voice log once the browser comes back online
- Location: playwright\offline-sync.spec.ts:63:7

# Error details

```
Test timeout of 120000ms exceeded.
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - heading "Offline Sync Fixture" [level=1] [ref=e5]
      - paragraph [ref=e6]: Use this page to exercise queueing and cross-tab flushing flows.
    - generic [ref=e7]:
      - generic [ref=e8]: "Connection: offline"
      - generic [ref=e9]: "Pending items: 1"
    - generic [ref=e10]:
      - button "Clear queue" [ref=e11]
      - button "Queue voice log" [ref=e12]
      - button "Flush queue" [ref=e13]
  - region "Notifications alt+T"
  - button "Open Next.js Dev Tools" [ref=e19] [cursor=pointer]:
    - generic [ref=e22]:
      - text: Compiling
      - generic [ref=e23]:
        - generic [ref=e24]: .
        - generic [ref=e25]: .
        - generic [ref=e26]: .
  - alert [ref=e27]
```