/* Build 41: stacked undo, snackbar dismissal, reply swipes and preview greetings. */
const fs=require('fs');
const path=require('path');
const {JSDOM,VirtualConsole}=require('jsdom');
const html=fs.readFileSync(path.join(__dirname,'..','www','index.html'),'utf8');
const errors=[];const vc=new VirtualConsole();
vc.on('jsdomError',e=>errors.push('jsdomError: '+e.message));
vc.on('error',(...a)=>errors.push('console.error: '+a.map(x=>x&&x.stack?x.stack:x).join(' ')));
const seed={
 chars:[
  {id:'c1',name:'Aria',desc:'A forest spirit.',first:'Hello {{user}}.',alts:['Another hello.'],tags:[],img:''},
  {id:'c2',name:'Borin',desc:'A dwarf.',first:'Yo {{user}}.',alts:[],tags:[],img:''}
 ],
 books:[],personas:[{id:'p1',name:'Wanderer',desc:'A traveller.'}],
 chats:{
  c1:[
   {r:'c',t:'Two',s:['One','Two','Three'],i:1},
   {r:'u',t:'Hi there.'},
   {r:'c',t:'Last',s:['Last','Latest'],i:0}
  ],
  c2:[{r:'c',t:'Alpha'},{r:'u',t:'Bravo'},{r:'c',t:'Charlie'}]
 },
 links:{},persona:'p1',cp:{},act:{c1:Date.now(),c2:Date.now()-100000},
 provs:[{id:'pr1',name:'Local',url:'http://localhost:11434/v1',key:'',fmt:'openai'}],
 models:[{id:'m1',pid:'pr1',mid:'test',name:'Test Model'}],
 cfg:{auto:false,am:'m1'}
};
const dom=new JSDOM(html,{url:'http://localhost:8080/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.matchMedia=w.matchMedia||(q=>({matches:false,media:q,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}}));
 w.Element.prototype.scrollIntoView=()=>{};
 Object.defineProperty(w.navigator,'storage',{value:{persisted:async()=>false,persist:async()=>true},configurable:true});
 try{w.localStorage.setItem('hearth',JSON.stringify(seed))}catch(e){}
 w.fetch=async()=>({status:404,ok:false,headers:{get:()=>null},text:async()=>'no',json:async()=>({})});
}});
const d=dom.window.document,W=dom.window;
const out=[];const ok=(n,c)=>{out.push((c?'PASS ':'FAIL ')+n);if(!c)process.exitCode=1};
function click(el){if(!el)throw new Error('missing click target');el.dispatchEvent(new W.MouseEvent('click',{bubbles:true,cancelable:true}))}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function tab(id){
 if(!d.querySelector('nav.tb')){const hb=d.querySelector('header [data-a="home"]');if(hb){click(hb);await wait(160)}}
 click(d.querySelector(`nav.tb [data-id="${id}"]`));await wait(140)}
async function toHome(){
 const hb=d.querySelector('header [data-a="home"]');
 if(hb){click(hb);await wait(160);return}
 if(d.querySelector('nav.tb [data-id="home"]')){await tab('home');return}
 throw new Error('no way home')
}
async function openChat(id){
 if(!d.querySelector('nav.tb'))await toHome();
 await tab('chars');
 click(d.querySelector(`.hc[data-a="cview"][data-id="${id}"]`));await wait(140);
 click(d.querySelector(`[data-a="open"][data-id="${id}"]`));await wait(200);
}
async function leaveChat(){click(d.querySelector('[data-a="back"]'));await wait(160)}
function touch(el,type,x,y){
 const e=new W.Event(type,{bubbles:true,cancelable:true});
 e.touches=type==='touchend'?[]:[{clientX:x,clientY:y}];
 e.changedTouches=[{clientX:x,clientY:y}];
 el.dispatchEvent(e);
}
async function swipeEl(el,dx){
 touch(el,'touchstart',200,300);touch(el,'touchmove',200+dx,300);touch(el,'touchend',200+dx,300);await wait(120);
}
(async()=>{
 await wait(800);
 ok('boots clean',errors.length===0);
 const VER=W.eval('VER');
 ok('build is at least 41',VER>=41&&new RegExp('build '+VER).test(d.body.textContent));

 // release notes
 ok('catalog banner appears on Home',!!d.querySelector('main .banner[data-a="tab"][data-id="news"]'));
 click(d.querySelector('main .banner[data-a="tab"][data-id="news"]'));await wait(200);
 ok('catalog opens',d.querySelector('h1.pt')?.textContent==='What’s new');
 ok('catalog marks the current build',d.querySelector('.rel.cur .relv')?.textContent===String(VER));
 const rel41=[...d.querySelectorAll('.rel')].find(x=>x.querySelector('.relv')?.textContent==='41');
 const rel41items=rel41?[...rel41.querySelectorAll('.rell li')]:[];
 ok('catalog includes build 41',!!rel41);
 ok('catalog documents stacked undo',rel41items.some(x=>/stack/i.test(x.textContent)));
 ok('catalog documents reply swipes',rel41items.some(x=>/swipe/i.test(x.textContent)));
 ok('catalog documents the preview fix',rel41items.some(x=>/alternative greetings/i.test(x.textContent)));
 await toHome();

 // two deletes stay independently undoable
 await openChat('c2');
 ok('undo chat is ready',d.querySelectorAll('main .msg').length===3);
 click(d.querySelector('.msg[data-i="0"] .bub'));await wait(120);
 click(d.querySelector('[data-a="del"][data-i="0"]'));await wait(140);
 click(d.querySelector('.msg[data-i="1"] .bub'));await wait(120);
 click(d.querySelector('[data-a="del"][data-i="1"]'));await wait(180);
 ok('two deletes leave two undo buttons',d.querySelectorAll('#sn [data-a="undo"]').length===2);
 ok('each undo button belongs to its action',new Set([...d.querySelectorAll('#sn [data-a="undo"]')].map(x=>x.dataset.u)).size===2);
 ok('both messages are deleted',W.eval('S.chats.c2').length===1);
 click(d.querySelectorAll('#sn [data-a="undo"]')[0]);await wait(180);
 ok('undoing the older delete restores it in place',W.eval('S.chats.c2').map(x=>x.t).join(',')==='Alpha,Bravo');
 ok('the newer undo is still offered',d.querySelectorAll('#sn [data-a="undo"]').length===1);
 click(d.querySelector('#sn [data-a="undo"]'));await wait(180);
 ok('undoing the newer delete restores the full chat',W.eval('S.chats.c2').map(x=>x.t).join(',')==='Alpha,Bravo,Charlie');
 ok('undo stack is empty after both restores',W.eval('UNDO.length')===0);

 // swipe an undo snackbar away without restoring
 click(d.querySelector('.msg[data-i="1"] .bub'));await wait(120);
 click(d.querySelector('[data-a="del"][data-i="1"]'));await wait(160);
 ok('delete offers undo before the swipe',!!d.querySelector('#sn [data-a="undo"]'));
 await swipeEl(d.querySelector('#sn .snack'),-110);await wait(240);
 ok('swiped snackbar disappears',!d.querySelector('#sn .snack'));
 ok('swiping dismisses undo without restoring',W.eval('S.chats.c2').map(x=>x.t).join(',')==='Alpha,Charlie');
 ok('dismissed action leaves the undo stack',W.eval('UNDO.length')===0);

 // two edits stay independently undoable
 click(d.querySelector('.msg[data-i="0"] .bub'));await wait(120);
 click(d.querySelector('[data-a="edit"][data-i="0"]'));await wait(140);
 d.querySelector('#em').value='Alpha edited';
 click(d.querySelector('[data-a="savem"]'));await wait(180);
 ok('edit updates the message',W.eval('S.chats.c2')[0].t==='Alpha edited');
 ok('edit offers undo',!!d.querySelector('#sn [data-a="undo"]'));
 click(d.querySelector('.msg[data-i="0"] .bub'));await wait(120);
 click(d.querySelector('[data-a="edit"][data-i="0"]'));await wait(140);
 d.querySelector('#em').value='Alpha twice';
 click(d.querySelector('[data-a="savem"]'));await wait(180);
 ok('two edits leave two undo buttons',d.querySelectorAll('#sn [data-a="undo"]').length===2);
 click(d.querySelectorAll('#sn [data-a="undo"]')[1]);await wait(180);
 ok('undoing the newest edit returns the previous text',W.eval('S.chats.c2')[0].t==='Alpha edited');
 ok('the older edit undo is still offered',d.querySelectorAll('#sn [data-a="undo"]').length===1);
 click(d.querySelector('#sn [data-a="undo"]'));await wait(180);
 ok('undoing the older edit returns the original text',W.eval('S.chats.c2')[0].t==='Alpha');
 ok('edit undo stack is empty',W.eval('UNDO.length')===0);

 // reply swipes
 await leaveChat();await openChat('c1');
 ok('swipe chat is ready',d.querySelectorAll('main .msg').length===3);
 ok('older reply starts on its middle version',W.eval('S.chats.c1')[0].i===1);
 await swipeEl(d.querySelector('.msg[data-i="0"] .bub'),-80);
 ok('swipe left moves to the next version',W.eval('S.chats.c1')[0].i===2&&W.eval('S.chats.c1')[0].t==='Three');
 click(d.querySelector('.msg[data-i="0"] .bub'));
 ok('a swipe does not open the message tools',W.eval('V.edit')===null);
 await wait(400);
 await swipeEl(d.querySelector('.msg[data-i="0"] .bub'),80);
 ok('swipe right moves to the previous version',W.eval('S.chats.c1')[0].i===1&&W.eval('S.chats.c1')[0].t==='Two');
 await swipeEl(d.querySelector('.msg[data-i="0"] .bub'),-80);
 await swipeEl(d.querySelector('.msg[data-i="0"] .bub'),-80);
 ok('an older reply stops at its last version',W.eval('S.chats.c1')[0].i===2);
 await swipeEl(d.querySelector('.msg[data-i="2"] .bub'),80);
 ok('the newest reply stops at its first version',W.eval('S.chats.c1')[2].i===0);
 await swipeEl(d.querySelector('.msg[data-i="2"] .bub'),-80);
 ok('swipe left advances the newest reply',W.eval('S.chats.c1')[2].i===1&&W.eval('S.chats.c1')[2].t==='Latest');
 W.eval("window.__swipeGen='';gen=function(m){window.__swipeGen=m}");
 await swipeEl(d.querySelector('.msg[data-i="2"] .bub'),-80);
 ok('swiping past the final version keeps the current reply',W.eval('window.__swipeGen')==='');
 click(d.querySelector('.reply-versions [data-a="regen"]'));
 ok('New reply explicitly requests generation',W.eval('window.__swipeGen')==='swipe');

 // alternate greetings in a Discover preview
 await leaveChat();
 W.eval("V.prev={c:{id:'pv1',name:'Preview',first:'First opening',alts:['Second opening','Third opening'],about:'A preview character.',tags:[],img:''},src:'hub',lore:0};V.tab='prev';V.gi=0;render()");
 await wait(160);
 ok('preview shows the first greeting',d.querySelector('.gtext')?.textContent.includes('First opening'));
 click(d.querySelector('[data-a="gnav"][data-d="1"]'));await wait(140);
 ok('preview advances to the first alternative',W.eval('V.gi')===1&&d.querySelector('.gtext')?.textContent.includes('Second opening'));
 click(d.querySelector('[data-a="gnav"][data-d="1"]'));await wait(140);
 ok('preview advances to the next alternative',W.eval('V.gi')===2&&d.querySelector('.gtext')?.textContent.includes('Third opening'));
 click(d.querySelector('[data-a="gnav"][data-d="-1"]'));await wait(140);
 ok('preview goes back to the previous alternative',W.eval('V.gi')===1&&d.querySelector('.gtext')?.textContent.includes('Second opening'));
 ok('no runtime errors at the end',errors.length===0);
 if(errors.length)console.log(errors.join('\n'));
 console.log(out.join('\n'));
 const fails=out.filter(x=>x.startsWith('FAIL'));
 console.log(`\n${out.length-fails.length}/${out.length} checks passed`);
 setTimeout(()=>process.exit(fails.length?1:0),50);
})().catch(e=>{console.error('SUITE ERROR',e);process.exit(1)});
