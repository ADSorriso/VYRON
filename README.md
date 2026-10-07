# VYRON AI Frontend

Versão reconstruída do VYRON para funcionar como interface de uma IA especialista em programação, debugging, arquitetura e desenvolvimento web.

## Como abrir
Abra `index.html` diretamente ou publique a pasta em GitHub Pages.

## O que funciona agora
- Interface completa e responsiva
- Chat em modo demonstração
- Sessões persistidas em localStorage
- Memórias locais
- Projetos locais
- Upload/drop de arquivos para contexto visual
- Detecção simples de stack pelos nomes/extensões
- Modos de trabalho
- Knowledge Engine e activity trace
- Configuração de endpoint do backend

## Para ativar IA real
Crie um backend seguro e configure em `Configurações > Endpoint do backend`.
O frontend envia POST JSON com aproximadamente:

```json
{
  "message": "texto do usuário",
  "mode": "DEBUG",
  "web": true,
  "memory": true,
  "memories": [],
  "files": [{"name":"app.js","type":"text/javascript","size":1234}]
}
```

O backend deve responder:

```json
{"answer":"resposta da IA"}
```

**Não coloque chaves secretas no frontend.**
