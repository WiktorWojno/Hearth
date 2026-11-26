/* Build 48: View Transitions for themes and the character-to-chat morph. */
const fs=require('fs');
const path=require('path');
const {JSDOM,VirtualConsole}=require('jsdom');
const html=fs.readFileSync(path.join(__dirname,'..','www','index.html'),'utf8');
const out=[];const ok=(n,c)=>{out.push((c?'PASS ':'FAIL ')+n);if(!c)process.exitCode=1};
const wait=ms=>new Promise(r=>setTimeout(r,ms));

const errors=[];const vc=new VirtualConsole();
vc.on('jsdomError',e=>errors.push('jsdomError: '+e.message));
vc.on('error',(...a)=>errors.push('console.error: '+a.map(x=>x&&x.stack?x.stack:x).join(' ')));
const seed={
 chars:[{id:'c1',name:'Aria',desc:'A forest spirit.',first:'Hello {{user}}.',alts:[],tags:[],img:''}],
 books:[],personas:[{id:'p1',name:'Wanderer',desc:'A traveller.'}],
 chats:{c1:[{r:'c',t:'Hello.',ts:Date.now()-5000},{r:'u',t:'Hi.',ts:Date.now()-4000}]},
 old:{},links:{c1:[]},persona:'p1',cp:{},act:{c1:Date.now()},
 title:{c1:'Lanterns'},pin:{},provs:[],models:[],cfg:{auto:false}
};
const dom=new JSDOM(html,{url:'http://localhost:8080/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.matchMedia=w.matchMedia||(q=>({matches:false,media:q,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}}));
 w.Element.prototype.scrollIntoView=()=>{};
 Object.defineProperty(w.navigator,'storage',{value:{persisted:async()=>false,persist:async()=>true},configurable:true});
 try{w.localStorage.setItem('hearth',JSON.stringify(seed))}catch(e){}
 w.fetch=async()=>({status:404,ok:false,headers:{get:()=>null},text:async()=>'no',json:async()=>({})});
}});
const d=dom.window.document,W=dom.window;
const click=el=>{if(!el)throw new Error('missing click target');el.dispatchEvent(new W.MouseEvent('click',{bubbles:true,cancelable:true}))};

(async()=>{
 // Static wiring.
 ok('build 48 is current',/var VER=48\b/.test(html));
 ok('release notes describe the transitions',/v:48,when/.test(html)&&/Transitions that carry you/.test(html));
 ok('view transition styles exist',/@supports \(view-transition-name: none\)/.test(html)&&/::view-transition-old\(root\)/.test(html));
 ok('transitions have a safe fallback',/typeof document\.startViewTransition!=='function'/.test(html));
 ok('character cards carry a unique transition name',/view-transition-name:\$\{vtId\(x\.id\)\}/.test(html));
 ok('chat header names its portrait',/av\(c,'sm',vtId\(c\.id\)\)/.test(html));
 ok('opening a chat is wrapped in a transition',/function openChat\(id\)\{vt\(\(\)=>\{/.test(html));
 ok('theme switches are wrapped in a transition',/aptheme:\(\)=>\{[^\n]*vt\(\(\)=>/.test(html));
 ok('off and reduced motion skip transitions',/off\|\|typeof document\.startViewTransition/.test(html));

 await wait(1200);
 ok('home rows expose a morph source',/view-transition-name:c/.test(d.querySelector('.row .av').getAttribute('style')||''));

 // Character card -> chat header.
 click(d.querySelector('nav.tb [data-id="chars"]'));await wait(200);
 const hc=d.querySelector('.hc[data-a="cview"][data-id="c1"]');
 ok('character card has a named portrait',/view-transition-name:cc1/.test(hc.querySelector('.ph,img').getAttribute('style')||''));
 click(hc);await wait(200);
 ok('character view opened before the chat',!!d.querySelector('[data-a="open"][data-id="c1"]'));

 let calls=0,vtDuringCallback=false;
 W.document.startViewTransition=cb=>{calls++;cb();vtDuringCallback=vtDuringCallback||W.eval('V.vt')===true;return{finished:Promise.resolve(),ready:Promise.resolve(),updateCallbackDone:Promise.resolve()}};
 click(d.querySelector('[data-a="open"][data-id="c1"]'));await wait(120);
 ok('chat morph uses one view transition',calls===1&&vtDuringCallback);
 ok('chat opened with its header portrait named',/view-transition-name:cc1/.test(d.querySelector('header .av').getAttribute('style')||'')&&!!d.querySelector('main .msg'));
 ok('transition flag clears afterwards',W.eval('V.vt')===false);

 // Theme switch crossfade.
 click(d.querySelector('header [data-a="back"]'));await wait(180);
 W.eval("V.tab='apTheme';render()");
 const before=calls;
 click(d.querySelector('[data-a="aptheme"][data-id="onyx"]'));await wait(120);
 ok('theme change runs through a transition',calls===before+1&&W.eval("S.look.theme")==='onyx');
 ok('theme actually applied',d.documentElement.dataset.scheme==='dark'&&W.eval("activeTheme().id")==='onyx');

 // Motion off must be a plain, instant switch.
 W.eval("S.look.motion='off';applyLook();render()");
 const offBefore=calls;
 click(d.querySelector('[data-a="aptheme"][data-id="sakura"]'));await wait(80);
 ok('motion off skips the transition',calls===offBefore&&W.eval("S.look.theme")==='sakura');
 ok('motion off still changes the theme',W.eval("activeTheme().id")==='sakura');

 ok('no runtime errors',errors.length===0);
 if(errors.length)console.log(errors.join('\n'));
 console.log(out.join('\n'));
 console.log('\n'+out.filter(x=>x.startsWith('PASS')).length+'/'+out.length+' checks passed');
 setTimeout(()=>process.exit(out.some(x=>x.startsWith('FAIL'))?1:0),50);
})().catch(e=>{console.error('SUITE ERROR',e);process.exit(1)});
