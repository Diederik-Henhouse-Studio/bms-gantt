# BMS Gantt — Architectuur & Bouwplan

## Doel

Een eigen Gantt component bouwen, geïnspireerd op SVAR React Gantt (MIT), maar:
- Volledig eigen code (geen @svar-ui/* dependencies)
- Gebouwd op ons bestaande stack: React 18, Shadcn UI, Tailwind, Zustand
- Specifiek voor het Grondwijzer domein (projectfasering, F1/F2/F3, grondstromen)

## Referentiecode

```
components/gantt/reference/
├── svar-react-gantt/src/   ← React view-laag (35 bestanden, ~3.500 LOC)
└── svar-gantt-core/store/  ← State + logica (14 bestanden, ~3.900 LOC)
```

Totale referentie: **~7.500 regels** die we vervangen met eigen code.

---

## SVAR Architectuur (hoe zij het doen)

### Compositie-hiërarchie

```
Gantt (API root, state init, props → store)
  └─ Layout (responsive, scroll sync, hotkeys)
      ├─ Grid (links: takenlijst, kolommen, inline editing)
      │  └─ WxGrid (extern: @svar-ui/react-grid)
      │     ├─ TextCell (taaknaam + expand/collapse)
      │     └─ ActionCell (taak toevoegen)
      ├─ Resizer (versleepbare scheidslijn)
      └─ Chart (rechts: tijdlijn + balken)
         ├─ TimeScale (header met datumcellen)
         ├─ Markers (verticale lijnen)
         ├─ CellGrid (achtergrond raster)
         └─ Bars (taakbalken + interactie)
            ├─ Links (SVG polylines)
            ├─ BarSegments (split tasks)
            └─ Rollups (aggregaten)
```

### State management flow

```
1. Props (tasks, links, config) ────→ DataStore
2. DataStore initialiseert:
   ├─ GanttDataTree (taakhiërarchie)
   ├─ Scales berekening (datumrange → tijdcellen)
   └─ Positionering ($x, $y, $w, $h per taak)
3. Componenten subscriben via useStore()
4. User acties → exec('action', data) → Store handlers
5. Store update → React re-render
```

### Sleutelbestanden in de referentie

| Bestand | LOC | Wat het doet | Complexiteit |
|---------|-----|-------------|-------------|
| **Store: DataStore.ts** | 1.668 | Centrale state, action routing, undo/redo | Hoog |
| **Store: scales.ts** | 374 | Tijdschaal berekening, zoom | Hoog |
| **Store: time.ts** | 424 | Datumrekenen met date-fns | Middel |
| **Store: tasks.ts** | 243 | Taakpositionering, drag logica | Middel |
| **Store: links.ts** | 173 | Link-routing (SVG punten berekenen) | Middel |
| **Store: GanttDataTree.ts** | 181 | Boom-structuur taken | Middel |
| **Store: normalizeDates.ts** | 90 | Datums afleiden uit start/eind/duur | Laag |
| **React: Bars.jsx** | 763 | Taakbalken renderen + alle drag interactie | Hoog |
| **React: Grid.jsx** | 612 | Linkerpaneel tabel | Hoog (vervangen door TanStack) |
| **React: Gantt.jsx** | 340 | Hoofdcomponent, props → store | Middel |
| **React: Chart.jsx** | 301 | Chart container, zoom, virtueel scrollen | Middel |
| **React: Layout.jsx** | 255 | Grid + chart compositie, scroll sync | Middel |
| **React: Editor.jsx** | 382 | Taak-bewerkdialoog | Laag (vervangen door Shadcn Dialog) |

---

## Onze architectuur

### Stack

| Laag | SVAR gebruikt | Wij gebruiken |
|------|--------------|--------------|
| UI componenten | @svar-ui/react-core (30+) | Shadcn UI (al in project) |
| State management | @svar-ui/lib-state (EventBus/Store) | Zustand |
| Grid (linkerpaneel) | @svar-ui/react-grid (WxGrid) | TanStack Table |
| Datum-berekeningen | date-fns (via gantt-store) | date-fns (zelfde) |
| Styling | Eigen CSS themes | Tailwind CSS |
| Toolbar | @svar-ui/react-toolbar | Shadcn Button/DropdownMenu |
| Context menu | @svar-ui/react-menu | Shadcn ContextMenu |
| Editor/dialoog | @svar-ui/react-editor | Shadcn Dialog + Form |
| Iconen | Ingebouwd | lucide-react (al in project) |

### Mappenstructuur

```
components/gantt/
├── docs/                          ← Documentatie
│   ├── architectuur.md            ← Dit bestand
│   ├── fase-1-store.md            ← Gedetailleerd plan per fase
│   ├── fase-2-chart.md
│   └── ...
├── reference/                     ← SVAR broncode als referentie
│   ├── svar-react-gantt/
│   └── svar-gantt-core/
└── src/                           ← Onze eigen code
    ├── store/                     ← Gantt state (Zustand)
    │   ├── ganttStore.ts          ← Hoofdstore
    │   ├── taskTree.ts            ← Taakhiërarchie
    │   ├── scales.ts              ← Tijdschaal berekeningen
    │   ├── positioning.ts         ← Taak → pixels
    │   ├── links.ts               ← Link routing
    │   ├── calendar.ts            ← Werkdagen/feestdagen
    │   ├── scheduling.ts          ← Auto-scheduling (PRO)
    │   ├── criticalPath.ts        ← Critical path (PRO)
    │   └── types.ts               ← TypeScript interfaces
    ├── components/                ← React componenten
    │   ├── Gantt.tsx              ← Hoofdcomponent (public API)
    │   ├── GanttLayout.tsx        ← Grid + Chart compositie
    │   ├── GanttChart.tsx         ← Rechts: tijdlijn + balken
    │   ├── GanttGrid.tsx          ← Links: TanStack Table
    │   ├── TimeScale.tsx          ← Tijdlijn header
    │   ├── TaskBar.tsx            ← Eén taakbalk
    │   ├── TaskBars.tsx           ← Alle balken + drag container
    │   ├── DependencyLinks.tsx    ← SVG lijnen
    │   ├── Markers.tsx            ← Verticale markerlijnen
    │   ├── Baseline.tsx           ← Baseline balk (PRO)
    │   ├── GanttToolbar.tsx       ← Knoppen bovenaan
    │   ├── TaskEditor.tsx         ← Bewerkdialoog (Shadcn Dialog)
    │   └── GanttResizer.tsx       ← Versleepbare scheidslijn
    ├── hooks/                     ← React hooks
    │   ├── useGanttStore.ts       ← Zustand hook
    │   ├── useDrag.ts             ← Drag & drop logica
    │   ├── useVirtualScroll.ts    ← Virtueel scrollen
    │   └── useScrollSync.ts       ← Grid ↔ chart sync
    └── utils/                     ← Hulpfuncties
        ├── dateUtils.ts           ← date-fns wrappers
        ├── geometry.ts            ← Pixel-berekeningen
        └── linkRouting.ts         ← SVG polyline punten
```

---

## Bouwfases

### Fase 1: Store — het brein (week 1)

**Doel:** Zustand store die taken en links beheert, datums berekent, en pixel-posities uitrekent.

**Bestudeer eerst:**
- `reference/svar-gantt-core/store/src/DataStore.ts` (1.668 regels — het hart)
- `reference/svar-gantt-core/store/src/scales.ts` (hoe ze tijdschalen berekenen)
- `reference/svar-gantt-core/store/src/tasks.ts` (hoe ze posities berekenen)

**Bouw:**
1. `types.ts` — GanttTask, GanttLink, GanttScale interfaces
2. `taskTree.ts` — boom-structuur, open/dicht, parent-child
3. `scales.ts` — tijdschaal generatie (dag/week/maand cellen met pixelbreedtes)
4. `positioning.ts` — taak → { x, y, width, height } op basis van schaal
5. `ganttStore.ts` — Zustand store die alles combineert
6. `calendar.ts` — werkdagen berekening
7. `links.ts` — link validatie en routing-punten

### Fase 2: Chart rendering — het gezicht (week 2)

**Bestudeer eerst:**
- `reference/svar-react-gantt/src/Bars.jsx` (763 regels — de kern van de UI)
- `reference/svar-react-gantt/src/Chart.jsx` (scroll, zoom, virtualisatie)
- `reference/svar-react-gantt/src/Links.jsx` (SVG polylines)

**Bouw:**
1. `TimeScale.tsx` — dubbele header rij (maand + dag)
2. `TaskBar.tsx` — één balk met voortgang, resize handles, label
3. `TaskBars.tsx` — container die alle balken rendert + drag afhandelt
4. `DependencyLinks.tsx` — SVG overlay met polylines
5. `GanttChart.tsx` — compositie van bovenstaande + scroll/zoom
6. `Markers.tsx` — verticale lijnen (vandaag, deadlines)

### Fase 3: Grid linkerpaneel (week 2-3)

**Bouw:**
1. `GanttGrid.tsx` — TanStack Table met kolommen: naam (indent), start, eind, duur
2. Scroll-synchronisatie met chart
3. Inline editing

### Fase 4: Interactie (week 3)

**Bestudeer eerst:**
- `reference/svar-react-gantt/src/Bars.jsx` regels 200-600 (drag logica)

**Bouw:**
1. `useDrag.ts` — drag & drop hook (move, resize start, resize end, progress)
2. Snap-to-grid (op daggrens)
3. Link aanmaken (klik start-punt → klik eind-punt)
4. `TaskEditor.tsx` — Shadcn Dialog voor taak bewerken

### Fase 5: PRO features (week 3-4)

1. `Baseline.tsx` — dunne balk onder hoofdbalk
2. `criticalPath.ts` — langste-pad algoritme
3. `scheduling.ts` — forward-pass auto-scheduling
4. Undo/redo in Zustand (temporal middleware)
5. PDF export (html2canvas + jsPDF)

### Fase 6: Grondwijzer integratie (week 4)

1. Taaktypes: F1, F2, F3, Transport, Inspectie, Order
2. Kleurschema per type/status
3. Data-koppeling met project-pipeline
4. Markers voor BKV-deadlines, project-milestones

---

## Kritische lessen uit SVAR's code

### 1. Bars.jsx is de moeilijkste component
763 regels die drag, resize, link-creation, touch, focus, en custom templates afhandelt. Dit is waar 30% van de debug-tijd gaat. **Tip:** splits dit in meerdere hooks (`useDrag`, `useResize`, `useLinkCreate`).

### 2. Scroll-sync is subtiel
Layout.jsx synchroniseert verticale scroll tussen Grid en Chart via een gedeelde scroll-container. De Chart berekent zelf welke rijen zichtbaar zijn. **Tip:** gebruik één scroll-container div met twee absolute-positioned kinderen.

### 3. Schaalberekening is het fundament
Alles hangt af van `scales.ts` — de functie die datumrange → pixelposities berekent. Als dit niet klopt, klopt niets. **Tip:** bouw dit eerst en test het uitgebreid.

### 4. SVG links zijn simpeler dan ze lijken
Links.jsx is maar 67 regels. De complexiteit zit in `links.ts` in de store (173 regels) die de SVG-punten berekent. Het is rechte-hoek routing met 4 link-types. **Tip:** begin met alleen e2s (end-to-start), voeg de rest later toe.

### 5. Virtual scrolling is essentieel
Chart.jsx berekent een `renderArea` (eerste en laatste zichtbare rij) en rendert alleen die taken. Zonder dit is 200+ taken onbruikbaar. **Tip:** implementeer dit vanaf dag 1.
