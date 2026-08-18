from pathlib import Path
import re, base64, hashlib, json

root = Path('.')
html_path = root / 'index.html'
html = html_path.read_text(encoding='utf-8')

# 1. Move the approved CSS out of index.html.
style_match = re.search(r'<style>(.*?)</style>', html, flags=re.S | re.I)
if not style_match:
    raise SystemExit('Expected one inline style block.')
css = style_match.group(1).strip() + '\n'
html = html[:style_match.start()] + '<link rel="stylesheet" href="./styles.css">' + html[style_match.end():]

# 2. Earlier Phase16B generation left ignored text inside script elements that have src attributes.
# Browsers ignore that text; remove it while preserving the exact external script references.
external_pattern = re.compile(r'<script\s+([^>]*?src=["\'][^"\']+["\'][^>]*)>.*?</script>', flags=re.S | re.I)
html = external_pattern.sub(lambda m: f'<script {m.group(1).strip()}></script>', html)

# 3. Move the real inline app code into app.js, and isolate Owner Team Accounts into its own module.
inline_matches = list(re.finditer(r'<script>(.*?)</script>', html, flags=re.S | re.I))
if len(inline_matches) != 1:
    raise SystemExit(f'Expected one inline application script after cleanup; found {len(inline_matches)}.')
inline = inline_matches[0]
application = inline.group(1).strip() + '\n'
marker = 'ownerViews.teamaccounts=`'
position = application.find(marker)
if position < 0:
    raise SystemExit('Owner Team Accounts extension was not found.')
app_js = application[:position].rstrip() + '\n'
team_js = application[position:].strip() + '\n'
html = html[:inline.start()] + '<script src="./app.js"></script>\n<script src="./team-accounts.js"></script>' + html[inline.end():]

# 4. Extract every embedded image from HTML and JavaScript without changing the image bytes.
assets_dir = root / 'assets'
assets_dir.mkdir(exist_ok=True)
image_pattern = re.compile(r'data:image/(png|jpe?g|webp);base64,([A-Za-z0-9+/=]+)', flags=re.I)
asset_map = {}
manifest_assets = []

def extract_images(text):
    def replace(match):
        image_format = match.group(1).lower()
        extension = 'jpg' if image_format in ('jpg', 'jpeg') else image_format
        raw = base64.b64decode(match.group(2))
        full_hash = hashlib.sha256(raw).hexdigest()
        key = (full_hash, extension)
        if key not in asset_map:
            name = f'brand-{full_hash[:12]}.{extension}'
            (assets_dir / name).write_bytes(raw)
            asset_map[key] = name
            manifest_assets.append({'name': name, 'bytes': len(raw), 'sha256': full_hash})
        return 'assets/' + asset_map[key]
    return image_pattern.sub(replace, text)

html = extract_images(html)
css = extract_images(css)
app_js = extract_images(app_js)
team_js = extract_images(team_js)
html = re.sub(r'\n{4,}', '\n\n\n', html)

html_path.write_text(html, encoding='utf-8')
(root / 'styles.css').write_text(css, encoding='utf-8')
(root / 'app.js').write_text(app_js, encoding='utf-8')
(root / 'team-accounts.js').write_text(team_js, encoding='utf-8')

(root / '.gitignore').write_text('.DS_Store\n.env\n.env.*\nnode_modules/\n*.log\n', encoding='utf-8')
(root / 'package.json').write_text(json.dumps({
    'name': 'allshield-site',
    'private': True,
    'version': '1.0.0',
    'scripts': {
        'test': 'node tests/static-check.mjs && node --check app.js && node --check backend.js && node --check team-accounts.js'
    }
}, indent=2) + '\n', encoding='utf-8')

(root / 'tests').mkdir(exist_ok=True)
(root / 'tests' / 'static-check.mjs').write_text(r'''import { readFile, readdir } from "node:fs/promises";
const required = ["index.html","styles.css","app.js","backend.js","config.js","team-accounts.js"];
for (const file of required) await readFile(file);
const files = required;
for (const file of files) {
  const text = await readFile(file, "utf8");
  if (/data:image\//i.test(text)) throw new Error(`Embedded image remains in browser source: ${file}`);
  if (/sb_secret_/i.test(text) || /service_role/i.test(text)) throw new Error(`Privileged Supabase credential marker found in browser source: ${file}`);
}
const html = await readFile("index.html", "utf8");
for (const ref of ["./styles.css","./app.js","./backend.js","./config.js","./team-accounts.js"]) {
  if (!html.includes(ref)) throw new Error(`Missing HTML reference: ${ref}`);
}
const assets = (await readdir("assets")).filter(name => name !== "manifest.json");
if (assets.length < 1) throw new Error("No extracted image assets found.");
console.log(`Static validation passed: ${assets.length} image assets, no embedded images or browser secrets.`);
''', encoding='utf-8')

(root / '.github' / 'workflows').mkdir(parents=True, exist_ok=True)
(root / '.github' / 'workflows' / 'validate.yml').write_text('''name: Validate Allshield\n\non:\n  push:\n    branches: [main, refactor/modular-platform]\n  pull_request:\n    branches: [main]\n\npermissions:\n  contents: read\n\njobs:\n  static-validation:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 22\n      - run: npm test\n''', encoding='utf-8')

(root / 'README.md').write_text('''# Allshield Insurance Group\n\nThis repository is the source of truth for the Allshield public website and back-office platform.\n\n## Structure\n\n- `index.html` — approved page and portal markup\n- `styles.css` — approved visual system and responsive styles\n- `app.js` — public-site and portal UI behavior\n- `team-accounts.js` — Owner Team Accounts UI and account-management actions\n- `backend.js` — Supabase authentication and browser data access\n- `config.js` — browser-safe Supabase project configuration\n- `assets/` — extracted original brand/site image bytes\n- `supabase/` — database and Edge Function source/reference files\n- `tests/` — automated static/security checks\n\n## Workflow\n\nGitHub + Supabase are canonical. Changes are committed here and automatically validated. Numbered local ZIP builds are no longer the primary development workflow.\n\n## Security\n\nBrowser code contains only the Supabase publishable key. Secret/service-role keys, AI keys, social-platform secrets, and other privileged credentials remain server-side.\n''', encoding='utf-8')

manifest = {
    'index_bytes': html_path.stat().st_size,
    'styles_bytes': (root / 'styles.css').stat().st_size,
    'app_bytes': (root / 'app.js').stat().st_size,
    'team_accounts_bytes': (root / 'team-accounts.js').stat().st_size,
    'assets': manifest_assets,
}
(assets_dir / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'index_bytes': manifest['index_bytes'], 'asset_count': len(manifest_assets)}, indent=2))
