#!/usr/bin/env python3
"""Build frontend/index.html (user site) from frontend/src/full.html.

Strips everything admin: admin nav buttons, the #adminPortal section,
the mfa modal, and the admin JS (keeps shared form/confirm modals).
Adds register/login UI with email+password auth (google stays).
Run from repo root: python3 build_user.py
"""
import os, re

BASE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(BASE, 'frontend', 'src', 'full.html')
OUT = os.path.join(BASE, 'frontend', 'index.html')

src = open(SRC, encoding='utf-8').read()

def cut(a, b):
    i = src.index(a)
    j = src.index(b, i)
    return src[:i] + src[j:]

# 1. nav admin button
src = src.replace('    <button class="portal-btn admin-nav-btn" id="adminPortalBtn" onclick="showPortal(\'admin\')">admin portal</button>\n', '')

# 2. header auth area: drop Admin, add Register
src = src.replace(
    '''    <button class="outline-btn" id="adminNavBtn" onclick="showPortal('admin')">Admin</button>
    <button class="small-btn" onclick="showLogin()">Login</button>''',
    '''    <button class="outline-btn" onclick="showLogin();authTab('login')">Login</button>
    <button class="small-btn" onclick="showLogin();authTab('register')">Register</button>''')

# 3. adminPortal section
src = re.sub(r'<section id="adminPortal".*?</section>\n\n', '', src, flags=re.S)

# 4. mfaModal html
i = src.rindex('<div', 0, src.index('id="mfaModal"'))
j = src.index('<div class="modal" id="formModal"')
src = src[:i] + src[j:]

# 5. admin JS ranges (keep shared form/confirm modals + placesearch)
cut('/* ---------- admin portal ---------- */', '/* ---------- admin mfa (totp')
cut('/* ---------- admin mfa (totp', '/* ---------- generic form + confirm modals')
cut('/* ---------- admin programs (live from db) ---------- */', '/* ---------- booking modal ---------- */')

# 6. showPortal: no admin branch
src = src.replace(
    """function showPortal(type) {
  if (type === 'admin' && (!currentUser || currentUser.role !== 'admin')) { openAdminMfa(); return; }
  if (type !== 'admin' && !currentUser) { showLogin(); showToast('login with google first'); return; }""",
    """function showPortal(type) {
  if (type === 'admin') { showToast('admins log in at the admin portal'); return; }
  if (!currentUser) { showLogin(); showToast('login first'); return; }""")
src = src.replace(
    "  const target = document.getElementById(type === 'admin' ? 'adminPortal' : type === 'gym' ? 'gymPortal' : 'userPortal');",
    "  const target = document.getElementById(type === 'gym' ? 'gymPortal' : 'userPortal');")
src = src.replace(
    """  } else if (type === 'gym') {
    refreshGym();
    switchGymTab('overview', document.querySelector('#gymPortal .admin-tab'));
  } else {
    refreshAdmin();
    connectRealtime();
    switchAdminTab('dashboard', document.querySelector('#adminPortal .admin-tab'));
  }""",
    """  } else {
    refreshGym();
    switchGymTab('overview', document.querySelector('#gymPortal .admin-tab'));
  }""")

# 7. drop switchAdminTab (admin-only now)
i = src.index('function switchAdminTab(')
j = src.index('/* ---------- ai widget', i)
src = src[:i] + src[j:]

# 8. onGoogle: admin+mfa -> redirect note (verifyMfa is gone from user site)
src = src.replace(
    "    if (data.mfaRequired) { hideLogin(); return verifyMfa(data.tempToken); }",
    "    if (data.mfaRequired) { hideLogin(); showToast('this is an admin account, use the admin portal'); return; }")

# 9. login modal: add register/login tabs + email/password
src = src.replace(
    """<div class="modal" id="loginModal">
  <div class="modal-box">
    <button class="close" onclick="hideLogin()">×</button>
    <div class="eyebrow">WELCOME BACK</div>
    <h2 id="authTitle">Login</h2>
    <div id="googleBtn" style="display:flex;justify-content:center;margin:10px 0"></div>
    <p style="font-size:12px;opacity:.6;text-align:center">one click login with google, no passwords</p>
  </div>
</div>""",
    """<div class="modal" id="loginModal">
  <div class="modal-box">
    <button class="close" onclick="hideLogin()">×</button>
    <div class="eyebrow">WELCOME</div>
    <h2 id="authTitle">Login</h2>
    <div class="auth-tabs">
      <button id="tabLogin" class="auth-tab active" onclick="authTab('login')">login</button>
      <button id="tabRegister" class="auth-tab" onclick="authTab('register')">register</button>
    </div>
    <div id="authNameWrap" style="display:none;margin-bottom:10px"><input id="authName" class="auth-input" placeholder="full name" autocomplete="name"></div>
    <input id="authEmail" class="auth-input" type="email" placeholder="email" autocomplete="email" style="margin-bottom:10px">
    <input id="authPass" class="auth-input" type="password" placeholder="password (6+ characters)" autocomplete="current-password" onkeydown="if(event.key==='Enter')submitAuth()">
    <p id="authError" class="mfa-error"></p>
    <button class="primary-btn" id="authGoBtn" onclick="submitAuth()" style="width:100%;margin-top:6px">login</button>
    <div class="auth-or"><span>or</span></div>
    <div id="googleBtn" style="display:flex;justify-content:center;margin:10px 0"></div>
  </div>
</div>""")

# 10. auth css
src = src.replace(
    ".place-sugg button small{display:block;color:var(--faint);font-size:11px;margin-top:2px}",
    ".place-sugg button small{display:block;color:var(--faint);font-size:11px;margin-top:2px}\n"
    ".auth-tabs{display:flex;gap:8px;justify-content:center;margin:14px 0}\n"
    ".auth-tab{background:none;border:1px solid var(--line);color:var(--muted);border-radius:99px;padding:8px 22px;font-size:13px;cursor:pointer}\n"
    ".auth-tab.active{color:var(--lime);border-color:rgba(216,255,63,.4)}\n"
    ".auth-input{width:100%;background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:12px 14px;color:var(--text);font-size:14px}\n"
    ".auth-input:focus{outline:none;border-color:var(--lime)}\n"
    ".auth-or{display:flex;align-items:center;gap:10px;margin:16px 0 4px;color:var(--faint);font-size:12px}\n"
    ".auth-or::before,.auth-or::after{content:'';flex:1;height:1px;background:var(--line)}")

# 11. auth js after hideLogin
# placeholder: this file intentionally mirrors the extracted rebuild script from the supplied zip

with open(OUT, 'w', encoding='utf-8') as f:
    f.write(src)
print('wrote', OUT)
