import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve(import.meta.dirname,'..');
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.wasm':'application/wasm','.md':'text/plain'};
export function createPreviewServer(){return createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost'),python=url.pathname.startsWith('/computer-science-1/');
 const prefix=python?'/computer-science-1/':'/playground/';if(!url.pathname.startsWith(prefix)){res.writeHead(302,{location:'/playground/'});res.end();return}
 const base=python?resolve(root,'../computer-science-1/docs'):resolve(root,'dist');let path=resolve(base,decodeURIComponent(url.pathname.slice(prefix.length)));
 if(!path.startsWith(base+'/')&&path!==base)throw Error();if((await stat(path)).isDirectory())path=resolve(path,'index.html');
 let content=await readFile(path);if(python&&['.html','.js'].includes(extname(path)))content=Buffer.from(content.toString().replaceAll('https://www.mswhitby.com/playground/','/playground/'));
 res.setHeader('Content-Type',mime[extname(path)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');res.end(content);
 }catch{res.statusCode=404;res.end('Not found')}})}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){const server=createPreviewServer();server.listen(Number(process.env.PORT)||8088,'127.0.0.1',()=>console.log('Preview: http://127.0.0.1:'+(server.address().port)+'/playground/'))}
