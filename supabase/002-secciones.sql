-- RUTA · ajuste para Vida y Capital. Pegar en Supabase → SQL Editor → Run. Se puede correr más de una vez.
alter table people   add column if not exists note     text default '';
alter table memories add column if not exists area     text;
alter table jobs     add column if not exists currency text not null default 'CLP';
