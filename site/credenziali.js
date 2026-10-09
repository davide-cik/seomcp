// Generatore della configurazione: costruisce il blocco per l'assistente scelto.
// Tutto avviene nel browser: nessun valore viene salvato o inviato.
(function () {
  var form = document.getElementById('cfg');
  var out = document.querySelector('#cfg-out code');
  var guide = document.querySelector('#cfg-guide a');
  if (!form || !out) return;
  var PKG = 'github:davide-cik/seomcp';
  var FIELDS = {
    sa: ['GOOGLE_APPLICATION_CREDENTIALS'],
    oauth: ['SEOMCP_GOOGLE_CLIENT_ID', 'SEOMCP_GOOGLE_CLIENT_SECRET'],
    google: ['SEOMCP_GSC_SITE', 'SEOMCP_GA_PROPERTY'],
    always: ['SEOMCP_GOOGLE_API_KEY', 'BING_WEBMASTER_API_KEY', 'SEOMCP_BING_SITE'],
  };

  function env() {
    var mode = form.elements.google.value;
    var names = (mode === 'none' ? [] : FIELDS[mode].concat(FIELDS.google)).concat(FIELDS.always);
    var list = [];
    names.forEach(function (n) {
      var v = form.elements[n].value.trim();
      if (v) list.push([n, v]);
    });
    return list;
  }

  function json(key, list, before, after) {
    var lines = ['{', '  "' + key + '": {', '    "seomcp": {'];
    (before || []).forEach(function (l) { lines.push('      ' + l + ','); });
    lines.push('      "command": "npx",');
    lines.push('      "args": ["-y", "' + PKG + '"]' + (list.length || after ? ',' : ''));
    if (list.length) {
      lines.push('      "env": {');
      list.forEach(function (e, i) {
        lines.push('        ' + JSON.stringify(e[0]) + ': ' + JSON.stringify(e[1]) + (i < list.length - 1 ? ',' : ''));
      });
      lines.push('      }' + (after ? ',' : ''));
    }
    if (after) lines.push('      ' + after);
    lines.push('    }', '  }', '}');
    return lines.join('\n');
  }

  function shell(v) {
    return /^[\w@%+=:,./-]+$/.test(v) ? v : "'" + v.replace(/'/g, "'\\''") + "'";
  }

  function toml(v) {
    return JSON.stringify(v);
  }

  var FORMATS = {
    'claude-code': function (l) {
      return ['claude mcp add seomcp -s user \\']
        .concat(l.map(function (e) { return '  -e ' + e[0] + '=' + shell(e[1]) + ' \\'; }))
        .concat(['  -- npx -y ' + PKG]).join('\n');
    },
    'claude-desktop': function (l) { return json('mcpServers', l); },
    'gemini-cli': function (l) { return json('mcpServers', l); },
    'vscode-copilot': function (l) { return json('servers', l, ['"type": "stdio"']); },
    'copilot-cli': function (l) { return json('mcpServers', l, ['"type": "local"'], '"tools": ["*"]'); },
    chatgpt: function (l) {
      var s = '[mcp_servers.seomcp]\ncommand = "npx"\nargs = ["-y", "' + PKG + '"]';
      if (l.length) s += '\n\n[mcp_servers.seomcp.env]\n' + l.map(function (e) { return e[0] + ' = ' + toml(e[1]); }).join('\n');
      return s;
    },
    'mistral-vibe': function (l) {
      var s = '[[mcp_servers]]\nname = "seomcp"\ntransport = "stdio"\ncommand = "npx"\nargs = ["-y", "' + PKG + '"]';
      if (l.length) s += '\nenv = { ' + l.map(function (e) { return toml(e[0]) + ' = ' + toml(e[1]); }).join(', ') + ' }';
      return s;
    },
  };

  function render() {
    var mode = form.elements.google.value;
    form.querySelectorAll('[data-when]').forEach(function (el) {
      var w = el.getAttribute('data-when');
      el.hidden = w === 'google' ? mode === 'none' : w !== mode;
    });
    var sel = form.elements.client;
    var fmt = FORMATS[sel.value];
    out.textContent = fmt ? fmt(env()) : '';
    var opt = sel.options[sel.selectedIndex];
    if (guide && opt) {
      guide.href = opt.getAttribute('data-guide');
      guide.textContent = 'guida per ' + opt.textContent;
    }
  }

  form.addEventListener('input', render);
  form.addEventListener('change', render);
  render();
})();
