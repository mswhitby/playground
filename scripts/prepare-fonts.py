"""Fetch the three self-hosted display fonts, checking pinned content hashes."""
import hashlib,json,urllib.request
from pathlib import Path
root=Path(__file__).resolve().parents[1]
folder=root/'public/vendor/fonts';folder.mkdir(parents=True,exist_ok=True)
for font in json.loads((root/'scripts/fonts.json').read_text()):
 target=folder/font['file']
 if target.exists() and hashlib.sha256(target.read_bytes()).hexdigest()==font['sha256']:continue
 with urllib.request.urlopen(font['url'],timeout=30) as response:data=response.read()
 if hashlib.sha256(data).hexdigest()!=font['sha256']:raise RuntimeError('Font checksum differs: '+font['family'])
 target.write_bytes(data)
print('Verified three locally served fonts.')
