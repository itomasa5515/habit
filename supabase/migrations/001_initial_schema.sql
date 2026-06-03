create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  timezone text not null default 'Asia/Tokyo',
  holiday_region text not null default 'JP',
  holidays jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  if_trigger text not null,
  then_action text not null,
  habit_mode text not null default 'single' check (habit_mode in ('single', 'routine')),
  steps jsonb not null default '[]'::jsonb,
  minimum_step_id text,
  minimum_success text not null,
  short_benefit text,
  mid_benefit text,
  long_benefit text,
  benefits jsonb not null default '[]'::jsonb,
  frequency_type text not null check (frequency_type in ('daily', 'weekdays', 'business_days', 'weekends', 'weekends_holidays', 'holidays', 'weekly')),
  weekly_target_count integer,
  review_interval_days integer not null check (review_interval_days > 0),
  growth_type text not null check (growth_type in ('amount', 'duration', 'frequency', 'difficulty', 'maintain')),
  current_target_value numeric,
  current_target_unit text,
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  start_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references habits(id) on delete cascade,
  log_date date not null,
  status text not null check (status in ('done', 'missed', 'skipped')),
  completed_step_ids text[] not null default '{}',
  branch_selections jsonb not null default '{}'::jsonb,
  note text,
  missed_reason text check (missed_reason in ('forgot', 'busy', 'too_hard', 'condition', 'other')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (habit_id, log_date)
);

create table if not exists habit_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references habits(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  target_days integer not null,
  done_days integer not null,
  success_rate numeric not null,
  perceived_difficulty text check (perceived_difficulty in ('easy', 'good', 'hard')),
  app_suggestion text not null check (app_suggestion in ('increase', 'maintain', 'decrease', 'adjust')),
  user_decision text check (user_decision in ('increase', 'maintain', 'decrease', 'adjust')),
  decision_note text,
  created_at timestamptz not null default now()
);

create table if not exists habit_adjustments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references habits(id) on delete cascade,
  review_id uuid references habit_reviews(id) on delete set null,
  previous_target_value numeric,
  next_target_value numeric,
  previous_target_unit text,
  next_target_unit text,
  previous_minimum_success text,
  next_minimum_success text,
  reason text,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;
alter table habits enable row level security;
alter table habit_logs enable row level security;
alter table habit_reviews enable row level security;
alter table habit_adjustments enable row level security;

create policy "Users can manage own profile"
on profiles for all
using (id = auth.uid())
with check (id = auth.uid());

create policy "Users can manage own habits"
on habits for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can manage own habit logs"
on habit_logs for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can manage own habit reviews"
on habit_reviews for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can manage own habit adjustments"
on habit_adjustments for all
using (user_id = auth.uid())
with check (user_id = auth.uid());
