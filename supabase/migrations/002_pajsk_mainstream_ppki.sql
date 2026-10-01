-- PAJSK v1.1: Tahun 4-6 sahaja untuk arus perdana, PPKI berasingan,
-- serta pemetaan aktiviti/jawatan Portal Koku -> label SPPB/iDME.

create table if not exists public.pajsk_unit_idme_map (
  portal_unit_id uuid primary key,
  category text not null check (category in ('club','uniform','sport')),
  portal_name text not null,
  idme_label text,
  mapping_status text not null default 'mapped' check (mapping_status in ('mapped','review','ppki')),
  updated_at timestamptz not null default now()
);

create table if not exists public.pajsk_ppki_selections (
  session_year integer not null,
  student_id uuid not null,
  selected boolean not null default false,
  class_code text not null default '',
  class_name text not null default '',
  full_name_cache text not null default '',
  myid_cache text not null default '',
  updated_at timestamptz not null default now(),
  primary key (session_year,student_id)
);

create index if not exists idx_pajsk_ppki_selections_year_selected on public.pajsk_ppki_selections(session_year,selected);
alter table public.pajsk_unit_idme_map enable row level security;
alter table public.pajsk_ppki_selections enable row level security;
revoke all on public.pajsk_unit_idme_map from anon,authenticated;
revoke all on public.pajsk_ppki_selections from anon,authenticated;

insert into public.pajsk_unit_idme_map(portal_unit_id,category,portal_name,idme_label,mapping_status)
select id,category::text,name,
  case
    when name='AGAMA ISLAM' then 'PERSATUAN AGAMA ISLAM (SR)'
    when name='BAHASA INGGERIS' then 'PERSATUAN BAHASA INGGERIS (SR)'
    when name='DOKTOR MUDA' then 'KELAB DOKTOR MUDA (SR)'
    when name='PENCEGAHAN JENAYAH' then 'KELAB PENCEGAHAN JENAYAH (SR)'
    when name='RUKUN NEGARA' then 'KELAB RUKUN NEGARA (SR)'
    when name='STEM' then 'KELAB SAINS, TEKNOLOGI, KEJURUTERAAN DAN MATEMATIK (STEM)/SOLAR (SR)'
    when name='BSMM' then 'BULAN SABIT MERAH MALAYSIA (BSMM) (SR)'
    when name='PENGAKAP' then 'PERSEKUTUAN PENGAKAP MALAYSIA (SR)'
    when name='PPIM' then 'PERGERAKAN PUTERI ISLAM MALAYSIA (PPIM) (SR)'
    when name='TKRS' then 'KADET REMAJA SEKOLAH (SR)'
    when name='BOLA BALING' then 'BOLA BALING (SR)'
    when name='BOLA JARING' then 'BOLA JARING (SR)'
    when name='BOLA SEPAK' then 'BOLA SEPAK (SR)'
    when name='KRIKET' then 'KRIKET (SR)'
    else null
  end,
  case
    when name ilike '%PENDIDIKAN KHAS%' then 'ppki'
    when name in ('KEBUDAYAAN','BEYBLADE') then 'review'
    else 'mapped'
  end
from public.units where active=true
on conflict (portal_unit_id) do update set
  category=excluded.category,portal_name=excluded.portal_name,idme_label=excluded.idme_label,
  mapping_status=excluded.mapping_status,updated_at=now();

create or replace function public.pajsk_idme_position(portal_position text)
returns text language sql immutable set search_path=public as $$
  select case
    when portal_position is null or btrim(portal_position)='' then null
    when upper(btrim(portal_position))='PENGERUSI' then 'PENGERUSI'
    when upper(btrim(portal_position)) like 'NAIB PENGERUSI%' then 'NAIB PENGERUSI'
    when upper(btrim(portal_position))='SETIAUSAHA' then 'SETIAUSAHA'
    when upper(btrim(portal_position)) like 'NAIB SETIAUSAHA%' then 'NAIB SETIAUSAHA'
    when upper(btrim(portal_position))='BENDAHARI' then 'BENDAHARI'
    when upper(btrim(portal_position)) like 'NAIB BENDAHARI%' then 'NAIB BENDAHARI'
    when upper(btrim(portal_position)) like 'AJK %' or upper(btrim(portal_position))='AJK' then 'AHLI JAWATANKUASA'
    else null
  end
$$;

-- PPKI selection list: semua murid PPKI aktif, tidak dipilih secara automatik.
insert into public.pajsk_ppki_selections(session_year,student_id,selected,class_code,class_name,full_name_cache,myid_cache)
select a.year,s.id,false,coalesce(c.code,''),c.name,s.full_name,coalesce(s.identification_no,s.idme_student_id,'')
from public.student_enrolments se
join public.academic_sessions a on a.id=se.session_id
join public.classes c on c.id=se.class_id
join public.students s on s.id=se.student_id
where se.is_current=true and s.active=true and c.year_level=0
on conflict (session_year,student_id) do update set
  class_code=excluded.class_code,class_name=excluded.class_name,
  full_name_cache=excluded.full_name_cache,myid_cache=excluded.myid_cache,updated_at=now();

-- Seed sesi 2026 Tahun 4-6 sahaja. Existing PAJSK data is never overwritten.
with target as (
  select a.year session_year,a.id session_id,se.student_id,c.id class_id,c.code class_code,c.name class_name,c.year_level,
         s.full_name,coalesce(s.identification_no,s.idme_student_id,'') myid
  from public.student_enrolments se
  join public.academic_sessions a on a.id=se.session_id
  join public.classes c on c.id=se.class_id
  join public.students s on s.id=se.student_id
  where a.year=2026 and se.is_current=true and s.active=true and c.year_level between 4 and 6
), base as (
  select t.*,
    club.payload club_payload, uniform.payload uniform_payload, sport.payload sport_payload
  from target t
  left join lateral (
    select jsonb_build_object('ditaksir',true,'aktiviti',coalesce(m.idme_label,''),'portalAktiviti',u.name,'unitId',u.id,
      'activityMappingStatus',coalesce(m.mapping_status,'review'),'jawatan',coalesce(public.pajsk_idme_position(ucm.position),''),
      'portalJawatan',coalesce(ucm.position,''),'positionMappingStatus',case when ucm.position is null then 'missing' when public.pajsk_idme_position(ucm.position) is null then 'review' else 'mapped' end,
      'pelibatan','[]'::jsonb,'pencapaian',null,'komitmen','[]'::jsonb,'khidmatSumbangan','','kehadiran',12) payload
    from public.student_unit_memberships sm join public.units u on u.id=sm.unit_id
    left join public.pajsk_unit_idme_map m on m.portal_unit_id=u.id
    left join lateral (select x.position from public.unit_committee_members x where x.session_id=sm.session_id and x.unit_id=sm.unit_id and x.student_id=sm.student_id order by x.sort_order,x.id limit 1) ucm on true
    where sm.student_id=t.student_id and sm.session_id=t.session_id and sm.is_current=true and sm.category='club' order by u.name limit 1
  ) club on true
  left join lateral (
    select jsonb_build_object('ditaksir',true,'aktiviti',coalesce(m.idme_label,''),'portalAktiviti',u.name,'unitId',u.id,
      'activityMappingStatus',coalesce(m.mapping_status,'review'),'jawatan',coalesce(public.pajsk_idme_position(ucm.position),''),
      'portalJawatan',coalesce(ucm.position,''),'positionMappingStatus',case when ucm.position is null then 'missing' when public.pajsk_idme_position(ucm.position) is null then 'review' else 'mapped' end,
      'pelibatan','[]'::jsonb,'pencapaian',null,'komitmen','[]'::jsonb,'khidmatSumbangan','','kehadiran',12) payload
    from public.student_unit_memberships sm join public.units u on u.id=sm.unit_id
    left join public.pajsk_unit_idme_map m on m.portal_unit_id=u.id
    left join lateral (select x.position from public.unit_committee_members x where x.session_id=sm.session_id and x.unit_id=sm.unit_id and x.student_id=sm.student_id order by x.sort_order,x.id limit 1) ucm on true
    where sm.student_id=t.student_id and sm.session_id=t.session_id and sm.is_current=true and sm.category='uniform' order by u.name limit 1
  ) uniform on true
  left join lateral (
    select jsonb_build_object('ditaksir',true,'aktiviti',coalesce(m.idme_label,''),'portalAktiviti',u.name,'unitId',u.id,
      'activityMappingStatus',coalesce(m.mapping_status,'review'),'jawatan',coalesce(public.pajsk_idme_position(ucm.position),''),
      'portalJawatan',coalesce(ucm.position,''),'positionMappingStatus',case when ucm.position is null then 'missing' when public.pajsk_idme_position(ucm.position) is null then 'review' else 'mapped' end,
      'pelibatan','[]'::jsonb,'pencapaian',null,'komitmen','[]'::jsonb,'khidmatSumbangan','','kehadiran',12) payload
    from public.student_unit_memberships sm join public.units u on u.id=sm.unit_id
    left join public.pajsk_unit_idme_map m on m.portal_unit_id=u.id
    left join lateral (select x.position from public.unit_committee_members x where x.session_id=sm.session_id and x.unit_id=sm.unit_id and x.student_id=sm.student_id order by x.sort_order,x.id limit 1) ucm on true
    where sm.student_id=t.student_id and sm.session_id=t.session_id and sm.is_current=true and sm.category='sport' order by u.name limit 1
  ) sport on true
)
insert into public.pajsk_student_records(student_id,session_year,class_id,class_code,class_name,year_level,myid_cache,full_name_cache,kelab_persatuan,badan_beruniform,sukan_permainan,ekstra_kurikulum,complete,status,source)
select student_id,session_year,class_id,coalesce(class_code,''),class_name,year_level,myid,full_name,
       coalesce(club_payload,'{}'::jsonb),coalesce(uniform_payload,'{}'::jsonb),coalesce(sport_payload,'{}'::jsonb),'{}'::jsonb,false,'draft','admin'
from base on conflict (student_id,session_year) do nothing;
