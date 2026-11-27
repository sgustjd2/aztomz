-- 한끗 Supabase 스키마 v1 — 회원(profiles) · 댓글(comments) · 좋아요(likes)
-- 적용: Supabase 대시보드 → SQL Editor 에 통째로 붙여 실행(처음 1회).
-- 트렌드 데이터는 아직 DB에 없다(원본은 backend/data/trends.json). trend_id 는 trends.json 의 id 문자열.
-- 권한은 전부 RLS로 막는다. 브라우저는 anon 키만 쓰고, service_role 키는 맥 .env 에만 둔다.

-- ---------- 회원 프로필 ----------
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  nickname   text not null unique check (char_length(nickname) between 2 and 20),
  created_at timestamptz not null default now()
);

-- 가입하면 프로필을 자동 생성(기본 닉네임 user_ + id 해시 15자리 — 나중에 본인이 변경)
-- id 앞 8자를 쓰던 첫 버전은 앞자리가 같은 두 id 에서 unique 충돌로 가입이 실패했다(2026-11-10 RLS 점검에서 발견).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, nickname)
  values (new.id, 'user_' || substr(md5(new.id::text), 1, 15));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 회원 탈퇴: 본인 계정만 지운다. profiles·comments·likes 는 on delete cascade 로 함께 지워진다.
create function public.delete_my_account()
returns void
language sql
security definer set search_path = ''
as $$
  delete from auth.users where id = auth.uid();
$$;
revoke execute on function public.delete_my_account() from public, anon;
grant  execute on function public.delete_my_account() to authenticated;

-- ---------- 댓글 ----------
create table public.comments (
  id         bigint generated always as identity primary key,
  trend_id   text not null check (trend_id ~ '^[A-Za-z0-9_-]{1,100}$'),
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 500),
  is_hidden  boolean not null default false,   -- 운영자 숨김(신고 처리용). 본인은 못 바꾼다(아래 grant)
  created_at timestamptz not null default now()
);
create index comments_trend_idx on public.comments (trend_id, created_at desc);

-- ---------- 좋아요 ----------
create table public.likes (
  trend_id   text not null check (trend_id ~ '^[A-Za-z0-9_-]{1,100}$'),
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (trend_id, user_id)
);

-- 트렌드별 좋아요 수(누구나 조회)
create view public.like_counts with (security_invoker = true) as
  select trend_id, count(*)::int as likes from public.likes group by trend_id;

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.comments enable row level security;
alter table public.likes    enable row level security;

create policy "profiles: 누구나 조회" on public.profiles for select using (true);
create policy "profiles: 본인만 수정" on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

create policy "comments: 숨김 아닌 것 + 본인 것 조회" on public.comments for select
  using (not is_hidden or auth.uid() = user_id);
create policy "comments: 로그인 사용자 본인 명의로 작성" on public.comments for insert to authenticated
  with check (auth.uid() = user_id and not is_hidden);
create policy "comments: 본인만 수정" on public.comments for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "comments: 본인만 삭제" on public.comments for delete to authenticated
  using (auth.uid() = user_id);

create policy "likes: 누구나 조회" on public.likes for select using (true);
create policy "likes: 본인 명의로 추가" on public.likes for insert to authenticated
  with check (auth.uid() = user_id);
create policy "likes: 본인 것만 취소" on public.likes for delete to authenticated
  using (auth.uid() = user_id);

-- ---------- 테이블 권한 (최소 권한) ----------
-- 프로젝트 생성 시 "Automatically expose new tables"를 껐으므로 필요한 것만 명시적으로 준다.
-- 실제 어떤 행을 보고 쓸 수 있는지는 위 RLS 정책이 다시 거른다.
revoke all on public.profiles, public.comments, public.likes, public.like_counts from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on public.profiles, public.comments, public.likes, public.like_counts to anon, authenticated;
-- 작성 시 넣을 수 있는 컬럼도 제한(user_id·created_at·is_hidden 은 기본값만 쓰인다)
grant insert (trend_id, body) on public.comments to authenticated;
grant insert (trend_id) on public.likes to authenticated;
grant delete on public.comments, public.likes to authenticated;
-- 컬럼 단위 제한: 사용자는 댓글 본문·닉네임만 고칠 수 있다(is_hidden·trend_id·user_id 변경 불가)
grant update (body) on public.comments to authenticated;
grant update (nickname) on public.profiles to authenticated;
