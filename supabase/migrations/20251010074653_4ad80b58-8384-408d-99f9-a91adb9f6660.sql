-- Create event-images storage bucket for hero images and maps
insert into storage.buckets (id, name, public)
values ('event-images', 'event-images', true);

-- Storage policies for event images
create policy "Anyone can view event images"
on storage.objects for select
using (bucket_id = 'event-images');

create policy "Admins can upload event images"
on storage.objects for insert
with check (bucket_id = 'event-images' and auth.role() = 'authenticated');

create policy "Admins can update event images"
on storage.objects for update
using (bucket_id = 'event-images' and auth.role() = 'authenticated');

create policy "Admins can delete event images"
on storage.objects for delete
using (bucket_id = 'event-images' and auth.role() = 'authenticated');

-- Events table
create table public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  date date,
  location text,
  hero_image_url text,
  published boolean default false,
  enable_program boolean default true,
  enable_participants boolean default true,
  enable_exhibitors boolean default true,
  enable_map boolean default false,
  enable_info boolean default true,
  google_sheets_url text,
  last_synced_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Program items table
create table public.program_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade not null,
  external_id text,
  day date not null,
  start_time time not null,
  end_time time,
  title text not null,
  description text,
  location text,
  created_at timestamptz default now()
);

-- Participants table
create table public.participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade not null,
  external_id text,
  name text not null,
  company text,
  created_at timestamptz default now()
);

-- Exhibitors table
create table public.exhibitors (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade not null,
  external_id text,
  company_name text not null,
  stand_number text,
  created_at timestamptz default now()
);

-- Info sections table
create table public.info_sections (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade not null,
  title text not null,
  content text,
  order_index integer default 0,
  created_at timestamptz default now()
);

-- Maps table
create table public.maps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade not null,
  image_url text not null,
  created_at timestamptz default now()
);

-- Admin settings table (for password)
create table public.admin_settings (
  id uuid primary key default gen_random_uuid(),
  password_hash text not null,
  updated_at timestamptz default now()
);

-- Create indexes for performance
create index idx_events_slug on public.events(slug);
create index idx_program_items_event_id on public.program_items(event_id);
create index idx_program_items_day on public.program_items(event_id, day);
create index idx_participants_event_id on public.participants(event_id);
create index idx_participants_name on public.participants(event_id, name);
create index idx_exhibitors_event_id on public.exhibitors(event_id);
create index idx_exhibitors_company on public.exhibitors(event_id, company_name);
create index idx_info_sections_event_id on public.info_sections(event_id, order_index);
create index idx_maps_event_id on public.maps(event_id);

-- Enable RLS on all tables
alter table public.events enable row level security;
alter table public.program_items enable row level security;
alter table public.participants enable row level security;
alter table public.exhibitors enable row level security;
alter table public.info_sections enable row level security;
alter table public.maps enable row level security;
alter table public.admin_settings enable row level security;

-- RLS Policies: Public read access for published events
create policy "Anyone can view published events"
on public.events for select
using (published = true);

create policy "Anyone can view program items for published events"
on public.program_items for select
using (
  exists (
    select 1 from public.events
    where events.id = program_items.event_id
    and events.published = true
  )
);

create policy "Anyone can view participants for published events"
on public.participants for select
using (
  exists (
    select 1 from public.events
    where events.id = participants.event_id
    and events.published = true
  )
);

create policy "Anyone can view exhibitors for published events"
on public.exhibitors for select
using (
  exists (
    select 1 from public.events
    where events.id = exhibitors.event_id
    and events.published = true
  )
);

create policy "Anyone can view info sections for published events"
on public.info_sections for select
using (
  exists (
    select 1 from public.events
    where events.id = info_sections.event_id
    and events.published = true
  )
);

create policy "Anyone can view maps for published events"
on public.maps for select
using (
  exists (
    select 1 from public.events
    where events.id = maps.event_id
    and events.published = true
  )
);

-- Admin policies: Authenticated users can manage all data
create policy "Authenticated users can manage events"
on public.events for all
to authenticated
using (true)
with check (true);

create policy "Authenticated users can manage program items"
on public.program_items for all
to authenticated
using (true)
with check (true);

create policy "Authenticated users can manage participants"
on public.participants for all
to authenticated
using (true)
with check (true);

create policy "Authenticated users can manage exhibitors"
on public.exhibitors for all
to authenticated
using (true)
with check (true);

create policy "Authenticated users can manage info sections"
on public.info_sections for all
to authenticated
using (true)
with check (true);

create policy "Authenticated users can manage maps"
on public.maps for all
to authenticated
using (true)
with check (true);

create policy "Authenticated users can manage admin settings"
on public.admin_settings for all
to authenticated
using (true)
with check (true);

-- Function to update updated_at timestamp
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Trigger for events table
create trigger update_events_updated_at
before update on public.events
for each row
execute function public.update_updated_at_column();

-- Insert default admin password (password: "mef2025" - MUST be changed after first login)
-- Using bcrypt hash for password "mef2025"
insert into public.admin_settings (password_hash)
values ('$2a$10$rX8EZQxJhN7YvZqJz.4xOeK3yH0yN4KvF6xZ7RqXJ8KvF6xZ7RqXJa');