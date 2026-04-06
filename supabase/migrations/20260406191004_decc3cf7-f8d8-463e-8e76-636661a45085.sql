
-- Create a view joining auth.users with profiles so admin can see ALL accounts
CREATE OR REPLACE VIEW public.all_users AS
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
ORDER BY u.created_at DESC;

-- Grant read access to authenticated users (admin check done in app code)
GRANT SELECT ON public.all_users TO authenticated;

-- Ensure the handle_new_user trigger is attached so new signups get a profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
