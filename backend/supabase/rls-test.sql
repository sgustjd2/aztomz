-- 한끗 RLS·권한 점검 — SQL Editor에서 통째로 실행. 결과표의 ok 가 전부 true 여야 한다.
-- 가짜 사용자 A·B(비밀번호 없음, 로그인 불가)를 만들어 각자의 권한으로 쿼리한 뒤 마지막에 지운다.
-- trend_id 'rls-test' 는 실제 트렌드와 겹치지 않는 테스트 전용 값.

create temp table if not exists t_res(step int, name text, expect text, got text, ok boolean);
truncate t_res;

insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
 ('00000000-0000-4000-8000-0000000000a1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','rls-a@test.invalid','{}','{}',now(),now()),
 ('00000000-0000-4000-8000-0000000000b1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','rls-b@test.invalid','{}','{}',now(),now());

do $t$
declare
  a uuid := '00000000-0000-4000-8000-0000000000a1';
  b uuid := '00000000-0000-4000-8000-0000000000b1';
  ca text := json_build_object('sub', '00000000-0000-4000-8000-0000000000a1', 'role', 'authenticated')::text;
  cb text := json_build_object('sub', '00000000-0000-4000-8000-0000000000b1', 'role', 'authenticated')::text;
  cid bigint; n int;
begin
  -- 1 비로그인 댓글 조회
  begin
    execute 'set local role anon'; perform set_config('request.jwt.claims', '{"role":"anon"}', true);
    select count(*) into n from public.comments; execute 'reset role';
    insert into t_res values (1, '비로그인: 댓글 조회', '허용', '허용', true);
  exception when others then insert into t_res values (1, '비로그인: 댓글 조회', '허용', '거부 ' || sqlerrm, false); end;

  -- 2 비로그인 댓글 작성
  begin
    execute 'set local role anon'; perform set_config('request.jwt.claims', '{"role":"anon"}', true);
    insert into public.comments (trend_id, body) values ('rls-test', 'anon'); execute 'reset role';
    insert into t_res values (2, '비로그인: 댓글 작성', '거부', '허용됨', false);
  exception when others then insert into t_res values (2, '비로그인: 댓글 작성', '거부', '거부', true); end;

  -- 3 A 댓글 작성
  begin
    execute 'set local role authenticated'; perform set_config('request.jwt.claims', ca, true);
    insert into public.comments (trend_id, body) values ('rls-test', 'A의 댓글') returning id into cid; execute 'reset role';
    insert into t_res values (3, 'A: 내 댓글 작성', '허용', '허용', true);
  exception when others then insert into t_res values (3, 'A: 내 댓글 작성', '허용', '거부 ' || sqlerrm, false); end;

  -- 4 A가 B 명의로 작성
  begin
    execute 'set local role authenticated'; perform set_config('request.jwt.claims', ca, true);
    insert into public.comments (trend_id, body, user_id) values ('rls-test', '사칭', b); execute 'reset role';
    insert into t_res values (4, 'A: B 명의로 댓글 작성', '거부', '허용됨', false);
  exception when others then insert into t_res values (4, 'A: B 명의로 댓글 작성', '거부', '거부', true); end;

  -- 5 A가 숨김 상태로 작성
  begin
    execute 'set local role authenticated'; perform set_config('request.jwt.claims', ca, true);
    insert into public.comments (trend_id, body, is_hidden) values ('rls-test', '숨김', true); execute 'reset role';
    insert into t_res values (5, 'A: is_hidden 지정 작성', '거부', '허용됨', false);
  exception when others then insert into t_res values (5, 'A: is_hidden 지정 작성', '거부', '거부', true); end;

  -- 6 B가 A 댓글 수정
  begin
    execute 'set local role authenticated'; perform set_config('request.jwt.claims', cb, true);
    update public.comments set body = '변조' where id = cid; get diagnostics n = row_count; execute 'reset role';
    insert into t_res values (6, 'B: A 댓글 수정', '0행', n || '행', n = 0);
  exception when others then insert into t_res values (6, 'B: A 댓글 수정', '0행', '거부', true); end;

  -- 7 B가 A 댓글 삭제
  begin
    execute 'set local role authenticated'; perform set_config('request.jwt.claims', cb, true);
    delete from public.comments where id = cid; get diagnostics n = row_count; execute 'reset role';
    insert into t_res values (7, 'B: A 댓글 삭제', '0행', n || '행', n = 0);
  exception when others then insert into t_res values (7, 'B: A 댓글 삭제', '0행', '거부', true); end;

  -- 8 A 내 댓글 본문 수정
  begin
    execute 'set local role authenticated'; perform set_config('request.jwt.claims', ca, true);
    update public.comments set body = 'A 수정' where id = cid; get diagnostics n = row_count; execute 'reset role';
    insert into t_res values (8, 'A: 내 댓글 본문 수정', '1행', n || '행', n = 1);
  exception when others then insert into t_res values (8, 'A: 내 댓글 본문 수정', '1행', '거부 ' || sqlerrm, false); end;

  -- 9 A 내 댓글 숨김 해제·변경
  begin
    execute 'set local role authenticated'; perform set_config('request.jwt.claims', ca, true);
    update public.comments set is_hidden = false where id = cid; execute 'reset role';
    insert into t_res values (9, 'A: is_hidden 변경', '거부', '허용됨', false);
  exception when others then insert into t_res values (9, 'A: is_hidden 변경', '거부', '거부', true); end;

  -- 10 A 댓글 작성자 바꾸기
  begin
    execute 'set local role authenticated'; perform set_config('request.jwt.claims', ca, true);
    update public.comments set user_id = b where id = cid; execute 'reset role';
    insert into t_res values (10, 'A: 댓글 작성자 변경', '거부', '허용됨', false);
  exception when others then insert into t_res values (10, 'A: 댓글 작성자 변경', '거부', '거부', true); end;

  -- 11 B가 A 닉네임 변경
  begin
    execute 'set local role authenticated'; perform set_config('request.jwt.claims', cb, true);
    update public.profiles set nickname = '탈취닉' where id = a; get diagnostics n = row_count; execute 'reset role';
    insert into t_res values (11, 'B: A 닉네임 변경', '0행', n || '행', n = 0);
  exception when others then insert into t_res values (11, 'B: A 닉네임 변경', '0행', '거부', true); end;

  -- 12 A 내 닉네임 변경
  begin
    execute 'set local role authenticated'; perform set_config('request.jwt.claims', ca, true);
    update public.profiles set nickname = '테스트A' where id = a; get diagnostics n = row_count; execute 'reset role';
    insert into t_res values (12, 'A: 내 닉네임 변경', '1행', n || '행', n = 1);
  exception when others then insert into t_res values (12, 'A: 내 닉네임 변경', '1행', '거부 ' || sqlerrm, false); end;

  -- 13 비로그인 프로필 직접 생성
  begin
    execute 'set local role anon'; perform set_config('request.jwt.claims', '{"role":"anon"}', true);
    insert into public.profiles (id, nickname) values (gen_random_uuid(), '유령'); execute 'reset role';
    insert into t_res values (13, '비로그인: 프로필 생성', '거부', '허용됨', false);
  exception when others then insert into t_res values (13, '비로그인: 프로필 생성', '거부', '거부', true); end;

  -- 14 A 좋아요
  begin
    execute 'set local role authenticated'; perform set_config('request.jwt.claims', ca, true);
    insert into public.likes (trend_id) values ('rls-test'); execute 'reset role';
    insert into t_res values (14, 'A: 좋아요', '허용', '허용', true);
  exception when others then insert into t_res values (14, 'A: 좋아요', '허용', '거부 ' || sqlerrm, false); end;

  -- 15 A 좋아요 중복
  begin
    execute 'set local role authenticated'; perform set_config('request.jwt.claims', ca, true);
    insert into public.likes (trend_id) values ('rls-test'); execute 'reset role';
    insert into t_res values (15, 'A: 좋아요 중복', '거부', '허용됨', false);
  exception when others then insert into t_res values (15, 'A: 좋아요 중복', '거부', '거부', true); end;

  -- 16 B가 A 좋아요 취소
  begin
    execute 'set local role authenticated'; perform set_config('request.jwt.claims', cb, true);
    delete from public.likes where trend_id = 'rls-test' and user_id = a; get diagnostics n = row_count; execute 'reset role';
    insert into t_res values (16, 'B: A 좋아요 취소', '0행', n || '행', n = 0);
  exception when others then insert into t_res values (16, 'B: A 좋아요 취소', '0행', '거부', true); end;

  -- 17 비로그인 좋아요 수
  begin
    execute 'set local role anon'; perform set_config('request.jwt.claims', '{"role":"anon"}', true);
    select coalesce(max(likes), 0) into n from public.like_counts where trend_id = 'rls-test'; execute 'reset role';
    insert into t_res values (17, '비로그인: 좋아요 수 조회', '1', n::text, n = 1);
  exception when others then insert into t_res values (17, '비로그인: 좋아요 수 조회', '1', '거부 ' || sqlerrm, false); end;

  -- 18 운영자가 숨긴 댓글: 비로그인은 못 보고, 작성자 A는 본다
  update public.comments set is_hidden = true where id = cid;
  begin
    execute 'set local role anon'; perform set_config('request.jwt.claims', '{"role":"anon"}', true);
    select count(*) into n from public.comments where id = cid; execute 'reset role';
    insert into t_res values (18, '비로그인: 숨긴 댓글 조회', '0건', n || '건', n = 0);
  exception when others then insert into t_res values (18, '비로그인: 숨긴 댓글 조회', '0건', '거부 ' || sqlerrm, false); end;
  begin
    execute 'set local role authenticated'; perform set_config('request.jwt.claims', ca, true);
    select count(*) into n from public.comments where id = cid; execute 'reset role';
    insert into t_res values (19, 'A: 내 숨긴 댓글 조회', '1건', n || '건', n = 1);
  exception when others then insert into t_res values (19, 'A: 내 숨긴 댓글 조회', '1건', '거부 ' || sqlerrm, false); end;

  -- 20 비로그인 탈퇴 함수 호출
  begin
    execute 'set local role anon'; perform set_config('request.jwt.claims', '{"role":"anon"}', true);
    perform public.delete_my_account(); execute 'reset role';
    insert into t_res values (20, '비로그인: 탈퇴 함수', '거부', '허용됨', false);
  exception when others then insert into t_res values (20, '비로그인: 탈퇴 함수', '거부', '거부', true); end;

  -- 21 비로그인 auth.users 조회
  begin
    execute 'set local role anon'; perform set_config('request.jwt.claims', '{"role":"anon"}', true);
    select count(*) into n from auth.users; execute 'reset role';
    insert into t_res values (21, '비로그인: 회원 이메일 목록 조회', '거부', '허용됨', false);
  exception when others then insert into t_res values (21, '비로그인: 회원 이메일 목록 조회', '거부', '거부', true); end;

  -- 22 B 탈퇴 → B만 지워지고 A는 남는다
  begin
    execute 'set local role authenticated'; perform set_config('request.jwt.claims', cb, true);
    perform public.delete_my_account(); execute 'reset role';
    select count(*) into n from auth.users where id in (a, b);
    insert into t_res values (22, 'B: 회원 탈퇴(본인만 삭제)', 'A만 남음(1)', n::text, n = 1 and exists (select 1 from auth.users where id = a));
  exception when others then insert into t_res values (22, 'B: 회원 탈퇴(본인만 삭제)', 'A만 남음(1)', '거부 ' || sqlerrm, false); end;
end
$t$;

-- 정리: 가짜 사용자와 그 댓글·좋아요(cascade)를 지운다
delete from auth.users where id in ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000b1');
delete from public.comments where trend_id = 'rls-test';
delete from public.likes where trend_id = 'rls-test';

select step, name, expect, got, ok from t_res order by step;
