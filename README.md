# 담금 (가칭) - 절주 fakedoor 검증 랜딩 페이지

이 프로젝트는 Next.js (App Router) 기반의 모바일 퍼스트 fakedoor 테스트용 랜딩 웹앱입니다.  
사용자의 음주 의존도를 진단하고, 결과에 따라 맞춤형 혜택을 제시하여 검증용 사전등록 퍼널을 구축합니다.

---

## 1. 로컬 개발 환경 설정

1. **패키지 설치**:
   ```bash
   npm install --ignore-scripts
   ```
2. **환경 변수 구성**:
   `.env.local` 파일을 루트 폴더에 생성하고 아래 환경 변수를 채워 넣으세요:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   NEXT_PUBLIC_META_PIXEL_ID=your_meta_pixel_id
   NEXT_PUBLIC_KAKAO_CHANNEL_URL=https://pf.kakao.com/_xxxxxx
   ```
3. **개발 서버 실행**:
   ```bash
   npm run dev
   ```

---

## 2. Supabase SQL DDL 스키마

Supabase SQL Editor에서 아래 쿼리를 실행하여 테이블을 구성하고 RLS 정책을 활성화하세요.  
익명(anon) 사용자에게 **insert** 및 **update** 권한만 제공하고, **select** 조회를 원천 차단하여 개인정보 보호 및 어뷰징을 방지합니다.

```sql
-- 1. quiz_sessions 테이블 생성
create table public.quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now() not null,
  answers jsonb default '{}'::jsonb not null,
  score int,
  variant text not null check (variant in ('price', 'noprice')),
  utm_content text,
  cta_clicked bool default false not null,
  price_selected text
);

-- 2. preorders 테이블 생성
create table public.preorders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now() not null,
  session_id uuid references public.quiz_sessions(id) on delete set null,
  contact text not null,
  contact_type text not null check (contact_type in ('email', 'kakao'))
);

-- 3. Row Level Security (RLS) 활성화
alter table public.quiz_sessions enable row level security;
alter table public.preorders enable row level security;

-- 4. quiz_sessions RLS 정책 생성 (anon 삽입 및 수정 허용, 조회 차단)
create policy "Allow anon insert to quiz_sessions" 
on public.quiz_sessions 
for insert 
to anon 
with check (true);

create policy "Allow anon update to quiz_sessions" 
on public.quiz_sessions 
for update 
to anon 
using (true)
with check (true);

-- 5. preorders RLS 정책 생성 (anon 삽입 허용, 조회 및 수정 차단)
create policy "Allow anon insert to preorders" 
on public.preorders 
for insert 
to anon 
with check (true);
```

---

## 3. 퍼널 분석용 SQL 쿼리

이 단일 SQL 쿼리를 Supabase 대시보드 내 SQL Editor에서 실행하면  
**전체 유입 세션 수 / 퀴즈 완료율 / variant별 CTA 클릭률 / 사전등록 전환율**을 한눈에 확인할 수 있습니다.

```sql
with funnel_metrics as (
  select
    variant,
    count(*) as total_sessions,
    count(case when score is not null then 1 end) as completed_sessions,
    count(case when cta_clicked = true then 1 end) as cta_clicks,
    count(distinct p.id) as preorder_count
  from
    public.quiz_sessions s
    left join public.preorders p on s.id = p.session_id
  group by
    variant
)
select
  variant,
  total_sessions as "전체 세션 수",
  completed_sessions as "퀴즈 완료 세션",
  round((completed_sessions::numeric / nullif(total_sessions, 0)) * 100, 2) as "퀴즈 완료율 (%)",
  cta_clicks as "CTA 클릭 수",
  round((cta_clicks::numeric / nullif(completed_sessions, 0)) * 100, 2) as "CTA 클릭률 (완료자 대비, %)",
  preorder_count as "사전등록 수",
  round((preorder_count::numeric / nullif(total_sessions, 0)) * 100, 2) as "사전등록 전환율 (진입 대비, %)"
from
  funnel_metrics;
```
