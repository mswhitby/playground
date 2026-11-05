-- Teacher-only complete assignment history and weekly points.
-- History contains assignment metadata, never drafts or source files.
-- Weekly points count only the positive improvement on a server-graded assignment,
-- credited to its (America/Chicago) submission week. Re-submitting a previously
-- scored assignment cannot earn its points again.
begin;

create function public.playground_teacher_student_history(p_class uuid,p_student uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
  course text;
  practice_rows jsonb;
  submission_rows jsonb;
  check_rows jsonb;
begin
  perform playground_private.require_teacher(p_class);
  select c.course_id into course
    from playground_private.classes c where c.id=p_class;
  if not exists(select 1 from playground_private.members m
    where m.class_id=p_class and m.user_id=p_student and m.status='approved') then
    raise exception 'Student is not enrolled in this section' using errcode='42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'activity_id',p.activity_id,'content_version',p.content_version,
    'activity_kind',p.activity_kind,'status',p.status,
    'verification',p.verification,'updated_at',p.updated_at)
    order by p.updated_at desc,p.activity_id),'[]'::jsonb)
  into practice_rows from public.playground_progress p
    where p.user_id=p_student and p.course_id=course;

  -- Every hand-in, including older receipts outside the 200-row class snapshot.
  -- No submission.files, practice_data, or draft source is exposed here.
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',s.id,'activity_id',s.activity_id,'content_version',s.content_version,
    'activity_kind',s.activity_kind,'submitted_at',s.submitted_at,
    'grade_status',coalesce(g.status,'ungraded'),
    'points',case when g.status='graded' then g.points else null end,
    'possible',case when g.status='graded' then g.possible else null end,
    'scope',case when g.status='graded' then g.scope else null end)
    order by s.submitted_at desc,s.id desc),'[]'::jsonb)
  into submission_rows from public.playground_submissions s
    left join public.playground_grades g on g.submission_id=s.id
    where s.user_id=p_student and s.course_id=course
      and s.activity_id not like 'review:%';

  select coalesce(jsonb_agg(jsonb_build_object(
    'activity_id',a.activity_id,'checks',a.checks,'last_check',a.last_check)
    order by a.activity_id),'[]'::jsonb)
  into check_rows from(
    select a.activity_id,count(*)::integer as checks,
       max(a.recorded_at) as last_check
      from public.playground_attempts a
     where a.user_id=p_student and a.course_id=course
     group by a.activity_id
  ) a;

  return jsonb_build_object('course_id',course,'user_id',p_student,
    'practice',practice_rows,'submissions',submission_rows,'checks',check_rows);
end $$;

create function public.playground_teacher_weekly_points(p_class uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
  course text;
  weekly jsonb;
begin
  perform playground_private.require_teacher(p_class);
  select c.course_id into course from playground_private.classes c where c.id=p_class;
  with ordered_grades as (
    select s.user_id,s.activity_id,s.id,s.submitted_at,g.points,
      max(g.points) over (
        partition by s.user_id,s.activity_id
        order by s.submitted_at,s.id
        rows between unbounded preceding and 1 preceding
      ) as previous_best
    from public.playground_submissions s
      join public.playground_grades g on g.submission_id=s.id
    where s.course_id=course and s.activity_id not like 'review:%'
      and g.status='graded' and g.points is not null
      and g.scope in ('grader_tests','published_tests','teacher')
      and exists(select 1 from playground_private.members m
        where m.class_id=p_class and m.user_id=s.user_id and m.status='approved')
  ), improvements as (
    select user_id,activity_id,
      date_trunc('week',submitted_at at time zone 'America/Chicago')::date as week_start,
      greatest(0::numeric,points-coalesce(previous_best,0)) as earned
    from ordered_grades
  ), totals as (
    select user_id,week_start,round(sum(earned),2) as earned,
      count(distinct activity_id) filter(where earned>0) as improved_assignments
    from improvements
    where earned>0
    group by user_id,week_start
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'user_id',t.user_id,'week_start',t.week_start::text,
    'points',t.earned,'assignments',t.improved_assignments)
    order by t.week_start desc,t.user_id),'[]'::jsonb)
  into weekly from totals t;

  return jsonb_build_object('course_id',course,'time_zone','America/Chicago',
    'method','verified_score_improvements','weeks',weekly);
end $$;

revoke all on function public.playground_teacher_student_history(uuid,uuid),
 public.playground_teacher_weekly_points(uuid)
 from public,anon,authenticated;
grant execute on function public.playground_teacher_student_history(uuid,uuid),
 public.playground_teacher_weekly_points(uuid) to authenticated;

comment on function public.playground_teacher_student_history(uuid,uuid) is
 'Teacher-only full assignment metadata for one approved student in one section; no source files.';
comment on function public.playground_teacher_weekly_points(uuid) is
 'Teacher-only weekly incremental gains from verified server grades, Monday to Sunday in Central Time; one assignment cannot earn duplicate points on a repeated hand-in.';
commit;
