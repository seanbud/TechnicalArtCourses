# Interactions Spec

All user interactions, simulation scenarios, and state transitions.

---

## Control Bar Interactions

### Client Selector (Dropdown)
- **Options**: FC (FIFA), Madden, Battlefield, Metaverse Partner, External Vendor A
- **On change**:
  - `selectedClient` updates
  - Inspector Config tab reloads with new profile JSON
  - If simulation is running → log "⚠️ Config hot-swapped to {client}" and continue with new settings at next stage
  - If idle → just update config display
  - Console logs: `ClientRegistry: loaded profile for {display_name}`

### Technology Toggle (Marker / Markerless)
- Two-state toggle button
- **Marker** (default): shows ⚡ icon, label "Marker"
- **Markerless**: shows 📷 icon, label "Markerless"
- **On toggle**:
  - `selectedTech` updates
  - Ingest + Cleanup stage nodes update their labels (e.g., "INGEST (Vicon)" → "INGEST (Move.ai)")
  - The active files for those stages swap in the file explorer
  - Console logs: `StrategyRegistry: swapped to {tech} strategies`

### Send Capture Button
- Large, prominent, green accent
- **On click**: starts the full simulation (see architecture.md event flow)
- **During sim**: button changes to "Running..." (disabled, dimmed)
- **After complete**: button re-enables
- **If clicked again**: resets and re-runs

### Speed Control
- Three buttons: 1x, 2x, 4x
- Controls the delay between stage transitions
- Base delay: 1500ms at 1x, 750ms at 2x, 375ms at 4x

### Inject Failure Button
- Red accent, labeled "💥 Inject NAS Failure"
- **On click**:
  - Sets `failureActive = true`, `failureType = "nas_down"`
  - If sim is running at DELIVER stage → immediate effect
  - If sim hasn't reached DELIVER → will trigger when it arrives
  - If sim is idle → arm the failure for the next run
- **During failure**: button changes to "🔧 Recover NAS" — click to manually resolve

---

## Pipeline Stage Node Interactions

### Click a Stage Node
- Node visually expands or highlights as "selected"
- Inspector panel switches to the most relevant tab for that stage:
  - INGEST → Data tab (shows raw capture data)
  - CLEANUP → Data tab (shows cleanup transforms)
  - RETARGET → Config tab (shows skeleton mapping)
  - VALIDATE → Data tab (shows validation results with ✓/✗ checkers)
  - EXPORT → Adapter tab (shows which export adapter and its settings)
  - DELIVER → Adapter tab (shows delivery adapter + circuit breaker state)
- File explorer highlights the files active for that stage
- Console scrolls to that stage's log entries

### Stage Node Visual States
- **Idle**: Muted border, no fill emphasis
- **Active** (data packet is here): Bright border, subtle bg fill
- **Completed**: Green check icon in corner, slightly dimmed
- **Failed**: Red border, ✗ icon
- **Waiting**: Pulsing border (only during retry/circuit breaker scenarios)

---

## File Explorer Interactions

### Click a Folder
- Toggle expand/collapse
- Default expanded: `pipeline/`, `config/`, `config/clients/`

### Click a File
- File row gets selected highlight
- Inspector switches to Data tab showing the simulated file contents (Python source or JSON config)
- **If that file is currently "active" in the simulation**: inspector also shows a callout: "This file is currently loaded by stage: {STAGE_NAME}"

### Active File Highlighting
- During simulation, files that are relevant to the current stage get a subtle background highlight (`#2d3548`)
- When stage changes, the previously highlighted files lose their highlight and the new stage's files gain it
- No animations — instant swap

---

## Inspector Panel Interactions

### Tab Switching
- Click any tab label → show that tab's content
- Active tab has accent-colored bottom border

### Data Tab
- Shows `CaptureResult` as formatted JSON
- When a file is clicked in the explorer → shows that file's simulated source instead
- Fields that changed in the current stage are highlighted with a subtle left-border accent
- Small label at top: "CaptureResult after STAGE_NAME" or "File: filename.py"

### Config Tab
- Shows the selected client's full JSON profile
- Fields relevant to the current stage pulse briefly when the stage activates:
  - RETARGET → `skeleton` section highlights
  - EXPORT → `export` section highlights
  - DELIVER → `delivery` section highlights
  - VALIDATE → `validation` section highlights

### Adapter Tab
- Shows a card with:
  - Adapter class name (e.g., "FBXExportAdapter")
  - Pattern used ("Adapter + Factory")
  - Factory lookup: `get_export_adapter(profile) → FBXExportAdapter`
  - State: Initialized / Running / Complete
- For DELIVER stage, also shows:
  - Circuit breaker state (CLOSED / OPEN / HALF_OPEN) with colored indicator
  - Retry count
  - Local queue count (during failure)

### Hooks Tab
- Shows plugin hook timeline as a vertical list:
  ```
  ✓ register()           — plugin loaded
  ○ pre_export()         — pending
  ○ post_export()        — pending
  ○ custom_validate()    — pending
  ```
- Each hook gets a checkmark ✓ when called during simulation
- If the selected client has no plugin: show "No plugin registered for {client_id}"

### Logs Tab
- Filtered view of console entries for the current stage only
- Same format as bottom console but scoped

---

## Data Packet Interactions

### Visual Appearance
- Rectangular card/box positioned on the pipeline graph
- Shows abbreviated label: take name (e.g., "FC_..._sh05")
- Background color: subtle accent fill
- Moves between stage nodes during simulation with CSS transition

### Click the Data Packet
- Opens a **modal popup** overlay
- Modal shows the full `CaptureResult` JSON at its current state
- Modal has:
  - Title: "Data Packet — {take_name}"
  - Subtitle: "After stage: {current_stage}"
  - Full JSON view with syntax-highlighted fields
  - Fields added in the current stage marked with a "NEW" badge
  - Close button (× or click outside)

---

## Simulation Scenarios

### Scenario 1: Happy Path (Default)
1. Select any client, any technology
2. Click "Send Capture"
3. Data flows through all 6 stages
4. Each stage activates, processes, completes
5. Console shows the full journey
6. Data packet reaches DELIVER and completes
7. Final log: "✅ Pipeline complete"

### Scenario 2: NAS Failure + Circuit Breaker + Recovery
1. Click "Inject NAS Failure" (or during sim)
2. When DELIVER stage activates:
   - Delivery attempt 1: FAIL → log "NASDelivery: IOError — connection refused"
   - Retry 1 (2s delay): FAIL → log "Retry 2/3..."
   - Retry 2 (4s delay): FAIL → log "Retry 3/3 FAILED"
   - Circuit breaker TRIPS → log "CircuitBreaker [NAS]: OPEN after 3 failures"
   - Data queues to local SSD → log "ResilientStorage: queued to /tmp/capture_queue/"
   - Circuit breaker indicator on DELIVER node turns RED
   - After 3 seconds: circuit → HALF_OPEN (indicator YELLOW)
   - "Recover NAS" button available
3. Click "Recover NAS":
   - Test request succeeds → circuit → CLOSED (indicator GREEN)
   - Auto-flush queue → log "Flushing 1 queued files to NAS..."
   - Delivery completes normally
   - log "✅ Pipeline complete (recovered from NAS failure)"

### Scenario 3: Client Hot-Swap
1. Start sim with FC client
2. Mid-simulation, switch dropdown to Metaverse
3. At the next stage, the pipeline picks up the new config
4. Export now uses GLTFExportAdapter instead of FBX
5. Delivery now uses S3 instead of Perforce
6. Plugin hooks fire for metaverse (pre_export, custom_validate)

### Scenario 4: Technology Toggle
1. Start with Marker
2. Toggle to Markerless before clicking Send
3. Ingest node label changes to "INGEST (Move.ai)"
4. Cleanup node label changes to "CLEANUP (ML Filter)"
5. Data packet shows lower confidence (0.87 vs 1.0)
6. Cleanup shows different transforms (temporal_smooth vs marker_swap_fix)
7. After convergence point → everything identical to marker path

---

## Keyboard Shortcuts (optional enhancement)

| Key | Action |
|-----|--------|
| Space | Send Capture / Pause |
| 1, 2, 3 | Speed 1x, 2x, 4x |
| F | Inject/Recover NAS failure |
| Esc | Close modal |
