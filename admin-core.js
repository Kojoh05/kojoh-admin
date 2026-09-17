/* ============================================================
   KOJOH Admin, shared core
   Auth gate, shell, helpers, and the chart primitives.
   ============================================================ */
(function(){
  'use strict';

  // ------------------------------------------------------------ theme
  try {
    var stored = localStorage.getItem('kojoh-admin-theme');
    var sysDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', stored || (sysDark ? 'dark' : 'light'));
  } catch (e) {}

  var KA = window.KA = {};

  KA.toggleTheme = function(){
    var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('kojoh-admin-theme', next); } catch (e) {}
  };

  // ------------------------------------------------------------ helpers
  KA.esc = function(s){
    return String(s === null || s === undefined ? '' : s)
      .replace(/[<>&"']/g, function(c){
        return {'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c];
      });
  };
  KA.nf = function(n){ return Number(n || 0).toLocaleString('en-IN'); };
  KA.inr = function(n){ return '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 }); };
  KA.compact = function(n){
    n = Number(n || 0);
    if (n >= 10000000) return (n / 10000000).toFixed(1).replace(/\.0$/, '') + ' Cr';
    if (n >= 100000)   return (n / 100000).toFixed(1).replace(/\.0$/, '') + ' L';
    if (n >= 1000)     return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return KA.nf(n);
  };
  KA.date = function(v){
    if (!v) return '';
    var d = new Date(v);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };
  KA.dayShort = function(v){
    var d = new Date(v);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };
  KA.slugify = function(s){
    return String(s || '').toLowerCase().trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  KA.toast = function(msg, bad){
    var wrap = document.querySelector('.ka-toasts');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'ka-toasts';
      document.body.appendChild(wrap);
    }
    var t = document.createElement('div');
    t.className = 'ka-toast' + (bad ? ' ka-toast-bad' : '');
    t.textContent = msg;
    wrap.appendChild(t);
    setTimeout(function(){ t.remove(); }, bad ? 5200 : 2800);
  };

  KA.confirm = function(message){ return window.confirm(message); };

  // ------------------------------------------------------------ nav
  var NAV = [
    { key:'dashboard', href:'index.html',   label:'Dashboard',
      icon:'<path d="M3 13h6V3H3zM13 21h6V11h-6zM13 7h6V3h-6zM3 21h6v-4H3z"/>' },
    { key:'content',   href:'content.html', label:'Folders and datasets',
      icon:'<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>' },
    { key:'inbox',     href:'inbox.html',   label:'Inbox and signals',
      icon:'<path d="M4 4h16v12H7l-3 3z"/>' }
  ];

  function shellHtml(active, profile){
    var links = NAV.map(function(n){
      return '<a href="' + n.href + '"' + (n.key === active ? ' class="on"' : '') + '>'
        + '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
        + 'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + n.icon + '</svg>'
        + '<span>' + n.label + '</span></a>';
    }).join('');

    return '<div class="ka-shell">'
      + '<aside class="ka-side">'
      +   '<div class="ka-brand"><div class="ka-brand-mark">KOJOH</div>'
      +     '<div class="ka-brand-sub">Admin portal</div></div>'
      +   '<nav class="ka-nav">' + links
      +     '<a href="#" id="kaTheme"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" '
      +     'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
      +     '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/>'
      +     '</svg><span>Switch theme</span></a>'
      +     '<a href="#" id="kaChangePw"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" '
      +     'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
      +     '<rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>'
      +     '</svg><span>Change password</span></a>'
      +     '<a href="#" id="kaSignOut"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" '
      +     'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
      +     '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>'
      +     '</svg><span>Sign out</span></a>'
      +   '</nav>'
      +   '<div class="ka-side-foot"><strong>' + KA.esc(profile.username || 'Admin') + '</strong>'
      +     KA.esc(profile.email || '') + '</div>'
      + '</aside>'
      + '<main class="ka-main" id="kaMain"></main>'
      + '<div class="ka-drawer" id="kaPwDrawer" hidden><div class="ka-drawer-panel" id="kaPwPanel"></div></div>'
      + '</div>';
  }

  // ------------------------------------------------------------ change password
  function pwDrawerHtml(){
    return '<div class="ka-drawer-head"><h2>Change password</h2>'
      + '<button class="ka-btn ka-btn-sm" id="kaPwClose">Close</button></div>'
      + '<form id="kaPwForm">'
      + '<div class="ka-field"><label class="ka-label" for="kaPwCurrent">Current password</label>'
      + '<input class="ka-input" type="password" id="kaPwCurrent" autocomplete="current-password" required></div>'
      + '<div class="ka-field"><label class="ka-label" for="kaPwNew">New password</label>'
      + '<input class="ka-input" type="password" id="kaPwNew" autocomplete="new-password" minlength="8" required></div>'
      + '<div class="ka-field"><label class="ka-label" for="kaPwConfirm">Confirm new password</label>'
      + '<input class="ka-input" type="password" id="kaPwConfirm" autocomplete="new-password" minlength="8" required></div>'
      + '<button class="ka-btn ka-btn-primary" type="submit" id="kaPwSubmit" style="width:100%;">Update password</button>'
      + '<p class="ka-gate-err" id="kaPwErr"></p>'
      + '</form>';
  }

  function wireChangePassword(supa, session){
    var link = document.getElementById('kaChangePw');
    if (!link) return;
    link.addEventListener('click', function(e){
      e.preventDefault();
      if (!session) {
        KA.toast('Sign in with a real account first, the login gate is currently off.', true);
        return;
      }
      var drawer = document.getElementById('kaPwDrawer');
      var panel = document.getElementById('kaPwPanel');
      panel.innerHTML = pwDrawerHtml();
      drawer.hidden = false;

      document.getElementById('kaPwClose').addEventListener('click', function(){ drawer.hidden = true; });
      drawer.addEventListener('click', function(ev){ if (ev.target === drawer) drawer.hidden = true; });

      document.getElementById('kaPwForm').addEventListener('submit', function(ev){
        ev.preventDefault();
        var cur = document.getElementById('kaPwCurrent').value;
        var next = document.getElementById('kaPwNew').value;
        var confirm = document.getElementById('kaPwConfirm').value;
        var err = document.getElementById('kaPwErr');
        var btn = document.getElementById('kaPwSubmit');
        err.textContent = '';

        if (next !== confirm) { err.textContent = 'New password and confirmation do not match.'; return; }
        if (next.length < 8) { err.textContent = 'New password needs to be at least 8 characters.'; return; }

        btn.disabled = true; btn.textContent = 'Checking current password';

        // Supabase has no direct "verify password" call, so re-authenticating
        // with the current password is how we confirm it before changing it.
        supa.auth.signInWithPassword({ email: session.user.email, password: cur }).then(function(r){
          if (r.error) {
            btn.disabled = false; btn.textContent = 'Update password';
            err.textContent = 'Current password is incorrect.';
            return;
          }
          btn.textContent = 'Updating';
          supa.auth.updateUser({ password: next }).then(function(u){
            btn.disabled = false; btn.textContent = 'Update password';
            if (u.error) { err.textContent = u.error.message; return; }
            drawer.hidden = true;
            KA.toast('Password updated.');
          });
        });
      });
    });
  }

  // ------------------------------------------------------------ gate
  function gateHtml(state, msg){
    if (state === 'login') {
      return '<div class="ka-gate"><div class="ka-gate-card">'
        + '<h1>KOJOH Admin</h1><p>Sign in with the account that owns this site.</p>'
        + '<form id="kaLoginForm">'
        + '<div class="ka-field"><label class="ka-label" for="kaEmail">Email</label>'
        + '<input class="ka-input" type="email" id="kaEmail" autocomplete="username" required></div>'
        + '<div class="ka-field"><label class="ka-label" for="kaPass">Password</label>'
        + '<input class="ka-input" type="password" id="kaPass" autocomplete="current-password" required></div>'
        + '<button class="ka-btn ka-btn-primary" type="submit" id="kaLoginBtn" '
        + 'style="width:100%;">Sign in</button>'
        + '<p class="ka-gate-err" id="kaLoginErr"></p>'
        + '</form></div></div>';
    }
    return '<div class="ka-gate"><div class="ka-gate-card">'
      + '<h1>No access</h1><p>' + KA.esc(msg || 'This account is not an admin.') + '</p>'
      + '<button class="ka-btn" id="kaSignOut2" style="width:100%;">Sign out</button>'
      + '</div></div>';
  }

  KA.SKIP_LOGIN = false;

  KA.boot = function(pageKey, onReady){
    if (!(window.SUPABASE_URL && window.SUPABASE_ANON_KEY && window.supabase)) {
      document.body.innerHTML = gateHtml('denied', 'Supabase is not configured. Fill in supabase-config.js.');
      return;
    }
    var supa = KA.supa = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

    if (KA.SKIP_LOGIN) {
      var previewProfile = { username: 'Preview', email: 'Login gate is off', is_admin: true };
      document.body.innerHTML = shellHtml(pageKey, previewProfile);
      document.getElementById('kaTheme').addEventListener('click', function(e){
        e.preventDefault(); KA.toggleTheme();
      });
      var so = document.getElementById('kaSignOut');
      if (so) so.style.display = 'none';
      wireChangePassword(supa, null);
      onReady({ session: null, profile: previewProfile, main: document.getElementById('kaMain') });
      return;
    }

    supa.auth.getSession().then(function(res){
      var session = res.data && res.data.session;
      if (!session) { showLogin(); return; }
      checkAdmin(session);
    });

    function showLogin(){
      document.body.innerHTML = gateHtml('login');
      var form = document.getElementById('kaLoginForm');
      form.addEventListener('submit', function(e){
        e.preventDefault();
        var btn = document.getElementById('kaLoginBtn');
        var err = document.getElementById('kaLoginErr');
        err.textContent = '';
        btn.disabled = true; btn.textContent = 'Signing in';
        supa.auth.signInWithPassword({
          email: document.getElementById('kaEmail').value.trim(),
          password: document.getElementById('kaPass').value
        }).then(function(r){
          if (r.error) {
            btn.disabled = false; btn.textContent = 'Sign in';
            err.textContent = r.error.message;
            return;
          }
          checkAdmin(r.data.session);
        });
      });
    }

    function checkAdmin(session){
      supa.from('profiles').select('id, username, email, is_admin')
        .eq('id', session.user.id).maybeSingle()
        .then(function(r){
          if (r.error) {
            document.body.innerHTML = gateHtml('denied', r.error.message);
            wireSignOut();
            return;
          }
          if (!r.data || !r.data.is_admin) {
            document.body.innerHTML = gateHtml('denied',
              'This account is signed in but does not have admin rights.');
            wireSignOut();
            return;
          }
          document.body.innerHTML = shellHtml(pageKey, r.data);
          wireSignOut();
          document.getElementById('kaTheme').addEventListener('click', function(e){
            e.preventDefault(); KA.toggleTheme();
          });
          wireChangePassword(supa, session);
          onReady({ session: session, profile: r.data, main: document.getElementById('kaMain') });
        });
    }

    function wireSignOut(){
      ['kaSignOut', 'kaSignOut2'].forEach(function(id){
        var el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('click', function(e){
          e.preventDefault();
          supa.auth.signOut().then(function(){ window.location.reload(); });
        });
      });
    }
  };

  // ------------------------------------------------------------ charts
  // Single series, one ink colour, magnitude by length. No legend by design.

  function barPath(x, y, w, h, r){
    r = Math.max(0, Math.min(r, w / 2, h));
    return 'M' + x + ',' + (y + h)
      + ' L' + x + ',' + (y + r)
      + ' Q' + x + ',' + y + ' ' + (x + r) + ',' + y
      + ' L' + (x + w - r) + ',' + y
      + ' Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + r)
      + ' L' + (x + w) + ',' + (y + h) + ' Z';
  }

  function niceTicks(max){
    if (max <= 0) return [0, 1];
    var raw = max / 3;
    var mag = Math.pow(10, Math.floor(Math.log10(raw)));
    var step = [1, 2, 2.5, 5, 10].map(function(m){ return m * mag; })
      .filter(function(s){ return s >= raw; })[0] || mag * 10;
    var ticks = [];
    for (var v = 0; v <= max + step * 0.001; v += step) ticks.push(v);
    if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step);
    return ticks;
  }

  /**
   * Column chart, one series.
   * rows: [{ label, value, sub }]
   */
  KA.columnChart = function(host, rows, opts){
    opts = opts || {};
    var fmt = opts.format || KA.nf;
    host.innerHTML = '';

    if (!rows || !rows.length || rows.every(function(r){ return !r.value; })) {
      host.innerHTML = '<div class="ka-chart-empty">' +
        KA.esc(opts.empty || 'Nothing recorded in this window yet.') + '</div>';
      return;
    }

    var W = 720, PLOT_H = 150, PAD_L = 42, PAD_R = 10, PAD_T = 14, AXIS_H = 20;
    var H = PAD_T + PLOT_H + AXIS_H;              // container includes the axis band
    var innerW = W - PAD_L - PAD_R;
    var max = Math.max.apply(null, rows.map(function(r){ return Number(r.value) || 0; }));
    var ticks = niceTicks(max);
    var top = ticks[ticks.length - 1] || 1;
    var band = innerW / rows.length;
    var bw = Math.min(24, Math.max(3, band - 4));  // never fill the slot
    var peak = rows.reduce(function(a, b){ return (Number(b.value) || 0) > (Number(a.value) || 0) ? b : a; }, rows[0]);

    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" role="img" aria-label="'
          + KA.esc(opts.aria || 'Column chart') + '">';

    ticks.forEach(function(t){
      var y = PAD_T + PLOT_H - (t / top) * PLOT_H;
      s += '<line class="ka-grid-line" x1="' + PAD_L + '" y1="' + y.toFixed(1)
        + '" x2="' + (W - PAD_R) + '" y2="' + y.toFixed(1) + '"/>';
      s += '<text class="ka-axis-text" x="' + (PAD_L - 7) + '" y="' + (y + 3.5).toFixed(1)
        + '" text-anchor="end">' + KA.esc(fmt(t)) + '</text>';
    });

    rows.forEach(function(r, i){
      var v = Number(r.value) || 0;
      var h = top > 0 ? (v / top) * PLOT_H : 0;
      var x = PAD_L + i * band + (band - bw) / 2;
      var y = PAD_T + PLOT_H - h;
      if (h > 0) s += '<path class="ka-bar" d="' + barPath(x, y, bw, h, 4) + '"/>';
      s += '<rect class="ka-bar-hit" x="' + (PAD_L + i * band).toFixed(1) + '" y="' + PAD_T
        + '" width="' + band.toFixed(1) + '" height="' + PLOT_H
        + '" data-i="' + i + '"/>';
    });

    // one direct label, on the peak only
    var pi = rows.indexOf(peak);
    if (pi >= 0 && Number(peak.value) > 0) {
      var ph = (Number(peak.value) / top) * PLOT_H;
      var px = PAD_L + pi * band + band / 2;
      var py = PAD_T + PLOT_H - ph - 5;
      s += '<text class="ka-mark-label" x="' + px.toFixed(1) + '" y="' + py.toFixed(1)
        + '" text-anchor="middle">' + KA.esc(fmt(peak.value)) + '</text>';
    }

    // sparse x labels: first, middle, last
    [0, Math.floor(rows.length / 2), rows.length - 1]
      .filter(function(v, i, a){ return a.indexOf(v) === i && rows[v]; })
      .forEach(function(i){
        var x = PAD_L + i * band + band / 2;
        var anchor = i === 0 ? 'start' : (i === rows.length - 1 ? 'end' : 'middle');
        var xa = i === 0 ? PAD_L : (i === rows.length - 1 ? W - PAD_R : x);
        s += '<text class="ka-axis-text" x="' + xa.toFixed(1) + '" y="' + (H - 6)
          + '" text-anchor="' + anchor + '">' + KA.esc(rows[i].label) + '</text>';
      });

    s += '</svg><div class="ka-tip" id="tip_' + (opts.id || 'c') + '"></div>';

    // table twin, so no value is tooltip-gated
    s += '<details class="ka-tableview"><summary></summary><table><thead><tr><th>'
      + KA.esc(opts.xTitle || 'Day') + '</th><th>' + KA.esc(opts.yTitle || 'Value')
      + '</th></tr></thead><tbody>'
      + rows.map(function(r){
          return '<tr><td>' + KA.esc(r.label) + '</td><td>' + KA.esc(fmt(r.value)) + '</td></tr>';
        }).join('')
      + '</tbody></table></details>';

    host.innerHTML = s;

    var tip = host.querySelector('.ka-tip');
    var svg = host.querySelector('svg');
    svg.addEventListener('mousemove', function(e){
      var hit = e.target.closest('.ka-bar-hit');
      if (!hit) { tip.classList.remove('on'); return; }
      var r = rows[Number(hit.getAttribute('data-i'))];
      var box = host.getBoundingClientRect();
      tip.innerHTML = KA.esc(r.label) + ': <strong>' + KA.esc(fmt(r.value)) + '</strong>'
        + (r.sub ? ' &#183; ' + KA.esc(r.sub) : '');
      tip.style.left = (e.clientX - box.left) + 'px';
      tip.style.top = (e.clientY - box.top) + 'px';
      tip.classList.add('on');
    });
    svg.addEventListener('mouseleave', function(){ tip.classList.remove('on'); });
  };

  /**
   * Ranked horizontal list. Values are always visible as text.
   * rows: [{ name, value, sub }]
   */
  KA.rankList = function(host, rows, opts){
    opts = opts || {};
    var fmt = opts.format || KA.nf;
    if (!rows || !rows.length) {
      host.innerHTML = '<div class="ka-rank-empty">' +
        KA.esc(opts.empty || 'No data yet.') + '</div>';
      return;
    }
    var max = Math.max.apply(null, rows.map(function(r){ return Number(r.value) || 0; })) || 1;
    host.innerHTML = '<div class="ka-rank">' + rows.map(function(r){
      var pct = Math.max(2, (Number(r.value) || 0) / max * 100);
      return '<div class="ka-rank-row">'
        + '<span class="ka-rank-name" title="' + KA.esc(r.name) + '">' + KA.esc(r.name) + '</span>'
        + '<span class="ka-rank-val">' + KA.esc(fmt(r.value)) + '</span>'
        + '<span class="ka-rank-track"><span class="ka-rank-fill" style="width:' + pct.toFixed(1) + '%"></span></span>'
        + '</div>';
    }).join('') + '</div>';
  };

})();
