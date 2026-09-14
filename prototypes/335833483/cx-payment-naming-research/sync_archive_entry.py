"""Update the original local entry, keeping a one-time backup of the old page."""
from pathlib import Path
import shutil

root = Path(__file__).resolve().parent
workspace = root.parents[2]
entry = workspace / '_Archive/Base2.0/B2C/search.html'
backup = entry.with_name('search.before-cx-2026-09-14.html')
if not backup.exists():
    shutil.copy2(entry, backup)
page = (root / 'index.html').read_text(encoding='utf-8')
page = page.replace('<head>', '<head><base href="../../../Designers/Dima/process-2026-09-14-cx-payment-naming/">', 1)
entry.write_text(page, encoding='utf-8')
print(f'Updated: {entry}\nOriginal preserved: {backup}')
