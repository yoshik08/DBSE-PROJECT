#!/usr/bin/env python3
"""Build frontend/admin/index.html (admin-only app) from frontend/index.html.

The admin app contains: full CSS, admin topbar, MFA-code-only login,
the #adminPortal section, form/confirm/mfa modals, and the admin JS
(extracted by section markers). No user-site HTML or JS ships in it.

Usage: python3 build_admin.py   (run from repo root)
Deploy: create a second Vercel project with root directory = frontend/admin
"""
import os, re

SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'frontend', 'src', 'full.html')
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'frontend', 'admin', 'index.html')

src = open(SRC, encoding='utf-8').read()

# ---------- head (meta + all css) ----------
head = src[:src.index('</head>') + len('</head>')]
head = head.replace('<title>SportSphere', '<title>SportSphere Admin')
# admin needs no google/razorpay/qr scripts
head = re.sub(r'<script src="https://accounts\.google\.com.*?</script>\n?', '', head)
head = re.sub(r'<script src="https://cdn\.jsdelivr\.net/npm/qrcode-generator.*?</script>\n?', '', head)
head = re.sub(r'<script src="https://checkout\.razorpay\.com.*?</script>\n?', '', head)

# ---------- admin portal section ----------
m = re.search(r'<section id="adminPortal".*?</section>', src, re.S)
assert m, 'adminPortal section not found'
admin_html = m.group(0)
admin_html = admin_html.replace(
    '<button class="close-portal" onclick="closePortals()">back to site</button>', '')

# ---------- modal divs ----------
def div_block(start_id, end_marker):
    i = src.index('<div', src.index('id="%s"' % start_id))
    j = src.index(end_marker, i)
    return src[i:j]

form_modal = div_block('formModal', 'id="confirmModal"')
confirm_modal = div_block('confirmModal', 'id="toast"')
mfa_modal = div_block('mfaModal', 'id="formModal"')
toast = '<div id="toast"></div>'

# ---------- script parts ----------
def section(start_marker, end_marker):
    i = src.index(start_marker)
    j = src.index(end_marker, i)
    return src[i:j]

config = []
for stmt in ['const API =', 'let jwt =', 'let currentUser =',
             'let sportsData =', 'let socket =']:
    mm = re.search(r'^' + re.escape(stmt) + r'.*$', src, re.M)
    assert mm, stmt
    config.append(mm.group(0))
config_js = '\n'.join(config)

helpers = section('/* ---------- helpers ---------- */', '/* ---------- catalog ---------- */')
admin_js = section('/* ---------- admin portal ---------- */', '/* ---------- booking modal ---------- */')

# patch: realtime used a removed billing refresher
admin_js = admin_js.replace("refreshAdminBilling()", "refreshAdmin()")
# patch: mfa success -> admin boot (no user-site nav functions here)
admin_js = admin_js.replace(
    """    updateNavState(currentUser.role);
    greetUser(currentUser.fullName);
    showToast('welcome, ' + currentUser.fullName.split(' ')[0]);
    if (mfaMode === 'direct') showPortal('admin');""",
    """    onAdminLogin();""")

boot = """
/* ---------- admin app boot (mfa code only, no google) ---------- */
async function loadAdminCatalog() {
  [sportsData, programsData, plansData, gymsData] = await Promise.all([
    api('/api/sports'), api('/api/programs'), api('/api/plans'), api('/api/gyms')
  ]);
}
function onAdminLogin() {
  closeMfaModal();
  document.getElementById('adminLogin').style.display = 'none';
  document.getElementById('adminTop').style.display = '';
  document.getElementById('adminApp').style.display = '';
  document.getElementById('adminPortal').classList.add('active');
  showToast('welcome back, admin');
  (async () => {
    try { await loadAdminCatalog(); } catch (e) { console.warn('catalog failed', e.message); }
    refreshAdmin();
    connectRealtime();
    switchAdminTab('dashboard', document.querySelector('#adminPortal .admin-tab'));
  })();
}
function adminLogout() {
  jwt = null; currentUser = null;
  localStorage.removeItem('ss_jwt');
  if (socket) { socket.disconnect(); socket = null; }
  location.reload();
}
window.addEventListener('DOMContentLoaded', async () => {
  if (jwt) {
    try {
      const me = await api('/api/auth/me');
      if (me && me.role === 'admin') { currentUser = me; onAdminLogin(); return; }
    } catch (e) { /* fall through to login */ }
    jwt = null; localStorage.removeItem('ss_jwt');
  }
});
"""

admin_css = """
<style>
.admin-topbar{position:fixed;top:0;left:0;right:0;z-index:50;display:flex;align-items:center;justify-content:space-between;padding:14px 4%;background:rgba(5,5,6,.85);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-bottom:1px solid var(--line)}
.admin-topbar .brand{font-weight:800;letter-spacing:.02em;text-decoration:none;color:var(--text)}
.admin-login{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:radial-gradient(60% 50% at 50% 0%,rgba(216,255,63,.07),transparent 70%)}
.admin-login-card{max-width:400px;width:100%;text-align:center;border:1px solid var(--line);border-radius:20px;padding:44px 36px;background:var(--bg2)}
.admin-login-card h1{margin:10px 0 8px;font-size:28px}
.admin-login-card p{color:var(--muted);font-size:14px;margin-bottom:22px}
#adminApp .portal-section{padding-top:110px}
</style>
"""

body = """
<body>
<div id="adminLogin" class="admin-login">
  <div class="admin-login-card">
    <span class="eyebrow">restricted area</span>
    <h1>sportsphere admin</h1>
    <p>enter the 6-digit code from your authenticator app. no google login here.</p>
    <button class="primary-btn" onclick="openAdminMfa()">enter admin code</button>
  </div>
</div>
<header id="adminTop" class="admin-topbar" style="display:none">
  <span class="brand"><span class="brand-mark">S</span> SportSphere <span style="color:var(--faint);font-weight:400">/ admin</span></span>
  <button class="ghost-btn" onclick="adminLogout()">logout</button>
</header>
<div id="adminApp" style="display:none">
""" + admin_html + """
</div>
""" + mfa_modal + form_modal + confirm_modal + toast + """
<script>
""" + config_js + "\n" + helpers + "\n" + admin_js + "\n" + boot + """
</script>
</body>
</html>
"""

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, 'w', encoding='utf-8') as f:
    f.write(head + admin_css + body)
print('wrote', OUT, len(open(OUT, 'r', encoding='utf-8').read()), 'bytes')
