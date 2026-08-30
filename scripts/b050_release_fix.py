from pathlib import Path
p=Path('index.html')
s=p.read_text()
old='social-connection-center.js?v=B2026.08.29.049'
new='social-connection-center.js?v=B2026.08.30.050'
if old not in s:
    raise SystemExit('B049 social connection center cache tag not found')
p.write_text(s.replace(old,new,1))
