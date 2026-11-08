-- Agent subscription plans (Rapport / Dialogue / Fluency / Founding) and founding-agent codes.

alter table public.agents
  add column plan text check (plan in ('rapport','dialogue','fluency','founding')),
  add column plan_status text check (plan_status in ('active','pending','past_due','canceled')),
  add column stripe_customer_id text,
  add column stripe_subscription_id text;

-- Agents may edit their quiz answers, but never their own plan, cap, verification or billing ids.
-- Only admins, security-definer functions and the service role (Stripe webhook) can change those.
create or replace function public.protect_agent_billing() returns trigger
language plpgsql as $$
begin
  if current_user = 'authenticated' and not public.is_admin() then
    if tg_op = 'INSERT' then
      new.verified := false; new.plan := null; new.plan_status := null; new.monthly_cap := 6;
      new.stripe_customer_id := null; new.stripe_subscription_id := null;
    elsif (new.plan, new.plan_status, new.monthly_cap, new.verified, new.stripe_customer_id, new.stripe_subscription_id)
          is distinct from (old.plan, old.plan_status, old.monthly_cap, old.verified, old.stripe_customer_id, old.stripe_subscription_id) then
      raise exception 'Billing fields can only be changed through checkout';
    end if;
  end if;
  return new;
end $$;
create trigger agents_protect_billing before insert or update on public.agents
  for each row execute function public.protect_agent_billing();

-- ---------------------------------------------------------------- founding agents
create table public.founding_requests (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null unique references public.profiles on delete cascade,
  status text not null default 'requested' check (status in ('requested','approved','redeemed')),
  code text unique,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  redeemed_at timestamptz
);
alter table public.founding_requests enable row level security;
-- The agent can see their own request (and the code once approved); admins see all.
create policy "founding: own/admin" on public.founding_requests for select using (agent_id = auth.uid() or is_admin());

create or replace function public.request_founding() returns void
language plpgsql security definer set search_path = public as $$
declare ad record;
begin
  if my_role() <> 'agent' then raise exception 'Agents only'; end if;
  insert into founding_requests (agent_id) values (auth.uid()) on conflict (agent_id) do nothing;
  perform log_activity('match_suggested', null, name_of(auth.uid()),
    name_of(auth.uid()) || ' says they''re a founding agent. Approve them in Agents to send a code.');
  for ad in select id from profiles where role = 'admin' loop
    perform notify_user(ad.id, 'milestone', 'Founding agent request', name_of(auth.uid()) || ' is asking for founding agent pricing.', null);
  end loop;
end $$;

create or replace function public.approve_founding(rid uuid) returns text
language plpgsql security definer set search_path = public as $$
declare r founding_requests; c text;
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  select * into r from founding_requests where id = rid;
  c := coalesce(r.code, 'CF-' || upper(substr(md5(gen_random_uuid()::text), 1, 6)));
  update founding_requests set code = c, status = 'approved', approved_at = now() where id = rid;
  perform notify_user(r.agent_id, 'milestone', 'You''re a founding agent 🧡',
    'Your code is ' || c || '. Enter it on the plan screen to lock in $39/month for life.', null);
  perform log_activity('match_approved', null, 'Admin', 'You approved ' || name_of(r.agent_id) || ' as a founding agent (code ' || c || ')');
  return c;
end $$;

create or replace function public.redeem_founding_code(p_code text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update founding_requests set status = 'redeemed', redeemed_at = now()
    where agent_id = auth.uid() and status in ('approved','redeemed') and upper(code) = upper(trim(p_code));
  if not found then raise exception 'That code doesn''t match. Check the code we sent you.'; end if;
  perform log_activity('report_resolved', null, name_of(auth.uid()), name_of(auth.uid()) || ' validated their founding agent code');
end $$;

alter publication supabase_realtime add table public.agents;
