# Interactive Pipeline Simulator — Implementation Plan

An interactive single-page web app that lets you visually trace mock capture data through the full EA pipeline architecture from Module 6.

## App Location

```
CapturePipelineCourse/
  simulator/
    index.html           ← The app (single file, all inline)
    docs/                ← Build specs (referenced below)
      architecture.md    ← Panels, state management, component hierarchy
      mock-data.md       ← All simulated data: configs, scripts, file tree
      interactions.md    ← User flows, scenarios, state transitions
      visual-design.md   ← Colors, typography, component styles, animations
```

> [!IMPORTANT]
> **Single-file build.** Everything in one `index.html`. No build tools, no framework. Lucide icons via CDN for system iconography.

---

## Layout: Three-Panel + Console

See [architecture.md](file:///Users/seanbudning/Documents/GitHub/UnityTechnicalArtCourse/CapturePipelineCourse/simulator/docs/architecture.md) for full component hierarchy.

```
┌──────────────────────────────────────────────────────────────────┐
│  NAV BAR  (← Back to Course)           Pipeline Simulator  🎛️   │
├────────────────┬─────────────────────────────────┬───────────────┤
│  FILE EXPLORER │  PIPELINE STAGE VISUALIZER      │  INSPECTOR    │
│  (260px)       │  (flex)                         │  (320px)      │
│                │  ┌───────── CONTROL BAR ───────┐│               │
│  pipeline/     │  │ Client ▾  Tech⚡  ▶Send  💥││  [Data] [Cfg] │
│    core.py     │  └────────────────────────────┘││  [Adpt] [Hook]│
│    runner.py   │                                 ││  [Logs]       │
│  config/       │   ┌──────┐   ┌──────┐          ││               │
│    fc.json     │   │INGEST│──▶│CLEAN │          ││  CaptureResult│
│    madden.json │   └──────┘   └──────┘          ││  {            │
│  adapters/     │      ···CONVERGENCE···          ││    take_name  │
│    fbx.py      │   ┌──────┐   ┌──────┐  ┌─────┐││    frame_rate │
│    gltf.py     │   │RETAR │──▶│VALID │─▶│EXPRT│││    joints: {} │
│  plugins/      │   └──────┘   └──────┘  └──────┘││  }            │
│    metaverse.py│        ▼  DELIVER  ▶  📦       ││               │
├────────────────┴─────────────────────────────────┴───────────────┤
│  CONSOLE  [14:23:01] ClientRegistry loaded 5 profiles            │
│           [14:23:02] Adapter FBXExportAdapter initialized         │
└──────────────────────────────────────────────────────────────────┘
```

---

## User Feedback (Incorporated)

| Feedback | Change |
|----------|--------|
| Brighter theme, more midtones | Using `#1a1f2e` bg, `#252b3d` panels, `#2d3548` cards — blue-grey midtones, not pure dark |
| Data packet should be a box, clickable with metadata popup | Rectangular "data packet" card showing take name. Click opens modal with full CaptureResult fields |
| Simple bg highlight for active files, no pulse | Active files get solid subtle bg highlight (`#2d3548`), no animations |
| No icons in file explorer, just extensions | Plain text file tree: `fc.json`, `core.py` — no emoji icons |

---

## Detailed Specs

| Doc | Contents |
|-----|----------|
| [architecture.md](file:///Users/seanbudning/Documents/GitHub/UnityTechnicalArtCourse/CapturePipelineCourse/simulator/docs/architecture.md) | Panel components, JS state structure, event flow, module responsibilities |
| [mock-data.md](file:///Users/seanbudning/Documents/GitHub/UnityTechnicalArtCourse/CapturePipelineCourse/simulator/docs/mock-data.md) | Client configs, file tree structure, script contents, CaptureResult transforms per stage |
| [interactions.md](file:///Users/seanbudning/Documents/GitHub/UnityTechnicalArtCourse/CapturePipelineCourse/simulator/docs/interactions.md) | All click/select interactions, simulation scenarios, failure injection flows |
| [visual-design.md](file:///Users/seanbudning/Documents/GitHub/UnityTechnicalArtCourse/CapturePipelineCourse/simulator/docs/visual-design.md) | Color palette, typography, component CSS specs, animation keyframes |

---

## Proposed Changes

### Simulator

#### [NEW] [index.html](file:///Users/seanbudning/Documents/GitHub/UnityTechnicalArtCourse/CapturePipelineCourse/simulator/index.html)
Single-file web app.

### Course Integration

#### [MODIFY] [index.html](file:///Users/seanbudning/Documents/GitHub/UnityTechnicalArtCourse/CapturePipelineCourse/index.html)
Add "Pipeline Simulator" card in Technical Reference section.

## Verification

- Open `simulator/index.html` in Firefox
- Click through each client, each technology, run simulation
- Verify file highlights, inspector updates, console logging
- Test failure injection scenario
