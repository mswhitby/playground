-- Bootstrap trusted provider identities: two teacher accounts, two students,
-- and an unrelated teacher group. Editable metadata is deliberately misleading.
reset role;
alter table auth.users add column raw_user_meta_data jsonb default '{}';
create table auth.identities(user_id uuid,provider text,provider_id text,identity_data jsonb default '{}');
insert into auth.users(id) values('00000000-0000-0000-0000-000000000003'),('00000000-0000-0000-0000-000000000004'),('00000000-0000-0000-0000-000000000005');
insert into auth.identities(user_id,provider,provider_id) values
('00000000-0000-0000-0000-000000000001','github','63321092'),
('00000000-0000-0000-0000-000000000002','github','student-a'),
('00000000-0000-0000-0000-000000000003','github','104539455'),
('00000000-0000-0000-0000-000000000004','github','student-b'),
('00000000-0000-0000-0000-000000000005','github','other-teacher');
