-- 1. Profiles
create table if not exists profiles (
  email       text primary key,
  photo_url   text,
  bio         text,
  updated_at  timestamptz default now()
);

-- 2. Registered Users
create table if not exists registered_users (
  id          bigint primary key,
  name        text not null,
  email       text unique not null,
  flat        text,
  block       text,
  role        text default 'Resident',
  phone       text,
  password    text not null,
  created_at  timestamptz default now()
);

-- 3. Password Overrides
create table if not exists password_overrides (
  email       text primary key,
  password    text not null,
  updated_at  timestamptz default now()
);

-- 4. Complaints
create table if not exists complaints (
  id              bigint primary key,
  title           text not null,
  description     text not null,
  status          text not null default 'Pending',
  category        text not null default 'Other',
  date            text not null,
  raised_by       text not null,
  raised_by_email text,
  icon            text default '📝',
  admin_note      text,
  created_at      timestamptz default now()
);

-- 5. Bookings
create table if not exists bookings (
  id               bigint primary key,
  venue            text not null,
  date             text not null,
  purpose          text not null,
  booked_by        text not null,
  booked_by_email  text,
  status           text not null default 'Pending',
  created_at       timestamptz default now()
);

-- 6. Events / Community Feed
create table if not exists events (
  id          bigint primary key,
  title       text,
  caption     text,
  date        text,
  category    text default 'Community',
  gradient    jsonb,
  icon        text default '📝',
  posted_by   text,
  views       int default 0,
  likes       jsonb default '[]',
  saved       jsonb default '[]',
  comments    jsonb default '[]',
  created_at  timestamptz default now()
);

-- 7. Notifications
create table if not exists notifications (
  id           bigint primary key,
  title        text not null,
  message      text not null,
  icon         text default '🔔',
  date         text not null,
  target_type  text,
  target_user  text,
  reads        jsonb default '[]',
  created_at   timestamptz default now()
);

-- 8. Polls
create table if not exists polls (
  id          int primary key,
  data        jsonb not null,
  updated_at  timestamptz default now()
);

-- 9. Payment Types
create table if not exists payment_types (
  id          bigint primary key,
  name        text,
  amount      numeric,
  period      text,
  description text
);

-- 10. Payment History
create table if not exists payment_history (
  id          bigint primary key,
  date        text,
  type        text,
  amount      numeric,
  method      text,
  status      text default 'Paid',
  reference   text,
  user_email  text,
  created_at  timestamptz default now()
);

-- RLS
alter table profiles          enable row level security;
alter table registered_users  enable row level security;
alter table password_overrides enable row level security;
alter table complaints        enable row level security;
alter table bookings          enable row level security;
alter table events            enable row level security;
alter table notifications     enable row level security;
alter table polls             enable row level security;
alter table payment_types     enable row level security;
alter table payment_history   enable row level security;

create policy "anon_all" on profiles          for all to anon using (true) with check (true);
create policy "anon_all" on registered_users  for all to anon using (true) with check (true);
create policy "anon_all" on password_overrides for all to anon using (true) with check (true);
create policy "anon_all" on complaints        for all to anon using (true) with check (true);
create policy "anon_all" on bookings          for all to anon using (true) with check (true);
create policy "anon_all" on events            for all to anon using (true) with check (true);
create policy "anon_all" on notifications     for all to anon using (true) with check (true);
create policy "anon_all" on polls             for all to anon using (true) with check (true);
create policy "anon_all" on payment_types     for all to anon using (true) with check (true);
create policy "anon_all" on payment_history   for all to anon using (true) with check (true);
