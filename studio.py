#!/usr/bin/env python3
"""
Arjun Yadav Studio — Central Remote Config Management CLI & GUI
Top 1% Remote Configuration Controller for Mobile App Portfolio
"""

import os
import sys
import json
import glob
import re
import urllib.request
import subprocess
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
import webbrowser

STUDIO_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_DIR = os.path.join(STUDIO_DIR, "config")
PROD_BASE_URL = "https://arjunyadav.com/config"

APPS = [
    {"slug": "zeropath", "name": "ZeroPath: Loan & EMI Tracker", "id": "com.arjunyadav.zeropath"},
    {"slug": "video-splitter", "name": "Auto Video Splitter for Status", "id": "com.splitvideoforwhatsapp"},
    {"slug": "swiperight", "name": "SwipeRight: Card Compare India", "id": "com.creditcard.swiperight"},
    {"slug": "water-diary", "name": "Water Diary - Drink Reminder", "id": "com.waterdiary.drinkreminder"},
    {"slug": "water-reminder-pro", "name": "Water Drinking Reminder - Pro", "id": "com.pro.drinkreminder"},
]

def get_config_path(slug):
    return os.path.join(CONFIG_DIR, f"{slug}.json")

def load_config(slug):
    path = get_config_path(slug)
    if not os.path.exists(path):
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def save_config(slug, data):
    path = get_config_path(slug)
    data["last_updated"] = datetime.now().strftime("%Y-%m-%d")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
        f.write("\n")

def fetch_live_config(slug):
    url = f"{PROD_BASE_URL}/{slug}.json"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "StudioManager/1.0"})
        with urllib.request.urlopen(req, timeout=3) as resp:
            if resp.status == 200:
                return json.loads(resp.read().decode("utf-8"))
    except Exception:
        return None
    return None

def validate_config(slug, data):
    errors = []
    if not isinstance(data, dict):
        return [f"{slug}: Root must be a JSON object"]
    
    if "app_id" not in data or not isinstance(data["app_id"], str):
        errors.append(f"{slug}: Missing or invalid 'app_id'")
    if "app_name" not in data or not isinstance(data["app_name"], str):
        errors.append(f"{slug}: Missing or invalid 'app_name'")
    
    ads = data.get("ads")
    if not isinstance(ads, dict):
        errors.append(f"{slug}: Missing or invalid 'ads' object")
    else:
        if not isinstance(ads.get("enabled"), bool):
            errors.append(f"{slug}: 'ads.enabled' must be a boolean (true/false)")
        if not isinstance(ads.get("test_mode"), bool):
            errors.append(f"{slug}: 'ads.test_mode' must be a boolean (true/false)")

    vc = data.get("version_control")
    if not isinstance(vc, dict):
        errors.append(f"{slug}: Missing or invalid 'version_control' object")
    else:
        if not isinstance(vc.get("latest_version_code"), int):
            errors.append(f"{slug}: 'version_control.latest_version_code' must be an integer")
        if not isinstance(vc.get("force_update"), bool):
            errors.append(f"{slug}: 'version_control.force_update' must be a boolean")

    # Anti-reconnaissance check: Disallow leaked internal IDs
    if "integrations" in data:
        errors.append(f"{slug}: SECURITY RISK: 'integrations' block contains leaked IDs. Remove it.")
        
    return errors

def validate_all():
    print("\n🔍 Validating all 5 Remote Config schemas...")
    all_ok = True
    for app in APPS:
        data = load_config(app["slug"])
        if not data:
            print(f"  ❌ {app['slug']}.json: File not found")
            all_ok = False
            continue
        errs = validate_config(app["slug"], data)
        if errs:
            for e in errs:
                print(f"  ❌ {e}")
            all_ok = False
        else:
            print(f"  ✅ {app['slug']}.json: Valid schema & safe")
    return all_ok

def show_status(check_live=True):
    print("\n" + "=" * 90)
    print(" 📱 ARJUN YADAV STUDIO — REMOTE CONFIG CONTROL PANEL")
    print("=" * 90)
    print(f"{'App Slug':<20} | {'Ads':<8} | {'Test':<6} | {'Ver':<5} | {'Force':<6} | {'Notice':<8} | {'Live Sync'}")
    print("-" * 90)
    
    for app in APPS:
        slug = app["slug"]
        local = load_config(slug)
        if not local:
            print(f"{slug:<20} | NOT FOUND")
            continue
        
        ads = "🟢 ON" if local.get("ads", {}).get("enabled") else "🔴 OFF"
        test = "🟡 YES" if local.get("ads", {}).get("test_mode") else "⚪ NO"
        ver = str(local.get("version_control", {}).get("latest_version_code", 1))
        force = "🔴 YES" if local.get("version_control", {}).get("force_update") else "⚪ NO"
        notice = "📢 ON" if local.get("notice", {}).get("show_dialog") else "⚪ OFF"
        
        sync_status = "⚪ Local Only"
        if check_live:
            live = fetch_live_config(slug)
            if live:
                match = (
                    live.get("ads", {}).get("enabled") == local.get("ads", {}).get("enabled") and
                    live.get("version_control", {}).get("latest_version_code") == local.get("version_control", {}).get("latest_version_code") and
                    live.get("version_control", {}).get("force_update") == local.get("version_control", {}).get("force_update")
                )
                sync_status = "🟢 In Sync" if match else "🟡 Out of Sync"
            else:
                sync_status = "⚠️ Unreachable"

        print(f"{slug:<20} | {ads:<8} | {test:<6} | {ver:<5} | {force:<6} | {notice:<8} | {sync_status}")
    print("=" * 90 + "\n")

def deploy():
    if not validate_all():
        print("\n❌ Deployment aborted due to schema/security errors. Fix errors first.")
        return False
    
    print("\n🚀 Initiating Production Deployment...")
    # 1. Commit changes in git
    try:
        subprocess.run(["git", "add", "config/"], cwd=STUDIO_DIR, check=True)
        msg = f"config: update remote configs via studio manager ({datetime.now().strftime('%Y-%m-%d %H:%M')})"
        diff = subprocess.run(["git", "diff", "--cached", "--quiet"], cwd=STUDIO_DIR)
        if diff.returncode != 0:
            subprocess.run(["git", "commit", "-m", msg], cwd=STUDIO_DIR, check=True)
            subprocess.run(["git", "push", "origin", "main"], cwd=STUDIO_DIR, check=True)
            print("  ✅ Git changes committed and pushed to main.")
        else:
            print("  ℹ️ No local config changes detected to commit.")
    except Exception as e:
        print(f"  ⚠️ Git sync warning: {e}")

    # 2. Firebase deploy
    print("  📦 Deploying to Firebase Hosting (arjunyadav-studio)...")
    res = subprocess.run(["firebase", "deploy", "--only", "hosting"], cwd=STUDIO_DIR, capture_output=True, text=True)
    if res.returncode == 0:
        print("  🎉 Firebase deploy successful!")
        show_status(check_live=True)
        return True
    else:
        print(f"  ❌ Firebase deploy failed: {res.stderr}")
        return False

# ----------------- WEB GUI SERVER -----------------
HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Arjun Yadav Studio — Remote Config Hub</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #070913;
      --card-bg: #0e1322;
      --card-hover: #141b2f;
      --border: rgba(255, 255, 255, 0.08);
      --primary: #6366f1;
      --primary-hover: #4f46e5;
      --emerald: #10b981;
      --rose: #f43f5e;
      --amber: #f59e0b;
      --text: #f8fafc;
      --text-muted: #94a3b8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      background: var(--bg);
      color: var(--text);
      padding: 32px 24px;
      min-height: 100vh;
    }
    .header {
      max-width: 1200px;
      margin: 0 auto 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }
    .title-box h1 {
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.5px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .badge {
      font-size: 11px;
      padding: 4px 10px;
      border-radius: 9999px;
      background: rgba(99, 102, 241, 0.15);
      color: var(--primary);
      border: 1px solid rgba(99, 102, 241, 0.3);
      font-weight: 700;
    }
    .title-box p {
      font-size: 14px;
      color: var(--text-muted);
      margin-top: 4px;
    }
    .action-bar {
      display: flex;
      gap: 12px;
    }
    .btn {
      padding: 10px 20px;
      border-radius: 10px;
      font-weight: 700;
      font-size: 14px;
      cursor: pointer;
      border: none;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .btn-primary {
      background: var(--primary);
      color: #fff;
      box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);
    }
    .btn-primary:hover { background: var(--primary-hover); transform: translateY(-1px); }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.05);
      color: var(--text);
      border: 1px solid var(--border);
    }
    .btn-secondary:hover { background: rgba(255, 255, 255, 0.1); }
    .grid {
      max-width: 1200px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
      gap: 20px;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
      transition: all 0.2s ease;
    }
    .card:hover { border-color: rgba(99, 102, 241, 0.3); }
    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .app-title { font-size: 17px; font-weight: 700; }
    .app-slug { font-size: 12px; font-family: 'JetBrains Mono', monospace; color: var(--text-muted); margin-top: 2px; }
    .section-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--text-muted);
      margin-bottom: 12px;
    }
    .row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    }
    .row:last-child { border-bottom: none; }
    .switch-label { font-size: 14px; font-weight: 500; }
    .switch {
      position: relative;
      display: inline-block;
      width: 44px;
      height: 24px;
    }
    .switch input { opacity: 0; width: 0; height: 0; }
    .slider {
      position: absolute;
      cursor: pointer;
      top: 0; left: 0; right: 0; bottom: 0;
      background-color: rgba(255, 255, 255, 0.1);
      transition: .2s;
      border-radius: 24px;
    }
    .slider:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: .2s;
      border-radius: 50%;
    }
    input:checked + .slider { background-color: var(--emerald); }
    input:checked + .slider.rose { background-color: var(--rose); }
    input:checked + .slider:before { transform: translateX(20px); }
    .input-box {
      width: 80px;
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 6px 10px;
      color: #fff;
      font-size: 14px;
      font-family: 'JetBrains Mono', monospace;
      text-align: center;
    }
    .text-input {
      width: 100%;
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 8px 12px;
      color: #fff;
      font-size: 13px;
      margin-top: 6px;
    }
    .toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      padding: 14px 24px;
      background: #1e293b;
      border: 1px solid var(--border);
      border-radius: 12px;
      font-weight: 600;
      font-size: 14px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      display: none;
      z-index: 1000;
    }
    .status-badge {
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
    }
    .status-ok { background: rgba(16, 185, 129, 0.15); color: var(--emerald); }
  </style>
</head>
<body>
  <div class="header">
    <div class="title-box">
      <h1>Arjun Yadav Studio <span class="badge">TOP 1% REMOTE CONFIG</span></h1>
      <p>Instant zero-downtime configuration for all Android apps via <code>arjunyadav.com</code></p>
    </div>
    <div class="action-bar">
      <button class="btn btn-secondary" onclick="validateConfigs()">🔍 Validate</button>
      <button class="btn btn-primary" onclick="saveAndDeploy()">🚀 Deploy to Live Production</button>
    </div>
  </div>

  <div class="grid" id="appsGrid">
    <!-- Populated by JS -->
  </div>

  <div class="toast" id="toast"></div>

  <script>
    let appData = {};

    async function loadData() {
      const res = await fetch('/api/apps');
      appData = await res.json();
      render();
    }

    function render() {
      const grid = document.getElementById('appsGrid');
      grid.innerHTML = '';

      for (const [slug, item] of Object.entries(appData)) {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
          <div class="card-top">
            <div>
              <div class="app-title">${item.app_name}</div>
              <div class="app-slug">${slug} • ${item.app_id}</div>
            </div>
            <span class="status-badge status-ok">● Live</span>
          </div>

          <div>
            <div class="section-title">Ad Controls</div>
            <div class="row">
              <span class="switch-label">Ads Enabled</span>
              <label class="switch">
                <input type="checkbox" id="ads_${slug}" ${item.ads.enabled ? 'checked' : ''} onchange="updateVal('${slug}', 'ads.enabled', this.checked)">
                <span class="slider"></span>
              </label>
            </div>
            <div class="row">
              <span class="switch-label">Test Mode</span>
              <label class="switch">
                <input type="checkbox" id="test_${slug}" ${item.ads.test_mode ? 'checked' : ''} onchange="updateVal('${slug}', 'ads.test_mode', this.checked)">
                <span class="slider"></span>
              </label>
            </div>
          </div>

          <div>
            <div class="section-title">Version Control</div>
            <div class="row">
              <span class="switch-label">Latest Version Code</span>
              <input type="number" class="input-box" value="${item.version_control.latest_version_code}" onchange="updateVal('${slug}', 'version_control.latest_version_code', parseInt(this.value))">
            </div>
            <div class="row">
              <span class="switch-label">Force Update</span>
              <label class="switch">
                <input type="checkbox" ${item.version_control.force_update ? 'checked' : ''} onchange="updateVal('${slug}', 'version_control.force_update', this.checked)">
                <span class="slider rose"></span>
              </label>
            </div>
          </div>

          <div>
            <div class="section-title">In-App Notice Dialog</div>
            <div class="row">
              <span class="switch-label">Show Dialog</span>
              <label class="switch">
                <input type="checkbox" ${item.notice && item.notice.show_dialog ? 'checked' : ''} onchange="updateVal('${slug}', 'notice.show_dialog', this.checked)">
                <span class="slider"></span>
              </label>
            </div>
            <input type="text" class="text-input" placeholder="Notice Title" value="${item.notice ? item.notice.title || '' : ''}" onchange="updateVal('${slug}', 'notice.title', this.value)">
            <input type="text" class="text-input" placeholder="Notice Message" value="${item.notice ? item.notice.message || '' : ''}" onchange="updateVal('${slug}', 'notice.message', this.value)">
          </div>
        `;
        grid.appendChild(card);
      }
    }

    function updateVal(slug, path, val) {
      const parts = path.split('.');
      if (parts.length === 2) {
        if (!appData[slug][parts[0]]) appData[slug][parts[0]] = {};
        appData[slug][parts[0]][parts[1]] = val;
      }
      showToast('Changes saved locally. Click Deploy when ready!');
    }

    async function validateConfigs() {
      const res = await fetch('/api/validate');
      const data = await res.json();
      if (data.ok) {
        showToast('✅ All 5 Remote Config schemas are 100% valid!');
      } else {
        alert('Validation Errors:\\n' + data.errors.join('\\n'));
      }
    }

    async function saveAndDeploy() {
      showToast('⏳ Validating & Deploying to Firebase Hosting...');
      const res = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appData)
      });
      const data = await res.json();
      if (data.ok) {
        showToast('🎉 Successfully deployed to arjunyadav.com live!');
      } else {
        alert('Deployment failed:\\n' + (data.error || 'Unknown error'));
      }
    }

    function showToast(msg) {
      const toast = document.getElementById('toast');
      toast.innerText = msg;
      toast.style.display = 'block';
      setTimeout(() => { toast.style.display = 'none'; }, 3500);
    }

    loadData();
  </script>
</body>
</html>
"""

class StudioRequestHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/" or self.path == "/index.html":
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(HTML_TEMPLATE.encode("utf-8"))
        elif self.path == "/api/apps":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            out = {}
            for a in APPS:
                out[a["slug"]] = load_config(a["slug"])
            self.wfile.write(json.dumps(out).encode("utf-8"))
        elif self.path == "/api/validate":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            errs = []
            for a in APPS:
                cfg = load_config(a["slug"])
                errs.extend(validate_config(a["slug"], cfg))
            self.wfile.write(json.dumps({"ok": len(errs) == 0, "errors": errs}).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        if self.path == "/api/deploy":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            try:
                data = json.loads(body.decode("utf-8"))
                for slug, cfg in data.items():
                    save_config(slug, cfg)
                
                success = deploy()
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"ok": success}).encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"ok": False, "error": str(e)}).encode("utf-8"))

def run_gui(port=5050):
    server = HTTPServer(("127.0.0.1", port), StudioRequestHandler)
    print(f"\n🌐 Studio Web Dashboard running at: http://localhost:{port}")
    print("Press Ctrl+C to stop.\n")
    try:
        webbrowser.open(f"http://localhost:{port}")
    except Exception:
        pass
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStudio server stopped.")

def main():
    if len(sys.argv) < 2:
        show_status()
        print("Usage:")
        print("  ./studio status                         Show live status of all apps")
        print("  ./studio gui                            Open visual web dashboard in browser")
        print("  ./studio validate                       Validate all JSON schemas")
        print("  ./studio toggle-ads <slug>              Toggle ads enabled/disabled")
        print("  ./studio set-version <slug> <code_num>  Set latest version code")
        print("  ./studio force-update <slug> <on|off>   Enable/disable force update")
        print("  ./studio deploy                         Validate, git commit & deploy live")
        return

    cmd = sys.argv[1].lower()
    
    if cmd == "status":
        show_status()
    elif cmd == "gui":
        run_gui()
    elif cmd == "validate":
        validate_all()
    elif cmd == "deploy":
        deploy()
    elif cmd == "toggle-ads" and len(sys.argv) >= 3:
        slug = sys.argv[2]
        cfg = load_config(slug)
        if not cfg:
            print(f"Unknown app slug: {slug}")
            return
        curr = cfg.get("ads", {}).get("enabled", True)
        cfg["ads"]["enabled"] = not curr
        save_config(slug, cfg)
        print(f"✅ {slug}: Ads toggled to {'ENABLED' if not curr else 'DISABLED'}")
        print("Run './studio deploy' to publish live.")
    elif cmd == "set-version" and len(sys.argv) >= 4:
        slug = sys.argv[2]
        code = int(sys.argv[3])
        cfg = load_config(slug)
        if not cfg:
            print(f"Unknown app slug: {slug}")
            return
        cfg["version_control"]["latest_version_code"] = code
        save_config(slug, cfg)
        print(f"✅ {slug}: Version code set to {code}")
        print("Run './studio deploy' to publish live.")
    elif cmd == "force-update" and len(sys.argv) >= 4:
        slug = sys.argv[2]
        mode = sys.argv[3].lower() in ["on", "true", "1", "yes"]
        cfg = load_config(slug)
        if not cfg:
            print(f"Unknown app slug: {slug}")
            return
        cfg["version_control"]["force_update"] = mode
        save_config(slug, cfg)
        print(f"✅ {slug}: Force update set to {mode}")
        print("Run './studio deploy' to publish live.")
    else:
        print(f"Unknown command: {cmd}")

if __name__ == "__main__":
    main()
