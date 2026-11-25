-- After creating your first user in Supabase > Authentication > Users,
-- replace the email below and run this once to make that user the admin.
update user_roles set role = 'admin'
where user_id = (select id from auth.users where email = 'owner@example.com');
