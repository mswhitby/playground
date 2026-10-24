"""Download the exact reviewed TeaVM practice runtime. Verify every byte."""
from pathlib import Path
import urllib.request,hashlib,json
root=Path(__file__).resolve().parents[1]
manifest=json.loads((root/'scripts/java-runtime.json').read_text())
target=root/'public/vendor/teavm';target.mkdir(parents=True,exist_ok=True)
for name,digest in manifest.items():
 path=target/name
 if not path.exists() or hashlib.sha256(path.read_bytes()).hexdigest()!=digest:
  data=urllib.request.urlopen('https://teavm.org/playground/'+name,timeout=60).read()
  if hashlib.sha256(data).hexdigest()!=digest:raise ValueError('Java runtime changed upstream: '+name)
  path.write_bytes(data)
print('Java runtime verified.')
