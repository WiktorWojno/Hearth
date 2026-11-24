/* Build 42: branches, regeneration, message times and edited markers. */
const fs=require('fs');
const path=require('path');
const {JSDOM,VirtualConsole}=require('jsdom');
const html=fs.readFileSync(path.join(__dirname,'..','www','index.html'),'utf8');
const errors=[];const vc=new VirtualConsole();
vc.on('jsdomError',e=>errors.push('jsdomError: '+e.message));
vc.on('error',(...a)=>errors.push('console.error: '+a.map(x=>x&&x.stack?x.stack:x).join(' ')));
const now=Date.now();
const seed={
 chars:[{id:'c1',name:'Aria',desc:'A forest spirit.',first:'Hello {{user}}.',alts:['Another hello.'],tags:[],img:''}],
 books:[],personas:[{id:'p1',name:'Wanderer',desc:'A traveller.'}],
 chats:{c1:[
  {r:'c',t:'Opening line.',ts:now-50000},
  {r:'u',t:'First question.',ts:now-40000},
  {r:'c',t:'First answer.',ts:now-30000,et:now-20000},
  {r:'u',t:'Second question.',ts:now-15000},
  {r:'c',t:'Second answer.',ts:now-10000}
 ]},
 links:{},old:{},persona:'p1',cp:{},act:{c1:now},title:{c1:'Original timeline'},
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
async function openChats(){
 click(d.querySelector('[data-a="set"]'));await wait(140);
 click(d.querySelector('[data-a="chats"]'));await wait(140);
}
(async()=>{
 await wait(800);
 ok('boots clean',errors.length===0);
 const VER=W.eval('VER');
 ok('build is at least 42',VER>=42&&new RegExp('build '+VER).test(d.body.textContent));

 // release notes
 ok('catalog banner appears on Home',!!d.querySelector('main .banner[data-a="tab"][data-id="news"]'));
 click(d.querySelector('main .banner[data-a="tab"][data-id="news"]'));await wait(200);
 ok('catalog opens',d.querySelector('h1.pt')?.textContent==='What’s new');
 const rel42=[...d.querySelectorAll('.rel')].find(x=>x.querySelector('.relv')?.textContent==='42');
 ok('catalog marks the current build',d.querySelector('.rel.cur .relv')?.textContent===String(VER));
 ok('catalog includes build 42',!!rel42);
 const rel42items=rel42?[...rel42.querySelectorAll('.rell li')]:[];
 ok('catalog documents branches',rel42items.some(x=>/branch/i.test(x.textContent)));
 ok('catalog documents regeneration',rel42items.some(x=>/regenerat/i.test(x.textContent)));
 ok('catalog documents message times',rel42items.some(x=>/time/i.test(x.textContent)&&/edited/i.test(x.textContent)));
 await toHome();

 // message details
 await openChat('c1');
 ok('branch chat is ready',d.querySelectorAll('main .msg').length===5);
 ok('message times are shown',d.querySelectorAll('main .msg .mmeta').length===5);
 ok('edited messages are marked',d.querySelector('.msg[data-i="2"] .mmeta')?.textContent.includes('edited'));
 W.eval("S.look.times=false;render()");
 ok('message details can be hidden',!d.querySelector('main .msg .mmeta'));
 W.eval("S.look.times=true;render()");

 // branch from a reply
 click(d.querySelector('.msg[data-i="2"] .bub'));await wait(120);
 ok('branch tool is offered',!!d.querySelector('[data-a="branch"][data-i="2"]'));
 ok('regenerate tool is offered',!!d.querySelector('[data-a="regenat"][data-i="2"]'));
 click(d.querySelector('[data-a="branch"][data-i="2"]'));await wait(180);
 ok('branch keeps the prefix',W.eval('S.chats.c1.length')===3);
 ok('branch preserves the original',W.eval('S.old.c1[0].msgs.length')===5);
 ok('branch gets a title',W.eval('S.title.c1')==='Branch at message 3');
 ok('branch closes the message tools',W.eval('V.edit')===null);

 // branch switcher
 click(d.querySelector('[data-a="set"]'));await wait(140);
 const branchBtn=d.querySelector('[data-a="chats"]');
 ok('branch switcher is available',/Branches & chats/.test(branchBtn?.textContent||'')&&branchBtn?.querySelector('.ov')?.textContent==='2');
 click(branchBtn);await wait(140);
 const sheet=d.querySelector('#sh')?.textContent||'';
 ok('branch switcher shows the current branch',/Current/.test(sheet)&&/Branch at message 3/.test(sheet));
 ok('branch switcher shows the original',/Original timeline/.test(sheet));
 ok('branch switcher shows the branch point',/branched at 3/.test(sheet));
 click(d.querySelector('#sh [data-a="sw"]'));await wait(200);
 ok('switching restores the original',W.eval('S.chats.c1.length')===5&&W.eval('S.title.c1')==='Original timeline');
 ok('the branch is preserved',W.eval('S.old.c1.length')===1&&W.eval('S.old.c1[0].msgs.length')===3);
 await openChats();
 click(d.querySelector('#sh [data-a="sw"]'));await wait(200);
 ok('switching returns to the branch',W.eval('S.chats.c1.length')===3&&W.eval('S.title.c1')==='Branch at message 3');

 // regenerate an earlier reply on a fresh branch
 await openChats();
 click(d.querySelector('#sh [data-a="sw"]'));await wait(200);
 ok('original is ready for regeneration',W.eval('S.chats.c1.length')===5);
 W.eval("window.__gen='';gen=function(m){window.__gen=m}");
 click(d.querySelector('.msg[data-i="2"] .bub'));await wait(120);
 click(d.querySelector('[data-a="regenat"][data-i="2"]'));await wait(180);
 ok('regenerate branches before the reply',W.eval('S.chats.c1.length')===2);
 ok('regenerate asks for a new reply',W.eval('window.__gen')==='new');
 ok('regenerate keeps the old branch',W.eval('S.old.c1.length')===2&&W.eval('S.old.c1[0].msgs.length')===5);
 ok('regenerate names the new branch',W.eval('S.title.c1')==='Regenerated reply at 3');

 // a user message can start a reply from its own branch point
 click(d.querySelector('.msg[data-i="1"] .bub'));await wait(120);
 ok('a user message offers a reply branch',d.querySelector('[data-a="regenat"][data-i="1"]')?.textContent==='Reply from here');
 click(d.querySelector('[data-a="regenat"][data-i="1"]'));await wait(180);
 ok('reply branch keeps the user message',W.eval('S.chats.c1.length')===2);
 ok('reply branch asks for a new reply',W.eval('window.__gen')==='new');
 ok('reply branch is named after the message',W.eval('S.title.c1')==='Reply at 2');

 // new messages carry timestamps; edits carry an edited marker
 const input=d.querySelector('#in');input.value='A new line.';
 click(d.querySelector('[data-a="send"]'));await wait(100);
 const sent=W.eval('S.chats.c1');ok('new messages carry a timestamp',typeof sent[sent.length-1].ts==='number');
 click(d.querySelector('.msg[data-i="1"] .bub'));await wait(120);
 click(d.querySelector('[data-a="edit"][data-i="1"]'));await wait(120);
 d.querySelector('#em').value='First question edited.';
 click(d.querySelector('[data-a="savem"]'));await wait(180);
 ok('edits carry an edited timestamp',typeof W.eval('S.chats.c1[1].et')==='number');
 ok('edited marker is visible after editing',d.querySelector('.msg[data-i="1"] .mmeta')?.textContent.includes('edited'));
 click(d.querySelector('#sn [data-a="undo"]'));await wait(180);
 ok('undo removes the edited marker',W.eval('S.chats.c1[1].et')===undefined);

 // an undo belongs to the branch where the change happened
 click(d.querySelector('.msg[data-i="1"] .bub'));await wait(120);
 click(d.querySelector('[data-a="del"][data-i="1"]'));await wait(160);
 const deletedLength=W.eval('S.chats.c1.length');
 ok('delete offers undo before switching branches',!!d.querySelector('#sn [data-a="undo"]'));
 await openChats();
 click(d.querySelector('#sh [data-a="sw"]'));await wait(200);
 const activeLength=W.eval('S.chats.c1.length'),hiddenLength=W.eval('S.old.c1[0].msgs.length');
 ok('switching branches keeps the delete undo',!!d.querySelector('#sn [data-a="undo"]'));
 click(d.querySelector('#sn [data-a="undo"]'));await wait(180);
 ok('undo restores into the branch where the delete happened',W.eval('S.old.c1[0].msgs.length')===deletedLength+1);
 ok('undo leaves the active branch alone',W.eval('S.chats.c1.length')===activeLength&&hiddenLength===deletedLength);

 ok('no runtime errors at the end',errors.length===0);
 if(errors.length)console.log(errors.join('\n'));
 console.log(out.join('\n'));
 const fails=out.filter(x=>x.startsWith('FAIL'));
 console.log(`\n${out.length-fails.length}/${out.length} checks passed`);
 setTimeout(()=>process.exit(fails.length?1:0),50);
})().catch(e=>{console.error('SUITE ERROR',e);process.exit(1)});
