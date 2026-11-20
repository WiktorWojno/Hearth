/* Build 43: Discover search relevance, tags, filters and QOL. */
const fs=require('fs');
const path=require('path');
const {JSDOM,VirtualConsole}=require('jsdom');
const html=fs.readFileSync(path.join(__dirname,'..','www','index.html'),'utf8');
const errors=[];const vc=new VirtualConsole();
vc.on('jsdomError',e=>errors.push('jsdomError: '+e.message));
vc.on('error',(...a)=>errors.push('console.error: '+a.map(x=>x&&x.stack?x.stack:x).join(' ')));
const seed={
 chars:[{id:'c1',name:'Aria',desc:'A forest spirit.',first:'Hello {{user}}.',alts:[],tags:[],img:''}],
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
  const p=new URL(u),tags=(p.searchParams.get('tags')||'').split(',').filter(Boolean).map(x=>x.toLowerCase()),any=p.searchParams.get('inclusive_or')==='true';
  let result=nodes;
  if(tags.length)result=nodes.filter(n=>any?tags.some(t=>n.topics.map(x=>x.toLowerCase()).includes(t)):tags.every(t=>n.topics.map(x=>x.toLowerCase()).includes(t)));
  return {status:200,ok:true,headers:{get:()=>null},json:async()=>({data:{nodes:result,total:result.length}}),text:async()=>''};
 }
 return {status:404,ok:false,headers:{get:()=>null},json:async()=>({}),text:async()=>'no'};
};
(async()=>{
 await wait(800);
 ok('boots clean',errors.length===0);
 const VER=W.eval('VER');
 ok('build is at least 43',VER>=43&&new RegExp('build '+VER).test(d.body.textContent));

 // release notes
 ok('catalog banner appears on Home',!!d.querySelector('main .banner[data-a="tab"][data-id="news"]'));
 click(d.querySelector('main .banner[data-a="tab"][data-id="news"]'));await wait(200);
 ok('catalog opens',d.querySelector('h1.pt')?.textContent==='What’s new');
 const rel43=[...d.querySelectorAll('.rel')].find(x=>x.querySelector('.relv')?.textContent==='43');
 ok('catalog includes build 43',!!rel43);
 const rel43items=rel43?[...rel43.querySelectorAll('.rell li')]:[];
 ok('catalog documents relevance',rel43items.some(x=>/relevance/i.test(x.textContent)));
 ok('catalog documents tag filters',rel43items.some(x=>/tag/i.test(x.textContent)));
 ok('catalog documents recent searches',rel43items.some(x=>/recent|search option/i.test(x.textContent)));
 ok('catalog documents more sites',rel43items.some(x=>/JannyAI|JanitorAI/i.test(x.textContent)));
 await toHome();

 // browse
 await tab('chars');
 click(d.querySelector('[data-a="browse"]'));await wait(1000);
 ok('Discover opens',d.querySelector('h1.pt')?.textContent==='Discover');
 ok('default search is relevance',calls.some(u=>/api\.chub\.ai\/search/.test(u)&&/sort=relevance/.test(u)));
 ok('sort offers relevance',!!d.querySelector('#bs option[value="relevance"]'));
 ok('search options are available',!!d.querySelector('#bex')&&!!d.querySelector('#bfl')&&!!d.querySelector('#blore')&&!!d.querySelector('#balt'));
 ok('tag input is available',!!d.querySelector('#btag')&&!!d.querySelector('[data-a="btagadd"]'));
 ok('all three results are shown',d.querySelectorAll('.bc').length===3);
 ok('result count is shown',/3\s+characters/.test(d.querySelector('.bresult')?.textContent||''));
 ok('cards show tags',d.querySelectorAll('.bc .bctags .chip').length>=4);
 ok('recent searches start empty',(W.eval('S.disc.recent')||[]).length===0);

 // tag filter (all)

 click(d.querySelector('.bc [data-a="btag"][data-tag="Fantasy"]'));await wait(220);
 ok('tag filter is selected',W.eval('V.br.tags').length===1&&W.eval('V.br.tags[0]')==='Fantasy');
 ok('tag filter is sent to the hub',calls.some(u=>{try{return new URL(u).searchParams.get('tags')==='Fantasy'}catch(e){return false}}));
 ok('tag filter is marked active',!!d.querySelector('.chip.on[data-tag="Fantasy"]'));
 ok('tag filter narrows results',d.querySelectorAll('.bc').length===2);
 click(d.querySelector('.bc [data-a="btag"][data-tag="Adventure"]'));await wait(220);
 ok('multiple tags can be selected',W.eval('V.br.tags').length===2);
 ok('all-tag matching is the default',W.eval('V.br.match')==='all');
 ok('all-tag matching narrows to one',d.querySelectorAll('.bc').length===1);
 const anyBox=d.querySelector('#bmatch');anyBox.checked=false;anyBox.dispatchEvent(new W.Event('change',{bubbles:true}));await wait(220);
 ok('any-tag matching can be chosen',W.eval('V.br.match')==='any');
 ok('any-tag matching widens results',d.querySelectorAll('.bc').length===2);
 ok('any-tag matching is sent to the hub',calls.some(u=>{try{return new URL(u).searchParams.get('inclusive_or')==='true'}catch(e){return false}}));
 click(d.querySelector('[data-a="btagclear"]'));await wait(220);
 ok('tags can be cleared',W.eval('V.br.tags').length===0&&d.querySelectorAll('.bc').length===3);

 // query, recent history and exact phrase
 const bq=d.querySelector('#bq');bq.value='dragon';
 click(d.querySelector('[data-a="bsearch"]'));await wait(220);
 ok('search uses the query',calls.some(u=>{try{return new URL(u).searchParams.get('search')==='dragon'}catch(e){return false}}));
 ok('recent search is saved',W.eval('S.disc.recent')[0]==='dragon');
 ok('recent search chip is shown',!!d.querySelector('[data-a="brecent"][data-q="dragon"]'));
 ok('clear-search control is available',!!d.querySelector('[data-a="bclear"]'));
 const ex=d.querySelector('#bex');ex.checked=true;ex.dispatchEvent(new W.Event('change',{bubbles:true}));await wait(220);
 ok('exact phrase is sent instead of search',calls.some(u=>{try{const p=new URL(u);return p.searchParams.get('exact_search')==='dragon'&&!p.searchParams.has('search')}catch(e){return false}}));
 const bfl=d.querySelector('#bfl');bfl.checked=true;bfl.dispatchEvent(new W.Event('change',{bubbles:true}));await wait(160);
 const blore=d.querySelector('#blore');blore.checked=true;blore.dispatchEvent(new W.Event('change',{bubbles:true}));await wait(160);
 const balt=d.querySelector('#balt');balt.checked=true;balt.dispatchEvent(new W.Event('change',{bubbles:true}));await wait(160);
 ok('fork, lore and greeting filters are sent',calls.some(u=>{try{const p=new URL(u);return p.searchParams.get('include_forks')==='true'&&p.searchParams.get('require_lore')==='true'&&p.searchParams.get('require_alternate_greetings')==='true'}catch(e){return false}}));
 const bmin=d.querySelector('#bmin');bmin.value='1000';bmin.dispatchEvent(new W.Event('change',{bubbles:true}));await wait(160);
 ok('minimum length filter is sent',calls.some(u=>{try{return new URL(u).searchParams.get('min_tokens')==='1000'}catch(e){return false}}));

 // local result filter
 const bl=d.querySelector('#bl');bl.value='Cyra';bl.dispatchEvent(new W.Event('input',{bubbles:true}));await wait(120);
 ok('loaded results can be filtered',W.eval('V.br.local')==='Cyra'&&d.querySelectorAll('.bc').length===1);
 ok('filtered count reflects the visible rows',/1\s+character/.test(d.querySelector('.bresult')?.textContent||''));
 const bl2=d.querySelector('#bl');bl2.value='';bl2.dispatchEvent(new W.Event('input',{bubbles:true}));await wait(120);
 ok('loaded-result filter can be cleared',d.querySelectorAll('.bc').length===3);

 // reset and recent chips
 click(d.querySelector('[data-a="breset"]'));await wait(240);
 ok('reset restores the default filters',W.eval('V.br.sort')==='relevance'&&W.eval('V.br.tags').length===0&&W.eval('V.br.exact')===false&&W.eval('V.br.q')==='');
 ok('reset clears the search box',d.querySelector('#bq').value==='');
 click(d.querySelector('[data-a="brecent"][data-q="dragon"]'));await wait(220);
 ok('recent search chip runs the search',W.eval('V.br.q')==='dragon'&&d.querySelector('#bq').value==='dragon');
 const tagbox=d.querySelector('#btag');tagbox.value='Mystery';click(d.querySelector('[data-a="btagadd"]'));await wait(220);
 ok('manual tag filters can be added',W.eval('V.br.tags').includes('Mystery'));
 ok('manual tag filter is sent to the hub',calls.some(u=>{try{return new URL(u).searchParams.get('tags')==='Mystery'}catch(e){return false}}));
 click(d.querySelector('[data-a="btagclear"]'));await wait(220);

 // more sites and QOL controls
 W.eval("V.br.q='dragon';render()");
 const links=[...d.querySelectorAll('a.chip')].map(x=>x.href);
 ok('more sites are offered',links.some(x=>/chub\.ai/.test(x))&&links.some(x=>/characterhub\.org/.test(x))&&links.some(x=>/jannyai\.com/.test(x))&&links.some(x=>/janitorai\.com/.test(x)));
 ok('more-site links keep the query',links.some(x=>/dragon/.test(x)));
 ok('Surprise me is available',!!d.querySelector('[data-a="bsurprise"]'));
 ok('link import is available',!!d.querySelector('#bu')&&!!d.querySelector('[data-a="burl"]'));
 calls=[];await W.eval("urlImport('https://janitorai.com/characters/abc_slug')");await wait(80);
 ok('JanitorAI links use the JannyAI mirror',calls.includes('https://jannyai.com/characters/abc'));
 ok('loaded-result filter is available',!!d.querySelector('#bl'));
 ok('no runtime errors at the end',errors.length===0);
 if(errors.length)console.log(errors.join('\n'));
 console.log(out.join('\n'));
 const fails=out.filter(x=>x.startsWith('FAIL'));
 console.log(`\n${out.length-fails.length}/${out.length} checks passed`);
 setTimeout(()=>process.exit(fails.length?1:0),50);
})().catch(e=>{console.error('SUITE ERROR',e);process.exit(1)});
