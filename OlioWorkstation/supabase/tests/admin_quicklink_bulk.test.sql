begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users (id,aud,role,email,raw_user_meta_data) values
 ('a1010101-1111-4111-8111-111111111111','authenticated','authenticated','bulk-source@example.invalid','{}'),
 ('a2020202-2222-4222-8222-222222222222','authenticated','authenticated','bulk-target@example.invalid','{}');
insert into quicklink_folders(id,user_id,name,scope,order_index) values
 ('a3030303-3333-4333-8333-333333333333','a1010101-1111-4111-8111-111111111111','School','personal',0);
insert into quicklinks(id,user_id,folder_id,title,url,scope,order_index) values
 ('a4040404-4444-4444-8444-444444444444','a1010101-1111-4111-8111-111111111111','a3030303-3333-4333-8333-333333333333','Course','https://example.com','personal',0);

create temporary table bulk_plan as select jsonb_build_object(
 'mode','copy',
 'expected',jsonb_build_object(
   'profiles',(select jsonb_agg(jsonb_build_object('id',id,'org_id',org_id,'app_owner',app_owner)) from profiles where id in ('a1010101-1111-4111-8111-111111111111','a2020202-2222-4222-8222-222222222222')),
   'folders',(select jsonb_agg(to_jsonb(f)) from quicklink_folders f where id='a3030303-3333-4333-8333-333333333333'),
   'links',(select jsonb_agg(to_jsonb(l)) from quicklinks l where id='a4040404-4444-4444-8444-444444444444'),
   'destination','[]'::jsonb),
 'folders',jsonb_build_array(jsonb_build_object('id','a5050505-5555-4555-8555-555555555555','user_id','a2020202-2222-4222-8222-222222222222','name','School','scope','personal','order_index',0)),
 'links',jsonb_build_array(jsonb_build_object('id','a6060606-6666-4666-8666-666666666666','user_id','a2020202-2222-4222-8222-222222222222','folder_id','a5050505-5555-4555-8555-555555555555','title','Course','url','https://example.com','scope','personal','order_index',0))
) as payload;

select is((admin_bulk_quicklinks((select payload from bulk_plan))->>'count')::integer,2,'Folder and child copy together');
select is((select folder_id::text from quicklinks where id='a6060606-6666-4666-8666-666666666666'),'a5050505-5555-4555-8555-555555555555','Copied link points to new folder');
select is((select user_id::text from quicklinks where id='a4040404-4444-4444-8444-444444444444'),'a1010101-1111-4111-8111-111111111111','Copy preserves source');
delete from quicklinks where id='a6060606-6666-4666-8666-666666666666';
delete from quicklink_folders where id='a5050505-5555-4555-8555-555555555555';

-- A failed link insert must roll back the preceding folder insert.
select throws_ok($test$ select admin_bulk_quicklinks(jsonb_set((select payload from bulk_plan),'{links,0,folder_id}','"ffffffff-ffff-4fff-8fff-ffffffffffff"')) $test$,'23503',null,'Invalid child rolls back entire copy');
select is((select count(*)::integer from quicklink_folders where id='a5050505-5555-4555-8555-555555555555'),0,'No partial folder survives');
update quicklinks set title='Changed' where id='a4040404-4444-4444-8444-444444444444';
select throws_ok($test$ select admin_bulk_quicklinks((select payload from bulk_plan)) $test$,'P0001','Link changed. Review the operation again.','Stale snapshot rejected');
select ok(not has_function_privilege('authenticated','public.admin_bulk_quicklinks(jsonb)','execute'),'Regular clients cannot bypass admin review');
select * from finish();
rollback;
