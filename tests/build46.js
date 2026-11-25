/* Build 46: a longer cold-start splash with a full drift of petals. */
const fs=require('fs');
const path=require('path');
const {JSDOM,VirtualConsole}=require('jsdom');
const html=fs.readFileSync(path.join(__dirname,'..','www','index.html'),'utf8');
const out=[];const ok=(n,c)=>{out.push((c?'PASS ':'FAIL ')+n);if(!c)process.exitCode=1};
const wait=ms=>new Promise(r=>setTimeout(r,ms));

function makeDom(reduced){
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
  w.matchMedia=w.matchMedia||(q=>({matches:reduced&&/prefers-reduced-motion/.test(q),media:q,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}}));
  w.Element.prototype.scrollIntoView=()=>{};
  Object.defineProperty(w.navigator,'storage',{value:{persisted:async()=>false,persist:async()=>true},configurable:true});
  try{w.localStorage.setItem('hearth',JSON.stringify(seed))}catch(e){}
  w.fetch=async()=>({status:404,ok:false,headers:{get:()=>null},text:async()=>'no',json:async()=>({})});
 }});
 return {d:dom.window.document,W:dom.window,errors};
}

(async()=>{
 // Splash copy and style: ten petals that cross the whole screen.
 ok('build 46 shipped',/var VER=(?:4[6-9]|[5-9]\d)/.test(html)&&/v:46,when/.test(html));
 ok('splash markup carries ten petals',(html.match(/<i class="petal"><\/i>/g)||[]).length===10);
 ok('petals have individual fall timing',(html.match(/--pdl:/g)||[]).length===10);
 ok('petal drift spans the screen',/106vh/.test(html)&&/petalFall/.test(html));
 ok('icon has a soft halo',/bootHalo/.test(html));
 ok('release notes describe the longer splash',/A slower, softer hello/.test(html)&&/about three seconds/.test(html));

 // Natural run: still visible well past the old ~1s cut-off.
 const a=makeDom(false);
 await wait(1600);
 ok('splash still up at 1.6s',!!a.d.querySelector('#boot'));
 ok('splash has ten petals in the page',a.d.querySelectorAll('#boot .petal').length===10);
 ok('app has drawn behind the splash',!!a.d.querySelector('#app')&&a.W.eval('BOOT_DONE')===true);
 await wait(1800);
 ok('splash removed after its hold',!a.d.querySelector('#boot'));
 ok('splash run is clean',a.errors.length===0);

 // Tap to skip: the same splash leaves quickly without waiting out the hold.
 const b=makeDom(false);
 await wait(600);
 ok('second splash is up before the tap',!!b.d.querySelector('#boot'));
 b.d.querySelector('#boot').dispatchEvent(new b.W.MouseEvent('click',{bubbles:true,cancelable:true}));
 await wait(850);
 ok('a tap skips the splash',!b.d.querySelector('#boot'));

 // Reduced motion: brief, still and not a long static frame.
 const c=makeDom(true);
 await wait(1500);
 ok('reduced motion keeps the splash brief',!c.d.querySelector('#boot'));

 console.log(out.join('\n'));
 console.log('\n'+out.filter(x=>x.startsWith('PASS')).length+'/'+out.length+' checks passed');
 setTimeout(()=>process.exit(out.some(x=>x.startsWith('FAIL'))?1:0),50);
})().catch(e=>{console.error('SUITE ERROR',e);process.exit(1)});
