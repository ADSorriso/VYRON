-- Esquema inicial sugerido para a próxima fase do VYRON.
-- Requer extensão vector quando embeddings forem ativados.
create extension if not exists vector;

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  name text not null,
  description text,
  stack jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  path text not null,
  language text,
  content text,
  content_hash text,
  embedding vector(1536),
  updated_at timestamptz default now()
);

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  project_id uuid references projects(id) on delete set null,
  title text,
  created_at timestamptz default now()
);

create table if not exists messages (
  id bigint generated always as identity primary key,
  conversation_id uuid references conversations(id) on delete cascade,
  role text not null,
  content text not null,
  created_at timestamptz default now()
);

create table if not exists memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  project_id uuid references projects(id) on delete cascade,
  kind text default 'project',
  title text,
  content text not null,
  embedding vector(1536),
  confidence real default 1,
  created_at timestamptz default now()
);

create table if not exists knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  url text unique not null,
  domain text,
  source_type text,
  license text,
  crawl_allowed boolean default false,
  authority_score real default 0.5,
  last_checked timestamptz
);

create table if not exists knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references knowledge_sources(id) on delete cascade,
  title text,
  language text,
  framework text,
  version text,
  content text,
  content_hash text,
  embedding vector(1536),
  fetched_at timestamptz default now()
);

create table if not exists solutions (
  id uuid primary key default gen_random_uuid(),
  problem_signature text,
  language text,
  framework text,
  solution text not null,
  success_count integer default 0,
  failure_count integer default 0,
  confidence real default 0.5,
  verified boolean default false,
  embedding vector(1536),
  created_at timestamptz default now()
);
