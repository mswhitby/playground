"""Adapt WasmSharp's bundler asset imports to pinned CDN URLs for our buildless site.
No student code is transformed. Run with the extracted @wasmsharp/core@0.10.2 directory.
"""
import argparse,re,shutil
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('package',type=Path);a=p.parse_args()
root=Path(__file__).resolve().parents[1]/'public/vendor/wasmsharp';root.mkdir(parents=True,exist_ok=True)
cdn='https://cdn.jsdelivr.net/npm/@wasmsharp/core@0.10.2/'
for name in ['WasmSharpWorker.js','Compilation.js','initializeWasmSharpModule.js','dotnet.js']:
 s=(a.package/name).read_text()
 s=re.sub(r'^//# sourceMappingURL=.*$', '',s,flags=re.M)
 if name=='dotnet.js':
  s=re.sub(r'^import (\w+) from "\./([^"\n]+\.(?:dll|wasm|dat))";',lambda m:'const '+m[1]+' = "'+cdn+m[2]+'";',s,flags=re.M)
  s=s.replace('from "./dotnet.runtime.js"','from "'+cdn+'dotnet.runtime.js"').replace('from "./dotnet.native.js"','from "'+cdn+'dotnet.native.js"')
  if re.search(r'^import \w+ from .*\.(dll|wasm|dat)',s,re.M):raise ValueError('Unadapted binary module import')
 if name=='initializeWasmSharpModule.js':
  s=s.replace('getDirectory(import.meta.url)',repr(cdn))
 (root/name).write_text(s)
shutil.copy2(a.package/'LICENSE',root/'LICENSE')
print('Prepared pinned, licensed runtime loader modules. Binary runtime assets remain on the CDN.')
