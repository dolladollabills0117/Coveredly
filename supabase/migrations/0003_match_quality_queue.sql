-- Match quality threshold: matches under 80% let the policyholder choose to match anyway
-- or wait in a queue for a better match. Agents never see low_fit / waiting matches.

alter table public.matches drop constraint matches_status_check;
alter table public.matches add constraint matches_status_check
  check (status in ('low_fit','waiting','pending_approval','active','established','reported','replaced'));
alter table public.matches add column fit jsonb; -- plain-language fit summary shown to the policyholder

-- Agents (and contact sharing) only once the match is approved.
create or replace function public.agent_visible(s text) returns boolean
language sql immutable as $$ select s in ('active','established','reported','replaced') $$;

create or replace function public.is_matched_with(other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from matches where agent_visible(status) and
    ((agent_id = auth.uid() and policyholder_id = other) or (policyholder_id = auth.uid() and agent_id = other)))
$$;
create or replace function public.in_match(mid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from matches where id = mid and agent_visible(status) and auth.uid() in (agent_id, policyholder_id))
$$;

drop policy "matches: participants/admin" on public.matches;
create policy "matches: participants/admin" on public.matches for select using (
  is_admin() or policyholder_id = auth.uid() or (agent_id = auth.uid() and agent_visible(status)));

-- Policyholder chooses to wait in the queue.
create or replace function public.wait_for_better(mid uuid) returns void
language plpgsql security definer set search_path = public as $$
declare m matches;
begin
  update matches set status = 'waiting' where id = mid and policyholder_id = auth.uid() and status = 'low_fit' returning * into m;
  if not found then return; end if;
  perform log_activity('match_suggested', mid, name_of(auth.uid()),
    name_of(auth.uid()) || ' chose to wait for an 80%+ match (best now: ' || m.score || '%).');
end $$;

-- Admin can approve straight out of the queue too.
create or replace function public.approve_match(mid uuid, p_agent uuid, p_score numeric) returns void
language plpgsql security definer set search_path = public as $$
declare m matches;
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  select * into m from matches where id = mid and status in ('pending_approval','low_fit','waiting');
  if not found then raise exception 'Match not pending'; end if;
  update matches set agent_id = p_agent, score = p_score, status = 'active', approved_at = now(),
    matched_by = case when m.agent_id = p_agent then 'Formula' else 'Admin' end where id = mid;
  perform notify_user(p_agent, 'matched', 'New lead matched ⚡', name_of(m.policyholder_id) || ' is ready to hear from you. Reach out fast!', mid);
  perform notify_user(m.policyholder_id, 'matched', 'You have a match! 🧡', 'Meet ' || name_of(p_agent) || ', your licensed NJ agent.', mid);
  perform log_activity('match_approved', mid, 'Admin', 'You matched ' || name_of(m.policyholder_id) || ' with ' || name_of(p_agent));
end $$;
