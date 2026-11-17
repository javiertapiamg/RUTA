-- RUTA · gastos en Capital y refresco de columnas. Pegar en Supabase → SQL Editor → Run. Se puede correr más de una vez.
alter table money drop constraint if exists money_kind_check;
alter table money add constraint money_kind_check check (kind in ('ahorro','ingreso','gasto'));
alter table jobs     add column if not exists currency text not null default 'CLP';
alter table people   add column if not exists note     text default '';
alter table memories add column if not exists area     text;
-- avisa a la API que hay columnas nuevas (sin esto, guardar una pega puede fallar)
notify pgrst, 'reload schema';
