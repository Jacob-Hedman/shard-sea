"""Web copies of the images the PHB vault embeds (`![[.../IMAGERY/NAME.webp]]`).

The vault's own files are print-sized (1-3 MB each). This writes WebP copies at most 1600 px
to public/img/phb/<NAME>.webp, which src/lib/md.ts renders in place of the embed.
Run after vendoring a new PHB version:  python3 scripts/phb-images.py sources/phb/v19
(needs Pillow). Unchanged images are rewritten identically, so re-running is harmless.
"""
import re
import sys
from pathlib import Path

from PIL import Image

vault = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[2] / "sources/phb/v19"
out = Path(__file__).resolve().parents[1] / "public/img/phb"
out.mkdir(parents=True, exist_ok=True)

embedded = set()
for md in vault.rglob("*.md"):
    for m in re.finditer(r"!\[\[([^\]|]+?\.(?:webp|png|jpe?g))(?:\|[^\]]*)?\]\]", md.read_text(encoding="utf-8"), re.I):
        embedded.add(Path(m.group(1)).name)

for name in sorted(embedded):
    src = next(vault.rglob(name), None)
    if not src:
        print("missing", name)
        continue
    img = Image.open(src)
    scale = 1600 / max(img.width, img.height)
    if scale < 1:
        img = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)
    dest = out / (Path(name).stem + ".webp")
    img.save(dest, "WEBP", quality=78, method=6)
    print(f"{name}: {src.stat().st_size // 1024} KB -> {dest.stat().st_size // 1024} KB")
