-- 한끗(az2mz) 트렌드 DB — P0
-- 적용: Supabase 대시보드 → SQL Editor 에 통째로 붙여 넣고 Run. 여러 번 실행해도 안전(idempotent).
-- 접근: service_role(secret 키)만. anon·authenticated 에는 권한·정책이 하나도 없다. 사이트는 계속 정적 파일만 읽는다.
-- 주의: 중첩 필드는 jsonb 가 아니라 json 이다 — jsonb 는 객체 키 순서를 바꿔서 trends.json 을 바이트 단위로 되살릴 수 없다.

create table if not exists public.trends (
  id           text primary key,
  sort_idx     integer,            -- trends.json 안의 순서(내보낼 때 정렬 기준, null 이면 맨 뒤)
  key_order    text[],             -- 원본 객체의 키 순서·존재 여부(키가 있으나 null 인 것까지 보존)
  type         text,
  cat          text,
  cover_cat    text,
  analyzed_at  text,
  collected_at text,
  title        text,
  buzz         text,
  ad           numeric,
  trust        numeric,
  sat          text,
  sat_txt      text,
  label        text,
  label_cls    text,
  excerpt      text,
  pull         text,
  verdict      text,
  stage        text,
  stage_msg    text,
  pure_korean  text,
  def          text,
  example      text,
  prompt       text,
  az_notice    text,
  fresh        boolean,
  shops        json,
  recs         json,
  src          json,
  video        json,
  images       json,
  article      json,
  reasons      json,
  tags         json,
  extra        json,               -- 위 컬럼에 없는 필드(모르는 필드도 잃지 않게)
  updated_at   timestamptz not null default now()
);

create table if not exists public.trends_history (
  hist_id    bigint generated always as identity primary key,
  trend_id   text not null,
  op         text not null check (op in ('UPDATE','DELETE')),
  old_row    jsonb not null,       -- 바뀌기/지워지기 직전의 행 전체
  changed_at timestamptz not null default now()
);
create index if not exists trends_history_trend_id_idx on public.trends_history (trend_id, changed_at desc);

-- trends.json 의 최상위 메타(generatedAt)
create table if not exists public.trends_meta (
  key   text primary key,
  value text
);

-- 이력: update·delete 직전 행을 저장(내용이 실제로 바뀐 update 만)
create or replace function public.trends_log_history() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and to_jsonb(old) - 'updated_at' = to_jsonb(new) - 'updated_at' then
    return new;
  end if;
  insert into public.trends_history (trend_id, op, old_row) values (old.id, tg_op, to_jsonb(old));
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

-- updated_at: 내용이 바뀐 update 에서만 갱신
create or replace function public.trends_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  if to_jsonb(old) - 'updated_at' is distinct from to_jsonb(new) - 'updated_at' then
    new.updated_at := now();
  else
    new.updated_at := old.updated_at;
  end if;
  return new;
end $$;

drop trigger if exists trg_1_history on public.trends;
create trigger trg_1_history before update or delete on public.trends
  for each row execute function public.trends_log_history();
drop trigger if exists trg_2_touch on public.trends;
create trigger trg_2_touch before update on public.trends
  for each row execute function public.trends_touch();

-- 보안: RLS 켜고 정책은 만들지 않는다 + 권한은 service_role 에만
alter table public.trends         enable row level security;
alter table public.trends_history enable row level security;
alter table public.trends_meta    enable row level security;

revoke all on public.trends, public.trends_history, public.trends_meta from public, anon, authenticated;
revoke all on function public.trends_log_history(), public.trends_touch() from public, anon, authenticated;
grant select, insert, update, delete on public.trends, public.trends_meta to service_role;
grant select, insert on public.trends_history to service_role;
grant usage, select on sequence public.trends_history_hist_id_seq to service_role;
