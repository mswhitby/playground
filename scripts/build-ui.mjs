import {build} from 'esbuild';
import {copyFileSync,mkdirSync} from 'node:fs';
mkdirSync('public/vendor/learning',{recursive:true});
await build({entryPoints:['frontend/learning-ui.js'],bundle:true,minify:true,outfile:'public/vendor/learning/ui.js',legalComments:'eof'});
for(const [src,dest] of [['@materialstyle/materialstyle/dist/css/materialstyle.min.css','materialstyle.css'],['codemirror/lib/codemirror.css','codemirror.css'],['highlight.js/styles/github.css','highlight-light.css'],['highlight.js/styles/github-dark.css','highlight-dark.css']])copyFileSync('node_modules/'+src,'public/vendor/learning/'+dest);
await build({entryPoints:['frontend/react-runtime.js'],bundle:true,minify:true,define:{'process.env.NODE_ENV':'"production"'},outfile:'public/vendor/learning/react.js',legalComments:'eof'});
await build({entryPoints:['frontend/jsx.js'],bundle:true,minify:true,outfile:'public/vendor/learning/jsx.js',legalComments:'eof'});

await build({entryPoints:['frontend/account.js'],bundle:true,minify:true,format:'esm',target:'es2022',outfile:'public/account.js',legalComments:'eof'});
