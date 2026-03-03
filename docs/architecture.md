# Architecture Spec

## Component Hierarchy

```
App
├── NavBar
│     └── Back link, title, speed control
│
├── MainLayout (CSS Grid: 260px | 1fr | 320px)
│     ├── LeftPanel: FileExplorer
│     │     ├── TreeNode (recursive folder/file)
│     │     └── state: expandedFolders[], activeFile
│     │
│     ├── CenterPanel: PipelineVisualizer
│     │     ├── ControlBar
│     │     │     ├── ClientSelector (dropdown)
│     │     │     ├── TechToggle (marker / markerless)
│     │     │     ├── SendButton ("Send Capture")
│     │     │     ├── SpeedSlider (1x / 2x / 4x)
│     │     │     └── InjectFailureButton
│     │     │
│     │     ├── StageGraph
│     │     │     ├── StageNode × 6 (ingest, cleanup, retarget, validate, export, deliver)
│     │     │     ├── ConnectionLines (SVG paths between nodes)
│     │     │     ├── ConvergenceDivider (horizontal dashed line between stage 2 and 3)
│     │     │     ├── DataPacket (animated box traveling the path)
│     │     │     └── SideBranches: adapter lookup, plugin hook, circuit breaker indicator
│     │     │
│     │     └── StageDetail (expandable panel below graph when a node is clicked)
│     │
│     └── RightPanel: Inspector
│           ├── TabBar: [Data] [Config] [Adapter] [Hooks] [Logs]
│           ├── DataTab: live CaptureResult JSON view
│           ├── ConfigTab: selected client's profile JSON (highlighted relevant fields)
│           ├── AdapterTab: active adapter class + state
│           ├── HooksTab: plugin hook timeline (checkmarks/pending)
│           └── LogsTab: filtered log entries for current stage
│
└── BottomBar: Console
      └── Scrolling log entries with timestamps + severity colors
```

## JavaScript State Model

```javascript
const STATE = {
  // --- User selections ---
  selectedClient: "fc_sports",      // dropdown value
  selectedTech: "marker",           // "marker" | "markerless"
  speed: 1,                         // 1 | 2 | 4
  
  // --- Simulation ---
  isRunning: false,
  currentStage: null,               // "ingest" | "cleanup" | ... | "deliver" | null
  stageHistory: [],                 // stages already completed
  dataPacket: { ... },              // the CaptureResult being built up
  
  // --- Failure injection ---
  failureActive: false,
  failureType: null,                // "nas_down" | "p4_down" | null
  circuitBreakerState: "CLOSED",    // "CLOSED" | "OPEN" | "HALF_OPEN"
  retryCount: 0,
  localQueueCount: 0,
  
  // --- UI state ---
  activeFile: null,                 // path of file selected in explorer
  expandedFolders: ["pipeline", "config", "config/clients"],
  inspectorTab: "data",            // "data" | "config" | "adapter" | "hooks" | "logs"
  consoleEntries: [],              // { time, level, message, stage }
  
  // --- Derived (computed per stage) ---
  activeFiles: [],                 // files highlighted in file explorer
  activeAdapter: null,             // adapter class name
  activeHooks: [],                 // plugin hooks called
};
```

## Event Flow: "Send Capture" Button

```
1. User clicks "Send Capture"
   → isRunning = true
   → Load client profile from MOCK_DATA.clientConfigs[selectedClient]
   → Log: "ClientRegistry: loaded profile for {client}"
   → Log: "PluginManager: discovered {N} plugins"
   
2. Stage: INGEST
   → currentStage = "ingest"
   → activeFiles = ["pipeline/core.py", "adapters/vicon_ingest.py"]  (or markerless)
   → dataPacket = initial CaptureResult (raw, minimal fields)
   → Animate data packet to the INGEST node
   → Log: "{Technology}Ingest: reading {filename}"
   → Wait (500ms × speed multiplier)

3. Stage: CLEANUP
   → currentStage = "cleanup"
   → activeFiles swap to cleanup scripts
   → dataPacket gains: cleaned marker data or jitter-filtered ML data
   → Animate packet to CLEANUP node
   → Log: "{Technology}Cleanup: fixing swaps / filtering jitter"
   → Wait

4. ── CONVERGENCE POINT (visual line) ──

5. Stage: RETARGET
   → currentStage = "retarget"
   → activeFiles = ["pipeline/retarget.py"]
   → dataPacket gains: target skeleton, remapped joints
   → Log: "HumanIKRetarget: mapping to {skeleton_template}"
   → If client has plugin with custom_retarget hook → call it, show in hooks tab
   → Wait

6. Stage: VALIDATE
   → currentStage = "validate"
   → activeFiles = ["pipeline/validation.py", plugin validator if present]
   → Run checkers in parallel (show spinner on each checker, then ✓/✗)
   → Checkers: naming, skeleton, frame_range, root_origin, integrity
   → Log each result
   → Wait

7. Stage: EXPORT
   → currentStage = "export"
   → activeAdapter = adapter class name from config (FBXExportAdapter, GLTFExportAdapter, etc)
   → activeFiles = ["adapters/fbx_export.py"] (or gltf, usd)
   → Log: "Factory: selected {adapter} for format '{format}'"
   → If plugin has pre_export hook → fire it
   → dataPacket gains: output_path, exported format
   → If plugin has post_export hook → fire it
   → Wait

8. Stage: DELIVER
   → currentStage = "deliver"
   → If failureActive:
       → Circuit breaker trips → state = OPEN
       → Log: "CircuitBreaker [NAS]: OPEN after 3 failures"
       → Data queues to local SSD (localQueueCount++)
       → After timeout, circuit → HALF_OPEN → test → recover
       → Auto-flush queue
   → Else:
       → Normal delivery via adapter
       → Log: "{DeliveryAdapter}: delivered to {destination}"
   → Wait

9. Complete
   → isRunning = false
   → Log: "✅ Pipeline complete: {output_path}"
   → Data packet reaches end state
```

## Panel Synchronization Rules

| Event | File Explorer | Pipeline Graph | Inspector | Console |
|-------|--------------|----------------|-----------|---------|
| Stage changes | Highlight new active files | Move packet, activate node | Show stage-relevant data | Log stage entry |
| Click stage node | Highlight its files | (already active) | Switch to relevant tab | Scroll to stage logs |
| Click file in explorer | Mark as selected | No change | Show file contents in Data tab | No change |
| Change client | No change | Reset pipeline | Reload config tab | Log config load |
| Change tech | No change | Show divergent stage swap | Update data tab | Log strategy swap |
| Inject failure | No change | Show circuit breaker on deliver node | Show retry/queue state | Log failures + recovery |
