# @bluemillstudio/gantt — example app

Minimal Vite + React + Tailwind app consuming the local package via `file:..`.

## Run

```bash
# from repo root
npm run build          # build the library so the example can import it
cd example
npm install
npm run dev            # http://localhost:5173
```

When iterating on the library: re-run `npm run build` in the repo root and the example picks it up via Vite HMR on the next reload.

## What's shown

- Hierarchy with a summary task + 4 children + milestone
- Drag/resize, dependency links, progress handle
- Critical path + baselines toggles
- Holiday marker (red tint) + weekend shading
- `renderTaskTooltip` default (hover a bar)
- Introspection via `handle.snapshot()` — click the "📸 Snapshot" button
- Dark-mode toggle (theming via CSS custom properties)
- `computedFields`: each task gets a `$computed.risk` value visible in the snapshot
