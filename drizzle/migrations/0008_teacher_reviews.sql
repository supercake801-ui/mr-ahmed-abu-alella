create table public.teacher_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  reviewer_name text not null default '',
  rating smallint not null check (rating between 1 and 5),
  comment text not null default '' check (char_length(comment) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index teacher_reviews_created_idx on public.teacher_reviews(created_at desc);
grant select on public.teacher_reviews to anon;
grant select, insert, update, delete on public.teacher_reviews to authenticated;
grant all on public.teacher_reviews to service_role;
alter table public.teacher_reviews enable row level security;
create policy "Anyone reads reviews" on public.teacher_reviews for select to anon, authenticated using (true);
create policy "Own review insert" on public.teacher_reviews for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Own review update" on public.teacher_reviews for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Own or staff delete" on public.teacher_reviews for delete to authenticated using (user_id = (select auth.uid()) or public.is_staff(auth.uid()));

create or replace function public.teacher_reviews_fill()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.reviewer_name := coalesce((select full_name from public.profiles where id = new.user_id), '');
  new.comment := btrim(new.comment);
  new.updated_at := now();
  return new;
end $$;
create trigger teacher_reviews_fill before insert or update on public.teacher_reviews
for each row execute function public.teacher_reviews_fill();