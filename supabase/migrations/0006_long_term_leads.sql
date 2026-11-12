-- Agents can mark a lead as long-term (shopping around, or a longer sale like life).
-- Long-term leads aren't counted in the "policies sold" part of standing, get a longer
-- check-in window, and show separately in Sales Insights.

alter table public.matches
  add column long_term boolean not null default false,
  add column long_term_at timestamptz;

create or replace function public.set_long_term(mid uuid, p_long_term boolean) returns void
language plpgsql security definer set search_path = public as $$
declare m matches;
begin
  select * into m from matches where id = mid and agent_id = auth.uid() and status in ('active','established');
  if not found then raise exception 'Not your lead'; end if;
  if m.long_term = p_long_term then return; end if;
  update matches set long_term = p_long_term, long_term_at = case when p_long_term then now() else null end where id = mid;
  perform log_activity('milestone', mid, name_of(auth.uid()),
    name_of(auth.uid()) || case when p_long_term then ' marked ' else ' unmarked ' end || name_of(m.policyholder_id) || ' as a long-term lead');
end $$;
