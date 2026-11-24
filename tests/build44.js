/* Build 44: Discover sort, NSFW and tag suggestions. */
const fs=require('fs');
const path=require('path');
const {JSDOM,VirtualConsole}=require('jsdom');
const html=fs.readFileSync(path.join(__dirname,'..','www','index.html'),'utf8');
const errors=[];const vc=new VirtualConsole();
vc.on('jsdomError',e=>errors.push('jsdomError: '+e.message));
vc.on('error',(...a)=>errors.push('console.error: '+a.map(x=>x&&x.stack?x.stack:x).join(' ')));
const seed={
 chars:[{id:'c1',name:'Aria',desc:'A forest spirit.',first:'Hello {{user}}.',alts:[],tags:['Fantasy'],img:''}],
 books:[],personas:[{id:'p1',name:'Wanderer',desc:'A traveller.'}],
 chats:{},links:{},persona:'p1',cp:{},act:{},
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
const nodes=[
 {fullPath:'a/Aria',name:'Aria',tagline:'A forest spirit',topics:['Fantasy','Romance'],downloadCount:1200,starCount:88,nTokens:700,avatar_url:''},
 {fullPath:'b/Borin',name:'Borin',tagline:'A dwarf smith',topics:['Fantasy','Adventure'],downloadCount:800,starCount:44,nTokens:1100,avatar_url:''},
 {fullPath:'c/Cyra',name:'Cyra',tagline:'A space pilot',topics:['Sci-Fi'],downloadCount:300,starCount:12,nTokens:400,avatar_url:''}
];
let calls=[];
W.fetch=async url=>{
 const u=String(url);calls.push(u);
 if(u.includes('api.chub.ai/search')){
  const p=new URL(u),tags=(p.searchParams.get('topics')||p.searchParams.get('tags')||'').split(',').filter(Boolean).map(x=>x.toLowerCase()),any=p.searchParams.get('inclusive_or')==='true';
  let result=nodes;
  if(tags.length)result=nodes.filter(n=>any?tags.some(t=>n.topics.map(x=>x.toLowerCase()).includes(t)):tags.every(t=>n.topics.map(x=>x.toLowerCase()).includes(t)));
  return {status:200,ok:true,headers:{get:()=>null},json:async()=>({data:{nodes:result,count:42}}),text:async()=>''};
 }
 return {status:404,ok:false,headers:{get:()=>null},json:async()=>({}),text:async()=>'no'};
};
function pickSort(label){
 click(d.querySelector('[data-a="sel"][data-id="bs"]'));
 const row=[...d.querySelectorAll('[data-a="pickv"]')].find(x=>new RegExp(label,'i').test(x.textContent));
 click(row)}
const hasParam=(name,value)=>calls.some(u=>{try{const p=new URL(u);return /api\.chub\.ai\/search/.test(u)&&p.searchParams.get(name)===value}catch(e){return false}});
const noParam=name=>calls.some(u=>{try{const p=new URL(u);return /api\.chub\.ai\/search/.test(u)&&!p.searchParams.has(name)}catch(e){return false}});
(async()=>{
 await wait(800);
 ok('boots clean',errors.length===0);
 const VER=W.eval('VER');
 ok('build is at least 44',VER>=44&&new RegExp('build '+VER).test(d.body.textContent));

 // release notes
 ok('catalog banner appears on Home',!!d.querySelector('main .banner[data-a="tab"][data-id="news"]'));
 click(d.querySelector('main .banner[data-a="tab"][data-id="news"]'));await wait(200);
 const rel44=[...d.querySelectorAll('.rel')].find(x=>x.querySelector('.relv')?.textContent==='44');
 ok('catalog includes build 44',!!rel44);
 const items=rel44?[...rel44.querySelectorAll('.rell li')]:[];
 ok('catalog documents the sort fix',items.some(x=>/sort/i.test(x.textContent)));
 ok('catalog documents the NSFW fix',items.some(x=>/NSFW|NSFL/i.test(x.textContent)));
 ok('catalog documents tag suggestions',items.some(x=>/tag/i.test(x.textContent)&&/suggest/i.test(x.textContent)));
 await toHome();

 // discover
 await tab('chars');
 click(d.querySelector('[data-a="browse"]'));await wait(1000);
 ok('Discover opens',d.querySelector('h1.pt')?.textContent==='Discover');
 ok('relevance is the default',W.eval('V.br.sort')==='relevance');
 ok('relevance leaves sort to the hub',noParam('sort'));
 ok('result count uses the hub count',/3\s+characters/.test(d.querySelector('.bresult')?.textContent||'')&&/42\s+matches/.test(d.querySelector('.bresult')?.textContent||''));

 // sort
 pickSort('Most starred');await wait(240);
 ok('most starred reaches the hub',hasParam('sort','star_count'));
 pickSort('Newest');await wait(240);
 ok('newest uses creation order',W.eval('V.br.sort')==='id'&&hasParam('sort','id'));
 pickSort('Most relevant');await wait(240);
 ok('relevance omits sort again',W.eval('V.br.sort')==='relevance'&&noParam('sort'));
 ok('sort label follows the choice',/Most relevant/.test(d.querySelector('[data-a="sel"][data-id="bs"]')?.textContent||''));

 // NSFW
 let bn=d.querySelector('#bn');bn.checked=true;bn.dispatchEvent(new W.Event('change',{bubbles:true}));await wait(240);
 ok('NSFW toggle is saved',W.eval('V.br.nsfw')===true);
 ok('NSFW includes NSFL results',hasParam('nsfw','true')&&hasParam('nsfl','true'));
 bn=d.querySelector('#bn');bn.checked=false;bn.dispatchEvent(new W.Event('change',{bubbles:true}));await wait(240);
 ok('NSFW can be turned off',W.eval('V.br.nsfw')===false&&hasParam('nsfw','false')&&hasParam('nsfl','false'));

 // tag suggestions
 const box=d.querySelector('#btagsug');
 ok('common tag suggestions are shown',!!box&&!box.hidden&&/Common tags/.test(box.textContent||''));
 const tagInput=d.querySelector('#btag');tagInput.value='fan';tagInput.dispatchEvent(new W.Event('input',{bubbles:true}));await wait(60);
 const suggest=[...d.querySelectorAll('#btagsug [data-a="btag"]')].find(x=>x.dataset.tag==='Fantasy');
 ok('tag suggestions follow typing',!!suggest&&/Matching tags/.test(box.textContent||''));
 click(suggest);await wait(240);
 ok('a suggestion can be added',W.eval('V.br.tags').includes('Fantasy'));
 ok('suggested tags filter the hub',hasParam('topics','Fantasy'));
 ok('selected tags are marked',!!d.querySelector('.chip.on[data-tag="Fantasy"]'));
 click(d.querySelector('[data-a="btagclear"]'));await wait(220);
 ok('tags can be cleared',W.eval('V.br.tags').length===0);

 ok('no runtime errors at the end',errors.length===0);
 if(errors.length)console.log(errors.join('\n'));
 console.log(out.join('\n'));
 const fails=out.filter(x=>x.startsWith('FAIL'));
 console.log(`\n${out.length-fails.length}/${out.length} checks passed`);
 setTimeout(()=>process.exit(fails.length?1:0),50);
})().catch(e=>{console.error('SUITE ERROR',e);process.exit(1)});
