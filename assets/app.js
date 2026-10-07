(() => {
  const $ = (s, p=document) => p.querySelector(s);
  const $$ = (s, p=document) => [...p.querySelectorAll(s)];
  const state = {
    mode: 'AUTO', files: [],
    settings: JSON.parse(localStorage.getItem('vyron.settings') || 'null') || { endpoint:'', model:'DEMO CORE', web:true, memory:true },
    memories: JSON.parse(localStorage.getItem('vyron.memories') || '[]'),
    projects: JSON.parse(localStorage.getItem('vyron.projects') || '[]'),
    sessions: JSON.parse(localStorage.getItem('vyron.sessions') || '[]'),
    activity: JSON.parse(localStorage.getItem('vyron.activity') || '[]'),
    currentSession: null
  };

  function persist(){
    localStorage.setItem('vyron.settings', JSON.stringify(state.settings));
    localStorage.setItem('vyron.memories', JSON.stringify(state.memories));
    localStorage.setItem('vyron.projects', JSON.stringify(state.projects));
    localStorage.setItem('vyron.sessions', JSON.stringify(state.sessions.slice(0,30)));
    localStorage.setItem('vyron.activity', JSON.stringify(state.activity.slice(-150)));
  }
  function stamp(){ return new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',second:'2-digit'}); }
  function log(message, type='INFO'){
    state.activity.push({time:stamp(), type, message}); persist(); renderActivity();
  }

  function boot(){
    const lines=['Initializing interface...','Loading project engine...','Mounting local memory...','Checking knowledge layer...','Starting VYRON Core...'];
    let i=0; const logEl=$('#bootLog'), bar=$('#bootBar');
    const timer=setInterval(()=>{ if(i>=lines.length){clearInterval(timer);setTimeout(()=>$('#boot').classList.add('hidden'),320);return;} logEl.innerHTML += `<div><b>[OK]</b> ${lines[i]}</div>`; bar.style.width=((i+1)/lines.length*100)+'%';i++; },140);
  }

  function matrix(){
    const c=$('#matrix'), x=c.getContext('2d'); let w,h,cols,drops;
    const resize=()=>{w=c.width=innerWidth;h=c.height=innerHeight;cols=Math.ceil(w/18);drops=Array(cols).fill(1)};resize();addEventListener('resize',resize);
    setInterval(()=>{x.fillStyle='rgba(6,8,7,.14)';x.fillRect(0,0,w,h);x.fillStyle='#b8ff00';x.font='11px monospace';drops.forEach((y,i)=>{x.fillText(Math.random()>.5?'1':'0',i*18,y*18);drops[i]=(y*18>h&&Math.random()>.975)?0:y+1})},70);
  }

  function showView(name){
    $$('.view').forEach(v=>v.classList.remove('active')); $(`#view-${name}`).classList.add('active');
    $$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===name));
    if(name==='projects') renderProjects(); if(name==='memory') renderMemories(); if(name==='knowledge') renderKnowledge(); if(name==='activity') renderActivity();
  }

  function initialMessage(){
    if(state.currentSession) return;
    const s={id:Date.now(),title:'Nova sessão',messages:[{role:'assistant',text:'**VYRON Core online.** Envie um projeto, cole um erro ou descreva o que deseja construir. Eu vou priorizar análise, causa raiz, implementação e verificação.',time:stamp()}]};
    state.sessions.unshift(s);state.currentSession=s.id;persist();renderSessions();renderMessages();
  }
  function current(){ return state.sessions.find(s=>s.id===state.currentSession); }
  function renderSessions(){
    $('#sessionList').innerHTML=state.sessions.slice(0,8).map(s=>`<button class="session-item" data-id="${s.id}">${escapeHTML(s.title)}</button>`).join('')||'<div class="empty">Sem sessões.</div>';
    $$('#sessionList .session-item').forEach(b=>b.onclick=()=>{state.currentSession=Number(b.dataset.id);renderMessages();showView('chat')});
  }
  function md(text){
    let safe=escapeHTML(text); safe=safe.replace(/```([\s\S]*?)```/g,'<pre>$1</pre>').replace(/\*\*(.*?)\*\*/g,'<b>$1</b>').replace(/\n/g,'<br>'); return safe;
  }
  function renderMessages(){
    const s=current(); if(!s)return;
    $('#messages').innerHTML=s.messages.map(m=>`<div class="message ${m.role}"><div class="role">${m.role==='assistant'?'V':'U'}</div><div class="bubble">${md(m.text)}<span class="meta">${m.time||''}${m.demo?' · DEMO':''}</span></div></div>`).join('');
    $('#messages').scrollTop=$('#messages').scrollHeight; $('#chatTitle').textContent=s.title==='Nova sessão'?'O que vamos construir?':s.title;
    $('#suggestions').style.display=s.messages.length>1?'none':'grid';
  }

  async function sendPrompt(){
    const input=$('#promptInput'); const text=input.value.trim(); if(!text && !state.files.length)return;
    const s=current(); s.messages.push({role:'user',text:text||`Analise os ${state.files.length} arquivo(s) anexados.`,time:stamp()});
    if(s.title==='Nova sessão') s.title=(text||'Projeto enviado').slice(0,42); input.value=''; autoSize();renderMessages();renderSessions();persist();log(`Prompt enviado em modo ${state.mode}`,'PROMPT');
    const typing={role:'assistant',text:'<typing>',time:''}; s.messages.push(typing); renderTyping();
    try{
      let answer;
      if(state.settings.endpoint){
        const payload={message:text,mode:state.mode,web:state.settings.web,memory:state.settings.memory,memories:state.settings.memory?state.memories:[],files:state.files.map(f=>({name:f.name,type:f.type,size:f.size}))};
        const r=await fetch(state.settings.endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); if(!r.ok)throw new Error(`HTTP ${r.status}`); const data=await r.json(); answer=data.answer||data.message||'Resposta recebida sem conteúdo.';
      } else { answer=demoAnswer(text); }
      s.messages[s.messages.length-1]={role:'assistant',text:answer,time:stamp(),demo:!state.settings.endpoint};
      if(/corrig|resolve|solu|bug/i.test(text)) localStorage.setItem('vyron.solved',String((Number(localStorage.getItem('vyron.solved'))||0)+1));
      persist();renderMessages();updateStats();log('Resposta gerada pelo VYRON Core',state.settings.endpoint?'CORE':'DEMO');
    } catch(e){ s.messages[s.messages.length-1]={role:'assistant',text:`Não consegui acessar o backend configurado.\n\n\`\`\`${e.message}\`\`\`\n\nVerifique o endpoint em Configurações.`,time:stamp()};renderMessages();log(`Falha no backend: ${e.message}`,'ERROR'); }
  }
  function renderTyping(){
    const s=current(); $('#messages').innerHTML=s.messages.map(m=>{if(m.text==='<typing>')return `<div class="message assistant"><div class="role">V</div><div class="bubble"><span class="typing"><i></i><i></i><i></i></span></div></div>`;return `<div class="message ${m.role}"><div class="role">${m.role==='assistant'?'V':'U'}</div><div class="bubble">${md(m.text)}<span class="meta">${m.time||''}</span></div></div>`}).join('');$('#messages').scrollTop=$('#messages').scrollHeight;
  }
  function demoAnswer(text){
    const files=state.files.length?`\n\n**Contexto detectado:** ${state.files.length} arquivo(s) anexado(s): ${state.files.slice(0,5).map(f=>f.name).join(', ')}${state.files.length>5?'…':''}.`:'';
    return `O frontend do VYRON está funcionando em **modo demonstração**.${files}\n\nPara eu realmente analisar código, pesquisar a internet, consultar memória vetorial e editar projetos, conecte o endpoint seguro do **VYRON Core** em Configurações.\n\nArquitetura prevista:\n\n\`\`\`\nFrontend → VYRON API → Modelo / Tools\n                    ├─ Web Research\n                    ├─ Supabase + pgvector\n                    ├─ Project Analyzer\n                    └─ Sandbox de testes\n\`\`\`\n\nSua solicitação foi registrada em modo **${state.mode}**. Nenhuma chave de API deve ficar neste frontend.`;
  }

  function handleFiles(list){
    [...list].forEach(file=>{if(!state.files.some(f=>f.name===file.name&&f.size===file.size))state.files.push({name:file.name,size:file.size,type:file.type||ext(file.name)})});
    renderFiles();detectStack();updateStats();log(`${list.length} arquivo(s) adicionados ao contexto`,'FILES');
  }
  function renderFiles(){
    $('#fileCount').textContent=state.files.length; $('#fileTree').innerHTML=state.files.length?state.files.map((f,i)=>`<div class="file-row"><span>${escapeHTML(f.name)}</span><span>${formatBytes(f.size)}</span></div>`).join(''):'<div class="empty">Nenhum arquivo carregado.</div>';
    $('#attachmentRow').innerHTML=state.files.map(f=>`<span class="attachment-chip">${escapeHTML(f.name)}</span>`).join('');
    $('#contextMeter').textContent=`CONTEXT ${Math.min(99,state.files.length*7)}%`;
  }
  function detectStack(){
    const names=state.files.map(f=>f.name.toLowerCase()); const found=[];
    if(names.some(n=>n.endsWith('.html')))found.push('HTML'); if(names.some(n=>n.endsWith('.css')))found.push('CSS'); if(names.some(n=>/\.(js|jsx)$/.test(n)))found.push('JavaScript'); if(names.some(n=>/\.(ts|tsx)$/.test(n)))found.push('TypeScript'); if(names.some(n=>n.endsWith('.py')))found.push('Python'); if(names.some(n=>n.endsWith('.php')))found.push('PHP'); if(names.some(n=>n.endsWith('.sql')))found.push('SQL'); if(names.some(n=>n==='package.json'))found.push('Node.js'); if(names.some(n=>n.includes('supabase')))found.push('Supabase');
    $('#stackChips').innerHTML=(found.length?found:['WAITING']).map(x=>`<span>${x}</span>`).join('');
  }

  function renderProjects(){
    const base=[...state.projects]; if(!base.length)base.push({name:'VYRON AI',stack:'HTML · CSS · JS',desc:'Workspace atual da IA especialista em programação.',updated:'agora'});
    $('#projectGrid').innerHTML=base.map((p,i)=>`<article class="project-card" data-i="${i}"><span class="project-type">PROJECT // ${String(i+1).padStart(2,'0')}</span><h3>${escapeHTML(p.name)}</h3><p>${escapeHTML(p.desc||'Projeto de software gerenciado pelo VYRON.')}</p><div class="project-meta"><span>${escapeHTML(p.stack||'STACK AUTO')}</span><span>${escapeHTML(p.updated||'local')}</span></div></article>`).join('');
  }
  function renderMemories(){
    $('#memoryList').innerHTML=state.memories.length?state.memories.map((m,i)=>`<div class="memory-item"><div><h4>${escapeHTML(m.title)}</h4><p>${escapeHTML(m.content)}</p></div><button data-i="${i}">×</button></div>`).join(''):'<div class="empty">Nenhuma memória persistente criada ainda.</div>';
    $$('#memoryList button').forEach(b=>b.onclick=()=>{state.memories.splice(Number(b.dataset.i),1);persist();renderMemories();updateStats()});
  }
  function renderKnowledge(){
    const solved=Number(localStorage.getItem('vyron.solved'))||0; $('#knowledgeDocs').textContent=state.files.length;$('#knowledgeSources').textContent=0;$('#knowledgeVerified').textContent=solved;
    const q=['Documentação atual da stack ativa','Erros recorrentes dos projetos','Mudanças recentes de frameworks'];$('#learningQueue').innerHTML=q.map((x,i)=>`<div class="queue-item"><span class="num">0${i+1}</span><div><b>${x}</b><small>aguardando backend knowledge engine</small></div><small>QUEUED</small></div>`).join('');
  }
  function renderActivity(){
    const el=$('#activityLog'); if(!el)return; el.innerHTML=state.activity.length?state.activity.slice().reverse().map(l=>`<div class="log-line"><span>${l.time}</span> <b class="${l.type==='ERROR'?'bad':l.type==='CORE'?'good':''}">[${l.type}]</b> ${escapeHTML(l.message)}</div>`).join(''):'<div class="empty">Nenhuma atividade registrada.</div>';
  }
  function updateStats(){
    $('#memoryCountSide').textContent=state.memories.length;$('#sourceCountSide').textContent=0;$('#solvedCountSide').textContent=Number(localStorage.getItem('vyron.solved'))||0;$('#confidenceSide').textContent=state.settings.endpoint?'LIVE':'DEMO';$('#modelMini').textContent=state.settings.model||'DEMO CORE';$('#memoryMini').textContent=state.settings.memory?'ACTIVE':'OFF';
  }
  function autoSize(){const t=$('#promptInput');t.style.height='auto';t.style.height=Math.min(t.scrollHeight,160)+'px'}
  function escapeHTML(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
  function ext(n){return n.split('.').pop()?.toUpperCase()||'FILE'} function formatBytes(n){if(!n)return'0 B';const k=1024,u=['B','KB','MB','GB'],i=Math.floor(Math.log(n)/Math.log(k));return`${(n/Math.pow(k,i)).toFixed(i?1:0)} ${u[i]}`}

  $$('.nav-item,.brand').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view||'chat')));
  $$('#modeSwitch button').forEach(b=>b.onclick=()=>{$$('#modeSwitch button').forEach(x=>x.classList.remove('active'));b.classList.add('active');state.mode=b.dataset.mode;$('#modeLabel').textContent=state.mode;log(`Modo alterado para ${state.mode}`,'MODE')});
  $('#newChatBtn').onclick=()=>{state.currentSession=null;initialMessage();showView('chat')};
  $('#sendBtn').onclick=sendPrompt; $('#promptInput').oninput=autoSize; $('#promptInput').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendPrompt()}};
  $$('#suggestions button').forEach(b=>b.onclick=()=>{$('#promptInput').value=b.dataset.prompt;autoSize();$('#promptInput').focus()});
  $('#attachBtn').onclick=()=>$('#fileInput').click(); $('#fileInput').onchange=e=>handleFiles(e.target.files); $('#dropZone').onclick=()=>$('#fileInput').click();
  ['dragenter','dragover'].forEach(ev=>$('#dropZone').addEventListener(ev,e=>{e.preventDefault();$('#dropZone').classList.add('drag')})); ['dragleave','drop'].forEach(ev=>$('#dropZone').addEventListener(ev,e=>{e.preventDefault();$('#dropZone').classList.remove('drag')})); $('#dropZone').addEventListener('drop',e=>handleFiles(e.dataTransfer.files));
  $('#webToggle').onclick=()=>{state.settings.web=!state.settings.web;$('#webToggle').classList.toggle('active',state.settings.web);persist()}; $('#memoryToggle').onclick=()=>{state.settings.memory=!state.settings.memory;$('#memoryToggle').classList.toggle('active',state.settings.memory);persist();updateStats()};
  $('#settingsBtn').onclick=()=>{const m=$('#settingsModal');$('#apiEndpoint').value=state.settings.endpoint;$('#modelName').value=state.settings.model;$('#settingWeb').checked=state.settings.web;$('#settingMemory').checked=state.settings.memory;m.showModal()};
  $('#saveSettingsBtn').onclick=e=>{e.preventDefault();state.settings.endpoint=$('#apiEndpoint').value.trim();state.settings.model=$('#modelName').value.trim()||'VYRON CORE';state.settings.web=$('#settingWeb').checked;state.settings.memory=$('#settingMemory').checked;persist();$('#settingsModal').close();updateStats();log('Configurações atualizadas','SYSTEM')};
  $('#addMemoryBtn').onclick=()=>$('#memoryModal').showModal(); $('#saveMemoryBtn').onclick=e=>{e.preventDefault();const title=$('#memoryTitleInput').value.trim(),content=$('#memoryContentInput').value.trim();if(title&&content){state.memories.unshift({title,content,created:new Date().toISOString()});persist();renderMemories();updateStats();log('Nova memória adicionada','MEMORY');$('#memoryTitleInput').value='';$('#memoryContentInput').value='';$('#memoryModal').close()}};
  $('#clearMemoryBtn').onclick=()=>{if(confirm('Remover todas as memórias locais?')){state.memories=[];persist();renderMemories();updateStats();log('Memórias locais removidas','MEMORY')}};
  $('#clearActivityBtn').onclick=()=>{state.activity=[];persist();renderActivity()};
  $('#createProjectBtn').onclick=()=>{const name=prompt('Nome do novo projeto:');if(name){state.projects.unshift({name,stack:'AUTO DETECT',desc:'Projeto criado no workspace local.',updated:'agora'});persist();renderProjects();log(`Projeto criado: ${name}`,'PROJECT')}};
  $('#importProjectBtn').onclick=()=>$('#fileInput').click();
  $('#collapseInspector').onclick=()=>$('#inspector').style.display='none';

  $('#webToggle').classList.toggle('active',state.settings.web);$('#memoryToggle').classList.toggle('active',state.settings.memory);
  boot();matrix();initialMessage();renderSessions();renderMessages();renderFiles();detectStack();renderProjects();renderMemories();renderKnowledge();renderActivity();updateStats();
  if(!state.activity.length)log('VYRON frontend inicializado','SYSTEM');
})();
