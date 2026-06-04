
create table users (
id bigint generated always as identity primary key,
telegram_id bigint unique,
username text,
balance int default 0,
vip_level int default 1,
referral_code text,
referred_by text,
daily_claim_date date,
spin_count int default 0,
ad_watch_count int default 0,
is_banned boolean default false,
created_at timestamp default now()
);

create table referrals (
id bigint generated always as identity primary key,
referrer bigint,
referred bigint,
commission int default 0
);

create table withdraw_requests (
id bigint generated always as identity primary key,
telegram_id bigint,
amount int,
status text default 'pending',
created_at timestamp default now()
);

create table leaderboard (
id bigint generated always as identity primary key,
telegram_id bigint,
score int default 0
);
