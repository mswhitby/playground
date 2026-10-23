import {marked} from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js/lib/common';
import csharp from 'highlight.js/lib/languages/csharp';
import CodeMirror from 'codemirror';
import 'codemirror/mode/python/python';
import 'codemirror/mode/clike/clike';
import 'codemirror/mode/xml/xml';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/css/css';
import 'codemirror/mode/htmlmixed/htmlmixed';
import 'codemirror/mode/jsx/jsx';
hljs.registerLanguage('csharp',csharp);
const editors=new WeakMap();
function markdown(target,source,base){
 target.innerHTML=DOMPurify.sanitize(marked.parse(source));
 target.classList.add('markdown-body');
 if(base)for(const a of target.querySelectorAll('a[href],img[src]')){const attr=a.tagName==='IMG'?'src':'href';try{a.setAttribute(attr,new URL(a.getAttribute(attr),base).href)}catch{}}
 for(const block of target.querySelectorAll('pre code'))hljs.highlightElement(block);
}
function editor(textarea,language='python'){
 if(!textarea||editors.has(textarea))return editors.get(textarea);
 const mode={python:'python',csharp:'text/x-csharp',html:'htmlmixed',css:'css',javascript:'javascript',react:'jsx'}[language]||language;
 const cm=CodeMirror.fromTextArea(textarea,{mode,lineNumbers:true,indentUnit:4,tabSize:4,indentWithTabs:false,lineWrapping:false,viewportMargin:20,extraKeys:{Tab:cm=>cm.replaceSelection('    '),'Ctrl-Enter':()=>document.querySelector('#run-code,#run,#mobile-run')?.click(),'Cmd-Enter':()=>document.querySelector('#run-code,#run,#mobile-run')?.click()}});
 cm.getWrapperElement().setAttribute('aria-label',textarea.getAttribute('aria-label')||'Code editor');
 let syncing=false;
 cm.on('change',()=>{if(syncing)return;textarea.value=cm.getValue();textarea.dispatchEvent(new Event('input',{bubbles:true}))});
 const refresh=()=>{if(!textarea.isConnected){observer.disconnect();return}if(cm.getValue()!==textarea.value){syncing=true;cm.setValue(textarea.value);syncing=false}cm.setOption('readOnly',textarea.readOnly);cm.refresh()};
 const observer=new MutationObserver(refresh);observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-bs-theme']});
 textarea.addEventListener('input',()=>{if(cm.getValue()!==textarea.value)refresh()});
 // Existing lesson navigation and Reset assign textarea.value; preserve those integrations.
 const descriptor=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value');
 Object.defineProperty(textarea,'value',{get(){return descriptor.get.call(this)},set(value){descriptor.set.call(this,value);if(cm.getValue()!==String(value)){syncing=true;cm.setValue(String(value));syncing=false}}});
 new ResizeObserver(()=>cm.refresh()).observe(cm.getWrapperElement());
 new MutationObserver(()=>cm.setOption('readOnly',textarea.readOnly)).observe(textarea,{attributes:true,attributeFilter:['readonly']});
 editors.set(textarea,cm);return cm;
}
window.PlaygroundUI={markdown,editor};
const auto=()=>{for(const t of document.querySelectorAll('textarea#code,textarea#debug-source'))editor(t,t.id==='debug-source'?'csharp':location.pathname.includes('computer-science-1')?'python':'csharp');for(const b of document.querySelectorAll('pre code:not([data-highlighted])'))hljs.highlightElement(b);for(const b of document.querySelectorAll('button:not(.CodeMirror button):not(.menu-caret):not(.menu-toggle):not(.icon-button)')){b.classList.add('btn',b.classList.contains('secondary')?'btn-outline-primary':'btn-primary')}for(const s of document.querySelectorAll('select'))s.classList.add('form-select')};
new MutationObserver(()=>{if(!window.__uiScheduled){window.__uiScheduled=true;requestAnimationFrame(()=>{window.__uiScheduled=false;auto()})}}).observe(document.body,{childList:true,subtree:true});
auto();document.dispatchEvent(new Event('playground-ui-ready'));
