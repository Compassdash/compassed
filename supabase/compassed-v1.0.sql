-- ===== CompassED v1.0: schoolwork platform connected to Compass Dash =====
-- Run this ONCE in the Compass Dash Supabase project (SQL Editor > New query > paste > Run), after
-- compass-dash-v2.8.0-teacher-accounts.sql. It is safe to run again: it never deletes anything.
--
-- What it adds (everything is prefixed ce_, so nothing in Compass Dash changes):
--  * Sign-in reuses Compass Dash accounts. Students sign in with their 4-digit code and username
--    (checked by the existing cd_auth); teachers with their Compass Dash username and password
--    (cd_t_login) and then use the same "t:..." session token (checked by the existing cd_tok).
--    The admin key keeps working for teacher functions too (cd_admin_ok).
--  * Units, lessons, quizzes and mastery checkpoints per subject, Lesson Playlists per class,
--    assignments and homework with draft-and-submit, version history, rubrics and grading,
--    spaced-repetition review cards, announcements with read receipts, calendar events,
--    notifications, and the Microsoft 365 link tables used by the ce-teams edge function.
--  * Read-only progress sync: ce_s_progress and ce_t_heatmap READ Compass Dash's stats and topic
--    progress (cd_codes.stats / cd_codes.prog). Nothing here writes to any cd_ table.
--
-- Subjects use the same numbering as Compass Dash teacher seats: 0 = Maths ... 10 = Arabic.

create extension if not exists pgcrypto;

-- ---------- 1. Tables ----------
create table if not exists public.ce_subject (
  id    int primary key,                  -- same number as cd_teacher.subj and cd_class.subj
  name  text not null,
  icon  text not null default 'book',   -- icon name in assets/icons.js
  color text not null default '#4cc4cf'
);
insert into public.ce_subject (id, name, icon, color) values
  (0,'Maths','maths','#4cc4cf'), (1,'English','english','#111111'), (2,'Science','science','#4cc4cf'), (3,'Geography','geography','#111111'),
  (4,'French','french','#4cc4cf'), (5,'Computing','computing','#111111'), (6,'Art & Design','art','#4cc4cf'), (7,'Music','music','#111111'),
  (8,'History','history','#4cc4cf'), (9,'Spanish','spanish','#111111'), (10,'Arabic','arabic','#4cc4cf')
on conflict (id) do nothing;

create table if not exists public.ce_unit (
  id       serial primary key,
  subj     int not null references public.ce_subject(id),
  class_id int references public.cd_class(id) on delete cascade,     -- null: every class in the subject
  year     int check (year is null or year between 7 and 9),
  title    text not null,
  summary  text not null default '',
  ord      int not null default 0,
  tid      int references public.cd_teacher(id) on delete set null,
  created  timestamptz not null default now()
);
create table if not exists public.ce_lesson (
  id       serial primary key,
  unit_id  int not null references public.ce_unit(id) on delete cascade,
  title    text not null,
  minutes  int not null default 20,
  blocks   jsonb not null default '[]'::jsonb,   -- [{t:'text'|'heading'|'list'|'key'|'video'|'link'|'check', ...}]
  ord      int not null default 0,
  pub      boolean not null default true,
  updated  timestamptz not null default now()
);
create table if not exists public.ce_lesson_done (
  lesson_id int not null references public.ce_lesson(id) on delete cascade,
  sid       bigint not null,
  at        timestamptz not null default now(),
  primary key (lesson_id, sid)
);
create table if not exists public.ce_quiz (
  id        serial primary key,
  subj      int not null references public.ce_subject(id),
  unit_id   int references public.ce_unit(id) on delete set null,
  title     text not null,
  kind      text not null default 'quiz' check (kind in ('quiz','checkpoint')),
  threshold int not null default 80,            -- % needed to pass a checkpoint
  qs        jsonb not null default '[]'::jsonb, -- [{q, a:[...4 options], c: correct index, why, topic}]
  tid       int references public.cd_teacher(id) on delete set null,
  updated   timestamptz not null default now()
);
create table if not exists public.ce_quiz_res (
  id      serial primary key,
  quiz_id int not null references public.ce_quiz(id) on delete cascade,
  sid     bigint not null,
  score   int not null default 0,
  out_of  int not null default 0,
  answers jsonb not null default '[]'::jsonb,
  at      timestamptz not null default now()
);
create index if not exists ce_quiz_res_q on public.ce_quiz_res (quiz_id, sid, at desc);

create table if not exists public.ce_playlist (
  id       serial primary key,
  class_id int not null references public.cd_class(id) on delete cascade,
  subj     int not null references public.ce_subject(id),
  title    text not null,
  items    jsonb not null default '[]'::jsonb,  -- [{t:'lesson'|'quiz', id}]
  tid      int references public.cd_teacher(id) on delete set null,
  updated  timestamptz not null default now()
);
create table if not exists public.ce_rubric (
  id       serial primary key,
  tid      int references public.cd_teacher(id) on delete set null,
  title    text not null,
  criteria jsonb not null default '[]'::jsonb,  -- [{name, levels:[{label, pts, desc}]}]
  updated  timestamptz not null default now()
);
create table if not exists public.ce_assign (
  id        serial primary key,
  class_id  int not null references public.cd_class(id) on delete cascade,
  subj      int not null references public.ce_subject(id),
  kind      text not null default 'homework' check (kind in ('homework','assignment','quiz')),
  title     text not null,
  instr     text not null default '',
  due       timestamptz,
  points    int not null default 10,
  quiz_id   int references public.ce_quiz(id) on delete set null,
  rubric_id int references public.ce_rubric(id) on delete set null,
  tid       int references public.cd_teacher(id) on delete set null,
  teams_id  text,                                -- Microsoft Teams assignment id once pushed
  created   timestamptz not null default now()
);
create table if not exists public.ce_sub (
  id        serial primary key,
  assign_id int not null references public.ce_assign(id) on delete cascade,
  sid       bigint not null,
  status    text not null default 'draft' check (status in ('draft','submitted','returned')),
  ver       int not null default 0,
  body      text not null default '',
  links     jsonb not null default '[]'::jsonb,
  sub_at    timestamptz,
  score     int,
  rub       jsonb,                               -- rubric level chosen per criterion
  feedback  text,
  graded_at timestamptz,
  teams_ok  boolean not null default false,      -- grade pushed to Teams
  unique (assign_id, sid)
);
create table if not exists public.ce_sub_ver (
  sub_id int not null references public.ce_sub(id) on delete cascade,
  ver    int not null,
  body   text not null,
  links  jsonb not null default '[]'::jsonb,
  at     timestamptz not null default now(),
  primary key (sub_id, ver)
);
create table if not exists public.ce_review (
  id       serial primary key,
  sid      bigint not null,
  subj     int not null,
  key      text not null,                        -- q:<quiz>:<n> or l:<lesson>:<n>
  front    text not null,
  back     text not null,
  ease     numeric not null default 2.5,
  ivl      int not null default 0,
  reps     int not null default 0,
  due      date not null default current_date,
  unique (sid, key)
);
create index if not exists ce_review_due on public.ce_review (sid, due);

create table if not exists public.ce_event (
  id       serial primary key,
  class_id int references public.cd_class(id) on delete cascade,  -- null: whole school
  kind     text not null default 'event' check (kind in ('event','exam','deadline','trip')),
  title    text not null,
  starts   timestamptz not null,
  ends     timestamptz,
  place    text not null default '',
  tid      int references public.cd_teacher(id) on delete set null
);
create table if not exists public.ce_ann (
  id       serial primary key,
  class_id int references public.cd_class(id) on delete cascade,  -- null: see targets
  targets  jsonb not null default '{}'::jsonb,   -- {year:7} or {sids:[...]} or {} = whole school
  title    text not null,
  body     text not null,
  pinned   boolean not null default false,
  tid      int references public.cd_teacher(id) on delete set null,
  created  timestamptz not null default now(),
  ends     timestamptz not null
);
create table if not exists public.ce_ann_read (
  ann_id int not null references public.ce_ann(id) on delete cascade,
  sid    bigint not null,
  at     timestamptz not null default now(),
  primary key (ann_id, sid)
);
create table if not exists public.ce_notif (
  id      serial primary key,
  sid     bigint,                                -- a student...
  tid     int,                                   -- ...or a teacher
  kind    text not null default 'info',
  title   text not null,
  body    text not null default '',
  link    text not null default '',
  created timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists ce_notif_s on public.ce_notif (sid, created desc);
create index if not exists ce_notif_t on public.ce_notif (tid, created desc);

-- Microsoft 365 / Teams (filled by the ce-teams edge function with the service role key)
create table if not exists public.ce_ms_user (
  oid     text primary key,                      -- Entra object id
  tenant  text not null,
  email   text,
  name    text,
  sid     bigint,                                -- linked student
  tid     int references public.cd_teacher(id) on delete cascade,  -- or linked teacher
  linked  timestamptz not null default now()
);
create table if not exists public.ce_ms_class (
  class_id int primary key references public.cd_class(id) on delete cascade,
  team_id  text not null,
  name     text,
  synced   timestamptz
);
create table if not exists public.ce_ms_session (
  tok     text primary key,                      -- sha256 of the session token
  oid     text not null references public.ce_ms_user(oid) on delete cascade,
  created timestamptz not null default now()
);

do $$ declare t text; begin
  foreach t in array array['ce_subject','ce_unit','ce_lesson','ce_lesson_done','ce_quiz','ce_quiz_res','ce_playlist','ce_rubric',
    'ce_assign','ce_sub','ce_sub_ver','ce_review','ce_event','ce_ann','ce_ann_read','ce_notif','ce_ms_user','ce_ms_class','ce_ms_session'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon, authenticated', t);
  end loop;
end $$;

-- ---------- 2. Helpers ----------
-- Student identity from code + username (reuses Compass Dash's cd_auth). Returns the cd_codes row or null.
create or replace function public.ce_student(p_code text, p_user text) returns public.cd_codes
language plpgsql stable security definer set search_path = public as $$
declare c text := public.cd_auth(p_code, p_user); r public.cd_codes;
begin
  if c like 'ERR:%' then return null; end if;
  select * into r from public.cd_codes where code = c;
  return r;
end $$;

-- Teacher identity from a session token or the admin key. Returns json {ok, admin, tid, subj, name, classes int[]}.
create or replace function public.ce_teacher(p_key text) returns json
language plpgsql stable security definer set search_path = public, extensions as $$
declare t public.cd_teacher;
begin
  t := public.cd_tok(p_key);
  if t.id is not null then
    return json_build_object('ok', true, 'admin', false, 'tid', t.id, 'subj', t.subj, 'name', coalesce(t.name, t.username),
      'username', t.username, 'classes', (select coalesce(array_agg(id), '{}') from public.cd_class where subj = t.subj));
  end if;
  if public.cd_admin_ok(p_key) then
    return json_build_object('ok', true, 'admin', true, 'tid', null, 'subj', null, 'name', 'Admin', 'username', 'admin',
      'classes', (select coalesce(array_agg(id), '{}') from public.cd_class));
  end if;
  return json_build_object('ok', false, 'error', 'bad_key');
end $$;

create or replace function public.ce_err(p_err text) returns json language sql immutable as $$
  select json_build_object('ok', false, 'error', p_err) $$;

create or replace function public.ce_ok_text(p text, n int) returns boolean language sql immutable as $$
  select p is not null and length(btrim(p)) between 1 and n $$;

-- Which classes may this teacher touch?  (admin: all)
create or replace function public.ce_can_class(t json, p_class int) returns boolean language sql stable as $$
  select (t->>'admin')::boolean or p_class = any(array(select json_array_elements_text(t->'classes'))::int[]) $$;
create or replace function public.ce_can_subj(t json, p_subj int) returns boolean language sql stable as $$
  select (t->>'admin')::boolean or (t->>'subj')::int = p_subj $$;

create or replace function public.ce_notify_class(p_class int, p_kind text, p_title text, p_body text, p_link text) returns void
language sql security definer set search_path = public as $$
  insert into public.ce_notif (sid, kind, title, body, link)
  select sid, p_kind, p_title, p_body, p_link from public.cd_codes where class_id = p_class and username is not null $$;

-- Mastery of one Compass Dash topic key "s.t" -> stage 0..4 (same rule as the Compass Dash page)
create or replace function public.ce_cd_stage(v jsonb) returns int language sql immutable as $$
  select case
    when coalesce((v->>'t')::boolean, false) and (v->>'a')::numeric >= 10 and (v->>'c')::numeric / greatest((v->>'a')::numeric, 1) >= .8 then 4
    when (v->>'a')::numeric >= 8 and (v->>'c')::numeric / greatest((v->>'a')::numeric, 1) >= .75 then 3
    when (v->>'a')::numeric >= 3 then 2
    when coalesce((v->>'a')::numeric, 0) > 0 or coalesce((v->>'r')::boolean, false) then 1 else 0 end $$;

-- Read-only view of a student's Compass Dash progress: xp, topics mastered, stage string, per-subject answers.
create or replace function public.ce_cd_summary(r public.cd_codes) returns json language sql stable as $$
  select json_build_object(
    'xp', coalesce((r.stats->>'xp')::int, 0), 'mast', coalesce((r.stats->>'mast')::int, 0), 'tot', coalesce((r.stats->>'tot')::int, 0),
    'ans', coalesce((r.stats->>'ans')::int, 0), 'cor', coalesce((r.stats->>'cor')::int, 0), 'st', coalesce(r.stats->>'st', ''),
    'sa', coalesce(r.stats->'sa', '[]'::jsonb), 'last_seen', r.last_seen,
    'topics', (select coalesce(json_object_agg(k, public.ce_cd_stage(v)), '{}'::json)
               from jsonb_each(case when jsonb_typeof(r.prog->'tp') = 'object' then r.prog->'tp' else '{}'::jsonb end) e(k, v))) $$;

-- ---------- 3. Student functions (p_code + p_user) ----------
create or replace function public.ce_s_login(p_code text, p_user text) returns json
language plpgsql security definer set search_path = public as $$
declare r public.cd_codes := public.ce_student(p_code, p_user);
begin
  if r.sid is null then return public.ce_err('no_match'); end if;
  return json_build_object('ok', true, 'sid', r.sid, 'code', r.code, 'username', r.username, 'house', r.house, 'year', r.year,
    'class', (select json_build_object('id', id, 'name', name, 'year', year, 'subj', subj) from public.cd_class where id = r.class_id),
    'subjects', (select json_agg(json_build_object('id', id, 'name', name, 'icon', icon, 'color', color) order by id) from public.ce_subject));
end $$;

-- Does announcement a reach student r?
create or replace function public.ce_ann_for(a public.ce_ann, r public.cd_codes) returns boolean language sql stable as $$
  select (a.class_id is not null and a.class_id = r.class_id)
      or (a.class_id is null and (a.targets = '{}'::jsonb
          or (a.targets ? 'year' and (a.targets->>'year')::int = r.year)
          or (a.targets ? 'sids' and a.targets->'sids' @> to_jsonb(r.sid)))) $$;

-- Everything the dashboard needs in one call.
create or replace function public.ce_s_home(p_code text, p_user text) returns json
language plpgsql security definer set search_path = public as $$
declare r public.cd_codes := public.ce_student(p_code, p_user);
begin
  if r.sid is null then return public.ce_err('no_match'); end if;
  return json_build_object('ok', true,
    'assigns', (select coalesce(json_agg(json_build_object('id', a.id, 'title', a.title, 'kind', a.kind, 'subj', a.subj, 'due', a.due, 'points', a.points,
                  'quiz_id', a.quiz_id, 'status', coalesce(s.status, 'todo'), 'score', s.score, 'sub_at', s.sub_at) order by a.due nulls last), '[]'::json)
                from public.ce_assign a left join public.ce_sub s on s.assign_id = a.id and s.sid = r.sid
                where a.class_id = r.class_id and (a.due is null or a.due > now() - interval '30 days')),
    'playlists', (select coalesce(json_agg(json_build_object('id', p.id, 'title', p.title, 'subj', p.subj, 'n', jsonb_array_length(p.items),
                  'done', (select count(*) from jsonb_array_elements(p.items) i where
                     (i->>'t' = 'lesson' and exists (select 1 from public.ce_lesson_done d where d.sid = r.sid and d.lesson_id = (i->>'id')::int)) or
                     (i->>'t' = 'quiz' and exists (select 1 from public.ce_quiz_res q where q.sid = r.sid and q.quiz_id = (i->>'id')::int)))) order by p.updated desc), '[]'::json)
                  from public.ce_playlist p where p.class_id = r.class_id),
    'events', (select coalesce(json_agg(json_build_object('id', e.id, 'kind', e.kind, 'title', e.title, 'starts', e.starts, 'place', e.place) order by e.starts), '[]'::json)
               from public.ce_event e where (e.class_id is null or e.class_id = r.class_id) and e.starts between now() and now() + interval '14 days'),
    'review_due', (select count(*) from public.ce_review v where v.sid = r.sid and v.due <= current_date),
    'unread_anns', (select count(*) from public.ce_ann a where a.ends > now() and public.ce_ann_for(a, r) and not exists (select 1 from public.ce_ann_read x where x.ann_id = a.id and x.sid = r.sid)),
    'notifs', (select coalesce(json_agg(json_build_object('id', n.id, 'kind', n.kind, 'title', n.title, 'body', n.body, 'link', n.link, 'created', n.created, 'read', n.read_at is not null) order by n.created desc), '[]'::json)
               from (select * from public.ce_notif where sid = r.sid order by created desc limit 20) n),
    'cd', public.ce_cd_summary(r));
end $$;

create or replace function public.ce_s_subjects(p_code text, p_user text) returns json
language plpgsql security definer set search_path = public as $$
declare r public.cd_codes := public.ce_student(p_code, p_user);
begin
  if r.sid is null then return public.ce_err('no_match'); end if;
  return json_build_object('ok', true,
    'units', (select coalesce(json_agg(json_build_object('id', u.id, 'subj', u.subj, 'title', u.title, 'summary', u.summary, 'ord', u.ord,
      'lessons', (select coalesce(json_agg(json_build_object('id', l.id, 'title', l.title, 'minutes', l.minutes, 'ord', l.ord,
                   'done', exists (select 1 from public.ce_lesson_done d where d.lesson_id = l.id and d.sid = r.sid)) order by l.ord, l.id), '[]'::json)
                  from public.ce_lesson l where l.unit_id = u.id and l.pub),
      'quizzes', (select coalesce(json_agg(json_build_object('id', q.id, 'title', q.title, 'kind', q.kind, 'threshold', q.threshold, 'n', jsonb_array_length(q.qs),
                   'best', (select max(case when x.out_of > 0 then round(100.0 * x.score / x.out_of) else 0 end) from public.ce_quiz_res x where x.quiz_id = q.id and x.sid = r.sid),
                   'tries', (select count(*) from public.ce_quiz_res x where x.quiz_id = q.id and x.sid = r.sid)) order by q.kind desc, q.id), '[]'::json)
                  from public.ce_quiz q where q.unit_id = u.id)) order by u.subj, u.ord, u.id), '[]'::json)
              from public.ce_unit u where (u.class_id is null or u.class_id = r.class_id) and (u.year is null or u.year = r.year)),
    'playlists', (select coalesce(json_agg(json_build_object('id', p.id, 'title', p.title, 'subj', p.subj, 'items', p.items) order by p.updated desc), '[]'::json)
                  from public.ce_playlist p where p.class_id = r.class_id),
    'cd', public.ce_cd_summary(r));
end $$;

create or replace function public.ce_s_lesson(p_code text, p_user text, p_id int) returns json
language plpgsql security definer set search_path = public as $$
declare r public.cd_codes := public.ce_student(p_code, p_user); l public.ce_lesson; u public.ce_unit;
begin
  if r.sid is null then return public.ce_err('no_match'); end if;
  select * into l from public.ce_lesson where id = p_id and pub;
  if l.id is null then return public.ce_err('not_found'); end if;
  select * into u from public.ce_unit where id = l.unit_id;
  if not (u.class_id is null or u.class_id = r.class_id) then return public.ce_err('not_found'); end if;
  return json_build_object('ok', true, 'id', l.id, 'title', l.title, 'minutes', l.minutes, 'blocks', l.blocks, 'unit', json_build_object('id', u.id, 'title', u.title, 'subj', u.subj),
    'done', exists (select 1 from public.ce_lesson_done d where d.lesson_id = l.id and d.sid = r.sid),
    'next', (select json_build_object('id', x.id, 'title', x.title) from public.ce_lesson x where x.unit_id = u.id and x.pub and (x.ord, x.id) > (l.ord, l.id) order by x.ord, x.id limit 1));
end $$;

create or replace function public.ce_s_lesson_done(p_code text, p_user text, p_id int) returns json
language plpgsql security definer set search_path = public as $$
declare r public.cd_codes := public.ce_student(p_code, p_user); l public.ce_lesson; b jsonb; n int := 0;
begin
  if r.sid is null then return public.ce_err('no_match'); end if;
  select * into l from public.ce_lesson where id = p_id and pub;
  if l.id is null then return public.ce_err('not_found'); end if;
  insert into public.ce_lesson_done (lesson_id, sid) values (l.id, r.sid) on conflict do nothing;
  -- key points become review cards (spaced repetition)
  for b in select * from jsonb_array_elements(l.blocks) where value->>'t' = 'key' loop
    n := n + 1;
    insert into public.ce_review (sid, subj, key, front, back)
      select r.sid, u.subj, 'l:' || l.id || ':' || n, coalesce(b->>'q', l.title || ': key point ' || n), left(b->>'text', 600) from public.ce_unit u where u.id = l.unit_id
    on conflict do nothing;
  end loop;
  return json_build_object('ok', true);
end $$;

create or replace function public.ce_s_quiz(p_code text, p_user text, p_id int) returns json
language plpgsql security definer set search_path = public as $$
declare r public.cd_codes := public.ce_student(p_code, p_user); q public.ce_quiz;
begin
  if r.sid is null then return public.ce_err('no_match'); end if;
  select * into q from public.ce_quiz where id = p_id;
  if q.id is null then return public.ce_err('not_found'); end if;
  -- questions are sent without the answer key; marking happens in ce_s_quiz_done
  return json_build_object('ok', true, 'id', q.id, 'title', q.title, 'kind', q.kind, 'threshold', q.threshold, 'subj', q.subj,
    'qs', (select coalesce(json_agg(json_build_object('q', x->>'q', 'a', x->'a', 'topic', x->>'topic')), '[]'::json) from jsonb_array_elements(q.qs) x),
    'tries', (select count(*) from public.ce_quiz_res x where x.quiz_id = q.id and x.sid = r.sid));
end $$;

create or replace function public.ce_s_quiz_done(p_code text, p_user text, p_id int, p_answers json, p_assign int default null) returns json
language plpgsql security definer set search_path = public as $$
declare r public.cd_codes := public.ce_student(p_code, p_user); q public.ce_quiz; i int := 0; sc int := 0; n int; x jsonb; ans int; res jsonb := '[]'::jsonb;
begin
  if r.sid is null then return public.ce_err('no_match'); end if;
  select * into q from public.ce_quiz where id = p_id;
  if q.id is null then return public.ce_err('not_found'); end if;
  n := jsonb_array_length(q.qs);
  if p_answers is null or json_typeof(p_answers) <> 'array' or json_array_length(p_answers) <> n then return public.ce_err('bad_answers'); end if;
  for x in select * from jsonb_array_elements(q.qs) loop
    ans := nullif(p_answers->>i, '')::int;
    if ans = (x->>'c')::int then sc := sc + 1;
    else   -- a wrong answer becomes a review card
      insert into public.ce_review (sid, subj, key, front, back) values (r.sid, q.subj, 'q:' || q.id || ':' || i, x->>'q',
        coalesce(x->'a'->>((x->>'c')::int), '') || case when coalesce(x->>'why', '') <> '' then E'\n' || (x->>'why') else '' end)
      on conflict (sid, key) do update set due = current_date, ivl = 0;
    end if;
    res := res || jsonb_build_object('i', i, 'ans', ans, 'c', (x->>'c')::int, 'why', x->>'why');
    i := i + 1;
  end loop;
  insert into public.ce_quiz_res (quiz_id, sid, score, out_of, answers) values (q.id, r.sid, sc, n, p_answers::jsonb);
  if p_assign is not null and exists (select 1 from public.ce_assign a where a.id = p_assign and a.quiz_id = q.id and a.class_id = r.class_id) then
    insert into public.ce_sub (assign_id, sid, status, ver, body, sub_at, score)
      values (p_assign, r.sid, 'submitted', 1, 'Quiz: ' || sc || '/' || n, now(), round(100.0 * sc / greatest(n, 1)))
    on conflict (assign_id, sid) do update set status = 'submitted', sub_at = now(), score = greatest(coalesce(public.ce_sub.score, 0), excluded.score), body = excluded.body;
  end if;
  return json_build_object('ok', true, 'score', sc, 'out_of', n, 'pct', round(100.0 * sc / greatest(n, 1)), 'passed', q.kind <> 'checkpoint' or 100 * sc >= q.threshold * n, 'results', res);
end $$;

create or replace function public.ce_s_assigns(p_code text, p_user text) returns json
language plpgsql security definer set search_path = public as $$
declare r public.cd_codes := public.ce_student(p_code, p_user);
begin
  if r.sid is null then return public.ce_err('no_match'); end if;
  return json_build_object('ok', true, 'rows', (select coalesce(json_agg(json_build_object('id', a.id, 'title', a.title, 'kind', a.kind, 'subj', a.subj, 'instr', a.instr,
      'due', a.due, 'points', a.points, 'quiz_id', a.quiz_id, 'created', a.created,
      'rubric', (select json_build_object('title', b.title, 'criteria', b.criteria) from public.ce_rubric b where b.id = a.rubric_id),
      'sub', case when s.id is null then null else json_build_object('id', s.id, 'status', s.status, 'ver', s.ver, 'body', s.body, 'links', s.links, 'sub_at', s.sub_at,
                 'score', s.score, 'rub', s.rub, 'feedback', s.feedback, 'graded_at', s.graded_at,
                 'versions', (select coalesce(json_agg(json_build_object('ver', v.ver, 'at', v.at, 'len', length(v.body)) order by v.ver desc), '[]'::json) from public.ce_sub_ver v where v.sub_id = s.id)) end)
      order by a.due nulls last, a.id desc), '[]'::json)
    from public.ce_assign a left join public.ce_sub s on s.assign_id = a.id and s.sid = r.sid where a.class_id = r.class_id));
end $$;

-- Save a draft (p_final = false) or hand in (p_final = true). Every save is kept as a version.
create or replace function public.ce_s_submit(p_code text, p_user text, p_assign int, p_body text, p_links json, p_final boolean) returns json
language plpgsql security definer set search_path = public as $$
declare r public.cd_codes := public.ce_student(p_code, p_user); a public.ce_assign; s public.ce_sub; v int;
begin
  if r.sid is null then return public.ce_err('no_match'); end if;
  select * into a from public.ce_assign where id = p_assign and class_id = r.class_id;
  if a.id is null then return public.ce_err('not_found'); end if;
  if length(coalesce(p_body, '')) > 20000 or length(coalesce(p_links::text, '[]')) > 4000 then return public.ce_err('too_big'); end if;
  if p_final and length(btrim(coalesce(p_body, ''))) = 0 and coalesce(json_array_length(p_links), 0) = 0 then return public.ce_err('empty'); end if;
  insert into public.ce_sub (assign_id, sid) values (a.id, r.sid) on conflict do nothing;
  select * into s from public.ce_sub where assign_id = a.id and sid = r.sid for update;
  if s.status = 'returned' and not p_final then return public.ce_err('graded'); end if;
  v := s.ver + 1;
  insert into public.ce_sub_ver (sub_id, ver, body, links) values (s.id, v, coalesce(p_body, ''), coalesce(p_links, '[]')::jsonb);
  update public.ce_sub set ver = v, body = coalesce(p_body, ''), links = coalesce(p_links, '[]')::jsonb,
    status = case when p_final then 'submitted' else status end, sub_at = case when p_final then now() else sub_at end where id = s.id;
  if p_final and a.tid is not null then
    insert into public.ce_notif (tid, kind, title, body, link) values (a.tid, 'submission', r.username || ' handed in "' || a.title || '"', '', '#/assignment/' || a.id);
  end if;
  return json_build_object('ok', true, 'ver', v, 'status', case when p_final then 'submitted' else s.status end);
end $$;

create or replace function public.ce_s_review(p_code text, p_user text) returns json
language plpgsql security definer set search_path = public as $$
declare r public.cd_codes := public.ce_student(p_code, p_user);
begin
  if r.sid is null then return public.ce_err('no_match'); end if;
  return json_build_object('ok', true,
    'due', (select coalesce(json_agg(json_build_object('id', v.id, 'subj', v.subj, 'front', v.front, 'back', v.back, 'reps', v.reps) order by v.due, v.id), '[]'::json)
            from (select * from public.ce_review where sid = r.sid and due <= current_date order by due, id limit 40) v),
    'total', (select count(*) from public.ce_review where sid = r.sid),
    'next', (select min(due) from public.ce_review where sid = r.sid and due > current_date));
end $$;

-- SM-2 style: grade 0 = forgot, 1 = hard, 2 = good, 3 = easy
create or replace function public.ce_s_review_done(p_code text, p_user text, p_id int, p_grade int) returns json
language plpgsql security definer set search_path = public as $$
declare r public.cd_codes := public.ce_student(p_code, p_user); v public.ce_review; g int := least(greatest(coalesce(p_grade, 0), 0), 3); e numeric; iv int;
begin
  if r.sid is null then return public.ce_err('no_match'); end if;
  select * into v from public.ce_review where id = p_id and sid = r.sid for update;
  if v.id is null then return public.ce_err('not_found'); end if;
  if g = 0 then iv := 0; e := greatest(1.3, v.ease - 0.2);
  else
    e := greatest(1.3, v.ease + case g when 1 then -0.15 when 2 then 0 else 0.15 end);
    iv := case when v.reps = 0 then 1 when v.reps = 1 then 3 else round(greatest(v.ivl, 1) * e) end;
    if g = 1 then iv := greatest(1, iv / 2); end if;
  end if;
  update public.ce_review set ease = e, ivl = iv, reps = case when g = 0 then 0 else v.reps + 1 end,
    due = current_date + greatest(iv, case when g = 0 then 0 else 1 end) where id = v.id;
  return json_build_object('ok', true, 'due_in', greatest(iv, case when g = 0 then 0 else 1 end));
end $$;

create or replace function public.ce_s_progress(p_code text, p_user text) returns json
language plpgsql security definer set search_path = public as $$
declare r public.cd_codes := public.ce_student(p_code, p_user);
begin
  if r.sid is null then return public.ce_err('no_match'); end if;
  return json_build_object('ok', true,
    'subjects', (select coalesce(json_agg(json_build_object('id', s.id, 'name', s.name, 'icon', s.icon,
      'lessons', (select count(*) from public.ce_lesson l join public.ce_unit u on u.id = l.unit_id where u.subj = s.id and l.pub and (u.class_id is null or u.class_id = r.class_id) and (u.year is null or u.year = r.year)),
      'lessons_done', (select count(*) from public.ce_lesson_done d join public.ce_lesson l on l.id = d.lesson_id join public.ce_unit u on u.id = l.unit_id where u.subj = s.id and d.sid = r.sid),
      'checkpoints', (select count(*) from public.ce_quiz q join public.ce_unit u on u.id = q.unit_id where q.subj = s.id and q.kind = 'checkpoint' and (u.class_id is null or u.class_id = r.class_id)),
      'checkpoints_passed', (select count(*) from public.ce_quiz q where q.subj = s.id and q.kind = 'checkpoint'
          and exists (select 1 from public.ce_quiz_res x where x.quiz_id = q.id and x.sid = r.sid and 100 * x.score >= q.threshold * greatest(x.out_of, 1))),
      'quiz_avg', (select round(avg(100.0 * x.score / greatest(x.out_of, 1))) from public.ce_quiz_res x join public.ce_quiz q on q.id = x.quiz_id where q.subj = s.id and x.sid = r.sid),
      'assigns', (select count(*) from public.ce_assign a where a.subj = s.id and a.class_id = r.class_id),
      'assigns_done', (select count(*) from public.ce_assign a join public.ce_sub b on b.assign_id = a.id and b.sid = r.sid where a.subj = s.id and a.class_id = r.class_id and b.status <> 'draft'),
      'grade_avg', (select round(avg(b.score)) from public.ce_assign a join public.ce_sub b on b.assign_id = a.id and b.sid = r.sid where a.subj = s.id and b.score is not null)
      ) order by s.id), '[]'::json) from public.ce_subject s),
    'recent', (select coalesce(json_agg(json_build_object('title', q.title, 'kind', q.kind, 'subj', q.subj, 'score', x.score, 'out_of', x.out_of, 'at', x.at) order by x.at desc), '[]'::json)
               from (select * from public.ce_quiz_res where sid = r.sid order by at desc limit 12) x join public.ce_quiz q on q.id = x.quiz_id),
    'cd', public.ce_cd_summary(r));
end $$;

create or replace function public.ce_s_calendar(p_code text, p_user text, p_from date, p_to date) returns json
language plpgsql security definer set search_path = public as $$
declare r public.cd_codes := public.ce_student(p_code, p_user);
begin
  if r.sid is null then return public.ce_err('no_match'); end if;
  return json_build_object('ok', true, 'rows', (
    select coalesce(json_agg(x order by x.starts), '[]'::json) from (
      select 'e' || e.id as id, e.kind, e.title, e.starts, e.ends, e.place, null::int as assign_id, (select name from public.cd_class where id = e.class_id) as class
        from public.ce_event e where (e.class_id is null or e.class_id = r.class_id) and e.starts::date between p_from and p_to
      union all
      select 'a' || a.id, 'due', a.title, a.due, null, (select name from public.ce_subject where id = a.subj), a.id, null
        from public.ce_assign a where a.class_id = r.class_id and a.due is not null and a.due::date between p_from and p_to) x));
end $$;

create or replace function public.ce_s_anns(p_code text, p_user text) returns json
language plpgsql security definer set search_path = public as $$
declare r public.cd_codes := public.ce_student(p_code, p_user);
begin
  if r.sid is null then return public.ce_err('no_match'); end if;
  return json_build_object('ok', true, 'rows', (select coalesce(json_agg(json_build_object('id', a.id, 'title', a.title, 'body', a.body, 'pinned', a.pinned, 'created', a.created,
      'from', (select coalesce(t.name, t.username) from public.cd_teacher t where t.id = a.tid), 'class', (select name from public.cd_class where id = a.class_id),
      'read', exists (select 1 from public.ce_ann_read x where x.ann_id = a.id and x.sid = r.sid)) order by a.pinned desc, a.created desc), '[]'::json)
    from public.ce_ann a where a.ends > now() and public.ce_ann_for(a, r)));
end $$;

create or replace function public.ce_s_ann_read(p_code text, p_user text, p_id int) returns json
language plpgsql security definer set search_path = public as $$
declare r public.cd_codes := public.ce_student(p_code, p_user);
begin
  if r.sid is null then return public.ce_err('no_match'); end if;
  insert into public.ce_ann_read (ann_id, sid) select a.id, r.sid from public.ce_ann a where a.id = p_id and public.ce_ann_for(a, r) on conflict do nothing;
  return json_build_object('ok', true);
end $$;

create or replace function public.ce_s_notif_read(p_code text, p_user text, p_id int) returns json
language plpgsql security definer set search_path = public as $$
declare r public.cd_codes := public.ce_student(p_code, p_user);
begin
  if r.sid is null then return public.ce_err('no_match'); end if;
  update public.ce_notif set read_at = now() where sid = r.sid and read_at is null and (p_id is null or id = p_id);
  return json_build_object('ok', true);
end $$;

-- ---------- 4. Teacher functions (p_key = "t:..." session token from cd_t_login, or the admin key) ----------
create or replace function public.ce_t_me(p_key text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare t json := public.ce_teacher(p_key);
begin
  if not (t->>'ok')::boolean then return t; end if;
  return t::jsonb || jsonb_build_object(
    'classes', (select coalesce(json_agg(json_build_object('id', c.id, 'name', c.name, 'year', c.year, 'subj', c.subj,
                  'n', (select count(*) from public.cd_codes x where x.class_id = c.id and x.username is not null),
                  'team', (select m.team_id from public.ce_ms_class m where m.class_id = c.id)) order by c.name), '[]'::json)
                from public.cd_class c where public.ce_can_class(t, c.id)),
    'subjects', (select json_agg(json_build_object('id', id, 'name', name, 'icon', icon, 'color', color) order by id) from public.ce_subject))::json;
end $$;

create or replace function public.ce_t_home(p_key text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare t json := public.ce_teacher(p_key);
begin
  if not (t->>'ok')::boolean then return t; end if;
  return json_build_object('ok', true,
    'to_grade', (select count(*) from public.ce_sub s join public.ce_assign a on a.id = s.assign_id where s.status = 'submitted' and public.ce_can_class(t, a.class_id)),
    'assigns', (select coalesce(json_agg(json_build_object('id', a.id, 'title', a.title, 'kind', a.kind, 'due', a.due, 'class_id', a.class_id,
                  'class', (select name from public.cd_class where id = a.class_id),
                  'n', (select count(*) from public.cd_codes x where x.class_id = a.class_id and x.username is not null),
                  'submitted', (select count(*) from public.ce_sub s where s.assign_id = a.id and s.status <> 'draft'),
                  'graded', (select count(*) from public.ce_sub s where s.assign_id = a.id and s.status = 'returned')) order by a.due nulls last), '[]'::json)
                from public.ce_assign a where public.ce_can_class(t, a.class_id) and (a.due is null or a.due > now() - interval '7 days')),
    'events', (select coalesce(json_agg(json_build_object('id', e.id, 'kind', e.kind, 'title', e.title, 'starts', e.starts) order by e.starts), '[]'::json)
               from public.ce_event e where (e.class_id is null or public.ce_can_class(t, e.class_id)) and e.starts between now() and now() + interval '14 days'),
    'notifs', (select coalesce(json_agg(json_build_object('id', n.id, 'kind', n.kind, 'title', n.title, 'link', n.link, 'created', n.created, 'read', n.read_at is not null) order by n.created desc), '[]'::json)
               from (select * from public.ce_notif where tid = (t->>'tid')::int order by created desc limit 20) n),
    'active', (select count(distinct x.sid) from public.cd_codes x where public.ce_can_class(t, x.class_id) and x.last_seen > now() - interval '7 days'));
end $$;

-- Students in a class with Compass Dash stats (read-only) and CompassED completion
create or replace function public.ce_t_class(p_key text, p_class int) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare t json := public.ce_teacher(p_key);
begin
  if not (t->>'ok')::boolean then return t; end if;
  if not public.ce_can_class(t, p_class) then return public.ce_err('forbidden'); end if;
  return json_build_object('ok', true,
    'class', (select json_build_object('id', id, 'name', name, 'year', year, 'subj', subj) from public.cd_class where id = p_class),
    'students', (select coalesce(json_agg(json_build_object('sid', x.sid, 'name', x.username, 'code', x.code, 'house', x.house, 'year', x.year, 'last_seen', x.last_seen,
        'cd', public.ce_cd_summary(x),
        'lessons_done', (select count(*) from public.ce_lesson_done d where d.sid = x.sid),
        'submitted', (select count(*) from public.ce_sub s join public.ce_assign a on a.id = s.assign_id where s.sid = x.sid and a.class_id = p_class and s.status <> 'draft'),
        'grade_avg', (select round(avg(s.score)) from public.ce_sub s join public.ce_assign a on a.id = s.assign_id where s.sid = x.sid and a.class_id = p_class and s.score is not null),
        'quiz_avg', (select round(avg(100.0 * q.score / greatest(q.out_of, 1))) from public.ce_quiz_res q where q.sid = x.sid),
        'ms', exists (select 1 from public.ce_ms_user m where m.sid = x.sid)) order by x.username), '[]'::json)
      from public.cd_codes x where x.class_id = p_class and x.username is not null));
end $$;

-- Class Overview Heatmap: students x units. Each cell: lesson completion %, best checkpoint %, quiz average.
create or replace function public.ce_t_heatmap(p_key text, p_class int) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare t json := public.ce_teacher(p_key); c public.cd_class;
begin
  if not (t->>'ok')::boolean then return t; end if;
  if not public.ce_can_class(t, p_class) then return public.ce_err('forbidden'); end if;
  select * into c from public.cd_class where id = p_class;
  return json_build_object('ok', true,
    'units', (select coalesce(json_agg(json_build_object('id', u.id, 'title', u.title, 'subj', u.subj,
                'lessons', (select count(*) from public.ce_lesson l where l.unit_id = u.id and l.pub),
                'checkpoint', (select q.id from public.ce_quiz q where q.unit_id = u.id and q.kind = 'checkpoint' order by q.id limit 1)) order by u.subj, u.ord, u.id), '[]'::json)
              from public.ce_unit u where (u.class_id is null or u.class_id = p_class) and (u.year is null or u.year = c.year) and (c.subj is null or u.subj = c.subj)),
    'students', (select coalesce(json_agg(json_build_object('sid', x.sid, 'name', x.username, 'cd', public.ce_cd_summary(x),
        'cells', (select coalesce(json_object_agg(u.id, json_build_object(
            'done', (select count(*) from public.ce_lesson_done d join public.ce_lesson l on l.id = d.lesson_id where l.unit_id = u.id and d.sid = x.sid),
            'cp', (select max(round(100.0 * r.score / greatest(r.out_of, 1))) from public.ce_quiz_res r join public.ce_quiz q on q.id = r.quiz_id where q.unit_id = u.id and q.kind = 'checkpoint' and r.sid = x.sid),
            'quiz', (select round(avg(100.0 * r.score / greatest(r.out_of, 1))) from public.ce_quiz_res r join public.ce_quiz q on q.id = r.quiz_id where q.unit_id = u.id and r.sid = x.sid))), '{}'::json)
          from public.ce_unit u where (u.class_id is null or u.class_id = p_class) and (u.year is null or u.year = c.year) and (c.subj is null or u.subj = c.subj))) order by x.username), '[]'::json)
      from public.cd_codes x where x.class_id = p_class and x.username is not null));
end $$;

-- Content: units, lessons and quizzes the teacher may edit (their subject; admin: all)
create or replace function public.ce_t_content(p_key text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare t json := public.ce_teacher(p_key);
begin
  if not (t->>'ok')::boolean then return t; end if;
  return json_build_object('ok', true,
    'units', (select coalesce(json_agg(json_build_object('id', u.id, 'subj', u.subj, 'class_id', u.class_id, 'year', u.year, 'title', u.title, 'summary', u.summary, 'ord', u.ord,
      'lessons', (select coalesce(json_agg(json_build_object('id', l.id, 'title', l.title, 'minutes', l.minutes, 'ord', l.ord, 'pub', l.pub, 'blocks', l.blocks, 'updated', l.updated) order by l.ord, l.id), '[]'::json) from public.ce_lesson l where l.unit_id = u.id)
      ) order by u.subj, u.ord, u.id), '[]'::json) from public.ce_unit u where public.ce_can_subj(t, u.subj)),
    'quizzes', (select coalesce(json_agg(json_build_object('id', q.id, 'subj', q.subj, 'unit_id', q.unit_id, 'title', q.title, 'kind', q.kind, 'threshold', q.threshold, 'qs', q.qs, 'updated', q.updated,
      'tries', (select count(*) from public.ce_quiz_res r where r.quiz_id = q.id)) order by q.updated desc), '[]'::json) from public.ce_quiz q where public.ce_can_subj(t, q.subj)),
    'playlists', (select coalesce(json_agg(json_build_object('id', p.id, 'class_id', p.class_id, 'subj', p.subj, 'title', p.title, 'items', p.items) order by p.updated desc), '[]'::json) from public.ce_playlist p where public.ce_can_class(t, p.class_id)),
    'rubrics', (select coalesce(json_agg(json_build_object('id', b.id, 'title', b.title, 'criteria', b.criteria, 'updated', b.updated) order by b.updated desc), '[]'::json)
                from public.ce_rubric b where (t->>'admin')::boolean or b.tid = (t->>'tid')::int));
end $$;

create or replace function public.ce_t_unit_save(p_key text, p_id int, p_subj int, p_class int, p_year int, p_title text, p_summary text, p_ord int) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare t json := public.ce_teacher(p_key); i int;
begin
  if not (t->>'ok')::boolean then return t; end if;
  if not public.ce_can_subj(t, p_subj) or (coalesce(p_class, 0) <> 0 and not public.ce_can_class(t, p_class)) then return public.ce_err('forbidden'); end if;
  if not public.ce_ok_text(p_title, 80) then return public.ce_err('bad_text'); end if;
  if coalesce(p_id, 0) = 0 then
    insert into public.ce_unit (subj, class_id, year, title, summary, ord, tid) values (p_subj, nullif(p_class, 0), nullif(p_year, 0), btrim(p_title), left(coalesce(p_summary, ''), 400), coalesce(p_ord, 0), (t->>'tid')::int) returning id into i;
  else
    update public.ce_unit set subj = p_subj, class_id = nullif(p_class, 0), year = nullif(p_year, 0), title = btrim(p_title), summary = left(coalesce(p_summary, ''), 400), ord = coalesce(p_ord, 0)
     where id = p_id and public.ce_can_subj(t, subj) returning id into i;
  end if;
  if i is null then return public.ce_err('not_found'); end if;
  return json_build_object('ok', true, 'id', i);
end $$;

create or replace function public.ce_t_unit_del(p_key text, p_id int) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare t json := public.ce_teacher(p_key);
begin
  if not (t->>'ok')::boolean then return t; end if;
  delete from public.ce_unit where id = p_id and public.ce_can_subj(t, subj);
  return json_build_object('ok', found);
end $$;

create or replace function public.ce_t_lesson_save(p_key text, p_id int, p_unit int, p_title text, p_minutes int, p_blocks json, p_ord int, p_pub boolean) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare t json := public.ce_teacher(p_key); i int; u public.ce_unit;
begin
  if not (t->>'ok')::boolean then return t; end if;
  select * into u from public.ce_unit where id = p_unit;
  if u.id is null or not public.ce_can_subj(t, u.subj) then return public.ce_err('forbidden'); end if;
  if not public.ce_ok_text(p_title, 100) then return public.ce_err('bad_text'); end if;
  if p_blocks is null or json_typeof(p_blocks) <> 'array' or length(p_blocks::text) > 200000 then return public.ce_err('too_big'); end if;
  if coalesce(p_id, 0) = 0 then
    insert into public.ce_lesson (unit_id, title, minutes, blocks, ord, pub) values (u.id, btrim(p_title), least(greatest(coalesce(p_minutes, 20), 1), 300), p_blocks::jsonb, coalesce(p_ord, 0), coalesce(p_pub, true)) returning id into i;
  else
    update public.ce_lesson set unit_id = u.id, title = btrim(p_title), minutes = least(greatest(coalesce(p_minutes, 20), 1), 300), blocks = p_blocks::jsonb, ord = coalesce(p_ord, 0), pub = coalesce(p_pub, true), updated = now()
     where id = p_id and exists (select 1 from public.ce_unit x where x.id = public.ce_lesson.unit_id and public.ce_can_subj(t, x.subj)) returning id into i;
  end if;
  if i is null then return public.ce_err('not_found'); end if;
  return json_build_object('ok', true, 'id', i);
end $$;

create or replace function public.ce_t_lesson_del(p_key text, p_id int) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare t json := public.ce_teacher(p_key);
begin
  if not (t->>'ok')::boolean then return t; end if;
  delete from public.ce_lesson l where l.id = p_id and exists (select 1 from public.ce_unit x where x.id = l.unit_id and public.ce_can_subj(t, x.subj));
  return json_build_object('ok', found);
end $$;

create or replace function public.ce_t_quiz_save(p_key text, p_id int, p_subj int, p_unit int, p_title text, p_kind text, p_threshold int, p_qs json) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare t json := public.ce_teacher(p_key); i int;
begin
  if not (t->>'ok')::boolean then return t; end if;
  if not public.ce_can_subj(t, p_subj) then return public.ce_err('forbidden'); end if;
  if not public.ce_ok_text(p_title, 100) then return public.ce_err('bad_text'); end if;
  if p_qs is null or json_typeof(p_qs) <> 'array' or json_array_length(p_qs) not between 1 and 60 or length(p_qs::text) > 120000 then return public.ce_err('bad_quiz'); end if;
  if coalesce(p_id, 0) = 0 then
    insert into public.ce_quiz (subj, unit_id, title, kind, threshold, qs, tid) values (p_subj, nullif(p_unit, 0), btrim(p_title), coalesce(p_kind, 'quiz'), least(greatest(coalesce(p_threshold, 80), 1), 100), p_qs::jsonb, (t->>'tid')::int) returning id into i;
  else
    update public.ce_quiz set subj = p_subj, unit_id = nullif(p_unit, 0), title = btrim(p_title), kind = coalesce(p_kind, 'quiz'), threshold = least(greatest(coalesce(p_threshold, 80), 1), 100), qs = p_qs::jsonb, updated = now()
     where id = p_id and public.ce_can_subj(t, subj) returning id into i;
  end if;
  if i is null then return public.ce_err('not_found'); end if;
  return json_build_object('ok', true, 'id', i);
end $$;

create or replace function public.ce_t_quiz_del(p_key text, p_id int) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare t json := public.ce_teacher(p_key);
begin
  if not (t->>'ok')::boolean then return t; end if;
  delete from public.ce_quiz where id = p_id and public.ce_can_subj(t, subj);
  return json_build_object('ok', found);
end $$;

create or replace function public.ce_t_playlist_save(p_key text, p_id int, p_class int, p_subj int, p_title text, p_items json) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare t json := public.ce_teacher(p_key); i int;
begin
  if not (t->>'ok')::boolean then return t; end if;
  if not public.ce_can_class(t, p_class) then return public.ce_err('forbidden'); end if;
  if not public.ce_ok_text(p_title, 80) then return public.ce_err('bad_text'); end if;
  if p_items is null or json_typeof(p_items) <> 'array' or json_array_length(p_items) > 60 then return public.ce_err('bad_items'); end if;
  if coalesce(p_id, 0) = 0 then
    insert into public.ce_playlist (class_id, subj, title, items, tid) values (p_class, p_subj, btrim(p_title), p_items::jsonb, (t->>'tid')::int) returning id into i;
    perform public.ce_notify_class(p_class, 'playlist', 'New playlist: ' || btrim(p_title), '', '#/subjects');
  else
    update public.ce_playlist set class_id = p_class, subj = p_subj, title = btrim(p_title), items = p_items::jsonb, updated = now() where id = p_id and public.ce_can_class(t, class_id) returning id into i;
  end if;
  if i is null then return public.ce_err('not_found'); end if;
  return json_build_object('ok', true, 'id', i);
end $$;

create or replace function public.ce_t_playlist_del(p_key text, p_id int) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare t json := public.ce_teacher(p_key);
begin
  if not (t->>'ok')::boolean then return t; end if;
  delete from public.ce_playlist where id = p_id and public.ce_can_class(t, class_id);
  return json_build_object('ok', found);
end $$;

create or replace function public.ce_t_rubric_save(p_key text, p_id int, p_title text, p_criteria json) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare t json := public.ce_teacher(p_key); i int;
begin
  if not (t->>'ok')::boolean then return t; end if;
  if not public.ce_ok_text(p_title, 80) then return public.ce_err('bad_text'); end if;
  if p_criteria is null or json_typeof(p_criteria) <> 'array' or json_array_length(p_criteria) not between 1 and 12 or length(p_criteria::text) > 40000 then return public.ce_err('bad_rubric'); end if;
  if coalesce(p_id, 0) = 0 then
    insert into public.ce_rubric (tid, title, criteria) values ((t->>'tid')::int, btrim(p_title), p_criteria::jsonb) returning id into i;
  else
    update public.ce_rubric set title = btrim(p_title), criteria = p_criteria::jsonb, updated = now() where id = p_id and ((t->>'admin')::boolean or tid = (t->>'tid')::int) returning id into i;
  end if;
  if i is null then return public.ce_err('not_found'); end if;
  return json_build_object('ok', true, 'id', i);
end $$;

create or replace function public.ce_t_rubric_del(p_key text, p_id int) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare t json := public.ce_teacher(p_key);
begin
  if not (t->>'ok')::boolean then return t; end if;
  delete from public.ce_rubric where id = p_id and ((t->>'admin')::boolean or tid = (t->>'tid')::int);
  return json_build_object('ok', found);
end $$;

create or replace function public.ce_t_assigns(p_key text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare t json := public.ce_teacher(p_key);
begin
  if not (t->>'ok')::boolean then return t; end if;
  return json_build_object('ok', true, 'rows', (select coalesce(json_agg(json_build_object('id', a.id, 'class_id', a.class_id, 'subj', a.subj, 'kind', a.kind, 'title', a.title, 'instr', a.instr,
      'due', a.due, 'points', a.points, 'quiz_id', a.quiz_id, 'rubric_id', a.rubric_id, 'teams_id', a.teams_id, 'created', a.created,
      'class', (select name from public.cd_class where id = a.class_id),
      'n', (select count(*) from public.cd_codes x where x.class_id = a.class_id and x.username is not null),
      'submitted', (select count(*) from public.ce_sub s where s.assign_id = a.id and s.status <> 'draft'),
      'graded', (select count(*) from public.ce_sub s where s.assign_id = a.id and s.status = 'returned')) order by a.due desc nulls first, a.id desc), '[]'::json)
    from public.ce_assign a where public.ce_can_class(t, a.class_id)));
end $$;

create or replace function public.ce_t_assign_save(p_key text, p_id int, p_class int, p_subj int, p_kind text, p_title text, p_instr text, p_due timestamptz, p_points int, p_quiz int, p_rubric int) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare t json := public.ce_teacher(p_key); i int;
begin
  if not (t->>'ok')::boolean then return t; end if;
  if not public.ce_can_class(t, p_class) then return public.ce_err('forbidden'); end if;
  if not public.ce_ok_text(p_title, 120) or length(coalesce(p_instr, '')) > 8000 then return public.ce_err('bad_text'); end if;
  if coalesce(p_id, 0) = 0 then
    insert into public.ce_assign (class_id, subj, kind, title, instr, due, points, quiz_id, rubric_id, tid)
      values (p_class, p_subj, coalesce(p_kind, 'homework'), btrim(p_title), coalesce(p_instr, ''), p_due, least(greatest(coalesce(p_points, 10), 0), 1000), nullif(p_quiz, 0), nullif(p_rubric, 0), (t->>'tid')::int) returning id into i;
    perform public.ce_notify_class(p_class, 'assign', 'New ' || coalesce(p_kind, 'homework') || ': ' || btrim(p_title), case when p_due is null then '' else 'Due ' || to_char(p_due, 'Dy DD Mon') end, '#/assignment/' || i);
  else
    update public.ce_assign set class_id = p_class, subj = p_subj, kind = coalesce(p_kind, 'homework'), title = btrim(p_title), instr = coalesce(p_instr, ''), due = p_due,
      points = least(greatest(coalesce(p_points, 10), 0), 1000), quiz_id = nullif(p_quiz, 0), rubric_id = nullif(p_rubric, 0)
     where id = p_id and public.ce_can_class(t, class_id) returning id into i;
  end if;
  if i is null then return public.ce_err('not_found'); end if;
  return json_build_object('ok', true, 'id', i);
end $$;

create or replace function public.ce_t_assign_del(p_key text, p_id int) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare t json := public.ce_teacher(p_key);
begin
  if not (t->>'ok')::boolean then return t; end if;
  delete from public.ce_assign where id = p_id and public.ce_can_class(t, class_id);
  return json_build_object('ok', found);
end $$;

-- Submissions for one assignment, with every version
create or replace function public.ce_t_subs(p_key text, p_assign int) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare t json := public.ce_teacher(p_key); a public.ce_assign;
begin
  if not (t->>'ok')::boolean then return t; end if;
  select * into a from public.ce_assign where id = p_assign;
  if a.id is null or not public.ce_can_class(t, a.class_id) then return public.ce_err('forbidden'); end if;
  return json_build_object('ok', true,
    'assign', json_build_object('id', a.id, 'title', a.title, 'kind', a.kind, 'instr', a.instr, 'due', a.due, 'points', a.points, 'class_id', a.class_id, 'quiz_id', a.quiz_id, 'teams_id', a.teams_id,
      'rubric', (select json_build_object('id', b.id, 'title', b.title, 'criteria', b.criteria) from public.ce_rubric b where b.id = a.rubric_id)),
    'rows', (select coalesce(json_agg(json_build_object('sid', x.sid, 'name', x.username, 'ms', exists (select 1 from public.ce_ms_user m where m.sid = x.sid),
        'sub', case when s.id is null then null else json_build_object('id', s.id, 'status', s.status, 'ver', s.ver, 'body', s.body, 'links', s.links, 'sub_at', s.sub_at, 'score', s.score, 'rub', s.rub, 'feedback', s.feedback, 'graded_at', s.graded_at, 'teams_ok', s.teams_ok,
          'versions', (select coalesce(json_agg(json_build_object('ver', v.ver, 'at', v.at, 'body', v.body, 'links', v.links) order by v.ver desc), '[]'::json) from public.ce_sub_ver v where v.sub_id = s.id)) end) order by x.username), '[]'::json)
      from public.cd_codes x left join public.ce_sub s on s.assign_id = a.id and s.sid = x.sid where x.class_id = a.class_id and x.username is not null));
end $$;

create or replace function public.ce_t_grade(p_key text, p_sub int, p_score int, p_rub json, p_feedback text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare t json := public.ce_teacher(p_key); s public.ce_sub; a public.ce_assign;
begin
  if not (t->>'ok')::boolean then return t; end if;
  select * into s from public.ce_sub where id = p_sub;
  if s.id is null then return public.ce_err('not_found'); end if;
  select * into a from public.ce_assign where id = s.assign_id;
  if not public.ce_can_class(t, a.class_id) then return public.ce_err('forbidden'); end if;
  if length(coalesce(p_feedback, '')) > 4000 then return public.ce_err('bad_text'); end if;
  update public.ce_sub set status = 'returned', score = least(greatest(coalesce(p_score, 0), 0), 100), rub = p_rub::jsonb, feedback = coalesce(p_feedback, ''), graded_at = now(), teams_ok = false where id = s.id;
  insert into public.ce_notif (sid, kind, title, body, link) values (s.sid, 'grade', '"' || a.title || '" has been marked', coalesce(left(p_feedback, 120), ''), '#/assignment/' || a.id);
  return json_build_object('ok', true);
end $$;

create or replace function public.ce_t_anns(p_key text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare t json := public.ce_teacher(p_key);
begin
  if not (t->>'ok')::boolean then return t; end if;
  return json_build_object('ok', true, 'rows', (select coalesce(json_agg(json_build_object('id', a.id, 'class_id', a.class_id, 'targets', a.targets, 'title', a.title, 'body', a.body, 'pinned', a.pinned, 'created', a.created, 'ends', a.ends,
      'class', (select name from public.cd_class where id = a.class_id),
      'reach', (select count(*) from public.cd_codes x where x.username is not null and public.ce_ann_for(a, x)),
      'reads', (select count(*) from public.ce_ann_read r where r.ann_id = a.id),
      'readers', (select coalesce(json_agg(json_build_object('name', x.username, 'at', r.at) order by r.at desc), '[]'::json) from public.ce_ann_read r join public.cd_codes x on x.sid = r.sid where r.ann_id = a.id)) order by a.created desc), '[]'::json)
    from public.ce_ann a where (a.class_id is not null and public.ce_can_class(t, a.class_id)) or (a.class_id is null and ((t->>'admin')::boolean or a.tid = (t->>'tid')::int))));
end $$;

create or replace function public.ce_t_ann_save(p_key text, p_id int, p_class int, p_targets json, p_title text, p_body text, p_pinned boolean, p_days int) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare t json := public.ce_teacher(p_key); i int;
begin
  if not (t->>'ok')::boolean then return t; end if;
  if coalesce(p_class, 0) <> 0 and not public.ce_can_class(t, p_class) then return public.ce_err('forbidden'); end if;
  if not public.ce_ok_text(p_title, 120) or not public.ce_ok_text(p_body, 2000) then return public.ce_err('bad_text'); end if;
  if coalesce(p_id, 0) = 0 then
    insert into public.ce_ann (class_id, targets, title, body, pinned, tid, ends)
      values (nullif(p_class, 0), coalesce(p_targets, '{}')::jsonb, btrim(p_title), btrim(p_body), coalesce(p_pinned, false), (t->>'tid')::int, now() + make_interval(days => least(greatest(coalesce(p_days, 14), 1), 90))) returning id into i;
    insert into public.ce_notif (sid, kind, title, body, link)
      select x.sid, 'announce', btrim(p_title), left(btrim(p_body), 140), '#/announcements' from public.cd_codes x, public.ce_ann a where a.id = i and x.username is not null and public.ce_ann_for(a, x);
  else
    update public.ce_ann set class_id = nullif(p_class, 0), targets = coalesce(p_targets, '{}')::jsonb, title = btrim(p_title), body = btrim(p_body), pinned = coalesce(p_pinned, false),
      ends = now() + make_interval(days => least(greatest(coalesce(p_days, 14), 1), 90))
     where id = p_id and ((t->>'admin')::boolean or tid = (t->>'tid')::int) returning id into i;
  end if;
  if i is null then return public.ce_err('not_found'); end if;
  return json_build_object('ok', true, 'id', i);
end $$;

create or replace function public.ce_t_ann_del(p_key text, p_id int) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare t json := public.ce_teacher(p_key);
begin
  if not (t->>'ok')::boolean then return t; end if;
  delete from public.ce_ann where id = p_id and ((t->>'admin')::boolean or tid = (t->>'tid')::int);
  return json_build_object('ok', found);
end $$;

create or replace function public.ce_t_events(p_key text, p_from date, p_to date) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare t json := public.ce_teacher(p_key);
begin
  if not (t->>'ok')::boolean then return t; end if;
  return json_build_object('ok', true, 'rows', (select coalesce(json_agg(x order by x.starts), '[]'::json) from (
      select 'e' || e.id as id, e.id as event_id, e.kind, e.title, e.starts, e.ends, e.place, e.class_id, (select name from public.cd_class where id = e.class_id) as class, null::int as assign_id
        from public.ce_event e where (e.class_id is null or public.ce_can_class(t, e.class_id)) and e.starts::date between p_from and p_to
      union all
      select 'a' || a.id, null, 'due', a.title, a.due, null, (select name from public.cd_class where id = a.class_id), a.class_id, (select name from public.cd_class where id = a.class_id), a.id
        from public.ce_assign a where public.ce_can_class(t, a.class_id) and a.due is not null and a.due::date between p_from and p_to) x));
end $$;

create or replace function public.ce_t_event_save(p_key text, p_id int, p_class int, p_kind text, p_title text, p_starts timestamptz, p_ends timestamptz, p_place text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare t json := public.ce_teacher(p_key); i int;
begin
  if not (t->>'ok')::boolean then return t; end if;
  if coalesce(p_class, 0) <> 0 and not public.ce_can_class(t, p_class) then return public.ce_err('forbidden'); end if;
  if not public.ce_ok_text(p_title, 120) or p_starts is null then return public.ce_err('bad_text'); end if;
  if coalesce(p_id, 0) = 0 then
    insert into public.ce_event (class_id, kind, title, starts, ends, place, tid) values (nullif(p_class, 0), coalesce(p_kind, 'event'), btrim(p_title), p_starts, p_ends, left(coalesce(p_place, ''), 120), (t->>'tid')::int) returning id into i;
    if coalesce(p_class, 0) <> 0 then perform public.ce_notify_class(p_class, 'event', coalesce(p_kind, 'event') || ': ' || btrim(p_title), to_char(p_starts, 'Dy DD Mon HH24:MI'), '#/calendar'); end if;
  else
    update public.ce_event set class_id = nullif(p_class, 0), kind = coalesce(p_kind, 'event'), title = btrim(p_title), starts = p_starts, ends = p_ends, place = left(coalesce(p_place, ''), 120)
     where id = p_id and ((t->>'admin')::boolean or tid = (t->>'tid')::int) returning id into i;
  end if;
  if i is null then return public.ce_err('not_found'); end if;
  return json_build_object('ok', true, 'id', i);
end $$;

create or replace function public.ce_t_event_del(p_key text, p_id int) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare t json := public.ce_teacher(p_key);
begin
  if not (t->>'ok')::boolean then return t; end if;
  delete from public.ce_event where id = p_id and ((t->>'admin')::boolean or tid = (t->>'tid')::int);
  return json_build_object('ok', found);
end $$;

create or replace function public.ce_t_notif_read(p_key text, p_id int) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare t json := public.ce_teacher(p_key);
begin
  if not (t->>'ok')::boolean then return t; end if;
  update public.ce_notif set read_at = now() where tid = (t->>'tid')::int and read_at is null and (p_id is null or id = p_id);
  return json_build_object('ok', true);
end $$;

-- ---------- 5. Microsoft Teams link (used by the ce-teams edge function, service role only) ----------
-- A signed-in CompassED user links their Microsoft account; the edge function calls this after verifying the id token.
create or replace function public.ce_ms_link(p_oid text, p_tenant text, p_email text, p_name text, p_code text, p_user text, p_key text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare r public.cd_codes; t json; s bigint; i int;
begin
  if p_key is not null and p_key <> '' then
    t := public.ce_teacher(p_key);
    if not (t->>'ok')::boolean or (t->>'admin')::boolean then return public.ce_err('bad_key'); end if;
    i := (t->>'tid')::int;
  else
    r := public.ce_student(p_code, p_user);
    if r.sid is null then return public.ce_err('no_match'); end if;
    s := r.sid;
  end if;
  insert into public.ce_ms_user (oid, tenant, email, name, sid, tid) values (p_oid, p_tenant, p_email, p_name, s, i)
    on conflict (oid) do update set tenant = excluded.tenant, email = excluded.email, name = excluded.name, sid = excluded.sid, tid = excluded.tid, linked = now();
  return json_build_object('ok', true, 'sid', s, 'tid', i);
end $$;

-- Microsoft sign-in: the edge function verified the id token; return the CompassED identity for that account.
create or replace function public.ce_ms_who(p_oid text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare m public.ce_ms_user; r public.cd_codes; t public.cd_teacher;
begin
  select * into m from public.ce_ms_user where oid = p_oid;
  if m.oid is null then return public.ce_err('not_linked'); end if;
  if m.tid is not null then
    select * into t from public.cd_teacher where id = m.tid and not disabled;
    if t.id is null then return public.ce_err('not_linked'); end if;
    return json_build_object('ok', true, 'role', 'teacher', 'tok', public.cd_tsess_new(t.id), 't', public.cd_tinfo(t));
  end if;
  select * into r from public.cd_codes where sid = m.sid;
  if r.sid is null or r.username is null then return public.ce_err('not_linked'); end if;
  -- a student token the page can use in place of code + username is not part of Compass Dash, so the
  -- edge function returns the code and username it holds for this link (see ce-teams/index.ts)
  return json_build_object('ok', true, 'role', 'student', 'code', r.code, 'username', r.username);
end $$;

create or replace function public.ce_ms_class_link(p_key text, p_class int, p_team text, p_name text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare t json := public.ce_teacher(p_key);
begin
  if not (t->>'ok')::boolean then return t; end if;
  if not public.ce_can_class(t, p_class) then return public.ce_err('forbidden'); end if;
  if p_team is null or p_team = '' then delete from public.ce_ms_class where class_id = p_class;
  else insert into public.ce_ms_class (class_id, team_id, name, synced) values (p_class, p_team, p_name, now())
    on conflict (class_id) do update set team_id = excluded.team_id, name = excluded.name, synced = now(); end if;
  return json_build_object('ok', true);
end $$;

-- Roster import: students found in the Team are matched to Compass Dash accounts by email or name; returns what matched.
create or replace function public.ce_ms_roster(p_key text, p_class int, p_members json) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare t json := public.ce_teacher(p_key); m json; matched int := 0; unmatched json := '[]'::json;
begin
  if not (t->>'ok')::boolean then return t; end if;
  if not public.ce_can_class(t, p_class) then return public.ce_err('forbidden'); end if;
  for m in select * from json_array_elements(p_members) loop
    -- already linked: nothing to do; else match the display name to a username in this class
    if exists (select 1 from public.ce_ms_user u where u.oid = m->>'oid' and u.sid is not null) then matched := matched + 1;
    elsif exists (select 1 from public.cd_codes x where x.class_id = p_class and lower(x.username) = lower(regexp_replace(coalesce(m->>'name', ''), '[^A-Za-z0-9_]', '', 'g'))) then
      insert into public.ce_ms_user (oid, tenant, email, name, sid)
        select m->>'oid', coalesce(m->>'tenant', ''), m->>'email', m->>'name', x.sid from public.cd_codes x where x.class_id = p_class and lower(x.username) = lower(regexp_replace(coalesce(m->>'name', ''), '[^A-Za-z0-9_]', '', 'g')) limit 1
      on conflict (oid) do nothing;
      matched := matched + 1;
    else unmatched := (unmatched::jsonb || jsonb_build_array(jsonb_build_object('name', m->>'name', 'email', m->>'email')))::json; end if;
  end loop;
  update public.ce_ms_class set synced = now() where class_id = p_class;
  return json_build_object('ok', true, 'matched', matched, 'unmatched', unmatched);
end $$;

create or replace function public.ce_ms_mark(p_key text, p_assign int, p_teams_id text, p_sub int, p_ok boolean) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare t json := public.ce_teacher(p_key);
begin
  if not (t->>'ok')::boolean then return t; end if;
  if p_assign is not null then update public.ce_assign set teams_id = p_teams_id where id = p_assign and public.ce_can_class(t, class_id); end if;
  if p_sub is not null then update public.ce_sub s set teams_ok = coalesce(p_ok, true) where s.id = p_sub and exists (select 1 from public.ce_assign a where a.id = s.assign_id and public.ce_can_class(t, a.class_id)); end if;
  return json_build_object('ok', true);
end $$;

-- ---------- 6. Permissions ----------
-- Everything runs as security definer through PostgREST (anon role); the ms_* functions are only for the edge function.
do $$ declare f record; begin
  for f in select p.oid::regprocedure as sig, p.proname as name from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'ce\_%' loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    if f.name like 'ce\_s\_%' or f.name like 'ce\_t\_%' then execute format('grant execute on function %s to anon, authenticated', f.sig);
    elsif f.name like 'ce\_ms\_%' then execute format('grant execute on function %s to service_role', f.sig); end if;
  end loop;
end $$;
grant usage on schema public to anon, authenticated, service_role;
