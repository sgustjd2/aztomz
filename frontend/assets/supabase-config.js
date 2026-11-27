/* 한끗 — Supabase 공개 설정. url·anonKey 가 비어 있으면 회원·댓글·좋아요 기능이 전부 꺼진다.
   anonKey 는 브라우저에 공개돼도 되는 값이다(권한은 DB의 RLS가 막는다).
   service_role 키는 절대 여기에 넣지 않는다 — 맥 .env 에만 둔다. */
window.HANGEUT_SUPABASE = {
  url: 'https://ofvsmqehksfelxictxgy.supabase.co',
  anonKey: 'sb_publishable_AXO5bFFbk2uDCT1jUyOpxQ_Q5l7AHRB'   // publishable 키(공개용)
};
