// ═══════════════════════════════════════════
// main.js — Init, event listeners, modal, resize
// ═══════════════════════════════════════════

// ── Client / Tech change ──
document.getElementById("sel-client").addEventListener("change", function(e) {
  S.client = e.target.value;
  renderGraph();
  renderTree();
  renderInspector();
  log("info", "ClientRegistry: loaded " + CL[S.client].display);
});

document.getElementById("sel-tech").addEventListener("change", function(e) {
  S.tech = e.target.value;
  renderGraph();
  renderTree();
  renderInspector();
  log("info", "StrategyRegistry: swapped to " + S.tech);
});

// ── Modal ──
function openModal(type, key) {
  var ov = document.getElementById("modal-overlay");
  var title = document.getElementById("modal-title");
  var sub = document.getElementById("modal-sub");
  var body = document.getElementById("modal-body");
  
  if (type === "info" && STAGE_INFO[key]) {
    var info = STAGE_INFO[key];
    title.textContent = info.title;
    sub.textContent = "Pattern: " + info.pattern;
    
    // Process markdown-ish bold and code
    var d = info.desc.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    d = d.replace(/\`(.*?)\`/g, '<code class="modal-code" onclick="pingFile(\'$1\')">$1</code>');
    
    body.innerHTML = '<div class="modal-section"><p>' + d + '</p></div>' +
      '<div class="modal-section"><h4>Source Code</h4>' + highlightPy(FC[info.code] || "") + '</div>' +
      '<a class="modal-link" href="../lessons/' + info.lesson + '" target="_blank">📖 Open Lesson →</a>';
  } else if (type === "storage" && STORAGE_INFO[key]) {
    var sInfo = STORAGE_INFO[key];
    title.textContent = "Storage Logistics";
    sub.innerHTML = '<span class="sbadge" style="position:static;display:inline-flex;margin-right:6px">🗄️</span> ' + sInfo.title;
    
    // Process markdown-ish bold and code
    var sd = sInfo.desc.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    sd = sd.replace(/\`(.*?)\`/g, '<code class="modal-code" onclick="pingFile(\'$1\')">$1</code>');
    
    body.innerHTML = '<div class="modal-section"><p>' + sd + '</p></div>';
  } else if (type === "packet" && S.packet) { 
    title.textContent = "Data Packet — " + S.packet.take_name;
    sub.textContent = "After stage: " + (STAGES[S.step] || "complete");
    body.innerHTML = '<div class="jtree">' + buildJsonTree(S.packet) + '</div>';
  }

  ov.classList.add("open");
}

function pingFile(term, checkOnly) {
  var map = {
    "Watchdog daemon": "scripts/delivery_bot.py",
    "Deadline": "pipeline/core.py",
    "P4Python": "adapters/p4_delivery.py",
    "boto3": "adapters/s3_delivery.py",
    "PipelineRunner": "pipeline/runner.py",
    "Strategy Registry": "pipeline/runner.py",
    "MarkerIngest": "adapters/vicon_ingest.py",
    "MarkerlessIngest": "adapters/moveai_ingest.py",
    "RetargetStage": "pipeline/retarget.py",
    "retarget stage.process": "pipeline/retarget.py",
    "RetargetStage.process()": "pipeline/retarget.py",
    "Client Registry": "pipeline/client_registry.py",
    "HumanIK": "pipeline/retarget.py",
    "PluginManager": "pipeline/plugin_manager.py",
    "ValidationStage": "pipeline/validation.py",
    "pre-export": "plugins/metaverse_client.py",
    "post-export": "plugins/metaverse_client.py",
    "pre_export": "plugins/metaverse_client.py",
    "post_export": "plugins/metaverse_client.py",
    "ExportFactory": "adapters/fbx_export.py",
    "Circuit Breaker": "adapters/nas_delivery.py",
    "CaptureResult": "adapters/vicon_ingest.py"
  };
  var path = map[term];
  if (path) {
    document.getElementById("modal-overlay").classList.remove("open");
    selectFile(path);
    log("info", "Pinging file for term: " + term);
  }
}

function inspectPacket() {
  S.selectedFile = null;
  S.inspectorTab = "data";
  setActiveTab("data");
  renderInspector();
}

function closeModal(e) {
  if (e && e.target !== document.getElementById("modal-overlay")) return;
  document.getElementById("modal-overlay").classList.remove("open");
}

// ── Resize handle ──
(function() {
  var handle = document.getElementById("resize-handle");
  var app = document.querySelector(".app");
  var dragging = false, startX, startW;
  handle.addEventListener("mousedown", function(e) {
    dragging = true; startX = e.clientX;
    startW = document.querySelector(".inspector").offsetWidth;
    handle.classList.add("dragging"); e.preventDefault();
  });
  document.addEventListener("mousemove", function(e) {
    if (!dragging) return;
    var diff = startX - e.clientX;
    var nw = Math.min(600, Math.max(320, startW + diff));
    app.style.setProperty("--inspector-w", nw + "px");
  });
  document.addEventListener("mouseup", function() {
    if (dragging) { dragging = false; handle.classList.remove("dragging"); }
  });
})();

// ── Init ──
renderTree();
renderGraph();
renderInspector();
log("info", "Pipeline Simulator v2.1 initialized");
log("info", "ClientRegistry: " + Object.keys(CL).length + " profiles loaded");
log("info", "PluginManager: 2 plugins discovered");
