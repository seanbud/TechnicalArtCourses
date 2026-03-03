// ═══════════════════════════════════════════
// engine.js — State + simulation logic
// ═══════════════════════════════════════════

var S = {
  client: "fc_sports", tech: "marker", step: -1,
  running: false, failureArmed: false, cbState: "CLOSED",
  retries: 0, queueCount: 0, autoPlay: false, autoTimer: null,
  selectedFile: null, activeFiles: [], inspectorTab: "data",
  packet: null, logs: [], hooksDone: [], valIdx: undefined
};

function clickStage(stage) {
  var idx = STAGES.indexOf(stage);
  var c = CL[S.client];
  if (stage === "ingest" || stage === "cleanup") S.activeFiles = SF[stage][S.tech] || [];
  else if (stage === "retarget" || stage === "validate") {
    S.activeFiles = SF[stage].both || [];
    if (stage === "validate" && c.plugin) S.activeFiles = S.activeFiles.concat(["plugins/" + c.plugin + ".py"]);
  } else if (stage === "export") {
    S.activeFiles = SF[stage][c.export.format] || [];
    if (c.plugin) S.activeFiles = S.activeFiles.concat(["plugins/" + c.plugin + ".py"]);
  } else if (stage === "deliver") {
    S.activeFiles = SF[stage][c.delivery.method] || [];
  }
  if (S.activeFiles.length > 0) S.selectedFile = S.activeFiles[0];
  else S.selectedFile = null;
  if (stage === "retarget") S.inspectorTab = "config";
  else if (stage === "export" || stage === "deliver") S.inspectorTab = "adapter";
  else if (stage === "validate" && c.plugin) S.inspectorTab = "hooks";
  else S.inspectorTab = "data";
  setActiveTab(S.inspectorTab);
  renderTree(); renderInspector();
}

function onNext() {
  if (S.step === -1) { startSim(); return; }
  if (S.step >= STAGES.length) return;
  advanceStep();
}

function onReset() {
  stopAuto();
  S.step = -1; S.running = false; S.packet = null; S.hooksDone = [];
  S.retries = 0; S.queueCount = 0; S.cbState = "CLOSED";
  S.activeFiles = []; S.selectedFile = null; S.valIdx = undefined;
  document.getElementById("btn-next").textContent = "▶ Start";
  document.getElementById("btn-next").disabled = false;
  document.getElementById("btn-reset").style.display = "none";
  document.getElementById("data-packet").style.display = "none";
  document.getElementById("file-loc").innerHTML = "";
  renderGraph(); renderInspector(); renderTree();
  log("info", "Pipeline reset");
}

function toggleAuto() {
  if (S.autoPlay) { stopAuto(); return; }
  S.autoPlay = true;
  var btn = document.getElementById("btn-auto");
  btn.textContent = "⏸ Pause"; btn.classList.add("active");
  if (S.step === -1) startSim();
  else scheduleAutoNext();
}

function stopAuto() {
  S.autoPlay = false;
  if (S.autoTimer) { clearTimeout(S.autoTimer); S.autoTimer = null; }
  var btn = document.getElementById("btn-auto");
  btn.textContent = "▶▶ Auto"; btn.classList.remove("active");
}

function scheduleAutoNext() {
  if (!S.autoPlay || S.step >= STAGES.length - 1) { stopAuto(); return; }
  S.autoTimer = setTimeout(function() { advanceStep(); scheduleAutoNext(); }, 2500);
}

function startSim() {
  S.step = -1; S.running = true; S.hooksDone = []; S.retries = 0;
  S.queueCount = 0; S.cbState = "CLOSED"; S.valIdx = undefined;
  var c = CL[S.client];
  document.getElementById("btn-next").textContent = "Next ▶";
  document.getElementById("btn-reset").style.display = "";
  var dp = document.getElementById("data-packet");
  dp.textContent = "📦 " + c.naming.example; dp.style.display = "inline-block";
  log("info", "PipelineRunner: starting for " + c.display + " (" + S.tech + ")");
  if (c.plugin) { log("plugin", "PluginManager: loaded " + c.plugin + ".py"); S.hooksDone.push("register"); }
  advanceStep();
  if (S.autoPlay) scheduleAutoNext();
}

async function advanceStep() {
  S.step++;
  if (S.step >= STAGES.length) {
    log("success", "✅ Pipeline complete: " + S.packet.output_path);
    document.getElementById("btn-next").disabled = true;
    document.getElementById("btn-next").textContent = "✅ Done";
    stopAuto();
    renderGraph(); renderInspector(); return;
  }
  var stage = STAGES[S.step];
  var c = CL[S.client];
  clickStage(stage);

  if (stage === "ingest") {
    var take = c.naming.example;
    S.packet = {
      take_name: take,
      frame_rate: S.tech === "marker" ? 120 : 30,
      frame_count: S.tech === "marker" ? 3450 : 862,
      source_technology: S.tech,
      source_vendor: S.tech === "marker" ? "vicon" : "moveai",
      source_file: S.tech === "marker" ? "/captures/raw/" + take + ".c3d" : "/captures/video/" + take + ".mp4",
      confidence: S.tech === "marker" ? 1.0 : 0.87,
      joints: S.tech === "marker" ? "{ 54 joints }" : "{ 32 joints }",
      metadata: { session: "2026-02-28", actor: "Actor_A" }
    };
    log("info", (S.tech === "marker" ? "MarkerIngest" : "MarkerlessIngest") + ": reading " + S.packet.source_file);
  } else if (stage === "cleanup") {
    S.packet.cleanup_applied = S.tech === "marker"
      ? ["marker_swap_fix (3)", "gap_fill (12)", "butterworth (6Hz)"]
      : ["temporal_smooth", "bone_stabilize", "contact_est", "conf_filter"];
    log("info", (S.tech === "marker" ? "MarkerCleanup" : "MarkerlessCleanup") + ": " + S.packet.cleanup_applied[0]);
  } else if (stage === "retarget") {
    S.packet.target_skeleton = c.skeleton.template;
    S.packet.joints_remapped = true;
    S.packet.joints = "{ " + c.skeleton.required.length + " joints (target) }";
    log("info", "HumanIKRetarget: → " + c.skeleton.template);
    if (c.plugin === "fc_custom") { S.hooksDone.push("custom_retarget"); log("plugin", "Hook: fc_custom.custom_retarget()"); }
  } else if (stage === "validate") {
    S.valIdx = -1; S.packet.validation_results = [];
    var checks = ["naming","skeleton","frames","root","integrity"];
    for (var i = 0; i < checks.length; i++) {
      await new Promise(function(r) { setTimeout(r, 300); });
      S.valIdx = i;
      S.packet.validation_results.push({checker: checks[i], passed: true});
      log("success", "Checker [" + checks[i] + "]: ✓ PASS");
      renderGraph();
    }
    if (c.plugin === "metaverse_client") { S.hooksDone.push("custom_validate"); log("plugin", "Hook: custom_validate() — OK"); }
  } else if (stage === "export") {
    if (c.plugin === "metaverse_client") { S.hooksDone.push("pre_export"); log("plugin", "Hook: pre_export() — LOD 5k tris"); }
    S.packet.output_path = "/output/" + c.id + "/" + c.naming.example + "_v001." + c.export.format;
    S.packet.adapter_used = getExpAdapter(c);
    S.packet.output_format = c.export.format;
    log("info", "Factory: " + getExpAdapter(c) + " → '" + c.export.format + "'");
    if (c.plugin === "metaverse_client") { S.hooksDone.push("post_export"); log("plugin", "Hook: post_export() — turntable"); }
  } else if (stage === "deliver") {
    if (S.failureArmed) {
      for (var r = 1; r <= 3; r++) {
        S.retries = r;
        log("error", "NASDelivery: IOError (attempt " + r + "/3)");
        renderGraph(); renderInspector();
        await new Promise(function(r) { setTimeout(r, 600); });
      }
      S.cbState = "OPEN"; log("error", "CircuitBreaker: OPEN — fail-fast");
      S.queueCount = 1; log("warn", "Queued to /tmp/capture_queue/");
      renderGraph(); renderInspector();
      await new Promise(function(r) { setTimeout(r, 1500); });
      S.cbState = "HALF_OPEN"; log("warn", "CircuitBreaker: HALF_OPEN — testing...");
      renderGraph(); renderInspector();
      await new Promise(function(r) { setTimeout(r, 2000); });
      if (S.failureArmed) toggleFailure();
      S.cbState = "CLOSED"; S.queueCount = 0;
      log("success", "CircuitBreaker: CLOSED — recovered");
      log("info", "Flushing queue...");
    }
    S.packet.delivery_method = c.delivery.method;
    S.packet.delivery_destination = getDest(c) + c.naming.example + "." + c.export.format;
    S.packet.delivery_timestamp = new Date().toISOString();
    S.packet.notification_sent = c.delivery.slack;
    log("success", getDelAdapter(c) + ": delivered to " + getDest(c));
    log("info", "Slack → " + c.delivery.slack);
  }
  renderGraph(); renderInspector();
}

function toggleFailure() {
  var btn = document.getElementById("btn-fail");
  if (!S.failureArmed) {
    S.failureArmed = true;
    btn.textContent = "🔧 Recover NAS";
    btn.style.borderColor = "var(--accent-orange)"; btn.style.color = "var(--accent-orange)";
    log("warn", "NAS failure ARMED");
  } else {
    S.failureArmed = false; S.cbState = "CLOSED";
    btn.textContent = "💥 NAS Failure";
    btn.style.borderColor = ""; btn.style.color = "";
    log("success", "NAS recovered — circuit breaker CLOSED");
    renderGraph();
    if (S.inspectorTab === "adapter") renderInspector();
  }
}
