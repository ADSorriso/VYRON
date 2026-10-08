const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const STORAGE = 'vyron_final_ui_v2';
const LEGACY = 'vyron_minimal_v1';

function uid(){ return Math.random().toString(36).slice(2,10); }
function safeParse(v){ try{return JSON.parse(v)}catch{return null} }
function load(){ return safeParse(localStorage.getItem(STORAGE)) || safeParse(localStorage.getItem(LEGACY)); }
function escapeHTML(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}

let state = load() || {mode:'AUTO',project:null,files:[],sessions:[{id:uid(),title:'Nova sessão',messages:[]}],activeSession:null,projectPanelOpen:true};
if(!state.sessions?.length) state.sessions=[{id:uid(),title:'Nova sessão',messages:[]}];
if(!state.activeSession) state.activeSession=state.sessions[0].id;
if(!['AUTO','DEBUG','BUILD'].includes(state.mode)) state.mode='AUTO';
if(typeof state.projectPanelOpen!=='boolean') state.projectPanelOpen=true;

function persist(){ localStorage.setItem(STORAGE,JSON.stringify(state)); }
function commit(){ persist(); renderAll(); }

function renderSessions(){
  const list=$('#sessionList'); list.innerHTML='';
  state.sessions.forEach(s=>{
    const b=document.createElement('button');
    b.className='session-item'+(s.id===state.activeSession?' active':'');
    b.innerHTML=`<span class="bubble">▢</span><span>${escapeHTML(s.title||'Sessão')}</span>`;
    b.onclick=()=>{state.activeSession=s.id;commit();showSession()};
    list.appendChild(b);
  });
}

function detectStack(names){
  const s=new Set(), lower=names.map(x=>x.toLowerCase());
  if(lower.some(x=>x.includes('next.config'))) s.add('Next.js');
  if(lower.some(x=>x.endsWith('.tsx')||x.endsWith('.ts')||x==='tsconfig.json')) s.add('TypeScript');
  if(lower.some(x=>x.endsWith('.jsx')||x.endsWith('.tsx'))) s.add('React');
  if(lower.some(x=>x==='package.json'||x.endsWith('/package.json'))) s.add('Node.js');
  if(lower.some(x=>x.endsWith('.py'))) s.add('Python');
  if(lower.some(x=>x.endsWith('.php'))) s.add('PHP');
  if(lower.some(x=>x.endsWith('.sql'))) s.add('SQL');
  if(lower.some(x=>x.endsWith('.html'))) s.add('HTML');
  if(lower.some(x=>x.endsWith('.css'))) s.add('CSS');
  if(lower.some(x=>x.includes('vite.config'))) s.add('Vite');
  return [...s].slice(0,6);
}

function renderProject(){
  const hasProject=!!state.project;
  $('#emptyProjectState').classList.toggle('hidden',hasProject);
  $('#projectContent').classList.toggle('hidden',!hasProject);
  $('#activeProjectChip').classList.toggle('hidden',!hasProject);
  $('#clearContextBtn').classList.toggle('hidden',state.files.length===0);

  if(hasProject){
    $('#projectName').textContent=state.project.name;
    $('#projectPath').textContent=`~/workspace/${state.project.name}`;
    $('#activeProjectChipName').textContent=state.project.name;
  }

  $('#fileCount').textContent=state.files.length;
  const fl=$('#fileList');
  if(hasProject && !state.files.length) fl.innerHTML='<p class="muted">Nenhum arquivo carregado.</p>';
  else if(hasProject) fl.innerHTML=state.files.slice(0,24).map(f=>`<div class="file-row"><span class="ficon">${f.isFolder?'▱':'▧'}</span><span>${escapeHTML(f.name)}</span></div>`).join('');

  const stack=detectStack(state.files.map(f=>f.name));
  $('#stackTags').innerHTML=stack.length?stack.map(x=>`<span class="tag">${x}</span>`).join(''):'<span class="tag">Aguardando arquivos</span>';

  const hint=$('#homeContextHint');
  const badge=$('#chatContextBadge');
  if(hasProject){
    const text=`<strong>${escapeHTML(state.project.name)}</strong>${state.files.length?` · ${state.files.length} arquivo(s) em contexto`:''}`;
    hint.innerHTML=text; badge.innerHTML=text;
    hint.classList.remove('hidden'); badge.classList.remove('hidden');
  }else{
    hint.classList.add('hidden'); badge.classList.add('hidden');
  }

  const shell=$('#appShell');
  shell.classList.toggle('project-collapsed',!state.projectPanelOpen);
  shell.classList.toggle('project-open',state.projectPanelOpen);
}

function renderModes(){
  $$('.mode-btn').forEach(b=>b.classList.toggle('active',b.dataset.mode===state.mode));
}

function renderChat(){
  const s=state.sessions.find(x=>x.id===state.activeSession);
  $('#chatSessionTitle').textContent=s?.title||'Nova sessão';
  const box=$('#chatMessages');
  if(!s){box.innerHTML='';return}
  box.innerHTML=s.messages.map(m=>`<article class="message ${m.role}"><div class="meta">${m.role==='user'?'VOCÊ':'VYRON'} // ${m.mode||state.mode}</div><div class="bubble-text">${escapeHTML(m.text)}</div></article>`).join('');
  requestAnimationFrame(()=>box.scrollTop=box.scrollHeight);
}

function renderAll(){renderSessions();renderProject();renderModes();renderChat()}

function newSession(){
  const s={id:uid(),title:'Nova sessão',messages:[]};
  state.sessions.unshift(s); state.activeSession=s.id; commit(); showSession();
}
function showSession(){
  const s=state.sessions.find(x=>x.id===state.activeSession);
  const hasMessages=!!s?.messages?.length;
  $('#welcomeView').classList.toggle('hidden',hasMessages);
  $('#chatView').classList.toggle('hidden',!hasMessages);
  if(hasMessages) renderChat();
}

function demoReply(text){
  const stack=detectStack(state.files.map(f=>f.name));
  const projectLine=state.project?`Projeto: ${state.project.name}${state.files.length?` · ${state.files.length} arquivo(s) carregado(s)`:''}.`:'';
  const stackLine=stack.length?`Stack detectada: ${stack.join(', ')}.`:'';
  const action=state.mode==='DEBUG'
    ?'Vou começar pela causa raiz, validar o fluxo e só depois propor a correção.'
    :state.mode==='BUILD'
      ?'Vou estruturar a implementação em etapas, preservando tudo que já funciona.'
      :'Vou escolher automaticamente a melhor estratégia entre análise, debug e construção.';
  return `VYRON Core em modo DEMO.\n\n${action}${projectLine?`\n${projectLine}`:''}${stackLine?`\n${stackLine}`:''}\n\nSolicitação recebida: “${text.slice(0,260)}${text.length>260?'…':''}”\n\nA interface está pronta para receber o backend real da IA.`;
}

function send(text){
  text=text.trim(); if(!text)return;
  let s=state.sessions.find(x=>x.id===state.activeSession);
  if(!s){newSession();s=state.sessions[0]}
  s.messages.push({role:'user',text,mode:state.mode,time:Date.now()});
  if(s.title==='Nova sessão') s.title=text.replace(/\s+/g,' ').slice(0,38)+(text.length>38?'…':'');
  s.messages.push({role:'ai',mode:state.mode,time:Date.now(),text:demoReply(text)});
  $('#promptInput').value=''; $('#chatInput').value='';
  commit(); showSession();
}

function handleFiles(fileList){
  const arr=[...fileList]; if(!arr.length)return;
  arr.forEach(f=>{
    const name=f.webkitRelativePath||f.name;
    if(!state.files.some(x=>x.name===name&&x.size===f.size)) state.files.push({name,size:f.size,type:f.type,isFolder:false});
  });
  if(!state.project){
    const root=(arr[0].webkitRelativePath||'').split('/')[0];
    const inferred=root||arr[0].name.replace(/\.[^.]+$/,'')||'projeto-importado';
    state.project={name:inferred};
  }
  state.projectPanelOpen=true; commit();
}

function openProjectModal(){ $('#projectModal').classList.remove('hidden'); setTimeout(()=>$('#newProjectName').focus(),20); }
function setMode(mode){ state.mode=mode; commit(); }

$$('.mode-btn').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
$('#sendBtn').onclick=()=>send($('#promptInput').value);
$('#chatSendBtn').onclick=()=>send($('#chatInput').value);
[$('#promptInput'),$('#chatInput')].forEach(el=>el.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send(el.value)}}));
$('#fileInput').onchange=e=>handleFiles(e.target.files);
$('#chatFileInput').onchange=e=>handleFiles(e.target.files);
$('#newSessionMini').onclick=newSession;
$('#newProjectBtn').onclick=openProjectModal;
$('#emptyCreateProjectBtn').onclick=openProjectModal;
$('#settingsBtn').onclick=()=>$('#settingsModal').classList.remove('hidden');
$$('[data-close]').forEach(b=>b.onclick=()=>$('#'+b.dataset.close).classList.add('hidden'));
$('#createProjectBtn').onclick=()=>{
  const n=$('#newProjectName').value.trim()||'novo-projeto';
  state.project={name:n}; state.files=[]; state.projectPanelOpen=true; commit();
  $('#projectModal').classList.add('hidden'); $('#newProjectName').value='';
};
$('#clearContextBtn').onclick=()=>{state.files=[];commit()};
$('#resetDataBtn').onclick=()=>{if(confirm('Apagar todas as sessões e dados locais do VYRON?')){localStorage.removeItem(STORAGE);localStorage.removeItem(LEGACY);location.reload()}};
$('#closeProjectPanelBtn').onclick=()=>{state.projectPanelOpen=false;commit()};
$('#toggleProjectPanelBtn').onclick=()=>{state.projectPanelOpen=!state.projectPanelOpen;commit()};

const drop=$('#homeComposer');
['dragenter','dragover'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add('dragging')}));
['dragleave','drop'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove('dragging')}));
drop.addEventListener('drop',e=>handleFiles(e.dataTransfer.files));

document.addEventListener('keydown',e=>{
  if(e.key==='Escape') $$('.modal').forEach(m=>m.classList.add('hidden'));
});

persist(); renderAll(); showSession();
