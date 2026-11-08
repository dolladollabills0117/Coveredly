-- Coveredly schema for Supabase (Postgres).
-- Run with `supabase db push`, or paste into the Supabase SQL editor.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  role text not null check (role in ('agent','policyholder','admin')),
  full_name text not null default '',
  email text not null,
  phone text,
  quiz_done boolean not null default false,
  created_at timestamptz not null default now()
);

-- Create a profile on sign-up. Role comes from sign-up metadata; nobody can sign up as admin.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role, full_name, email)
  values (new.id,
          case when new.raw_user_meta_data->>'role' = 'agent' then 'agent' else 'policyholder' end,
          coalesce(new.raw_user_meta_data->>'full_name',''), new.email);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin')
$$;

-- ---------------------------------------------------------------- quizzes
create table public.agents (
  user_id uuid primary key references public.profiles on delete cascade,
  license text not null,
  verified boolean not null default false,        -- set by admin after checking the NJ license
  licensed_states text[] not null default '{New Jersey}',
  counties text[] not null default '{}',
  contact_method text not null,
  languages text[] not null,
  explains text not null,
  advises text not null,
  speed text not null,
  best_lead_type text not null,
  lines text[] not null,
  monthly_cap int not null default 6,
  updated_at timestamptz not null default now()
);

create table public.policyholders (
  user_id uuid primary key references public.profiles on delete cascade,
  state text not null,
  county text,
  zip text,
  coverage text[] not null,
  language text not null,
  contact_method text not null,
  explain_style text not null,
  decision_style text not null,
  timing text not null,
  matters_most text not null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- matches (= leads on the agent side)
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  policyholder_id uuid not null references public.profiles on delete cascade,
  agent_id uuid references public.profiles on delete set null,
  score numeric not null default -1,
  matched_by text not null default 'Formula' check (matched_by in ('Formula','Admin')),
  status text not null default 'pending_approval'
    check (status in ('pending_approval','active','established','reported','replaced')),
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  contacted_at timestamptz,
  m_call timestamptz,
  m_quote timestamptz,
  m_sold timestamptz,
  m_review timestamptz,
  established_at timestamptz
);
create index on public.matches (agent_id, status);
create index on public.matches (policyholder_id);

create table public.lead_ratings (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches on delete cascade,
  agent_id uuid not null default auth.uid() references public.profiles,
  fit int not null check (fit between 1 and 5),
  vs_usual text not null check (vs_usual in ('Better','About the same','Worse')),
  note text,
  created_at timestamptz not null default now()
);

create table public.reviews (
  match_id uuid primary key references public.matches on delete cascade,
  policyholder_id uuid not null default auth.uid() references public.profiles,
  ease int not null check (ease between 1 and 5),
  would_recommend boolean not null,
  comment text,
  created_at timestamptz not null default now()
);

create table public.lead_reports (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches on delete cascade,
  agent_id uuid not null default auth.uid() references public.profiles,
  reason text not null,
  details text,
  status text not null default 'open' check (status in ('open','approved','denied')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches on delete cascade,
  sender_id uuid not null default auth.uid() references public.profiles,
  body text not null check (length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index on public.messages (match_id, created_at);

create table public.activity (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  match_id uuid references public.matches on delete set null,
  actor_name text not null,
  text text not null,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  kind text not null,
  title text not null,
  body text not null,
  match_id uuid references public.matches on delete cascade,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.push_tokens (
  user_id uuid not null references public.profiles on delete cascade,
  token text not null,
  primary key (user_id, token)
);

-- ---------------------------------------------------------------- helpers
create or replace function public.name_of(uid uuid) returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select full_name from profiles where id = uid), 'Someone')
$$;

create or replace function public.log_activity(t text, mid uuid, actor text, msg text) returns void
language sql security definer set search_path = public as $$
  insert into activity (type, match_id, actor_name, text) values (t, mid, actor, msg)
$$;

create or replace function public.notify_user(uid uuid, k text, ttl text, bdy text, mid uuid) returns void
language sql security definer set search_path = public as $$
  insert into notifications (user_id, kind, title, body, match_id) values (uid, k, ttl, bdy, mid)
$$;

-- All four milestones → Established, and celebrate on both sides.
create or replace function public.check_established() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status <> 'established' and new.m_call is not null and new.m_quote is not null
     and new.m_sold is not null and new.m_review is not null then
    new.status := 'established';
    new.established_at := now();
    perform notify_user(new.agent_id, 'established', 'It''s official! 🎉',
      'You and ' || name_of(new.policyholder_id) || ' have an established relationship.', new.id);
    perform notify_user(new.policyholder_id, 'established', 'You''re covered! 🎉',
      'You and ' || name_of(new.agent_id) || ' have an established relationship.', new.id);
    perform log_activity('established', new.id, name_of(new.agent_id),
      name_of(new.agent_id) || ' & ' || name_of(new.policyholder_id) || ' reached Established 🎉');
  end if;
  return new;
end $$;
create trigger matches_check_established before update on public.matches
  for each row execute function public.check_established();

-- ---------------------------------------------------------------- actions (RPC)
-- Clients never update matches directly; these functions enforce who can do what.

create or replace function public.mark_contacted(mid uuid) returns void
language plpgsql security definer set search_path = public as $$
declare m matches;
begin
  select * into m from matches where id = mid and agent_id = auth.uid() and status in ('active','established');
  if not found then raise exception 'Not your lead'; end if;
  if m.contacted_at is null then
    update matches set contacted_at = now() where id = mid;
    perform log_activity('contacted', mid, name_of(auth.uid()), name_of(auth.uid()) || ' contacted ' || name_of(m.policyholder_id));
  end if;
end $$;

create or replace function public.log_milestone(mid uuid, k text) returns void
language plpgsql security definer set search_path = public as $$
declare m matches;
begin
  select * into m from matches where id = mid and agent_id = auth.uid() and status in ('active','established');
  if not found then raise exception 'Not your lead'; end if;
  if k = 'call' and m.m_call is null then update matches set m_call = now(), contacted_at = coalesce(contacted_at, now()) where id = mid;
  elsif k = 'quote' and m.m_quote is null then update matches set m_quote = now(), contacted_at = coalesce(contacted_at, now()) where id = mid;
  elsif k = 'sold' and m.m_sold is null then
    update matches set m_sold = now(), contacted_at = coalesce(contacted_at, now()) where id = mid;
    perform notify_user(m.policyholder_id, 'milestone', 'Your policy is in place 🛡️',
      'Leave ' || name_of(auth.uid()) || ' a quick review to make it official.', mid);
  else return;
  end if;
  perform log_activity('milestone', mid, name_of(auth.uid()), name_of(auth.uid()) || ' ' ||
    case k when 'call' then 'had the first call with ' when 'quote' then 'delivered a quote to ' else 'sold a policy to ' end
    || name_of(m.policyholder_id));
end $$;

create or replace function public.submit_review(mid uuid, p_ease int, p_recommend boolean, p_comment text) returns void
language plpgsql security definer set search_path = public as $$
declare m matches;
begin
  select * into m from matches where id = mid and policyholder_id = auth.uid() and status in ('active','established');
  if not found then raise exception 'Not your match'; end if;
  insert into reviews (match_id, ease, would_recommend, comment) values (mid, p_ease, p_recommend, p_comment)
    on conflict (match_id) do update set ease = excluded.ease, would_recommend = excluded.would_recommend, comment = excluded.comment;
  update matches set m_review = coalesce(m_review, now()) where id = mid;
  perform log_activity('review', mid, name_of(auth.uid()), name_of(auth.uid()) || ' reviewed ' || name_of(m.agent_id) || ': ' || p_ease || '/5');
end $$;

create or replace function public.report_lead(mid uuid, p_reason text, p_details text) returns void
language plpgsql security definer set search_path = public as $$
declare m matches;
begin
  select * into m from matches where id = mid and agent_id = auth.uid() and status = 'active';
  if not found then raise exception 'Not your lead'; end if;
  insert into lead_reports (match_id, reason, details) values (mid, p_reason, p_details);
  update matches set status = 'reported' where id = mid;
  perform log_activity('reported', mid, name_of(auth.uid()), name_of(auth.uid()) || ' reported ' || name_of(m.policyholder_id) || ' as a bad lead: ' || p_reason);
end $$;

create or replace function public.rate_lead(mid uuid, p_fit int, p_vs text, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare m matches;
begin
  select * into m from matches where id = mid and agent_id = auth.uid();
  if not found then raise exception 'Not your lead'; end if;
  insert into lead_ratings (match_id, fit, vs_usual, note) values (mid, p_fit, p_vs, p_note);
  perform log_activity('rated', mid, name_of(auth.uid()), name_of(auth.uid()) || ' rated ' || name_of(m.policyholder_id) || ' ' || p_fit || '/5');
end $$;

-- Admin: approve a suggested match (or pick a different agent).
create or replace function public.approve_match(mid uuid, p_agent uuid, p_score numeric) returns void
language plpgsql security definer set search_path = public as $$
declare m matches;
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  select * into m from matches where id = mid and status = 'pending_approval';
  if not found then raise exception 'Match not pending'; end if;
  update matches set agent_id = p_agent, score = p_score, status = 'active', approved_at = now(),
    matched_by = case when m.agent_id = p_agent then 'Formula' else 'Admin' end where id = mid;
  perform notify_user(p_agent, 'matched', 'New lead matched ⚡', name_of(m.policyholder_id) || ' is ready to hear from you. Reach out fast!', mid);
  perform notify_user(m.policyholder_id, 'matched', 'You have a match! 🧡', 'Meet ' || name_of(p_agent) || ', your licensed NJ agent.', mid);
  perform log_activity('match_approved', mid, 'Admin', 'You matched ' || name_of(m.policyholder_id) || ' with ' || name_of(p_agent));
end $$;

create or replace function public.resolve_report(rid uuid, p_approve boolean) returns void
language plpgsql security definer set search_path = public as $$
declare r lead_reports;
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  update lead_reports set status = case when p_approve then 'approved' else 'denied' end, resolved_at = now()
    where id = rid returning * into r;
  update matches set status = case when p_approve then 'replaced' else 'active' end where id = r.match_id;
  perform notify_user(r.agent_id, 'matched',
    case when p_approve then 'Lead replacement approved' else 'Lead report reviewed' end,
    case when p_approve then 'We''ll send you a replacement lead as soon as one matches.'
         else 'This lead did not qualify for replacement and is back in your list.' end, r.match_id);
  perform log_activity('report_resolved', r.match_id, 'Admin', 'Report ' || case when p_approve then 'approved' else 'denied' end);
end $$;

-- Agent message also counts as "contacted".
create or replace function public.on_message() returns trigger
language plpgsql security definer set search_path = public as $$
declare m matches;
begin
  select * into m from matches where id = new.match_id;
  if new.sender_id = m.agent_id and m.contacted_at is null then
    update matches set contacted_at = now() where id = m.id;
    perform log_activity('contacted', m.id, name_of(m.agent_id), name_of(m.agent_id) || ' contacted ' || name_of(m.policyholder_id) || ' (in-app message)');
  end if;
  perform notify_user(case when new.sender_id = m.agent_id then m.policyholder_id else m.agent_id end,
    'message', 'New message from ' || name_of(new.sender_id), left(new.body, 120), m.id);
  return new;
end $$;
create trigger messages_after_insert after insert on public.messages for each row execute function public.on_message();

-- ---------------------------------------------------------------- row-level security
alter table public.profiles enable row level security;
alter table public.agents enable row level security;
alter table public.policyholders enable row level security;
alter table public.matches enable row level security;
alter table public.lead_ratings enable row level security;
alter table public.reviews enable row level security;
alter table public.lead_reports enable row level security;
alter table public.messages enable row level security;
alter table public.activity enable row level security;
alter table public.notifications enable row level security;
alter table public.push_tokens enable row level security;

-- Security-definer lookups so policies don't recurse into their own table.
create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$ select role from profiles where id = auth.uid() $$;
create or replace function public.my_verified() returns boolean
language sql stable security definer set search_path = public as $$ select coalesce((select verified from agents where user_id = auth.uid()), false) $$;

-- Is the caller one side of a non-pending match with this user?
create or replace function public.is_matched_with(other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from matches where status <> 'pending_approval' and
    ((agent_id = auth.uid() and policyholder_id = other) or (policyholder_id = auth.uid() and agent_id = other)))
$$;
create or replace function public.in_match(mid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from matches where id = mid and status <> 'pending_approval' and auth.uid() in (agent_id, policyholder_id))
$$;

create policy "profiles: self, matched, admin" on public.profiles for select
  using (id = auth.uid() or is_admin() or is_matched_with(id));
create policy "profiles: update self" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid() and role = my_role());

create policy "agents: self/admin/matched read" on public.agents for select using (user_id = auth.uid() or is_admin() or is_matched_with(user_id));
create policy "agents: self write" on public.agents for insert with check (user_id = auth.uid() and verified = false);
create policy "agents: self update" on public.agents for update using (user_id = auth.uid())
  with check (user_id = auth.uid() and verified = my_verified());
create policy "agents: admin update" on public.agents for update using (is_admin());

create policy "ph: self/admin/matched read" on public.policyholders for select using (user_id = auth.uid() or is_admin() or is_matched_with(user_id));
create policy "ph: self insert" on public.policyholders for insert with check (user_id = auth.uid());
create policy "ph: self update" on public.policyholders for update using (user_id = auth.uid());

create policy "matches: participants/admin" on public.matches for select using (
  is_admin() or policyholder_id = auth.uid() or (agent_id = auth.uid() and status <> 'pending_approval'));

create policy "ratings: own/admin" on public.lead_ratings for select using (agent_id = auth.uid() or is_admin());
create policy "reviews: participants/admin" on public.reviews for select using (is_admin() or in_match(match_id));
create policy "reports: own/admin" on public.lead_reports for select using (agent_id = auth.uid() or is_admin());

create policy "messages: participants read" on public.messages for select using (in_match(match_id) or is_admin());
create policy "messages: participants send" on public.messages for insert with check (sender_id = auth.uid() and in_match(match_id));

create policy "activity: admin" on public.activity for select using (is_admin());

create policy "notifications: own" on public.notifications for select using (user_id = auth.uid());
create policy "notifications: mark read" on public.notifications for update using (user_id = auth.uid());

create policy "push: own" on public.push_tokens for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Realtime for live updates in the app
alter publication supabase_realtime add table public.matches, public.messages, public.notifications;

-- To make yourself admin after signing up once in the app:
--   update public.profiles set role = 'admin' where email = 'hello@getcoveredly.com';
