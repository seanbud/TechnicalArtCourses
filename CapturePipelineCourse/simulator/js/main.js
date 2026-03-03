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
function openModal(type, arg) {
  var ov = document.getElementById("modal-overlay");
  var title = document.getElementById("modal-title");
  var sub = document.getElementById("modal-sub");
  var body = document.getElementById("modal-body");
  if (type === "packet" && S.packet) {
    title.textContent = "Data Packet — " + S.packet.take_name;
    sub.textContent = "After stage: " + (STAGES[S.step] || "complete");
    body.innerHTML = '<div class="jtree">' + buildJsonTree(S.packet) + '</div>';
  } else if (type === "info" && STAGE_INFO[arg]) {
    var info = STAGE_INFO[arg];
    title.textContent = info.title;
    sub.textContent = "Pattern: " + info.pattern;
    body.innerHTML = '<div class="modal-section"><p>' + info.desc + '</p></div>' +
      '<div class="modal-section"><h4>Source Code</h4>' + highlightPy(FC[info.code] || "") + '</div>' +
      '<a class="modal-link" href="../lessons/' + info.lesson + '" target="_blank">📖 Open Lesson →</a>';
  }
  ov.classList.add("open");
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
