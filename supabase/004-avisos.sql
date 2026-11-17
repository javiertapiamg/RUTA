-- RUTA · 004: marca de "ya te avisé" para los recordatorios del bot
alter table tasks add column if not exists reminded boolean not null default false;
notify pgrst, 'reload schema';
