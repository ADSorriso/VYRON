# VYRON AI — Arquitetura planejada

## Frontend incluído
- Chat especializado em programação
- Modos AUTO / CODE / DEBUG / BUILD / ARCH
- Upload/drop de arquivos e ZIP
- Contexto de projeto e detecção simples de stack
- Projetos locais
- Memória local
- Knowledge Engine UI
- Activity trace
- Configuração de endpoint de backend

## Backend recomendado (próxima etapa)

```text
GitHub Pages / Frontend
        |
        v
VYRON API (Vercel/Node ou servidor próprio)
        |
        +-- LLM / model router
        +-- Web Research Tool
        +-- Project Analyzer
        +-- Sandbox de execução
        +-- Supabase PostgreSQL
        |      +-- pgvector
        |      +-- Auth
        |      +-- Storage
        +-- Knowledge Harvester
```

## Regras de segurança
- Nunca colocar chaves de API no JavaScript do frontend.
- Todo acesso ao modelo, crawler, banco privilegiado e sandbox deve passar pelo backend.
- Pesquisa/ingestão web deve respeitar permissões, robots.txt, termos e licenças.
- Conteúdo encontrado na internet deve ser tratado como não confiável até validação.
