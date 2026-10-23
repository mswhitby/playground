// Exercise the real pinned .NET/Roslyn package, including our generated managed host.
// Usage: node scripts/smoke-csharp-runtime.mjs /path/to/extracted/npm/package
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {createServer} from 'node:http';
import {tmpdir} from 'node:os';
import {resolve,join,basename} from 'node:path';
import {pathToFileURL} from 'node:url';
import {buildDriver,buildChecks,parseResult,parseChecks} from '../public/csharp-protocol.mjs';
const pkg=resolve(process.argv[2]||''),root=new URL('../public/vendor/wasmsharp/',import.meta.url);
const timer=setTimeout(()=>{console.error('Real C# runtime smoke test timed out');process.exit(1)},60000);
const temp=await mkdtemp(join(tmpdir(),'playground-csharp-'));
const server=createServer(async(req,res)=>{try{const bytes=await readFile(join(pkg,basename(req.url)));res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Length':bytes.length});res.end(bytes)}catch{res.writeHead(404);res.end()}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${server.address().port}/`,cdn='https://unpkg.com/@wasmsharp/core@0.10.2/';
const logger={log:console.log,info:console.info,debug:console.debug};
try{
 let dotnet=await readFile(new URL('dotnet.js',root),'utf8');
 dotnet=dotnet.replaceAll(cdn,base);
 for(const name of ['dotnet.runtime.js','dotnet.native.js'])dotnet=dotnet.replaceAll(base+name,pathToFileURL(join(pkg,name)).href);
 await writeFile(join(temp,'dotnet.js'),dotnet);
 await writeFile(join(temp,'package.json'),' {"type":"module"}');
 await writeFile(join(temp,'initializeWasmSharpModule.js'),await readFile(new URL('initializeWasmSharpModule.js',root)));
 const {initializeWasmSharpModule}=await import(pathToFileURL(join(temp,'initializeWasmSharpModule.js')));
 const {Compilation}=await import(new URL('Compilation.js',root));
 console.log=console.info=console.debug=()=>{};
 const interop=await initializeWasmSharpModule();
 const cases=[
  ['stdout','using System; class Program {static void Main(){Console.WriteLine("Hello, Playground!");}}',null,r=>assert.equal(r.stdout,'Hello, Playground!\n')],
  ['syntax','using System; class Program {static void Main(){Console.WriteLine("Hello")}}',null,r=>{assert.equal(r.compiled,false);assert.match(r.diagnostics,/Program.cs.*CS1002/)}],
  ['exception','using System; class Program {static void Main(){Console.WriteLine("before");throw new InvalidOperationException("test error");}}',null,r=>{assert.equal(r.success,false);assert.match(r.stdout,/before/);assert.match(r.stderr,/InvalidOperationException: test error/)}],
  ['pass','public class Program {public static int DoubleValue(int a)=>a*2;public static void Main(){}}',buildChecks([{call:'DoubleValue(3)',expected:'6'}]),r=>assert.equal(parseChecks(r.stdout,1)[0].passed,true)],
  ['fail','public class Program {public static int DoubleValue(int a)=>a;public static void Main(){}}',buildChecks([{call:'DoubleValue(3)',expected:'6'}]),r=>assert.equal(parseChecks(r.stdout,1)[0].passed,false)],
  ['top-level','System.Console.WriteLine("Top level");',null,r=>assert.equal(r.stdout,'Top level\n')]
 ];
 let compilation;
 for(const [name,source,checks,verify] of cases){
  const code=buildDriver(source,{nonce:name,checks});
  if(compilation)await compilation.recompileAsync(code);else compilation=Compilation.create(code,interop);
  const raw=await compilation.run();assert.equal(raw.success,true,JSON.stringify(raw.diagnostics));
  const result=parseResult(raw.stdOut,name);verify(result);logger.log('PASS real C# runtime:',name);
 }
}finally{Object.assign(console,logger);clearTimeout(timer);server.close();await rm(temp,{recursive:true,force:true})}
// The embedded .NET host keeps background timers alive after tests finish.
process.exit(0);
