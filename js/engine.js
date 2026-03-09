// ═══════════════════════════════════════════
// engine.js — State + simulation logic
// ═══════════════════════════════════════════

var S = {
  client: "fc_sports",
  tech: "marker",
  step: -1,
  selectedFile: null,
  activeFiles: [],
  inspectorTab: "data",
  packet: null,
  logs: [],
  valIdx: 0,
  cbState: "CLOSED", // CLOSED=ok, OPEN=fail
  retries: 0,
  queueCount: 0,
  hooksDone: [],
  nasEnabled: true,
  chaosActive: false,
  chaosModes: [],
  prevPacket: null,
  focusTarget: null,
  logView: "sequential"
};

function toggleChaosMain() {
  S.chaosActive = !S.chaosActive;
  var btnMain = document.getElementById("btn-chaos-main");
  var btnDrop = document.getElementById("btn-chaos-drop");
  var menu = document.getElementById("chaos-menu");
  
  if (S.chaosActive) {
    btnMain.classList.add("active");
    btnMain.innerHTML = "🔴 Chaos: ON";
    btnDrop.disabled = false;
    log("warn", "[System] Chaos Event generator activated.");
    updateChaosSelection(); // Apply currently selected
  } else {
    btnMain.classList.remove("active");
    btnMain.innerHTML = "⚪ Chaos: OFF";
    btnDrop.disabled = true;
    menu.classList.remove("show"); // Hide menu if open
    
    // Clear all
    log("success", "[System] Chaos events cleared. Systems recovering...");
    if (!S.nasEnabled) {
      S.nasEnabled = true;
      if (S.cbState === "OPEN") {
         S.cbState = "HALF_OPEN";
         log("info", "[System] NAS Storage restored. Circuit Breaker testing connection...", "System");
         renderGraph(); renderInspector();
         // Async flush
         setTimeout(function() {
             S.cbState = "CLOSED";
             log("success", "[System] Circuit Breaker: CLOSED (Service Healthy)", "System");
             renderGraph(); renderInspector();
             
             if (S.queueCount > 0) {
                 log("info", "[Sweeper Daemon] Waking up to process fallback queue...", "System");
                 setTimeout(function() {
                     var c = CL[S.client];
                     S.packet.delivery_timestamp = new Date().toISOString();
                     S.queueCount = 0;
                     log("success", "[Sweeper Daemon] Emptied fallback queue. All files safely on NAS.", "System");
                     document.getElementById("btn-next").disabled = false;
                     renderGraph(); renderInspector();
                     
                     // Advance simulation to complete
                     setTimeout(function() { advanceStep(); }, 1000);
                 }, 1500);
             }
         }, 1000);
      }
    }
  }
  
  if (S.inspectorTab === "health" || S.inspectorTab === "adapter") renderInspector();
}

function toggleChaosMenu() {
  document.getElementById("chaos-menu").classList.toggle("show");
}

function updateChaosSelection() {
  if (!S.chaosActive) return; // Only apply if master is on
  
  var checkboxes = document.querySelectorAll('.chaos-dropdown-item input[type="checkbox"]');
  S.chaosModes = [];
  S.nasEnabled = true; // reset to true, evaluate below
  
  checkboxes.forEach(function(cb) {
    if (cb.checked) {
      S.chaosModes.push(cb.value);
      if (cb.value === "nas") {
        S.nasEnabled = false;
        log("critical", "[System] Simulated NAS Hardware Failure initiated!");
      } else if (cb.value === "vendor") {
        log("error", "[System] Simulated Vendor SDK Segfault armed (Cleanup stage).");
      } else if (cb.value === "config") {
        log("warn", "[System] Simulated Config Corruption armed (Validate stage).");
      }
    }
  });
  
  if (S.inspectorTab === "health" || S.inspectorTab === "adapter") renderInspector();
}

// Close menu if clicked outside
document.addEventListener('click', function(e) {
  var container = document.getElementById("chaos-container");
  if (container && !container.contains(e.target)) {
    var menu = document.getElementById("chaos-menu");
    if (menu && menu.classList.contains("show")) menu.classList.remove("show");
  }
});

function clickStage(stage, preserveSelection) {
  // Sticky packet logic: if we are viewing the packet, preserve that state
  var wasInspectingPacket = (S.inspectorTab === "data" && S.selectedFile === null && S.packet !== null);
  var isInspectingLogs = (S.inspectorTab === "logs");

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
  
  // Set default selection
  if (S.activeFiles.length > 0) S.selectedFile = S.activeFiles[0];
  else S.selectedFile = null;
  
  if (stage === "export" || stage === "deliver") S.inspectorTab = "adapter";
  else if (stage === "validate" && c.plugin) S.inspectorTab = "hooks";
  else S.inspectorTab = "data";

  // Override defaults if sticky selection is requested and active
  if (preserveSelection) {
    if (wasInspectingPacket) {
      S.selectedFile = null;
      S.inspectorTab = "data";
    } else if (isInspectingLogs) {
      S.selectedFile = null;
      S.inspectorTab = "logs";
    }
  }
  
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
  S.retries = 0; S.queueCount = 0; S.cbState = "CLOSED"; S.fatalError = null;
  S.activeFiles = []; S.selectedFile = null; S.valIdx = undefined;
  document.getElementById("btn-next").textContent = "▶ Start";
  document.getElementById("btn-next").disabled = false;
  document.getElementById("btn-reset").style.display = "none";
  document.getElementById("data-packet").style.display = "none";
  document.getElementById("file-loc").innerHTML = "";
  renderGraph(); renderInspector(); renderTree();
  log("info", "Pipeline reset", "System");
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
  if (!S.autoPlay || S.step >= STAGES.length) { stopAuto(); return; }
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
  log("info", "PipelineRunner: starting for " + c.display + " (" + S.tech + ")", "System");
  if (c.plugin) { 
    setTimeout(function() {
      log("plugin", "PluginManager: loaded " + c.plugin + ".py", "Cloud"); 
      S.hooksDone.push("register");
    }, 300);
  }
  advanceStep();
  if (S.autoPlay) scheduleAutoNext();
}

async function advanceStep() {
  if (S.packet) S.prevPacket = JSON.parse(JSON.stringify(S.packet));
  else S.prevPacket = null;
  S.step++;
  if (S.step >= STAGES.length) {
    log("success", "✅ Pipeline complete: " + S.packet.output_path, "System");
    document.getElementById("btn-next").disabled = true;
    document.getElementById("btn-next").textContent = "✅ Done";
    stopAuto();
    renderGraph(); renderInspector(); return;
  }
  var stage = STAGES[S.step];
  var c = CL[S.client];
  
  // Advance the stage visuals and code selection, preserving packet view if currently active
  clickStage(stage, true);

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
    await new Promise(function(r) { setTimeout(r, 400); });
    log("info", (S.tech === "marker" ? "MarkerIngest" : "MarkerlessIngest") + ": reading " + S.packet.source_file, "Stage");
  } else if (stage === "cleanup") {
    if (S.chaosActive && S.chaosModes.includes("vendor")) {
      await new Promise(function(r) { setTimeout(r, 600); });
      log("critical", "[System] FATAL: Vendor SDK segmentation fault. Core dumped.", S.tech === "marker" ? "Stage" : "Cloud");
      triggerFailPing(S.tech === "marker" ? "node-cleanup" : "ml-node-cleanup", "💥 CORE DUMPED");
      S.fatalError = "cleanup";
      stopAuto(); document.getElementById("btn-next").disabled = true;
      renderGraph(); renderInspector(); return;
    }
    
    S.packet.cleanup_applied = S.tech === "marker"
      ? ["marker_swap_fix (3)", "gap_fill (12)", "butterworth (6Hz)"]
      : ["temporal_smooth", "bone_stabilize", "contact_est", "conf_filter"];
    await new Promise(function(r) { setTimeout(r, 600); });
    log("info", (S.tech === "marker" ? "MarkerCleanup" : "MarkerlessCleanup") + ": " + S.packet.cleanup_applied[0], S.tech === "marker" ? "Stage" : "Cloud");
  } else if (stage === "retarget") {
    S.packet.target_skeleton = c.skeleton.template;
    S.packet.joints_remapped = true;
    S.packet.joints = "{ " + c.skeleton.required.length + " joints (target) }";
    await new Promise(function(r) { setTimeout(r, 500); });
    log("info", "HumanIKRetarget: → " + c.skeleton.template, "Cloud");
    if (c.plugin === "fc_custom") { 
      await new Promise(function(r) { setTimeout(r, 300); });
      S.hooksDone.push("custom_retarget"); 
      log("plugin", "Hook: fc_custom.custom_retarget()", "Cloud"); 
      triggerHookPing("node-retarget", "custom_retarget");
    }
  } else if (stage === "validate") {
    S.valIdx = -1; S.packet.validation_results = [];
    var checks = ["naming","skeleton","frames","root","integrity"];
    var allPassed = true;
    for (var i = 0; i < checks.length; i++) {
      await new Promise(function(r) { setTimeout(r, 300); });
      S.valIdx = i;
      var passed = (S.chaosActive && S.chaosModes.includes("config") && i >= 1) ? false : true;
      S.packet.validation_results.push({checker: checks[i], passed: passed});
      if (passed) {
        log("success", "Checker [" + checks[i] + "]: ✓ PASS", "Cloud");
      } else {
        log("error", "Checker [" + checks[i] + "]: ❌ FAIL (Config mismatch)", "Cloud");
        triggerFailPing("node-validate", "❌ Config Mismatch");
        allPassed = false;
      }
      renderGraph();
    }
    if (!allPassed) {
       S.fatalError = "validate";
       log("critical", "[System] Pipeline halted: Validation failed.", "Cloud");
       stopAuto(); document.getElementById("btn-next").disabled = true;
       renderGraph();
       return;
    }
    if (c.plugin === "metaverse_client") { 
      await new Promise(function(r) { setTimeout(r, 200); });
      S.hooksDone.push("custom_validate"); 
      log("plugin", "Hook: custom_validate() — OK", "Cloud"); 
      triggerHookPing("node-validate", "custom_validate");
    }
  } else if (stage === "export") {
    if (c.plugin === "metaverse_client") { 
      await new Promise(function(r) { setTimeout(r, 250); });
      S.hooksDone.push("pre_export"); 
      log("plugin", "Hook: pre_export() — LOD 5k tris", "Cloud"); 
      triggerHookPing("node-export", "pre_export");
    }
    S.packet.output_path = "/output/" + c.id + "/" + c.naming.example + "_v001." + c.export.format;
    S.packet.adapter_used = getExpAdapter(c);
    S.packet.output_format = c.export.format;
    await new Promise(function(r) { setTimeout(r, 450); });
    log("info", "Factory: " + getExpAdapter(c) + " → '" + c.export.format + "'", "Cloud");
    if (c.plugin === "metaverse_client") { 
      await new Promise(function(r) { setTimeout(r, 300); });
      S.hooksDone.push("post_export"); 
      log("plugin", "Hook: post_export() — turntable", "Cloud"); 
      triggerHookPing("node-export", "post_export");
    }
  } else if (stage === "deliver") {
    // Logic for Storage Failure injection
    if (!S.nasEnabled) {
      log("error", "[System] NASDelivery: connection timeout (SMB Error 0x80070035)", "Storage");
      for (var r = 1; r <= 3; r++) {
        S.retries = r;
        log("warn", "[System] Retrying NAS mount (attempt " + r + "/3)...", "Storage");
        renderGraph(); renderInspector();
        triggerFailPing("dest-" + c.delivery.method, "⚠️ Retry " + r + "/3");
        await new Promise(function(res) { setTimeout(res, 800); });
      }
      S.cbState = "OPEN"; 
      log("critical", "[System] Circuit Breaker: OPEN (Fail-Fast mode)", "System");
      S.queueCount = 1; 
      log("info", "[System] High-Availability: Queued take to local staging SSD.", "Stage");
      renderGraph(); renderInspector();
      stopAuto(); document.getElementById("btn-next").disabled = true;
      return;
    }

    S.packet.delivery_method = c.delivery.method;
    S.packet.delivery_destination = getDest(c) + c.naming.example + "." + c.export.format;
    S.packet.md5_hash = "e4d909c290d0fb1ca068ffaddf22cbd" + Math.floor(Math.random() * 9);
    S.packet.delivery_timestamp = new Date().toISOString();
    S.packet.notification_sent = c.delivery.slack;
    await new Promise(function(res) { setTimeout(res, 700); });
    log("success", getDelAdapter(c) + ": delivered (MD5 verified)", "Storage");
    await new Promise(function(res) { setTimeout(res, 200); });
    log("info", "Slack → " + c.delivery.slack, "System");
  }
  renderGraph(); renderInspector();
}

function toggleFailure() {
  S.nasEnabled = !S.nasEnabled;
  var btn = document.getElementById("btn-fail");
  if (S.nasEnabled) {
    btn.classList.remove("active-fail");
    btn.innerHTML = "💥 NAS Failure";
    log("info", "[System] NAS Storage restored. Circuit Breaker resetting...");
    // If cb was OPEN, switch to HALF_OPEN to test on next run
    if (S.cbState === "OPEN") S.cbState = "HALF_OPEN";
  } else {
    btn.classList.add("active-fail");
    btn.innerHTML = "🚨 NAS OFFLINE";
    log("critical", "[System] Simulated NAS Hardware Failure initiated!");
  }
}
