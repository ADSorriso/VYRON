const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const STORAGE = 'vyron_minimal_v1';
let state = load() || { mode:'AUTO', project:null, files:[], sessions:[{id:uid(),title:'Nova sessão',messages:[]}], activeSession:null };
if(!state.activeSession) state.activeSession = state.sessions[0]?.id || null;

function uid(){ return Math.random().toString(36).slice(2,10); }
function load(){ try{return JSON.parse(localStorage.getItem(STORAGE))}catch{return null} }
function save(){ localStorage.setItem(STORAGE, JSON.stringify(state)); renderAll(); }
function escapeHTML(s=''){return s.replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}

function renderSessions(){
  const list=$('#sessionList'); list.innerHTML='';
  state.sessions.forEach(s=>{
    const b=document.createElement('button'); b.className='session-item'+(s.id===state.activeSession?' active':'');
    b.innerHTML=`<span class="bubble">▢</span><span>${escapeHTML(s.title||'Sessão')}</span>`;
    b.onclick=()=>{state.activeSession=s.id;save();showSession()}; list.appendChild(b);
  });
}
function renderProject(){
  $('#projectName').textContent=state.project?.name||'Nenhum projeto';
  $('#projectPath').textContent=state.project?`~/workspace/${state.project.name}`:'anexe arquivos ou crie um projeto';
  $('#fileCount').textContent=state.files.length; $('#statFiles').textContent=state.files.length; $('#statMode').textContent=state.mode;
  const fl=$('#fileList');
  if(!state.files.length) fl.innerHTML='<p class="muted">Nenhum arquivo carregado.</p>';
  else fl.innerHTML=state.files.slice(0,18).map(f=>`<div class="file-row"><span class="ficon">${f.isFolder?'▱':'▧'}</span><span>${escapeHTML(f.name)}</span></div>`).join('');
  const stack=detectStack(state.files.map(f=>f.name));
  $('#stackTags').innerHTML=stack.length?stack.map(x=>`<span class="tag">${x}</span>`).join(''):'<span class="tag muted-tag">AGUARDANDO</span>';
}
function detectStack(names){
  const s=new Set(), lower=names.map(x=>x.toLowerCase());
  if(lower.some(x=>x.includes('next.config'))) s.add('Next.js');
  if(lower.some(x=>x.endsWith('.tsx')||x==='tsconfig.json')) s.add('TypeScript');
  if(lower.some(x=>x.endsWith('.jsx')||x.endsWith('.tsx'))) s.add('React');
  if(lower.some(x=>x==='package.json')) s.add('Node.js');
  if(lower.some(x=>x.endsWith('.py'))) s.add('Python');
  if(lower.some(x=>x.endsWith('.php'))) s.add('PHP');
  if(lower.some(x=>x.endsWith('.sql'))) s.add('SQL');
  if(lower.some(x=>x.endsWith('.html'))) s.add('HTML');
  if(lower.some(x=>x.endsWith('.css'))) s.add('CSS');
  return [...s].slice(0,6);
}
function renderModes(){ $$('.mode-btn').forEach(b=>b.classList.toggle('active',b.dataset.mode===state.mode)); $('#statMode').textContent=state.mode; }
function renderChat(){
  const s=state.sessions.find(x=>x.id===state.activeSession); const box=$('#chatMessages'); if(!s){box.innerHTML='';return}
  box.innerHTML=s.messages.map(m=>`<article class="message ${m.role}"><div class="meta">${m.role==='user'?'VOCÊ':'VYRON'} // ${m.mode||state.mode}</div><div class="bubble-text">${escapeHTML(m.text)}</div></article>`).join('');
  requestAnimationFrame(()=>box.scrollTop=box.scrollHeight);
}
function renderAll(){renderSessions();renderProject();renderModes();renderChat()}

function newSession(){ const s={id:uid(),title:'Nova sessão',messages:[]}; state.sessions.unshift(s); state.activeSession=s.id; save(); $('#welcomeView').classList.remove('hidden'); $('#chatView').classList.add('hidden'); }
function showSession(){ const s=state.sessions.find(x=>x.id===state.activeSession); if(s?.messages.length){$('#welcomeView').classList.add('hidden');$('#chatView').classList.remove('hidden');renderChat()}else{$('#welcomeView').classList.remove('hidden');$('#chatView').classList.add('hidden')} }
function send(text){
  text=text.trim(); if(!text)return; let s=state.sessions.find(x=>x.id===state.activeSession); if(!s){newSession();s=state.sessions[0]}
  s.messages.push({role:'user',text,mode:state.mode,time:Date.now()});
  if(s.title==='Nova sessão') s.title=text.slice(0,34)+(text.length>34?'…':'');
  s.messages.push({role:'ai',mode:state.mode,time:Date.now(),text:demoReply(text)});
  save(); $('#welcomeView').classList.add('hidden');$('#chatView').classList.remove('hidden'); $('#promptInput').value='';$('#chatInput').value='';
}
function demoReply(text){
  const ctx=state.files.length?`\n\nContexto carregado: ${state.files.length} arquivo(s). Stack detectada: ${detectStack(state.files.map(f=>f.name)).join(', ')||'não identificada'}.`:'';
  const action=state.mode==='DEBUG'?'Vou procurar a causa raiz do erro antes de sugerir qualquer alteração.':state.mode==='BUILD'?'Vou estruturar a implementação em etapas e preservar o que já estiver funcionando.':'Vou analisar a solicitação e escolher automaticamente a abordagem mais adequada.';
  return `VYRON Core em modo DEMO.\n\n${action}${ctx}\n\nSolicitação recebida: “${text.slice(0,220)}${text.length>220?'…':''}”\n\nA interface já está preparada. O próximo passo é conectar este fluxo ao backend real da IA.`;
}
function handleFiles(fileList){
  const arr=[...fileList]; if(!arr.length)return;
  arr.forEach(f=>{ if(!state.files.some(x=>x.name===f.name&&x.size===f.size)) state.files.push({name:f.webkitRelativePath||f.name,size:f.size,type:f.type,isFolder:false}); });
  if(!state.project){const root=(arr[0].webkitRelativePath||'').split('/')[0];state.project={name:root||'projeto-importado'}} save();
}

$$('.mode-btn').forEach(b=>b.onclick=()=>{state.mode=b.dataset.mode;save()});
$('#sendBtn').onclick=()=>send($('#promptInput').value); $('#chatSendBtn').onclick=()=>send($('#chatInput').value);
[$('#promptInput'),$('#chatInput')].forEach(el=>el.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send(el.value)}}));
$('#fileInput').onchange=e=>handleFiles(e.target.files); $('#chatFileInput').onchange=e=>handleFiles(e.target.files);
$('#newSessionMini').onclick=newSession;
$('#newProjectBtn').onclick=()=>{$('#projectModal').classList.remove('hidden');$('#newProjectName').focus()};
$('#settingsBtn').onclick=()=>$('#settingsModal').classList.remove('hidden');
$$('[data-close]').forEach(b=>b.onclick=()=>$('#'+b.dataset.close).classList.add('hidden'));
$('#createProjectBtn').onclick=()=>{const n=$('#newProjectName').value.trim()||'novo-projeto';state.project={name:n};state.files=[];save();$('#projectModal').classList.add('hidden');$('#newProjectName').value=''};
$('#clearContextBtn').onclick=()=>{state.files=[];save()};
$('#resetDataBtn').onclick=()=>{if(confirm('Apagar todas as sessões e dados locais do VYRON?')){localStorage.removeItem(STORAGE);location.reload()}};

const drop=$('.composer-wrap'); ['dragenter','dragover'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add('dragging')})); ['dragleave','drop'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove('dragging')})); drop.addEventListener('drop',e=>handleFiles(e.dataTransfer.files));
renderAll();showSession();
