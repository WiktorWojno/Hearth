/* Build 45: compact chat options, lorebook cleanup and the motion system. */
const fs=require('fs');
const path=require('path');
const {JSDOM,VirtualConsole}=require('jsdom');
const html=fs.readFileSync(path.join(__dirname,'..','www','index.html'),'utf8');
const errors=[];const vc=new VirtualConsole();
vc.on('jsdomError',e=>errors.push('jsdomError: '+e.message));
vc.on('error',(...a)=>errors.push('console.error: '+a.map(x=>x&&x.stack?x.stack:x).join(' ')));
const seed={
 chars:[{id:'c1',name:'Aria',desc:'A forest spirit.',first:'Hello {{user}}.',alts:[],tags:[],img:''}],
 books:[{id:'b1',name:'Ashfall',desc:'A quiet world.',entries:[{name:'Gate',keys:['gate'],content:'The gate is old.',on:true}]}],
 personas:[{id:'p1',name:'Wanderer',desc:'A traveller.'}],
 chats:{c1:[{r:'c',t:'Hello.',ts:Date.now()-5000},{r:'u',t:'Hi.',ts:Date.now()-4000}]},
 old:{c1:[{id:'old1',t:Date.now()-8000,msgs:[{r:'c',t:'An older beginning.'}],title:'Before'}]},
 links:{c1:['b1']},persona:'p1',cp:{},act:{c1:Date.now()},
 title:{c1:'Lanterns'},pin:{c1:1},
 provs:[],models:[],cfg:{auto:false}
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
async function appearanceChat(){
 await tab('me');
 click(d.querySelector('[data-a="tab"][data-id="appr"]'));await wait(160);
 click(d.querySelector('[data-a="tab"][data-id="apChat"]'));await wait(160);
}
async function openChat(id){
 if(!d.querySelector('nav.tb'))await toHome();
 await tab('chars');
 click(d.querySelector(`.hc[data-a="cview"][data-id="${id}"]`));await wait(140);
 click(d.querySelector(`[data-a="open"][data-id="${id}"]`));await wait(200);
}
(async()=>{
 await wait(1600);
 ok('boots clean',errors.length===0);
 ok('build is 45',W.eval('VER')===45&&new RegExp('build 45').test(d.body.textContent));
 ok('splash has finished and been removed',W.eval('BOOT_DONE')===true&&!d.querySelector('#boot'));
 W.eval('render()');
 ok('splash does not return on later redraws',!d.querySelector('#boot'));

 // release notes
 ok('catalog banner appears on Home',!!d.querySelector('main .banner[data-a="tab"][data-id="news"]'));
 click(d.querySelector('main .banner[data-a="tab"][data-id="news"]'));await wait(180);
 const rel45=[...d.querySelectorAll('.rel')].find(x=>x.querySelector('.relv')?.textContent==='45');
 ok('catalog includes build 45',!!rel45);
 const items=rel45?[...rel45.querySelectorAll('.rell li')]:[];
 ok('catalog documents compact chat options',items.some(x=>/chat options/i.test(x.textContent)&&/group/i.test(x.textContent)));
 ok('catalog documents the lorebook cleanup',items.some(x=>/lorebook/i.test(x.textContent)&&/edit character/i.test(x.textContent)));
 ok('catalog documents the splash',items.some(x=>/splash/i.test(x.textContent)&&/petal/i.test(x.textContent)));
 ok('catalog documents the motion setting',items.some(x=>/motion/i.test(x.textContent)&&/subtle/i.test(x.textContent)));
 await toHome();

 // default lorebooks tab and motion
 ok('Lorebooks tab is shown by default',!!d.querySelector('nav.tb [data-id="lore"]'));
 ok('full motion is the default',d.documentElement.dataset.motion==='full'&&W.eval('S.look.motion')==='full');

 // motion setting
 await appearanceChat();
 const full=d.querySelector('[data-a="look"][data-k="motion"][data-v="full"]');
 const off=d.querySelector('[data-a="look"][data-k="motion"][data-v="off"]');
 ok('motion choices are in Appearance → Chat',!!full&&!!off&&full.classList.contains('on'));
 click(off);await wait(120);
 ok('motion can be turned off',W.eval('S.look.motion')==='off'&&d.documentElement.dataset.motion==='off');
 click(d.querySelector('[data-a="look"][data-k="motion"][data-v="full"]'));await wait(120);
 ok('motion can be turned back on',W.eval('S.look.motion')==='full'&&d.documentElement.dataset.motion==='full');

 // hide lorebooks without deleting data
 const hide=d.querySelector('[data-a="look"][data-k="loreTab"][data-v="false"]');
 const show=d.querySelector('[data-a="look"][data-k="loreTab"][data-v="true"]');
 ok('lorebook visibility choice is available',!!hide&&!!show&&show.classList.contains('on'));
 click(hide);await wait(120);
 ok('lorebooks can be hidden',W.eval('S.look.loreTab')===false);
 await toHome();
 ok('hidden lorebooks leave the tab bar',!d.querySelector('nav.tb [data-id="lore"]'));
 ok('hiding lorebooks keeps the book data',W.eval('S.books.length')===1&&W.eval('S.links.c1[0]')==='b1');
 await appearanceChat();
 click(d.querySelector('[data-a="look"][data-k="loreTab"][data-v="true"]'));await wait(120);
 await toHome();
 ok('lorebooks can be shown again',W.eval('S.look.loreTab')===true&&!!d.querySelector('nav.tb [data-id="lore"]'));

 // skeleton while Discover is loading
 await tab('chars');
 click(d.querySelector('[data-a="browse"]'));await wait(1000);
 W.eval("V.br.busy=true;V.br.items=[];V.br.err='';V.br.note='';render()");
 ok('Discover shows a loading skeleton',d.querySelectorAll('.bsk .brow').length===3);
 W.eval('V.br.busy=false;render()');
 ok('skeleton disappears when loading ends',!d.querySelector('.bsk'));
 await toHome();

 // chat options
 await openChat('c1');
 click(d.querySelector('[data-a="set"]'));await wait(160);
 const sheet=d.querySelector('#sh .sheet');
 ok('chat options open',!!sheet&&/Chat options/.test(sheet.textContent||''));
 ok('chat options have a close button',!!sheet?.querySelector('.opt-head [data-a="close"]'));
 ok('chat options use grouped sections',['Chat settings','This chat','Tools','Character'].every(x=>[...sheet.querySelectorAll('.optsec h3')].some(h=>h.textContent===x)));
 ok('selectors are compact rows',sheet.querySelectorAll('select#ps + button.optrow, select#rm + button.optrow, select#bgs + button.optrow').length===3);
 ok('name row shows the chat title',sheet.querySelector('[data-a="retitle"] .ov')?.textContent==='Lanterns');
 ok('pin row shows the pinned state',/Pinned/.test(sheet.querySelector('[data-a="pinchat"]')?.textContent||'')&&sheet.querySelector('[data-a="pinchat"] .switch')?.classList.contains('on'));
 ok('branches row shows the count',sheet.querySelector('[data-a="chats"] .ov')?.textContent==='2');
 ok('tools are a four-button grid',sheet.querySelectorAll('.optgrid .optbtn').length===4);
 ok('edit character is its own row',/Edit character/.test(sheet.querySelector('[data-a="editc"]')?.textContent||''));
 ok('delete character is in a danger zone',!!sheet.querySelector('.optdanger [data-a="delchar"]'));
 ok('lorebook checklist is gone from chat options',!sheet.querySelector('input[data-b]')&&!/Lorebooks for this character/.test(sheet.textContent||''));
 ok('search all and done are gone',!/Search all/.test(sheet.textContent||'')&&!/^Done$/.test(sheet.querySelector('.acts')?.textContent||''));
 click(sheet.querySelector('.opt-head [data-a="close"]'));await wait(140);
 ok('close button closes chat options',!d.querySelector('#sh .sheet'));

 // jump-to-latest control
 const jump=d.querySelector('#jump');
 ok('jump-to-latest exists in chat',!!jump&&!jump.classList.contains('show'));
 W.eval('V.stick=false;render()');
 ok('jump-to-latest appears after scrolling up',d.querySelector('#jump')?.classList.contains('show'));
 click(d.querySelector('#jump'));await wait(120);
 ok('jump-to-latest returns to the newest message',W.eval('V.stick')===true&&!d.querySelector('#jump')?.classList.contains('show'));
 W.eval('V.busy=true;V.stick=false;render()');
 click(d.querySelector('#jump'));
 ok('jump-to-latest works while a reply is streaming',W.eval('V.stick')===true);
 W.eval('V.busy=false;render()');

 // one-time message entrance
 W.eval("V.animMsg={cid:'c1',i:1};render()");
 ok('a new message can animate in',!!d.querySelector('.msg.anim'));
 W.eval('render()');
 ok('the entrance class is not replayed on the next draw',W.eval('V.animMsg')===null&&!d.querySelector('.msg.anim'));

 // lorebook attachment still lives in the character editor
 click(d.querySelector('[data-a="set"]'));await wait(140);
 click(d.querySelector('[data-a="editc"]'));await wait(180);
 ok('lorebook attachment remains in Edit character',!!d.querySelector('input[data-lk="b1"]'));
 ok('lorebook entries are still intact',W.eval('S.books[0].entries.length')===1);

 ok('no runtime errors at the end',errors.length===0);
 if(errors.length)console.log(errors.join('\n'));
 console.log(out.join('\n'));
 const fails=out.filter(x=>x.startsWith('FAIL'));
 console.log(`\n${out.length-fails.length}/${out.length} checks passed`);
 setTimeout(()=>process.exit(fails.length?1:0),50);
})().catch(e=>{console.error('SUITE ERROR',e);process.exit(1)});
