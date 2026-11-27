/* Build 49: Discover imports bring linked Chub lorebooks, without duplicates. */
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
 chars:[{id:'c1',name:'Aria',desc:'A forest spirit.',first:'Hello.',alts:[],tags:[],img:''}],
 books:[],personas:[{id:'p1',name:'Wanderer'}],
 chats:{},old:{},links:{},persona:'p1',provs:[],models:[],cfg:{auto:false}
};
const dom=new JSDOM(html,{url:'http://localhost:8080/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.TextDecoder=TextDecoder;w.TextEncoder=TextEncoder;
 w.matchMedia=w.matchMedia||(q=>({matches:false,media:q,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}}));
 w.Element.prototype.scrollIntoView=()=>{};
 Object.defineProperty(w.navigator,'storage',{value:{persisted:async()=>false,persist:async()=>true},configurable:true});
 try{w.localStorage.setItem('hearth',JSON.stringify(seed))}catch(e){}
 w.fetch=async()=>({status:404,ok:false,headers:{get:()=>null},text:async()=>'no',json:async()=>({})});
}});
const d=dom.window.document,W=dom.window;
const click=el=>{if(!el)throw new Error('missing click target');el.dispatchEvent(new W.MouseEvent('click',{bubbles:true,cancelable:true}))};

function tinyPng(card){
 const sig=Buffer.from([137,80,78,71,13,10,26,10]);
 const body=Buffer.from('chara\0'+Buffer.from(JSON.stringify(card)).toString('base64'),'latin1');
 const len=Buffer.alloc(4);len.writeUInt32BE(body.length);
 return Buffer.concat([sig,len,Buffer.from('tEXt'),body,Buffer.alloc(4)]);
}
class FakeFile{constructor(parts,name,opts){this._u=parts[0];this.name=name;this.type=opts?.type||''}
 async arrayBuffer(){const u=this._u;return u.buffer.slice(u.byteOffset,u.byteOffset+u.byteLength)}
 async text(){return new TextDecoder().decode(await this.arrayBuffer())}}

(async()=>{
 // Static wiring.
 ok('build 49 is current',/var VER=49\b/.test(html));
 ok('release notes mention linked lorebooks',/v:49,when/.test(html)&&/Lorebooks come along/.test(html)&&/links to/.test(html));
 ok('Chub related lorebooks are read',/related_lorebooks/.test(html)&&/hubBookList/.test(html));
 ok('preview import attaches linked books',/attachHubBooks\(nid,p\.node,p\.fp\)/.test(html));
 ok('quick import attaches linked books',/attachHubBooks\(LASTC,null,fp\)/.test(html));
 ok('linked books are deduplicated by content',/bookSig/.test(html)&&/bySig\.get\(s\)/.test(html));
 ok('older entry fields are accepted',/e\.content\|\|e\.entry/.test(html));
 ok('root-level lorebooks are accepted',/d\.character_book\|\|j\.character_book/.test(html));
 ok('object entry maps are counted',/Object\.keys\(e\)\.length/.test(html));

 await wait(1200);

 // One linked book, then the same import again.
 W.nfetch=async url=>{
  if(url.includes('/api/characters/'))return{node:{name:'Card',related_lorebooks:[42]}};
  if(url.includes('/api/lorebooks/42'))return{node:{name:'World Book',definition:{embedded_lorebook:{name:'World Book',entries:[
   {keys:['lantern'],content:'Lanterns glow.'},{keys:['river'],content:'The river is cold.'}
  ]}}}};
  return{node:{}};
 };
 let added=await W.attachHubBooks('c1',{related_lorebooks:[42]},'someone/card');
 ok('a linked book is imported',added===1&&W.eval('S.books.length')===1&&W.eval('S.books[0].entries.length')===2);
 ok('the linked book is attached to the character',W.eval("(S.links.c1||[]).includes(S.books[0].id)"));
 added=await W.attachHubBooks('c1',{related_lorebooks:[42]},'someone/card');
 ok('importing the same book again adds nothing',added===0&&W.eval('S.books.length')===1);
 W.eval("S.chars.push({id:'c2',name:'Bram',first:'Hi.',alts:[],tags:[],img:''})");
 added=await W.attachHubBooks('c2',{related_lorebooks:[42]},'someone/card');
 ok('an existing book is reused for another character',added===0&&W.eval('S.books.length')===1&&W.eval("(S.links.c2||[]).includes(S.books[0].id)"));

 // A card with no linked IDs falls back to the character API's embedded book.
 W.nfetch=async url=>{
  if(url.includes('/api/characters/'))return{node:{name:'Solo',related_lorebooks:[],definition:{embedded_lorebook:{name:'Solo Book',entries:[{keys:['k'],content:'Solo entry.'}]}}}};
  return{node:{}};
 };
 added=await W.attachHubBooks('c1',{related_lorebooks:[]},'solo/card');
 ok('the API embedded book is a fallback',added===1&&W.eval('S.books.length')===2);

 // Parsing older and object-shaped books.
 const parsed=W.eval("normBook({name:'Old',entries:{a:{keys:['k'],content:'C'},b:{key:'q',entry:'E'}}},'x')");
 ok('object books keep their entries',parsed.entries.length===2);
 ok('entry is used when content is missing',parsed.entries[1].content==='E');
 ok('empty entries do not defeat deduplication',W.eval("bookSig({entries:[{content:'A'},{keys:['x']}]})")===W.eval("bookSig({entries:[{content:'A'}]})"));

 // Root-level book on a card.
 W.eval("S.chars=[];S.books=[];S.links={};addChar({name:'Rooty',character_book:{name:'Root Book',entries:[{keys:['k'],content:'C'}]}},'','','')");
 ok('a root-level book is attached',W.eval('S.books.length')===1&&W.eval('(S.links[S.chars[0].id]||[]).length')===1);

 // End to end: the Discover preview import button.
 W.eval("S.chars=[];S.books=[];S.links={};S.chats={};S.old={};V.prev=null;V.pq=null;thumb=async()=>''");
 W.File=FakeFile;
 W.nfetch=async url=>{
  if(url.includes('/api/lorebooks/42'))return{node:{name:'World Book',definition:{embedded_lorebook:{name:'World Book',entries:[{keys:['river'],content:'The river is cold.'}]}}}};
  return{node:{}};
 };
 const card={spec:'chara_card_v2',data:{name:'Linked Hero',first_mes:'Hi.',character_book:{name:'Embedded',entries:[{keys:['a'],content:'Embedded entry.'}]}}};
 const u8=new W.Uint8Array(tinyPng(card));
 W.__b=u8;
 W.eval(`V.prev=prevFrom({src:'hub',site:'chub',fp:'someone/card',bytes:__b,j:${JSON.stringify(card)},node:{related_lorebooks:[42]},img:''});V.prevBack='browse';V.tab='prev';V.cdt='story';render()`);
 const btn=d.querySelector('[data-a="pimp"]');
 ok('the Discover import button is available',!!btn);
 click(btn);await wait(500);
 ok('the card and both books are imported',W.eval('S.chars.length')===1&&W.eval('S.books.length')===2);
 ok('both books are attached to the new character',W.eval('(S.links[S.chars[0].id]||[]).length')===2);
 ok('the import opens the character',W.eval("V.tab")==='char'&&W.eval('V.cd')===W.eval('S.chars[0].id'));

 ok('no runtime errors',errors.length===0);
 if(errors.length)console.log(errors.join('\n'));
 console.log(out.join('\n'));
 console.log('\n'+out.filter(x=>x.startsWith('PASS')).length+'/'+out.length+' checks passed');
 setTimeout(()=>process.exit(out.some(x=>x.startsWith('FAIL'))?1:0),50);
})().catch(e=>{console.error('SUITE ERROR',e);process.exit(1)});
