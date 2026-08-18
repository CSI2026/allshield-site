from pathlib import Path

path = Path('index.html')
html = path.read_text(encoding='utf-8')
app_marker = '<script src="./app.js"></script>'
if app_marker not in html:
    raise SystemExit('app.js marker missing after modularization')

runtime = []
if 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2' not in html:
    runtime.append('<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>')
if './config.js' not in html:
    runtime.append('<script src="./config.js"></script>')
if './backend.js' not in html:
    runtime.append('<script src="./backend.js"></script>')

if runtime:
    html = html.replace(app_marker, '\n'.join(runtime) + '\n' + app_marker, 1)

path.write_text(html, encoding='utf-8')
print('Production runtime references are present.')
