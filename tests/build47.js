/* Build 47: ambient petals, time-of-day glow, first-paint stagger and the
   undo countdown line. */
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
 chats:{c1:[{r:'c',t:'Hello.',ts:Date.now()-5000}]},
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

(async()=>{
 // Static pieces.
 ok('build 47 is current',/var VER=47\b/.test(html));
 ok('release notes describe the ambiance',/v:47,when/.test(html)&&/Ambient petals and a livelier Hearth/.test(html));
 ok('ambient layer has its own slow fall',/ambFall/.test(html)&&/#amb \.ap\{/.test(html));
 ok('time-of-day glow exists',/todColor/.test(html)&&/@keyframes todIn/.test(html));
 ok('first-paint stagger exists',/@keyframes riseIn/.test(html)&&/main\.stagger>/.test(html));
 ok('undo line exists',/@keyframes life/.test(html)&&/class="life"/.test(html));
 ok('reduced motion hides ambiance',/prefers-reduced-motion[\s\S]{0,600}#amb\{display:none!important\}/.test(html));

 await wait(1200);
 ok('app is on Home',W.eval('V.tab')==='home'&&!!d.querySelector('main.stagger'));

 // Ambient petals, glow and entrance on first paint.
 const amb=d.querySelector('#amb');
 ok('home has an ambient layer',!!amb&&amb.getAttribute('aria-hidden')==='true');
 ok('home shows twelve petals at full motion',d.querySelectorAll('#amb .ap').length===12);
 ok('home shows the time-of-day glow',!!d.querySelector('#amb .tod'));
 ok('ambient layer does not take taps',W.getComputedStyle(amb).pointerEvents==='none');
 ok('first paint marks the screen for stagger',d.querySelector('#v').classList.contains('enter'));

 // A redraw must not replay the entrance or restart the petals.
 const key=amb.dataset.k,inner=amb.innerHTML;
 W.eval('render()');
 ok('redraw does not replay the stagger',!d.querySelector('#v').classList.contains('enter'));
 ok('redraw keeps the same petal layer',d.querySelector('#amb')===amb&&amb.dataset.k===key&&amb.innerHTML===inner);

 // Motion settings.
 W.eval("S.look.motion='subtle';applyLook();render()");
 ok('subtle trims the drift to five',d.querySelectorAll('#amb .ap').length===5);
 ok('subtle keeps the glow still',!!d.querySelector('#amb .tod'));
 W.eval("S.look.motion='off';applyLook();render()");
 ok('motion off clears the ambiance',d.querySelectorAll('#amb .ap').length===0&&!d.querySelector('#amb .tod'));
 ok('motion off remembers the choice',W.localStorage.getItem('hearth_motion')==='off');

 // Account picker uses the same layer.
 W.eval("S.look.motion='full';applyLook();ACCOUNTS=[{id:'a',name:'Aria'},{id:'b',name:'Bram'}];ACCT_ID='a';V.picker=true;V.loading=false;V.locked=false;render()");
 ok('picker is shown',!!d.querySelector('.lock .pick'));
 ok('picker has petals behind it',d.querySelectorAll('.lock ~ #amb .ap, #amb .ap').length===12&&!!d.querySelector('.lock'));
 ok('picker petals are decorative',d.querySelector('#amb').getAttribute('aria-hidden')==='true');

 // Undo countdown line.
 W.eval("V.picker=false;V.loading=false;V.locked=false;V.tab='home';V.chat=null;render();undoable('Message deleted',()=>{})");
 const life=d.querySelector('#sn .snack .life');
 ok('undo snackbar shows a countdown line',!!life);
 ok('countdown matches the seven-second window',/animation-duration:7000ms/.test(life.getAttribute('style')||''));

 ok('no runtime errors',errors.length===0);
 if(errors.length)console.log(errors.join('\n'));
 console.log(out.join('\n'));
 console.log('\n'+out.filter(x=>x.startsWith('PASS')).length+'/'+out.length+' checks passed');
 setTimeout(()=>process.exit(out.some(x=>x.startsWith('FAIL'))?1:0),50);
})().catch(e=>{console.error('SUITE ERROR',e);process.exit(1)});
