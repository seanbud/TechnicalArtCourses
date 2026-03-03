// ═══════════════════════════════════════════
// utils.js — Syntax highlighting & JSON tree
// ═══════════════════════════════════════════

function esc(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function highlightPy(code) {
  let h = esc(code);
  h = h.replace(/(#.*)$/gm, '<span class="cmt">$1</span>');
  h = h.replace(/("""[\s\S]*?"""|\'\'\'[\s\S]*?\'\'\')/g, '<span class="str">$1</span>');
  h = h.replace(/(@\w+)/g, '<span class="dec">$1</span>');
  h = h.replace(/(f?"[^"]*"|f?'[^']*')/g, '<span class="str">$1</span>');
  h = h.replace(/\b(class|def|import|from|return|if|else|elif|for|in|with|as|try|except|raise|True|False|None|and|or|not|is|pass|lambda)\b/g, '<span class="kw">$1</span>');
  h = h.replace(/\b(self)\b/g, '<span class="self">$1</span>');
  h = h.replace(/\b(\d+\.?\d*)\b/g, '<span class="num">$1</span>');
  return '<pre class="py">' + h + '</pre>';
}

function buildJsonTree(obj, depth) {
  depth = depth || 0;
  if (obj === null) return '<span class="jnull">null</span>';
  if (typeof obj === 'boolean') return '<span class="jbool">' + obj + '</span>';
  if (typeof obj === 'number') return '<span class="jnum">' + obj + '</span>';
  if (typeof obj === 'string') return '<span class="jstr">"' + esc(obj) + '"</span>';
  var isArr = Array.isArray(obj);
  var entries = isArr ? obj.map(function(v,i){return [i,v];}) : Object.entries(obj);
  var len = entries.length;
  var bO = isArr ? '[' : '{', bC = isArr ? ']' : '}';
  var id = 'jt_' + Math.random().toString(36).slice(2, 8);
  var expanded = depth < 1;
  var html = '<span class="jbrace">' + bO + '</span>';
  html += '<span class="jtoggle" onclick="toggleJson(\'' + id + '\', event)">' + (expanded ? '▾' : '▸') + '</span>';
  html += '<span class="jpreview" id="' + id + '_p" style="display:' + (expanded ? 'none' : 'inline') + '"> ' + len + ' ' + (isArr ? 'items' : 'keys') + ' ' + bC + '</span>';
  html += '<div id="' + id + '" class="' + (expanded ? '' : 'jcollapsed') + '" style="margin-left:' + (depth < 4 ? 16 : 0) + 'px">';
  entries.forEach(function(pair, i) {
    if (!isArr) html += '<span class="jkey">"' + esc(String(pair[0])) + '"</span>: ';
    html += buildJsonTree(pair[1], depth + 1);
    if (i < len - 1) html += ',';
    html += '<br>';
  });
  html += '</div><span class="jbrace" id="' + id + '_c" style="display:' + (expanded ? 'inline' : 'none') + '">' + bC + '</span>';
  return html;
}

function toggleJson(id, e) {
  var el = document.getElementById(id);
  var p = document.getElementById(id + '_p');
  var c = document.getElementById(id + '_c');
  var t = el.previousElementSibling;
  var show = el.classList.contains('jcollapsed');

  function update(nodeId, expand) {
    var b = document.getElementById(nodeId);
    var bp = document.getElementById(nodeId + '_p');
    var bc = document.getElementById(nodeId + '_c');
    var bt = b.previousElementSibling;
    if (expand) {
      b.classList.remove('jcollapsed');
      bp.style.display = 'none';
      bc.style.display = 'inline';
      bt.textContent = '▾';
    } else {
      b.classList.add('jcollapsed');
      bp.style.display = 'inline';
      bc.style.display = 'none';
      bt.textContent = '▸';
    }
  }

  update(id, show);

  if (e && e.shiftKey) {
    var children = el.querySelectorAll('.jtoggle');
    children.forEach(function(child) {
      var childId = child.getAttribute('onclick').match(/'([^']+)'/)[1];
      update(childId, show);
    });
  }
}
