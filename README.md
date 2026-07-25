# Calm Garden

Calm Garden is a free, private web experience for people who need a gentler moment. It combines guided breathing, sensory grounding, soft-focus play, a growing virtual garden, and local reflection prompts in one calm interface.

**Live site:** https://jouni12787.github.io/calming-garden-game/

## What it includes

- Guided breathing with four patterns, adjustable tempo, session goals, and optional generated soundscapes.
- Manual 5–4–3–2–1 grounding and an automatic 30-second reset.
- A garden that grows with completed breathing cycles.
- Keyboard-accessible bubble play with gentle affirmations.
- Reflection prompts and notes stored only in the user’s browser.
- Four visual themes, reduced-motion support, responsive layouts, and keyboard navigation.
- Installable PWA support and offline access after the first visit.
- No account, analytics, advertising, backend, or cloud storage.

## Project structure

```text
.
├── index.html                    # Semantic application shell
├── styles.css                    # Responsive design system and animations
├── app.js                        # App state and activity coordination
├── audio.js                      # Generated Web Audio soundscapes
├── breathing.js                  # Guided breathing controller
├── manifest.webmanifest          # Installable web app metadata
├── service-worker.js             # Offline app-shell cache
└── assets/
    └── calm-garden-mark.svg      # Brand mark and app icon
```

## Run locally

Because Calm Garden is a static site, any local web server works:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Privacy and safety

All progress, preferences, and reflection text remain in browser `localStorage`. Nothing is uploaded by the project.

Calm Garden is a self-guided comfort tool, not medical advice or an emergency service. The interface includes clear urgent-support guidance for users who feel unsafe.

## Accessibility

The experience includes semantic tabs, visible focus states, reduced-motion support, keyboard shortcuts, live status messages, accessible bubble controls, and responsive touch targets.

## Licence

Made by Ali Jouni and free for everyone to use, copy, and modify.
