-- ============================================
-- 010_assessment_innovation.sql
-- Innovation Point 1 & 3: Assessment + Hidden Distress tables
-- ============================================

-- Table 1: assessment_turn_evidence
-- Stores per-turn multimodal assessment results for Innovation Point 1
CREATE TABLE IF NOT EXISTS assessment_turn_evidence (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id      TEXT NOT NULL,
    turn_id         TEXT NOT NULL,
    user_id         TEXT,
    created_at      TIMESTAMPTZ DEFAULT now(),

    -- Text evidence (LLM-derived)
    text_evidence_json   JSONB DEFAULT '{}',

    -- Biosignal evidence
    biosignal_snapshot_json  JSONB DEFAULT '{}',

    -- Sensor quality
    sensor_quality_json  JSONB DEFAULT '{}',

    -- Contradiction values
    contradiction_json   JSONB DEFAULT '{}',

    -- Confidence values
    confidence_json      JSONB DEFAULT '{}',

    -- Final scores
    updated_item_scores_json JSONB DEFAULT '{}',
    total_score          INTEGER DEFAULT 0,
    severity_level       TEXT DEFAULT '',

    -- Assessment mode
    mode                 TEXT DEFAULT 'text_only' CHECK (mode IN ('text_only', 'multimodal')),

    -- Experimental condition (thesis design)
    condition            TEXT DEFAULT 'C2' CHECK (condition IN ('C1', 'C2', 'C3')),
    fallback_reasons_json JSONB DEFAULT '[]',

    -- Flags
    clarification_needed BOOLEAN DEFAULT FALSE,
    risk_flag            BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_ate_session ON assessment_turn_evidence(session_id);
CREATE INDEX IF NOT EXISTS idx_ate_user ON assessment_turn_evidence(user_id);
CREATE INDEX IF NOT EXISTS idx_ate_created ON assessment_turn_evidence(created_at);


-- Table 2: assessment_groundtruth
-- Stores post-session explicit PHQ-9/GAD-7 and usability ratings
-- Used as ground truth for Innovation Point 1 evaluation
CREATE TABLE IF NOT EXISTS assessment_groundtruth (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id      TEXT NOT NULL,
    participant_id  TEXT,
    created_at      TIMESTAMPTZ DEFAULT now(),

    -- Explicit PHQ-9
    phq9_total      INTEGER CHECK (phq9_total >= 0 AND phq9_total <= 27),
    phq9_items_json JSONB DEFAULT '{}',

    -- Explicit GAD-7
    gad7_total      INTEGER CHECK (gad7_total >= 0 AND gad7_total <= 21),

    -- Distress VAS (0-10)
    distress_vas    REAL CHECK (distress_vas >= 0 AND distress_vas <= 10),

    -- User experience
    burden_score    REAL CHECK (burden_score >= 0 AND burden_score <= 10),
    intrusiveness_score REAL CHECK (intrusiveness_score >= 0 AND intrusiveness_score <= 10),

    notes           TEXT DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_agt_session ON assessment_groundtruth(session_id);
CREATE INDEX IF NOT EXISTS idx_agt_participant ON assessment_groundtruth(participant_id);


-- Table 3: hidden_distress_events
-- Stores per-turn hidden distress detection results for Innovation Point 3
CREATE TABLE IF NOT EXISTS hidden_distress_events (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id      TEXT NOT NULL,
    turn_id         TEXT,
    created_at      TIMESTAMPTZ DEFAULT now(),

    -- HDI components
    sem_pos         REAL DEFAULT 0,
    obj_dist        REAL DEFAULT 0,
    self_report_norm REAL DEFAULT 0,
    gap_self        REAL DEFAULT 0,
    trend_worsening REAL DEFAULT 0,
    hdi             REAL DEFAULT 0,

    -- Classification
    risk_level      TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'moderate', 'high')),

    -- Explanation
    reason_json     JSONB DEFAULT '{}',

    -- Sub-components
    voice_component REAL DEFAULT 0,
    fatigue_component REAL DEFAULT 0,
    keystroke_component REAL DEFAULT 0,
    trend_component REAL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_hde_session ON hidden_distress_events(session_id);
CREATE INDEX IF NOT EXISTS idx_hde_risk ON hidden_distress_events(risk_level);
CREATE INDEX IF NOT EXISTS idx_hde_created ON hidden_distress_events(created_at);


-- ============================================
-- Auto-update timestamps (reuse pattern from existing migrations)
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.created_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';
