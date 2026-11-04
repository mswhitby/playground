"""Allow only the four unmodified, licensed Inter files from the design reference."""
from pathlib import Path
import hashlib
root=Path(__file__).resolve().parents[1]/'dist'
expected={'Inter-Regular.woff': '86d6370a74403c613d2e373e80b5948b519cd6198078319964a4b85f426bbaf1', 'Inter-SemiBold.woff': '765348b698a3fe5018cef34a9163b77872277b7888e27a536ca6004d877a8178', 'Inter-LICENSE.txt': '781ffde332be9bdb6ccc527e6ccd6d6a586f3960c2d598b5580b8c7d1ae53d66', 'Inter-Bold.woff': '5d8b60708f6c6fab38e4f19506d32247a4f64757cbf43323a81525c695171f95', 'Inter-Medium.woff': '856c9016d283dcd08fb2eb200a506ab2a230559742ac1d561aaaf1bec33547f0'}
actual={str(p.relative_to(root)) for p in root.rglob('*') if p.suffix.lower() in {'.woff','.woff2','.ttf','.otf'}}
fonts={'fonts/inter/'+name for name in expected if name.endswith('.woff')}
assert actual==fonts, 'Unexpected or missing font assets: '+str(actual^fonts)
for name,digest in expected.items():
 path=root/'fonts/inter'/name
 assert path.is_file() and hashlib.sha256(path.read_bytes()).hexdigest()==digest, 'Changed licensed font or license: '+name
assert 'data:font' not in (root/'fonts.css').read_text(), 'Use the reviewed font files, not embedded font data'
print('Verified four licensed Inter weights and their original license; no other font binaries.')
