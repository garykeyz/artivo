#!/usr/bin/env python3
"""Package the visitor-local demo for GitHub Pages, with no server/user data."""
import shutil
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent.parent))
from scripts.build_demo import build
ROOT=Path(__file__).resolve().parent.parent
build()
destination=ROOT/'dist'
if destination.exists():shutil.rmtree(destination)
destination.mkdir()
for source in (ROOT/'web').iterdir():
    if source.is_file():shutil.copy2(source,destination/source.name)
html=(destination/'index.html').read_text()
html=html.replace('<script src="feed.js"', '<script src="preview-config.js" defer></script><script src="demo.js" defer></script><script src="feed.js"')
html=html.replace('<meta name="theme-color"', '<meta name="description" content="ARTIVO: descubre talento, contrata artistas y administra tu música. Explora las vistas de cliente y músico."><meta name="theme-color"')
(destination/'index.html').write_text(html)
(destination/'preview-config.js').write_text("window.ARTIVO_STATIC_DEMO = true;\nwindow.ARTIVO_SOURCE_URL = 'https://github.com/garykeyz/artivo';\n")
(destination/'.nojekyll').touch()
print('GitHub Pages listo en dist/. La app Python conserva su API real.')
