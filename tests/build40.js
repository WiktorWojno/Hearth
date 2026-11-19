/* Build 40: release-notes catalog and windowed long chats. */
const fs=require('fs');
const path=require('path');
const {JSDOM,VirtualConsole}=require('jsdom');
const html=fs.readFileSync(path.join(__dirname,'..','www','index.html'),'utf8');
const errors=[];const vc=new VirtualConsole();
vc.on('jsdomError',e=>errors.push('jsdomError: '+e.message));
vc.on('error',(...a)=>errors.push('console.error: '+a.map(x=>x&&x.stack?x.stack:x).join(' ')));
const long=Array.from({length:200},(_,i)=>({r:i%2?'u':'c',t:i===5?'A needle in the haystack.':'Message '+i}));
const seed={
 chars:[
  {id:'c1',name:'Aria',desc:'A forest spirit.',first:'Hello {{user}}.',alts:[],tags:[],img:''},
  {id:'c2',name:'Borin',desc:'A dwarf.',first:'Yo {{user}}.',alts:[],tags:[],img:''}
 ],
 books:[],personas:[{id:'p1',name:'Wanderer',desc:'A traveller.'}],
 chats:{c1:long,c2:[{r:'u',t:'Hi there.'}]},
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
const saved=()=>JSON.parse(W.localStorage.getItem('hearth')||'{}');
const homeRows=()=>[...d.querySelectorAll('main .row[data-a="open"]')];
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
async function opts(){click(d.querySelector('[data-a="set"]'));await wait(160)}
async function closeSheet(){click(d.querySelector('#sh [data-a="close"]'));await wait(160)}
(async()=>{
 await wait(800);
 ok('boots clean',errors.length===0);
 const VER=W.eval('VER');
 ok('build is current',new RegExp('build '+VER).test(d.body.textContent));
 ok('catalog banner appears on Home',!!d.querySelector('main .banner[data-a="tab"][data-id="news"]'));
 ok('banner names the build',d.querySelector('main .banner[data-a="tab"][data-id="news"]')?.textContent.includes(String(VER)));

 // catalog
 click(d.querySelector('main .banner[data-a="tab"][data-id="news"]'));await wait(200);
 ok('catalog opens',d.querySelector('h1.pt')?.textContent==='What’s new');
 ok('catalog lists every build',d.querySelectorAll('.rel').length>=8);
 ok('latest build is marked',d.querySelector('.rel.cur .relv')?.textContent===String(VER));
 ok('latest badge is shown',d.querySelector('.rel.cur .badge.ok')?.textContent==='Latest');
 ok('catalog has release items',d.querySelectorAll('.rel.cur .rell li').length>=4);
 ok('build 39 is documented',[...d.querySelectorAll('.rel .relv')].some(x=>x.textContent==='39'));
 ok('catalog marks itself seen',saved().seen===VER);
 await toHome();
 ok('catalog banner is gone after reading',!d.querySelector('main .banner[data-a="tab"][data-id="news"]'));

 // profile entry and updates link
 await tab('me');
 const newsRow=d.querySelector('[data-a="tab"][data-id="news"]');
 ok('Profile has a What’s new row',!!newsRow&&newsRow.textContent.includes('What’s new'));
 ok('Profile row reports the build',newsRow?.textContent.includes(String(VER)));
 click(newsRow);await wait(180);
 ok('Profile row opens the catalog',d.querySelector('h1.pt')?.textContent==='What’s new');
 await toHome();await tab('me');
 click(d.querySelector('[data-a="tab"][data-id="upd"]'));await wait(180);
 const newsBtn=d.querySelector('[data-a="tab"][data-id="news"]');
 ok('Updates page links to the catalog',!!newsBtn&&newsBtn.textContent.includes('What’s new'));
 await toHome();

 // windowed chat
 await openChat('c1');
 let msgs=[...d.querySelectorAll('main .msg')];
 ok('long chat opens with a window',msgs.length===80);
 ok('window starts at message 120',msgs[0]?.dataset.i==='120');
 ok('window ends at the newest message',msgs[msgs.length-1]?.dataset.i==='199');
 const earlier=d.querySelector('[data-a="earlier"]');
 ok('earlier control is offered',!!earlier);
 ok('earlier control counts the rest',earlier?.textContent.includes('120 older'));
 click(earlier);await wait(200);
 msgs=[...d.querySelectorAll('main .msg')];
 ok('earlier loads another page',msgs.length===160);
 ok('earlier page starts at 40',msgs[0]?.dataset.i==='40');
 click(d.querySelector('[data-a="earlier"]'));await wait(200);
 msgs=[...d.querySelectorAll('main .msg')];
 ok('all messages can be loaded',msgs.length===200);
 ok('earlier control disappears at the start',!d.querySelector('[data-a="earlier"]'));

 // reopening resets the window
 await leaveChat();await openChat('c1');
 msgs=[...d.querySelectorAll('main .msg')];
 ok('reopening resets the window',msgs.length===80&&msgs[0]?.dataset.i==='120');

 // find reaches an old message and expands the window
 await opts();click(d.querySelector('#sh [data-a="chfind"]'));await wait(180);
 const fq=d.querySelector('#fq');
 ok('find field opens',!!fq);
 fq.value='needle';fq.dispatchEvent(new W.Event('input',{bubbles:true}));await wait(240);
 ok('find expands to an older match',!!d.querySelector('.msg[data-i="5"]'));
 ok('old message is highlighted',d.querySelector('.msg.cur')?.dataset.i==='5');
 ok('match text is marked',d.querySelector('mark.fhit')?.textContent==='needle');
 ok('find count is exact',d.querySelector('#fcount')?.textContent==='1 of 1 messages');
 await closeSheet();
 ok('window stays expanded after find',!!d.querySelector('.msg[data-i="5"]'));

 // absolute indices still drive edit and delete
 const last=d.querySelector('.msg[data-i="199"] .bub');
 click(last);await wait(160);
 const del=d.querySelector('[data-a="del"][data-i="199"]');
 ok('toolbar belongs to the clicked message',!!del);
 click(del);await wait(200);
 ok('delete removes the absolute message',W.eval('S.chats.c1.length')===199);
 ok('deleted text is gone',!W.eval('S.chats.c1').some(x=>x.t==='Message 199'));
 ok('undo is offered',!!d.querySelector('#sn [data-a="undo"]'));
 click(d.querySelector('#sn [data-a="undo"]'));await wait(180);
 ok('undo restores the message',W.eval('S.chats.c1.length')===200&&W.eval('S.chats.c1')[199].t==='Message 199');

 ok('no runtime errors at the end',errors.length===0);
 if(errors.length)console.log(errors.join('\n'));
 console.log(out.join('\n'));
 const fails=out.filter(x=>x.startsWith('FAIL'));
 console.log(`\n${out.length-fails.length}/${out.length} checks passed`);
 setTimeout(()=>process.exit(fails.length?1:0),50);
})().catch(e=>{console.error('SUITE ERROR',e);process.exit(1)});
