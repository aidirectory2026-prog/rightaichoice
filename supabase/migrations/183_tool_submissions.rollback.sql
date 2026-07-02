-- Rollback for 183_tool_submissions.sql — Phase 14 vendor submission queue.
-- Drops the queue table (and its policies/indexes with it). The tools drafts
-- created from approved submissions are NOT touched — they live their own
-- lifecycle in the onboard SOP.

DROP TABLE IF EXISTS tool_submissions;
