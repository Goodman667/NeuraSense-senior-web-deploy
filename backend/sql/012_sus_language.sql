-- ============================================================
-- NeuraSense: SUS 结果表增加“填写语言”一列（zh = 中文版，en = 英文版）
-- 如果之前已经运行过 011_sus_responses.sql，在 Supabase SQL Editor 中再运行一次本文件即可。
-- 未运行前，新提交的问卷会暂存在服务器本地 data/sus_responses.json，导出时照样会合并，不会丢失。
-- ============================================================

ALTER TABLE sus_responses ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'zh';
