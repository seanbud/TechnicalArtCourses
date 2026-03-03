# Visual Design Spec

---

## Color Palette (Midtone Blue-Grey)

```css
:root {
  /* Backgrounds — brighter midtones, not pure dark */
  --bg-app:       #1a1f2e;    /* main app background */
  --bg-panel:     #212738;    /* panel backgrounds */
  --bg-card:      #2a3149;    /* stage nodes, cards */
  --bg-hover:     #323a54;    /* hover states */
  --bg-active:    #2d3548;    /* active file highlight in explorer */
  --bg-input:     #1e2436;    /* input fields, dropdowns */

  /* Text */
  --text-primary:   #e2e8f0;
  --text-secondary: #94a3b8;
  --text-muted:     #64748b;

  /* Accents */
  --accent-green:   #34d399;  /* success, active stage, send button */
  --accent-blue:    #60a5fa;  /* info, links, convergence line */
  --accent-orange:  #fbbf24;  /* warnings, half-open circuit */
  --accent-red:     #f87171;  /* errors, open circuit, failures */
  --accent-purple:  #a78bfa;  /* plugin hooks */

  /* Borders */
  --border-default: #334155;
  --border-active:  #34d399;

  /* Syntax highlighting (for code preview in inspector) */
  --syn-keyword:    #c084fc;  /* class, def, import */
  --syn-string:     #86efac;  /* string literals */
  --syn-comment:    #64748b;  /* comments */
  --syn-number:     #fbbf24;  /* numbers */
  --syn-function:   #60a5fa;  /* function names */
}
```

---

## Typography

```css
/* Load via CDN in <head> */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

body         { font-family: 'Inter', sans-serif; font-size: 14px; }
code, pre    { font-family: 'JetBrains Mono', monospace; font-size: 12px; }
h1           { font-size: 1.5rem; font-weight: 700; }
h2           { font-size: 1.1rem; font-weight: 600; }
.stage-label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
.console-log { font-family: 'JetBrains Mono', monospace; font-size: 11px; }
```

---

## Layout Grid

```css
.app-layout {
  display: grid;
  grid-template-columns: 260px 1fr 320px;
  grid-template-rows: 48px 1fr 160px;
  grid-template-areas:
    "nav     nav     nav"
    "files   pipeline inspector"
    "console console  console";
  height: 100vh;
  overflow: hidden;
}
```

---

## Component Styles

### Nav Bar
```css
.nav-bar {
  grid-area: nav;
  background: var(--bg-panel);
  border-bottom: 1px solid var(--border-default);
  display: flex;
  align-items: center;
  padding: 0 1rem;
  gap: 1rem;
}
```

### File Explorer (Left Panel)
```css
.file-explorer {
  grid-area: files;
  background: var(--bg-panel);
  border-right: 1px solid var(--border-default);
  overflow-y: auto;
  padding: 0.5rem 0;
}

.file-tree-item {
  padding: 4px 12px 4px calc(12px + var(--depth) * 16px);
  cursor: pointer;
  font-size: 13px;
  color: var(--text-secondary);
  transition: background 0.15s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.file-tree-item:hover {
  background: var(--bg-hover);
}

.file-tree-item.active {
  background: var(--bg-active);    /* simple bg highlight, no pulse */
  color: var(--text-primary);
}

.file-tree-item.selected {
  background: var(--bg-active);
  color: var(--accent-green);
}

/* Folder toggle chevron */
.folder-chevron {
  width: 12px;
  transition: transform 0.15s;
}
.folder-chevron.open {
  transform: rotate(90deg);
}
```

### Pipeline Visualizer (Center Panel)
```css
.pipeline-panel {
  grid-area: pipeline;
  background: var(--bg-app);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.control-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: var(--bg-panel);
  border-radius: 8px;
  border: 1px solid var(--border-default);
  flex-wrap: wrap;
}

.stage-graph {
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}
```

### Stage Nodes
```css
.stage-node {
  background: var(--bg-card);
  border: 2px solid var(--border-default);
  border-radius: 10px;
  padding: 0.75rem 1.25rem;
  min-width: 130px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.3s, background 0.3s, box-shadow 0.3s;
}

.stage-node:hover {
  border-color: var(--text-secondary);
  background: var(--bg-hover);
}

.stage-node.active {
  border-color: var(--accent-green);
  box-shadow: 0 0 20px rgba(52, 211, 153, 0.15);
}

.stage-node.completed {
  border-color: var(--accent-green);
  opacity: 0.7;
}

.stage-node.failed {
  border-color: var(--accent-red);
  box-shadow: 0 0 20px rgba(248, 113, 113, 0.15);
}

.stage-node .stage-name {
  font-weight: 600;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--text-primary);
}

.stage-node .stage-subtitle {
  font-size: 0.7rem;
  color: var(--text-muted);
  margin-top: 2px;
}

.stage-node .stage-status {
  font-size: 0.65rem;
  margin-top: 4px;
}
```

### Connection Lines (SVG)
```css
.connection-line {
  stroke: var(--border-default);
  stroke-width: 2;
  fill: none;
  stroke-dasharray: 6 4;
}

.connection-line.active {
  stroke: var(--accent-green);
  animation: dash-flow 1s linear infinite;
}

@keyframes dash-flow {
  to { stroke-dashoffset: -10; }
}
```

### Convergence Divider
```css
.convergence-line {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0.5rem 0;
}

.convergence-line::before,
.convergence-line::after {
  content: '';
  flex: 1;
  border-top: 2px dashed var(--accent-blue);
  opacity: 0.4;
}

.convergence-label {
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--accent-blue);
  white-space: nowrap;
}
```

### Data Packet (Box)
```css
.data-packet {
  background: var(--bg-card);
  border: 2px solid var(--accent-green);
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 0.7rem;
  font-family: 'JetBrains Mono', monospace;
  color: var(--accent-green);
  cursor: pointer;
  position: absolute;
  transition: left 0.5s ease-in-out, top 0.5s ease-in-out;
  z-index: 10;
  white-space: nowrap;
}

.data-packet:hover {
  background: var(--bg-hover);
  box-shadow: 0 0 12px rgba(52, 211, 153, 0.2);
}
```

### Data Packet Modal
```css
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-content {
  background: var(--bg-panel);
  border: 1px solid var(--border-default);
  border-radius: 12px;
  padding: 1.5rem;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.modal-subtitle {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-bottom: 1rem;
}

.modal-json {
  background: var(--bg-app);
  border-radius: 6px;
  padding: 1rem;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  line-height: 1.5;
  white-space: pre-wrap;
}

.modal-json .new-field {
  border-left: 3px solid var(--accent-green);
  padding-left: 8px;
  margin-left: -11px;
}

.modal-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 1.2rem;
  cursor: pointer;
}
```

### Inspector Panel (Right)
```css
.inspector {
  grid-area: inspector;
  background: var(--bg-panel);
  border-left: 1px solid var(--border-default);
  display: flex;
  flex-direction: column;
}

.inspector-tabs {
  display: flex;
  border-bottom: 1px solid var(--border-default);
}

.inspector-tab {
  flex: 1;
  padding: 8px 4px;
  text-align: center;
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--text-muted);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: color 0.15s, border-color 0.15s;
}

.inspector-tab.active {
  color: var(--accent-green);
  border-bottom-color: var(--accent-green);
}

.inspector-content {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem;
}
```

### Console (Bottom)
```css
.console {
  grid-area: console;
  background: var(--bg-app);
  border-top: 1px solid var(--border-default);
  overflow-y: auto;
  padding: 0.5rem 1rem;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  line-height: 1.6;
}

.log-entry { color: var(--text-secondary); }
.log-entry .timestamp { color: var(--text-muted); }
.log-entry.info .message { color: var(--accent-blue); }
.log-entry.success .message { color: var(--accent-green); }
.log-entry.warning .message { color: var(--accent-orange); }
.log-entry.error .message { color: var(--accent-red); }
```

### Buttons
```css
.btn {
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
  border: 1px solid var(--border-default);
  background: var(--bg-card);
  color: var(--text-primary);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.btn:hover { background: var(--bg-hover); }

.btn-primary {
  background: var(--accent-green);
  color: #000;
  border-color: var(--accent-green);
  font-weight: 600;
}

.btn-primary:hover {
  background: #2ec489;
}

.btn-danger {
  background: rgba(248, 113, 113, 0.15);
  color: var(--accent-red);
  border-color: var(--accent-red);
}

.btn-danger:hover {
  background: rgba(248, 113, 113, 0.25);
}

.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
```

### Dropdown
```css
.select-wrapper select {
  appearance: none;
  background: var(--bg-input);
  color: var(--text-primary);
  border: 1px solid var(--border-default);
  border-radius: 6px;
  padding: 6px 30px 6px 10px;
  font-size: 0.8rem;
  font-family: 'Inter', sans-serif;
  cursor: pointer;
}
```

---

## Animations

### Connection Line Flow
Already defined above in `.connection-line.active` — dashes flow along the path.

### Data Packet Movement
CSS transition on `left` and `top` properties. 500ms ease-in-out. Applied via JS repositioning the absolute-positioned element.

### Stage Node Activation
Smooth border-color and box-shadow transition (0.3s). No abrupt changes.

### Validation Checkers (Parallel)
Show 5 small checker badges inside the VALIDATE node. Each starts as grey, then one by one turns green (✓) or red (✗) with a slight stagger delay (100ms between each). This visualizes "parallel" execution.

### Circuit Breaker State Change
Small colored dot on the DELIVER node:
- Green dot = CLOSED (normal)
- Red dot = OPEN (all fail instantly)
- Yellow dot = HALF_OPEN (testing)

Smooth color transition (0.3s).

---

## Icons (Lucide via CDN)

```html
<script src="https://unpkg.com/lucide@latest"></script>
```

Used for:
- Chevron (folder expand/collapse): `chevron-right`
- Send button: `play`
- Failure inject: `zap`
- Recovery: `wrench`
- Speed: `gauge`
- Stage completed: `check-circle`
- Stage failed: `x-circle`
- Circuit breaker: `shield` / `shield-off`
- Close modal: `x`
- Console severity icons: `info`, `alert-triangle`, `alert-circle`, `check`
