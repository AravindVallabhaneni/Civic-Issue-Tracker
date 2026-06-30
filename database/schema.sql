-- ============================================================
-- Hyperlocal Civic Issue Tracker — Supabase Database Schema
-- Run this in the Supabase SQL editor in order.
-- ============================================================

-- 1. Enable PostGIS extension for geospatial queries
create extension if not exists postgis;

-- 2. Departments (create before tables that reference it)
create table departments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category_keys text[] not null default '{}',
  contact_email text,
  jurisdiction_geom geometry(Polygon, 4326),
  created_at timestamptz default now()
);

-- 3. Profiles (extends auth.users)
create table profiles (
  id uuid references auth.users primary key,
  full_name text,
  role text not null default 'citizen'
    check (role in ('citizen', 'department_staff', 'admin')),
  department_id uuid references departments(id) on delete set null,
  created_at timestamptz default now()
);

-- 4. Issue clusters
create table issue_clusters (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  centroid geometry(Point, 4326) not null,
  report_count int not null default 1,
  department_id uuid references departments(id) on delete set null,
  status text not null default 'open'
    check (status in ('open', 'assigned', 'resolved')),
  priority int not null default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 5. Issue reports
create table issue_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references profiles(id) on delete set null,
  category text not null
    check (category in ('streetlight','garbage','water_leak','pothole','road_damage','noise_pollution','illegal_dumping','other')),
  description text,
  photo_url text,
  location geometry(Point, 4326) not null,
  address_text text,
  status text not null default 'reported'
    check (status in ('reported','acknowledged','in_progress','resolved','rejected')),
  cluster_id uuid references issue_clusters(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 6. Status update audit log
create table status_updates (
  id uuid primary key default gen_random_uuid(),
  cluster_id uuid references issue_clusters(id) on delete cascade,
  updated_by uuid references profiles(id) on delete set null,
  old_status text,
  new_status text,
  note text,
  created_at timestamptz default now()
);

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_issue_reports_location on issue_reports using gist(location);
create index idx_clusters_centroid on issue_clusters using gist(centroid);
create index idx_reports_cluster on issue_reports(cluster_id);
create index idx_reports_reporter on issue_reports(reporter_id);
create index idx_clusters_status on issue_clusters(status);
create index idx_clusters_priority on issue_clusters(priority desc);
create index idx_clusters_updated on issue_clusters(updated_at);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table profiles enable row level security;
alter table departments enable row level security;
alter table issue_reports enable row level security;
alter table issue_clusters enable row level security;
alter table status_updates enable row level security;

-- Profiles
create policy "Public profiles are viewable by everyone"
  on profiles for select using (true);

create policy "Users can insert their own profile"
  on profiles for insert with check (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update using (auth.uid() = id);

-- Departments
create policy "Departments are publicly readable"
  on departments for select using (true);

create policy "Only admins can manage departments"
  on departments for all using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

-- Issue reports
create policy "Reports are publicly readable"
  on issue_reports for select using (true);

create policy "Authenticated users can create reports"
  on issue_reports for insert with check (
    auth.uid() is not null
    and (reporter_id is null or reporter_id = auth.uid())
  );

create policy "Reporters can update their own reports"
  on issue_reports for update using (
    auth.uid() = reporter_id
  );

create policy "Staff and admins can update any report"
  on issue_reports for update using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role in ('department_staff', 'admin')
    )
  );

-- Issue clusters
create policy "Clusters are publicly readable"
  on issue_clusters for select using (true);

create policy "Only staff and admins can insert clusters"
  on issue_clusters for insert with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role in ('department_staff', 'admin')
    )
  );

create policy "Department staff can update their own department clusters"
  on issue_clusters for update using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and (
          profiles.role = 'admin'
          or (
            profiles.role = 'department_staff'
            and profiles.department_id = issue_clusters.department_id
          )
        )
    )
  );

-- Status updates
create policy "Status updates are publicly readable"
  on status_updates for select using (true);

create policy "Only staff and admins can create status updates"
  on status_updates for insert with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role in ('department_staff', 'admin')
    )
  );

-- ============================================================
-- TRIGGER: auto-create profile on user signup
-- ============================================================
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into profiles (id, full_name, role)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    coalesce(new.raw_user_meta_data ->> 'role', 'citizen')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- STORED PROCEDURES / RPC FUNCTIONS
-- ============================================================

-- Find open clusters of same category within radius (for clustering engine)
create or replace function find_nearby_clusters(
  p_category text,
  p_lat double precision,
  p_lng double precision,
  p_radius_meters double precision
)
returns table (
  id uuid,
  category text,
  report_count int,
  department_id uuid,
  status text,
  priority int,
  created_at timestamptz,
  distance_meters double precision
)
language plpgsql
security definer
as $$
begin
  return query
  select
    ic.id,
    ic.category,
    ic.report_count,
    ic.department_id,
    ic.status,
    ic.priority,
    ic.created_at,
    ST_Distance(
      ic.centroid::geography,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
    ) as distance_meters
  from issue_clusters ic
  where
    ic.category = p_category
    and ic.status != 'resolved'
    and ST_DWithin(
      ic.centroid::geography,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      p_radius_meters
    )
  order by distance_meters asc
  limit 5;
end;
$$;

-- Create a new cluster
create or replace function create_cluster(
  p_category text,
  p_lat double precision,
  p_lng double precision,
  p_department_id uuid default null,
  p_priority int default 1
)
returns table (id uuid)
language plpgsql
security definer
as $$
declare
  v_id uuid := gen_random_uuid();
begin
  insert into issue_clusters (id, category, centroid, report_count, department_id, status, priority)
  values (
    v_id,
    p_category,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326),
    1,
    p_department_id,
    case when p_department_id is not null then 'assigned' else 'open' end,
    p_priority
  );
  return query select v_id;
end;
$$;

-- Recompute cluster centroid from all member reports
create or replace function update_cluster_centroid(p_cluster_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_centroid geometry;
begin
  select ST_Centroid(ST_Collect(location))
  into v_centroid
  from issue_reports
  where cluster_id = p_cluster_id;

  if v_centroid is not null then
    update issue_clusters
    set centroid = v_centroid,
        updated_at = now()
    where id = p_cluster_id;
  end if;
end;
$$;

-- Create a report
create or replace function create_report(
  p_id uuid,
  p_reporter_id uuid,
  p_category text,
  p_description text,
  p_photo_url text,
  p_lat double precision,
  p_lng double precision,
  p_address_text text
)
returns table (id uuid, created_at timestamptz)
language plpgsql
security definer
as $$
begin
  insert into issue_reports (
    id, reporter_id, category, description, photo_url,
    location, address_text, status
  )
  values (
    p_id,
    p_reporter_id,
    p_category,
    p_description,
    p_photo_url,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326),
    p_address_text,
    'reported'
  );
  return query select p_id, now();
end;
$$;

-- Get report by ID with lat/lng extracted
create or replace function get_report_by_id(p_id uuid)
returns table (
  id uuid,
  reporter_id uuid,
  category text,
  description text,
  photo_url text,
  lat double precision,
  lng double precision,
  address_text text,
  status text,
  cluster_id uuid,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
as $$
begin
  return query
  select
    r.id,
    r.reporter_id,
    r.category,
    r.description,
    r.photo_url,
    ST_Y(r.location::geometry) as lat,
    ST_X(r.location::geometry) as lng,
    r.address_text,
    r.status,
    r.cluster_id,
    r.created_at,
    r.updated_at
  from issue_reports r
  where r.id = p_id;
end;
$$;

-- Get reports by cluster with lat/lng
create or replace function get_reports_geojson(
  p_cluster_id uuid default null,
  p_limit int default 20,
  p_offset int default 0
)
returns table (
  id uuid,
  reporter_id uuid,
  category text,
  description text,
  photo_url text,
  lat double precision,
  lng double precision,
  address_text text,
  status text,
  cluster_id uuid,
  created_at timestamptz
)
language plpgsql
security definer
as $$
begin
  return query
  select
    r.id,
    r.reporter_id,
    r.category,
    r.description,
    r.photo_url,
    ST_Y(r.location::geometry) as lat,
    ST_X(r.location::geometry) as lng,
    r.address_text,
    r.status,
    r.cluster_id,
    r.created_at
  from issue_reports r
  where (p_cluster_id is null or r.cluster_id = p_cluster_id)
  order by r.created_at desc
  limit p_limit
  offset p_offset;
end;
$$;

-- Get clusters in viewport with lat/lng centroid
create or replace function get_clusters_in_viewport(
  p_min_lat double precision default -90,
  p_min_lng double precision default -180,
  p_max_lat double precision default 90,
  p_max_lng double precision default 180,
  p_category text default null,
  p_status text default null,
  p_limit int default 100,
  p_offset int default 0
)
returns table (
  id uuid,
  category text,
  centroid_lat double precision,
  centroid_lng double precision,
  report_count int,
  department_id uuid,
  department_name text,
  status text,
  priority int,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
as $$
begin
  return query
  select
    ic.id,
    ic.category,
    ST_Y(ic.centroid::geometry) as centroid_lat,
    ST_X(ic.centroid::geometry) as centroid_lng,
    ic.report_count,
    ic.department_id,
    d.name as department_name,
    ic.status,
    ic.priority,
    ic.created_at,
    ic.updated_at
  from issue_clusters ic
  left join departments d on d.id = ic.department_id
  where
    ST_Within(
      ic.centroid,
      ST_MakeEnvelope(p_min_lng, p_min_lat, p_max_lng, p_max_lat, 4326)
    )
    and (p_category is null or ic.category = p_category)
    and (p_status is null or ic.status = p_status)
  order by ic.priority desc, ic.updated_at desc
  limit p_limit
  offset p_offset;
end;
$$;

-- Get cluster detail with member report count and sample photos
create or replace function get_cluster_detail(p_cluster_id uuid)
returns table (
  id uuid,
  category text,
  centroid_lat double precision,
  centroid_lng double precision,
  report_count int,
  department_id uuid,
  department_name text,
  status text,
  priority int,
  sample_photos jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
as $$
begin
  return query
  select
    ic.id,
    ic.category,
    ST_Y(ic.centroid::geometry) as centroid_lat,
    ST_X(ic.centroid::geometry) as centroid_lng,
    ic.report_count,
    ic.department_id,
    d.name as department_name,
    ic.status,
    ic.priority,
    (
      select jsonb_agg(photo_url)
      from (
        select r.photo_url
        from issue_reports r
        where r.cluster_id = ic.id
          and r.photo_url is not null
        limit 4
      ) photos
    ) as sample_photos,
    ic.created_at,
    ic.updated_at
  from issue_clusters ic
  left join departments d on d.id = ic.department_id
  where ic.id = p_cluster_id;
end;
$$;

-- Public stats for transparency page
create or replace function get_public_stats()
returns jsonb
language plpgsql
security definer
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'total_reports', (select count(*) from issue_reports),
    'total_clusters', (select count(*) from issue_clusters),
    'resolved_this_month', (
      select count(*) from issue_clusters
      where status = 'resolved'
        and updated_at >= date_trunc('month', now())
    ),
    'open_clusters', (
      select count(*) from issue_clusters where status = 'open'
    ),
    'avg_resolution_hours', (
      select round(avg(
        extract(epoch from (updated_at - created_at)) / 3600
      )::numeric, 1)
      from issue_clusters
      where status = 'resolved'
    ),
    'by_category', (
      select jsonb_object_agg(category, cnt)
      from (
        select category, count(*) as cnt
        from issue_reports
        group by category
      ) t
    ),
    'by_department', (
      select jsonb_agg(jsonb_build_object(
        'department', d.name,
        'total', count(*),
        'resolved', count(*) filter (where ic.status = 'resolved')
      ))
      from issue_clusters ic
      left join departments d on d.id = ic.department_id
      group by d.name
    )
  ) into result;

  return result;
end;
$$;

-- Department-level stats
create or replace function get_department_stats(p_department_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'total_clusters', (
      select count(*) from issue_clusters where department_id = p_department_id
    ),
    'open_clusters', (
      select count(*) from issue_clusters
      where department_id = p_department_id and status = 'open'
    ),
    'assigned_clusters', (
      select count(*) from issue_clusters
      where department_id = p_department_id and status = 'assigned'
    ),
    'resolved_clusters', (
      select count(*) from issue_clusters
      where department_id = p_department_id and status = 'resolved'
    ),
    'avg_resolution_hours', (
      select round(avg(
        extract(epoch from (updated_at - created_at)) / 3600
      )::numeric, 1)
      from issue_clusters
      where department_id = p_department_id and status = 'resolved'
    ),
    'high_priority_open', (
      select count(*) from issue_clusters
      where department_id = p_department_id
        and status in ('open', 'assigned')
        and priority >= 50
    )
  ) into result;

  return result;
end;
$$;

-- ============================================================
-- SEED DATA: departments
-- ============================================================
insert into departments (name, category_keys, contact_email) values
  ('Electrical Department', array['streetlight'], 'electrical@civic.gov'),
  ('Sanitation Department', array['garbage', 'illegal_dumping'], 'sanitation@civic.gov'),
  ('Water & Sewage Department', array['water_leak'], 'water@civic.gov'),
  ('Roads & Infrastructure', array['pothole', 'road_damage'], 'roads@civic.gov'),
  ('Environment & Noise Control', array['noise_pollution'], 'environment@civic.gov'),
  ('General Affairs', array['other'], 'general@civic.gov');
