-- Agent Standards (30-day notices, removal) and Agent Terms acceptance records.

alter table public.agents
  add column warning_at timestamptz,
  add column warning_reason text,
  add column removed_at timestamptz,
  add column terms_accepted_at timestamptz,
  add column terms_version text;

-- Agents can't edit billing, verification, notices, removal or their own terms record directly.
-- Those change only through the functions below, admins, or the service role.
create or replace function public.protect_agent_billing() returns trigger
language plpgsql as $$
begin
  if current_user = 'authenticated' and not public.is_admin() then
    if tg_op = 'INSERT' then
      new.verified := false; new.plan := null; new.plan_status := null; new.monthly_cap := 6;
      new.stripe_customer_id := null; new.stripe_subscription_id := null;
      new.warning_at := null; new.warning_reason := null; new.removed_at := null;
      new.terms_accepted_at := null; new.terms_version := null;
    elsif (new.plan, new.plan_status, new.monthly_cap, new.verified, new.stripe_customer_id, new.stripe_subscription_id,
           new.warning_at, new.warning_reason, new.removed_at, new.terms_accepted_at, new.terms_version)
          is distinct from (old.plan, old.plan_status, old.monthly_cap, old.verified, old.stripe_customer_id, old.stripe_subscription_id,
           old.warning_at, old.warning_reason, old.removed_at, old.terms_accepted_at, old.terms_version) then
      raise exception 'These fields can only be changed by Coveredly';
    end if;
  end if;
  return new;
end $$;

-- Proof of agreement: server timestamp + exact terms version, kept as a permanent log too.
create table public.terms_acceptances (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.profiles on delete cascade,
  terms_version text not null,
  accepted_at timestamptz not null default now()
);
alter table public.terms_acceptances enable row level security;
create policy "terms: own/admin" on public.terms_acceptances for select using (agent_id = auth.uid() or is_admin());

create or replace function public.accept_agent_terms(p_version text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if my_role() <> 'agent' then raise exception 'Agents only'; end if;
  update agents set terms_accepted_at = now(), terms_version = p_version where user_id = auth.uid();
  if not found then raise exception 'Finish the agent quiz first.'; end if;
  insert into terms_acceptances (agent_id, terms_version) values (auth.uid(), p_version);
  perform log_activity('report_resolved', null, name_of(auth.uid()), name_of(auth.uid()) || ' agreed to the Agent Terms (version ' || p_version || ')');
end $$;

create or replace function public.issue_agent_warning(p_agent uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  update agents set warning_at = now(), warning_reason = p_reason where user_id = p_agent and removed_at is null;
  if not found then raise exception 'Agent not found'; end if;
  perform notify_user(p_agent, 'milestone', '30-day notice from Coveredly', p_reason || ' You have 30 days to improve. See Profile → Your standing.', null);
  perform log_activity('reported', null, 'Admin', 'You sent ' || name_of(p_agent) || ' a 30-day notice: ' || p_reason);
end $$;

create or replace function public.clear_agent_warning(p_agent uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  update agents set warning_at = null, warning_reason = null where user_id = p_agent;
  perform notify_user(p_agent, 'milestone', 'Notice cleared 🧡', 'Thanks for turning things around. You''re in good standing.', null);
  perform log_activity('report_resolved', null, 'Admin', 'You cleared ' || name_of(p_agent) || '''s notice');
end $$;

-- Removed or canceled agents are never matched (the formula requires plan_status = 'active').
-- Founding codes now say the rate lasts as long as the agent meets the Agent Standards.
create or replace function public.approve_founding(rid uuid) returns text
language plpgsql security definer set search_path = public as $$
declare r founding_requests; c text;
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  select * into r from founding_requests where id = rid;
  c := coalesce(r.code, 'CF-' || upper(substr(md5(gen_random_uuid()::text), 1, 6)));
  update founding_requests set code = c, status = 'approved', approved_at = now() where id = rid;
  perform notify_user(r.agent_id, 'milestone', 'You''re a founding agent 🧡',
    'Your code is ' || c || '. Enter it on the plan screen to lock in $39/month for life, as long as you meet our Agent Standards.', null);
  perform log_activity('match_approved', null, 'Admin', 'You approved ' || name_of(r.agent_id) || ' as a founding agent (code ' || c || ')');
  return c;
end $$;
