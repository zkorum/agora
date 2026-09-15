// PostgreSQL system views are deliberately kept as SQL. Agora-table queries
// live in the read-only Drizzle diagnostics helper under services/api/scripts.
export const settingsSql = `SELECT json_build_object(
  'database', current_database(), 'serverVersion', current_setting('server_version'),
  'extensionInstalled', EXISTS(SELECT 1 FROM pg_extension WHERE extname='pg_stat_statements'),
  'settings', (SELECT json_object_agg(name, setting) FROM pg_settings WHERE name IN
    ('shared_preload_libraries','track_io_timing','track_wal_io_timing','max_connections',
     'shared_buffers','work_mem','log_min_duration_statement','log_lock_waits')));`;

export const databaseSampleSql = `SELECT json_build_object(
  'timestamp', clock_timestamp(),
  'activity', (SELECT coalesce(json_agg(t), '[]') FROM (
    SELECT state, wait_event_type, wait_event, count(*) FROM pg_stat_activity
    WHERE datname=current_database() AND pid<>pg_backend_pid() AND application_name<>'ranking_performance_monitor'
    GROUP BY state,wait_event_type,wait_event) t),
  'blockers', (SELECT coalesce(json_agg(t), '[]') FROM (
    SELECT pid, pg_blocking_pids(pid) AS blocking_pids FROM pg_stat_activity
    WHERE datname=current_database() AND cardinality(pg_blocking_pids(pid))>0) t),
  'database', (SELECT row_to_json(t) FROM (
    SELECT xact_commit,xact_rollback,blks_read,blks_hit,temp_bytes,deadlocks,
      blk_read_time,blk_write_time,stats_reset FROM pg_stat_database WHERE datname=current_database()) t),
  'tables', (SELECT coalesce(json_agg(t), '[]') FROM (
    SELECT relname,n_live_tup,n_dead_tup,n_tup_ins,n_tup_upd,n_tup_del,
      seq_scan,idx_scan,last_autovacuum,last_autoanalyze,pg_total_relation_size(relid) AS bytes
    FROM pg_stat_user_tables WHERE relname IN ('maxdiff_result','maxdiff_comparison',
      'maxdiff_user_entity_score','ranking_score','ranking_conversation_stats_snapshot','ranking_conversation_stats_item')) t),
  'replication', (SELECT coalesce(json_agg(t), '[]') FROM (
    SELECT application_name,state,sync_state,
      pg_wal_lsn_diff(pg_current_wal_lsn(),replay_lsn)::float8 AS replay_lag_bytes
    FROM pg_stat_replication) t));`;
