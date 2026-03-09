// ═══════════════════════════════════════════
// ui.js — Rendering functions
// ═══════════════════════════════════════════

// ── File tree ──
var expandedDirs = new Set(["capture_pipeline", "capture_pipeline/pipeline","capture_pipeline/config","capture_pipeline/config/clients","capture_pipeline/adapters","capture_pipeline/plugins","capture_pipeline/scripts"]);

// Helper to find a node in TREE by its full path
function findNodeByPath(items, path) {
  var parts = path.split("/");
  var current = items;
  for (var i = 0; i < parts.length; i++) {
    var found = current.find(function(item) { return item.n === parts[i]; });
    if (!found) return null;
    if (i === parts.length - 1) return found;
    current = found.c || [];
  }
  return null;
}

// Recursive helper to get all directory paths under a node
function getAllDirPaths(node, currentPath, results) {
  if (node.t === "d" && node.c) {
    node.c.forEach(function(child) {
      if (child.t === "d") {
        var childPath = currentPath + "/" + child.n;
        results.push(childPath);
        getAllDirPaths(child, childPath, results);
      }
    });
  }
}

function renderTree() {
  document.getElementById("file-tree").innerHTML = buildTree(TREE, "");
}

function buildTree(items, prefix) {
  var html = "";
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var path = prefix ? prefix + "/" + item.n : item.n;
    var depth = path.split("/").length - 1;
    var pad = "padding-left:" + (12 + depth * 16) + "px";
    
    if (item.t === "d") {
      var open = expandedDirs.has(path);
      // Check if this directory has a README.md child for the (i) icon
      var hasReadme = item.c && item.c.some(child => child.n === "README.md");
      var infoIcon = hasReadme ? '<span class="dir-info" title="View Directory Architecture" onclick="event.stopPropagation();selectFile(\'' + path + '/README.md\')">ⓘ</span>' : "";
      
      html += '<div class="tree-item" style="' + pad + '" onclick="toggleDir(\'' + path + '\',event)">' +
        '<span class="tree-chevron">' + (open ? '▾' : '▸') + '</span><span>' + item.n + '/</span>' + infoIcon + '</div>';
      if (open && item.c) html += buildTree(item.c, path);
    } else {
      // Hide README.md from the file list
      if (item.n === "README.md") continue;
      
      var cls = S.selectedFile === path ? "selected" : "";
      if (S.activeFiles.some(f => path.endsWith(f))) cls += " active-file";
      
      html += '<div class="tree-item ' + cls + '" style="' + pad + '" onclick="selectFile(\'' + path + '\')">' +
        '<span class="tree-chevron hidden">·</span><span>' + item.n + '</span></div>';
    }
  }
  return html;
}

function toggleDir(p, e) {
  if (e) e.stopPropagation();
  var isExpanding = !expandedDirs.has(p);
  
  if (e && e.shiftKey) {
    var node = findNodeByPath(TREE, p);
    if (node) {
      if (isExpanding) {
        expandedDirs.add(p);
        var subDirs = [];
        getAllDirPaths(node, p, subDirs);
        subDirs.forEach(function(d) { expandedDirs.add(d); });
      } else {
        expandedDirs.delete(p);
        // Collapse all children: remove any path that starts with "p/"
        expandedDirs.forEach(function(d) {
          if (d.startsWith(p + "/")) expandedDirs.delete(d);
        });
      }
    }
  } else {
    isExpanding ? expandedDirs.add(p) : expandedDirs.delete(p);
  }
  renderTree();
}

function selectFile(p, focusTarget) {
  S.selectedFile = p;
  S.focusTarget = focusTarget || null;
  var app = document.querySelector(".app");
  if (p.includes("config/clients/")) {
    var id = p.split("/").pop().replace(".json","");
    if (id === "fc") id = "fc_sports";
    if (CL[id]) {
      S.client = id;
      document.getElementById("sel-client").value = id;
      S.inspectorTab = "config";
      setActiveTab("config");
      renderGraph();
    }
    app.style.setProperty("--inspector-w", "360px");
  } else if (p.includes("config/pipeline_settings.json")) {
    S.inspectorTab = "config";
    setActiveTab("config");
    app.style.setProperty("--inspector-w", "360px");
  } else if (p.endsWith(".py")) {
    S.inspectorTab = "data";
    setActiveTab("data");
    app.style.setProperty("--inspector-w", "600px");
  } else {
    S.inspectorTab = "data";
    setActiveTab("data");
    app.style.setProperty("--inspector-w", "360px");
  }
  renderTree();
  renderInspector();
}

// ── Pipeline graph (L→R layout) ──
function renderGraph() {
  var c = CL[S.client];
  var isMk = S.tech === "marker";
  var dm = c.delivery.method;
  var h = '';

  // ROW 1 — Marker path
  h += '<div style="grid-row:1;grid-column:1;position:relative;display:flex;align-items:center;justify-content:center" class="' + (isMk ? '' : 'dimmed') + '">' +
       '<div class="tech-label marker-label">⚡ MARKER</div>' +
       mkNode("ingest", "Ingest", "Vicon .c3d", isMk) + '</div>';
  h += '<div style="grid-row:1;grid-column:2" class="parrow ' + (S.step >= 1 && isMk ? 'active-arrow' : '') + ' ' + (isMk ? '' : 'dimmed') + '">→<span class="arrow-tip">Raw CaptureResult</span></div>';
  h += '<div style="grid-row:1;grid-column:3" class="' + (isMk ? '' : 'dimmed') + '">' + mkNode("cleanup", "Cleanup", "Swap Fix / Gap Fill", isMk, "", "last-cleanup") + '</div>';
  h += '<div style="grid-row:1;grid-column:4;align-self:center" class="parrow tight-arrow ' + (S.step >= 2 && isMk ? 'active-arrow' : '') + ' ' + (isMk ? '' : 'dimmed') + '">→</div>';

  // ROW 3 — Markerless path
  h += '<div style="grid-row:3;grid-column:1;position:relative;display:flex;align-items:center;justify-content:center" class="' + (isMk ? 'dimmed' : '') + '">' +
       '<div class="tech-label markerless-label">📷 MARKERLESS</div>' +
       mkNode("ingest", "Ingest", "Move.ai Video", !isMk, "ml-") + '</div>';
  h += '<div style="grid-row:3;grid-column:2" class="parrow ' + (S.step >= 1 && !isMk ? 'active-arrow' : '') + ' ' + (isMk ? 'dimmed' : '') + '">→<span class="arrow-tip">Raw CaptureResult</span></span></div>';
  h += '<div style="grid-row:3;grid-column:3" class="' + (isMk ? 'dimmed' : '') + '">' + mkNode("cleanup", "Cleanup", "ML Jitter Filter", !isMk, "ml-", "last-cleanup") + '</div>';
  h += '<div style="grid-row:3;grid-column:4;align-self:center" class="parrow tight-arrow ' + (S.step >= 2 && !isMk ? 'active-arrow' : '') + ' ' + (isMk ? 'dimmed' : '') + '">→</div>';

  // COLUMN 5 — Convergence (Spans 3 rows)
  h += '<div class="conv-cell" style="grid-row:1/4;grid-column:5">';
  h += '<div class="conv-line-v"></div>';
  h += '<div class="conv-v-group">';
  h +=   '<div class="conv-v-bar"></div>';
  h +=   '<div class="conv-label-v">Convergence Point</div>';
  h +=   '<div class="conv-v-bar"></div>';
  h += '</div>';
  h += '</div>';

  // ROW 2 — Universal stages
  h += '<div style="grid-row:2;grid-column:6;display:flex;align-items:center;gap:6px">';
  h += '<span class="parrow tight-arrow ' + (S.step >= 2 ? 'active-arrow' : '') + '">→<span class="arrow-tip">Remapped joints</span></span>';
  
  var retarget_hooks = [];
  if (c.plugin === "fc_custom") retarget_hooks.push("custom_retarget");
  h += mkNode("retarget", "Retarget", "HumanIK → " + c.skeleton.template, true, "", "first-conv", retarget_hooks);
  
  h += '<span class="parrow ' + (S.step >= 3 ? 'active-arrow' : '') + '">→<span class="arrow-tip">Validated data</span></span>';
  h += mkNodeValidate(c);
  h += '<span class="parrow ' + (S.step >= 4 ? 'active-arrow' : '') + '">→<span class="arrow-tip">' + c.export.format.toUpperCase() + ' file</span></span>';
  
  var export_hooks = [];
  if (c.plugin === "metaverse_client") export_hooks.push("pre_export", "post_export");
  h += mkNode("export", "Export", (c.export.format === "gltf" ? "GLTF" : "FBX") + " via " + getExpAdapter(c), true, "", "", export_hooks);
  
  h += '<span class="parrow ' + (S.step >= 5 ? 'active-arrow' : '') + '">→<span class="arrow-tip">' + getDelAdapter(c) + '</span></span>';
  h += '</div>';

  // COLUMN 7 — Delivery destinations
  h += '<div class="deliver-col" style="grid-row:1/4;grid-column:7">';
  h += '<div class="darrow-label">' + getDelAdapter(c) + '</div>';
  DELIVERIES.forEach(function(d) {
    var isActive = d.id === dm;
    var isNasOffline = (d.id === "nas" && !S.nasEnabled);
    var cls = isActive ? "active-dest" : "inactive-dest";
    if (isNasOffline && isActive) cls += " nas-offline";
    
    var dest = "";
    if (d.id === "perforce") dest = c.delivery.depot_path || "";
    else if (d.id === "nas") dest = c.delivery.nas_path || "";
    else if (d.id === "s3") dest = c.delivery.s3_bucket ? "s3://" + c.delivery.s3_bucket + "/" : "";
    else if (d.id === "sftp") dest = c.delivery.sftp_host || "";
    var extra = "";
    if (isActive && S.step === 5) {
      var cc = ({CLOSED:"cb-closed",OPEN:"cb-open",HALF_OPEN:"cb-half"})[S.cbState] || "cb-closed";
      extra = ' <span class="cb-dot ' + cc + '"></span>';
    }
    h += '<div class="dnode ' + cls + '"><div class="dname">' + d.icon + ' ' + d.label + extra + '</div><div class="ddest">' + (isActive ? dest : d.proto) + '</div></div>';
  });
  h += '</div>';

  document.getElementById("pgraph").innerHTML = '<div class="pgraph-content" id="pgraph-content">' + h + '</div>';
  renderFileLocation();
  scaleGraph();
}

function scaleGraph() {
  var container = document.getElementById("pgraph");
  var content = document.getElementById("pgraph-content");
  if (!container || !content) return;
  
  content.style.transform = "none";
  var cw = container.clientWidth;
  var ch = container.clientHeight;
  var iw = content.scrollWidth;
  var ih = content.scrollHeight;
  
  if (iw === 0 || ih === 0) return;
  
  var scaleX = (cw - 40) / iw;
  var scaleY = (ch - 40) / ih;
  var scale = Math.min(scaleX, scaleY);
  
  // Clamping minimum scale to prevent text illegibility
  if (scale < 0.2) scale = 0.2;
  
  content.style.transform = "scale(" + scale + ")";
}

// Add ResizeObserver to properly detect zooming and scaling of the container
var graphObserver = new ResizeObserver(function() {
  scaleGraph();
});
window.addEventListener("DOMContentLoaded", function() {
  var container = document.getElementById("pgraph");
  if (container) graphObserver.observe(container);
});

function mkNode(stage, name, sub, active, pfx, extraCls, hooks) {
  pfx = pfx || "";
  extraCls = extraCls || "";
  hooks = hooks || [];
  var idx = STAGES.indexOf(stage);
  var cls = (S.step === idx && active) ? "active" : (S.step > idx && active ? "completed" : "");
  if (extraCls) cls += " " + extraCls;
  var badge = (S.step > idx && active) ? '<span class="sbadge" style="display:flex">✓</span>' : "";
  var fail = (stage === "deliver" && S.cbState === "OPEN") ? " failed" : "";
  
  var hooksHtml = "";
  if (hooks.length > 0) {
    hooksHtml = '<div class="shooks">';
    hooks.forEach(function(h) {
      var d = S.hooksDone.includes(h) ? " done" : "";
      hooksHtml += '<div class="shook' + d + '">' + h + '()</div>';
    });
    hooksHtml += '</div>';
  }
  
  return '<div class="snode ' + cls + fail + '" id="' + pfx + 'node-' + stage + '" onclick="clickStage(\'' + stage + '\')">' +
    '<span class="sinfo" onclick="event.stopPropagation();openModal(\'info\',\'' + stage + '\')">ⓘ</span>' +
    '<div class="sname">' + name + '</div><div class="ssub">' + sub + '</div>' + hooksHtml + badge + '</div>';
}

function mkNodeValidate(c) {
  var idx = 3;
  var cls = S.step === idx ? "active" : (S.step > idx ? "completed" : "");
  var badge = S.step > idx ? '<span class="sbadge" style="display:flex">✓</span>' : "";
  var vcks = '<div class="vchecks">';
  ["N","S","F","R","I"].forEach(function(l, i) {
    var passed = S.step > idx || (S.step === idx && S.valIdx !== undefined && i <= S.valIdx);
    vcks += '<div class="vck' + (passed ? ' pass' : '') + '">' + (passed ? '✓' : l) + '</div>';
  });
  vcks += '</div>';
  
  var hooksHtml = "";
  if (c.plugin === "metaverse_client") {
    var h = "custom_validate";
    var d = S.hooksDone.includes(h) ? " done" : "";
    hooksHtml = '<div class="shooks"><div class="shook' + d + '">' + h + '()</div></div>';
  }
  
  return '<div class="snode ' + cls + '" id="node-validate" onclick="clickStage(\'validate\')">' +
    '<span class="sinfo" onclick="event.stopPropagation();openModal(\'info\',\'validate\')">ⓘ</span>' +
    '<div class="sname">Validate</div><div class="ssub">5 Checkers</div>' + vcks + hooksHtml + badge + '</div>';
}

function getExpAdapter(c) { return c.export.format === "gltf" ? "GLTFExportAdapter" : "FBXExportAdapter"; }
function getDelAdapter(c) { return ({perforce:"PerforceDelivery",nas:"NASDelivery",s3:"S3Delivery",sftp:"SFTPDelivery"})[c.delivery.method] || "?"; }
function getDest(c) { return c.delivery.depot_path || c.delivery.nas_path || (c.delivery.s3_bucket ? "s3://" + c.delivery.s3_bucket + "/" : "") || c.delivery.sftp_host || ""; }

// ── File location indicator ──
function renderFileLocation() {
  var el = document.getElementById("file-loc");
  if (S.step < 0 || !S.packet) { el.innerHTML = ""; return; }
  var stage = STAGES[S.step];
  var c = CL[S.client];
  var loc;
  if (stage === "ingest") loc = FILE_LOC.ingest[S.tech];
  else if (stage === "deliver") loc = FILE_LOC.deliver[c.delivery.method] || FILE_LOC.deliver.perforce;
  else loc = FILE_LOC[stage] ? FILE_LOC[stage].any : null;
  if (!loc) { el.innerHTML = ""; return; }
  var path = loc.path
    .replace("{TAKE}", c.naming.example)
    .replace("{CLIENT}", c.id)
    .replace("{FMT}", c.export.format)
    .replace("{BUCKET}", c.delivery.s3_bucket || "")
    .replace("{HOST}", c.delivery.sftp_host || "");
  el.innerHTML = '📁 <span style="color:var(--text-secondary)">' + path + '</span>  ·  <span class="storage storage-link" onclick="openModal(\'storage\', \'' + loc.storage_id + '\')">' + loc.storage + '</span>';
}

// ── Inspector ──
function switchTab(t, el) {
  S.inspectorTab = t;
  setActiveTab(t);
  renderInspector();
}

function setActiveTab(t) {
  document.querySelectorAll(".inspector-tab").forEach(function(e) {
    e.classList.toggle("active", e.dataset.tab === t);
  });
}

function renderInspector() {
  var body = document.getElementById("inspector-body");
  var c = CL[S.client];
  var t = S.inspectorTab;
  if (t === "data") {
    if (S.selectedFile && S.selectedFile.includes("config/pipeline_settings.json")) {
      var config = {
        active_client: S.client,
        technology: S.tech,
        strategies: {
          ingest: S.tech === "marker" ? "MarkerIngest" : "MarkerlessIngest",
          cleanup: S.tech === "marker" ? "MarkerCleanup" : "MarkerlessCleanup"
        },
        plugin: CL[S.client].plugin || "none",
        delivery: CL[S.client].delivery.method
      };
      body.innerHTML = '<div class="inspector-label">File: config/pipeline_settings.json (Live)</div>' +
                       '<div class="jtree">' + buildJsonTree(config) + '</div>';
    } else if (S.selectedFile && FC[S.selectedFile]) {
      var raw = FC[S.selectedFile];
      if (S.selectedFile.endsWith(".json")) {
        var obj = null;
        try { obj = JSON.parse(raw); } catch(e){}
        if (obj) body.innerHTML = '<div class="inspector-label">File: ' + S.selectedFile + '</div><div class="jtree">' + buildJsonTree(obj) + '</div>';
        else body.innerHTML = '<div class="inspector-label">File: ' + S.selectedFile + '</div>' + highlightPy(raw);
      } else if (S.selectedFile.endsWith(".md")) {
        // Basic markdown parser for READMEs
        var mdHTML = raw
          .replace(/^### (.*$)/gim, '<h3>$1</h3>')
          .replace(/^## (.*$)/gim, '<h2>$1</h2>')
          .replace(/^# (.*$)/gim, '<h1>$1</h1>')
          .replace(/\*\*(.*?)\*\*/gim, '<b>$1</b>')
          .replace(/\*(.*?)\*/gim, '<i>$1</i>')
          .replace(/^\* (.*$)/gim, '<ul><li>$1</li></ul>')
          .replace(/<\/ul>\n<ul>/gim, '')
          .replace(/`(.*?)`/gim, '<code class="md-code">$1</code>')
          .replace(/\n\n/g, '</p><p>');
        
        body.innerHTML = '<div class="inspector-label">File: ' + S.selectedFile + '</div><div class="md-view" style="padding:10px"><p>' + mdHTML + '</p></div>';
      } else {
        body.innerHTML = '<div class="inspector-label">File: ' + S.selectedFile + '</div>' + highlightPy(raw, S.focusTarget);
      }
    } else if (S.packet) {
      body.innerHTML = '<div class="inspector-label">CaptureResult — after ' + (STAGES[S.step] || 'idle') + '</div><div class="jtree">' + buildJsonTree(S.packet, 0, S.prevPacket || undefined) + '</div>';
    } else {
      body.innerHTML = '<div class="inspector-label">CaptureResult</div><pre>Click "▶ Start" to begin</pre>';
    }
  } else if (t === "config") {
    body.innerHTML = '<div class="inspector-label">' + c.display + ' — Config</div><div class="jtree">' + buildJsonTree(c) + '</div>';
  } else if (t === "adapter") {
    var exp = getExpAdapter(c), del = getDelAdapter(c);
    var cb = "";
    if (S.step === 5) {
      var cc = ({CLOSED:"cb-closed",OPEN:"cb-open",HALF_OPEN:"cb-half"})[S.cbState];
      cb = '<p>Circuit Breaker: <span class="cb-dot ' + cc + '" style="display:inline-block"></span> ' + S.cbState + '</p><p>Retries: ' + S.retries + ' | Queued: ' + S.queueCount + '</p>';
    }
    var expFile = c.export.format === "gltf" ? "capture_pipeline/adapters/gltf_export.py" : "capture_pipeline/adapters/fbx_export.py";
    var delFile = "capture_pipeline/adapters/" + ({perforce:"p4",nas:"nas",s3:"s3",sftp:"sftp"})[c.delivery.method] + "_delivery.py";
    
    body.innerHTML = '<div class="inspector-label">Active Adapters</div>' +
      '<div class="adapter-card" style="cursor:pointer" onclick="selectFile(\'' + expFile + '\', \'class ' + getExpAdapter(c) + '\')" title="Click to view code">' +
      '<h4>Export: ' + exp + '</h4><p>Pattern: Adapter + Factory</p><p>Format: ' + c.export.format.toUpperCase() + ' ' + (c.export.fbx_version || '') + '</p></div>' +
      '<div class="adapter-card" style="cursor:pointer" onclick="selectFile(\'' + delFile + '\', \'class ' + getDelAdapter(c) + '\')" title="Click to view code">' +
      '<h4>Delivery: ' + del + '</h4><p>Dest: ' + getDest(c) + '</p><p>Slack: ' + c.delivery.slack + '</p>' + cb + '</div>';
  } else if (t === "hooks") {
    if (!c.plugin) {
      body.innerHTML = '<div class="inspector-label">Plugin Hooks</div><p style="color:var(--text-muted);font-size:.85rem">No plugin for ' + c.id + '</p>';
      return;
    }
    var hooks = c.plugin === "fc_custom" ? ["register","custom_retarget"] : ["register","pre_export","post_export","custom_validate"];
    var html = '<div class="inspector-label">Plugin: ' + c.plugin + '.py</div>';
    hooks.forEach(function(k) {
      var done = S.hooksDone.includes(k);
      var pPath = "capture_pipeline/plugins/" + c.plugin + ".py";
      html += '<div class="hook-item" style="cursor:pointer" onclick="selectFile(\'' + pPath + '\', \'def ' + k + '\')" title="Click to view code">' +
        '<span class="' + (done ? 'hook-done' : 'hook-pending') + '">' + (done ? '✓' : '○') + '</span> ' + k + '()</div>';
    });
    body.innerHTML = html;
  } else if (t === "logs") {
    var f = S.logs;
    
    var selHtml = '<select class="log-view-sel" onchange="S.logView=this.value;renderInspector()">' +
                    '<option value="sequential" ' + (S.logView==='sequential'?'selected':'') + '>Sequential</option>' +
                    '<option value="categorized" ' + (S.logView==='categorized'?'selected':'') + '>Categorized</option>' +
                  '</select>';

    var header = '<div class="inspector-label" style="display:flex;justify-content:space-between;align-items:center">' +
                 '<span>Logs</span>' +
                 '<div>' + selHtml + '<button class="btn-clear" onclick="clearLogs()" title="Clear all logs">Clear</button></div></div>';
    
    var logsHtml = "";
    if (S.logView === "categorized") {
      var buckets = {};
      f.forEach(function(l) {
        var loc = l.nodeLoc || "System";
        if (!buckets[loc]) buckets[loc] = [];
        buckets[loc].push(l);
      });
      // Sort keys alphabetically
      var locs = Object.keys(buckets).sort();
      locs.forEach(function(loc) {
        logsHtml += '<div style="margin: 8px 0 4px 0"><span class="l-badge lb-' + loc.toLowerCase() + '">' + loc + '</span></div>';
        logsHtml += buckets[loc].map(function(l) {
          return '<div class="log-entry ' + l.level + '" style="padding-left:10px;border-left:1px solid var(--border)"><span class="ts">' + l.time + '</span> <span class="msg">' + l.msg + '</span></div>';
        }).join("");
      });
    } else {
      logsHtml = f.map(function(l) { 
        var b = l.nodeLoc ? '<span class="l-badge lb-' + l.nodeLoc.toLowerCase() + '">' + l.nodeLoc + '</span>' : '';
        return '<div class="log-entry ' + l.level + '"><span class="ts">' + l.time + '</span> ' + b + '<span class="msg">' + l.msg + '</span></div>'; 
      }).join("");
    }
    
    body.innerHTML = header + logsHtml;
  }
  
  if (S.focusTarget) {
    setTimeout(function() {
      var el = document.getElementById("focus-target");
      if (el) el.scrollIntoView({behavior: "smooth", block: "center"});
    }, 50);
  }
}

function clearLogs() {
  S.logs = [];
  document.getElementById("console-log").innerHTML = "";
  renderInspector();
}

// ── Console ──
function log(level, msg, nodeLoc, stage) {
  var now = new Date();
  var time = '[' + String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0') + ':' + String(now.getSeconds()).padStart(2,'0') + ']';
  S.logs.push({time:time, level:level, msg:msg, nodeLoc:nodeLoc, stage:stage || STAGES[S.step] || null});
  
  // Real-time update for both panels
  var el = document.getElementById("console-log");
  if (el) {
    var b = nodeLoc ? '<span class="l-badge lb-' + nodeLoc.toLowerCase() + '">' + nodeLoc + '</span>' : '';
    el.innerHTML += '<div class="log-entry ' + level + '"><span class="ts">' + time + '</span> ' + b + '<span class="msg">' + msg + '</span></div>';
    el.scrollTop = el.scrollHeight;
  }
  
  // Force a render tick if we are looking at logs during simulation looping
  if (S.inspectorTab === "logs") {
     renderInspector();
  }
}

function triggerHookPing(nodeId, hookName) {
  var node = document.getElementById(nodeId);
  if (!node) return;
  var rect = node.getBoundingClientRect();
  var ping = document.createElement("div");
  ping.className = "hook-ping";
  ping.textContent = "⚙️ " + hookName;
  document.body.appendChild(ping);
  
  // Center above the node
  var x = rect.left + rect.width / 2;
  var y = rect.top;
  ping.style.left = (x - ping.offsetWidth / 2) + "px";
  ping.style.top = y + "px";
  
  setTimeout(function() { ping.remove(); }, 1200);
}
