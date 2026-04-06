
-- Replace view with one that enforces admin check internally
CREATE OR REPLACE VIEW public.all_users WITH (security_invoker = false) AS
SELECT 
  u.id as user_id,
  u.email,
  u.created_at as account_created_at,
  u.last_sign_in_at,
  p.farm_name,
  p.is_admin,
  p.display_name
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE public.is_admin(auth.uid())
ORDER BY u.created_at DESC;
