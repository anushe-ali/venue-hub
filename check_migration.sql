-- Check if new tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('admin_audit_logs', 'platform_settings', 'user_activity_stats')
ORDER BY table_name;

-- Check if is_active column was added to profiles
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'is_active';

-- Check if materialized view exists
SELECT matviewname FROM pg_matviews WHERE matviewname = 'admin_analytics_summary';

-- Check if helper functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_revenue_by_month', 'get_user_growth', 'refresh_admin_analytics')
ORDER BY routine_name;
