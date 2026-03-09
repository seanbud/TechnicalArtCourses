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
    "Watchdog daemon": {f:"capture_pipeline/scripts/delivery_bot.py", t:"class DeliveryBot"},
    "Deadline": {f:"capture_pipeline/pipeline/core.py", t:"class PipelineRunner"},
    "P4Python": {f:"capture_pipeline/adapters/p4_delivery.py", t:"class PerforceDelivery"},
    "boto3": {f:"capture_pipeline/adapters/s3_delivery.py", t:"class S3Delivery"},
    "PipelineRunner": {f:"capture_pipeline/pipeline/runner.py", t:"class UniversalPipeline"},
    "Strategy Registry": {f:"capture_pipeline/pipeline/runner.py", t:"STRATEGIES = {"},
    "MarkerIngest": {f:"capture_pipeline/adapters/vicon_ingest.py", t:"class MarkerIngest"},
    "MarkerlessIngest": {f:"capture_pipeline/adapters/moveai_ingest.py", t:"class MarkerlessIngest"},
    "RetargetStage": {f:"capture_pipeline/pipeline/retarget.py", t:"class HumanIKRetarget"},
    "retarget stage.process": {f:"capture_pipeline/pipeline/retarget.py", t:"def retarget"},
    "RetargetStage.process()": {f:"capture_pipeline/pipeline/retarget.py", t:"def retarget"},
    "Client Registry": {f:"capture_pipeline/pipeline/client_registry.py", t:"class ClientRegistry"},
    "HumanIK": {f:"capture_pipeline/pipeline/retarget.py", t:"class HumanIKRetarget"},
    "PluginManager": {f:"capture_pipeline/pipeline/plugin_manager.py", t:"class PluginManager"},
    "ValidationStage": {f:"capture_pipeline/pipeline/validation.py", t:"class UniversalValidator"},
    "pre-export": {f:"capture_pipeline/plugins/metaverse_client.py", t:"def pre_export"},
    "post-export": {f:"capture_pipeline/plugins/metaverse_client.py", t:"def post_export"},
    "pre_export": {f:"capture_pipeline/plugins/metaverse_client.py", t:"def pre_export"},
    "post_export": {f:"capture_pipeline/plugins/metaverse_client.py", t:"def post_export"},
    "ExportFactory": {f:"capture_pipeline/adapters/fbx_export.py", t:"class FBXExportAdapter"},
    "Circuit Breaker": {f:"capture_pipeline/adapters/nas_delivery.py", t:"@circuit_breaker"},
    "CaptureResult": {f:"capture_pipeline/adapters/vicon_ingest.py", t:"result = CaptureResult()"}
  };
  var target = map[term];
  if (target) {
    document.getElementById("modal-overlay").classList.remove("open");
    selectFile(target.f, target.t);
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
log("info", "Pipeline Simulator v2.1 initialized", "System");
log("info", "ClientRegistry: " + Object.keys(CL).length + " profiles loaded", "System");
log("info", "PluginManager: 2 plugins discovered", "System");
