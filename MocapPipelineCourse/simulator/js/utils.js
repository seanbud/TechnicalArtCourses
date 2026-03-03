// ═══════════════════════════════════════════
// utils.js — Syntax highlighting & JSON tree
// ═══════════════════════════════════════════

function esc(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function highlightPy(code) {
  // Tokenizer approach: extract strings & comments as atomic tokens first,
  // then apply keyword highlighting only to remaining code fragments.
  // This prevents the double-wrapping bug with docstrings.
  var tokens = [];
  var src = code;
  var out = '';
  var i = 0;
  while (i < src.length) {
    // Triple-quoted strings (""" or ''')
    if (src.slice(i, i+3) === '"""' || src.slice(i, i+3) === "'''") {
      var q3 = src.slice(i, i+3);
      var end = src.indexOf(q3, i+3);
      if (end === -1) end = src.length - 3;
      var tok = src.slice(i, end+3);
      var ph = '\x00T' + tokens.length + '\x00';
      tokens.push('<span class="str">' + esc(tok) + '</span>');
      out += ph; i = end + 3;
    }
    // f-strings or regular strings
    else if ((src[i] === '"' || src[i] === "'") || (src[i] === 'f' && i+1 < src.length && (src[i+1] === '"' || src[i+1] === "'"))) {
      var si = (src[i] === 'f') ? i + 1 : i;
      var qc = src[si];
      var j = si + 1;
      while (j < src.length && src[j] !== qc && src[j] !== '\n') { if (src[j] === '\\') j++; j++; }
      if (j < src.length) j++; // include closing quote
      var tok = src.slice(i, j);
      var ph = '\x00T' + tokens.length + '\x00';
      tokens.push('<span class="str">' + esc(tok) + '</span>');
      out += ph; i = j;
    }
    // Comments
    else if (src[i] === '#') {
      var nl = src.indexOf('\n', i);
      if (nl === -1) nl = src.length;
      var tok = src.slice(i, nl);
      var ph = '\x00T' + tokens.length + '\x00';
      tokens.push('<span class="cmt">' + esc(tok) + '</span>');
      out += ph; i = nl;
    }
    else { out += src[i]; i++; }
  }
  // Escape only the remaining code (not the token placeholders)
  var h = esc(out);
  // Apply keyword and decorator highlighting to code-only segments
  h = h.replace(/(@\w+)/g, '<span class="dec">$1</span>');
  h = h.replace(/\b(class|def|import|from|return|if|else|elif|for|in|with|as|try|except|raise|True|False|None|and|or|not|is|pass|lambda)\b/g, '<span class="kw">$1</span>');
  h = h.replace(/\b(self)\b/g, '<span class="self">$1</span>');
  h = h.replace(/\b(\d+\.?\d*)\b/g, '<span class="num">$1</span>');
  // Restore tokens back into the highlighted code
  for (var t = 0; t < tokens.length; t++) {
    h = h.replace('\x00T' + t + '\x00', tokens[t]);
  }
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
