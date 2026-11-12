-- Policies sold, by line, so admin can measure how long each line takes to sell.
-- A match can have several sales (e.g. auto now, life months later). The first one
-- completes the "Policy sold" milestone.

create table public.policy_sales (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches on delete cascade,
  agent_id uuid not null references public.profiles,
  line text not null check (line in ('Auto','Home','Renters','Condo','Landlord / dwelling fire','Umbrella','Life')),
  sold_at timestamptz not null default now(),
  unique (match_id, line)
);
create index on public.policy_sales (agent_id, line);
alter table public.policy_sales enable row level security;
create policy "sales: own/admin" on public.policy_sales for select using (agent_id = auth.uid() or is_admin());

create or replace function public.log_sale(mid uuid, p_lines text[]) returns void
language plpgsql security definer set search_path = public as $$
declare m matches; added text;
begin
  select * into m from matches where id = mid and agent_id = auth.uid() and status in ('active','established');
  if not found then raise exception 'Not your lead'; end if;
  if coalesce(array_length(p_lines, 1), 0) = 0 then raise exception 'Pick at least one policy'; end if;

  with ins as (
    insert into policy_sales (match_id, agent_id, line)
    select mid, auth.uid(), l from unnest(p_lines) as l
    on conflict (match_id, line) do nothing
    returning line
  ) select string_agg(case line when 'Home' then 'Homeowners' when 'Landlord / dwelling fire' then 'Landlord' else line end, ', ') into added from ins;

  if m.m_sold is null then
    perform log_milestone(mid, 'sold'); -- sets the milestone, notifies the policyholder, logs activity
  elsif added is not null then
    perform log_activity('milestone', mid, name_of(auth.uid()),
      name_of(auth.uid()) || ' sold another policy (' || added || ') to ' || name_of(m.policyholder_id));
  end if;
end $$;
