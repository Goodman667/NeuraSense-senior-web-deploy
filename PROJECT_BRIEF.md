# NeuraSense - AI Mental Health Platform — Complete Project Documentation

> **Purpose: AI tool onboarding / Thesis background material / Development reference**
> Last updated: March 19, 2026

---

## 1. Project Overview

NeuraSense is a full-stack AI-powered mental health management platform (PWA + Flutter native app) that integrates:
- **AI Counseling Dialog** with stealth clinical assessment
- **Standardized Psychometric Scales** (PHQ-9, GAD-7, PSS, SAS, SDS, ISI, ASRS)
- **Multi-Modal Biosignal Monitoring** (eye tracking, voice analysis, keystroke dynamics)
- **JITAI (Just-In-Time Adaptive Interventions)** with a two-generation engine
- **Digital Phenotyping** via smartphone-as-sensor paradigm
- **Knowledge Graph Reasoning** for clinical inference
- **Live2D/3D Virtual Companion** with affective mirroring and respiratory entrainment
- **Structured Therapeutic Programs** and peer community

### Deployment

| Component | URL | Platform |
|-----------|-----|----------|
| Web Frontend (React PWA) | https://neurasense.cc | Vercel |
| Backend API | https://api.neurasense.cc/docs | Render |
| Database | — | Supabase (PostgreSQL) |
| Source Code | https://github.com/Goodman667/NeuraSense | GitHub |
| Mobile App (Flutter) | In development | Android/iOS |

---

## 2. Technology Stack

### 2.1 Web Frontend (React)

| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 19.x | UI framework (functional components + Hooks) |
| TypeScript | 5.6.2 | Type safety |
| Vite | 6.x | Build tool |
| Zustand | 4.4.7 | Global state management (user/gamification/onboarding) |
| TailwindCSS | 3.4.0 | Atomic CSS (custom color systems: warm/primary/calm) |
| Three.js + React Three Fiber | ~0.182 / ~9.4 | 3D immersive scenes (breathing sphere, biofeedback forest) |
| Pixi.js + pixi-live2d-display | 6.5.10 / 0.4.0 | Live2D virtual avatar (Kei model, Cubism 4 SDK) |
| Recharts | 2.12.7 | Data charts (PHQ-9 trends, emotion radar) |
| MediaPipe Face Mesh | 0.4.x | Eye tracking (EAR algorithm, PERCLOS fatigue detection) |
| vite-plugin-pwa + Workbox | — | PWA / Service Worker / offline caching |
| Framer Motion | 12.x | Animations |

### 2.2 Mobile Frontend (Flutter)

| Technology | Version | Purpose |
|-----------|---------|---------|
| Flutter | 3.x | Cross-platform mobile framework |
| Riverpod | — | State management |
| GoRouter | — | Declarative routing |
| Rive | — | Vector animations (Aurora Flow character) |
| Dio / http | — | HTTP networking |

### 2.3 Backend

| Technology | Version | Purpose |
|-----------|---------|---------|
| FastAPI | 0.124.4 | Web framework (async, DDD architecture) |
| Uvicorn | 0.38.0 | ASGI server |
| Python | 3.11+ | Runtime |
| Supabase Python SDK | 2.5.0 | Primary database (PostgreSQL) |
| Neo4j | 6.0.3 | Knowledge graph (optional, rule engine fallback) |
| ZhipuAI SDK (GLM-4-Flash) | 2.1.5 | LLM for dialog/assessment/interpretation |
| scikit-learn | 1.8.0 | Trend prediction (RandomForest + LinearRegression) |
| NumPy / SciPy | 2.3.5 / 1.16.3 | Scientific computing |
| OpenCV | 4.11.0 | Clock Drawing Test image scoring |
| Edge-TTS | 7.2.7 | Chinese TTS (Microsoft) |
| ReportLab | 4.4.6 | PDF assessment report generation |

---

## 3. System Architecture

```
                         ┌─────────────────────────────────┐
                         │     User Device (Browser/App)    │
                         └──────────┬───────────┬──────────┘
                                    │           │
              ┌─────────────────────▼─┐  ┌──────▼──────────────────┐
              │  Vercel (neurasense.cc)│  │  Flutter App (native)   │
              │  React 19 SPA + PWA   │  │  Rive animations        │
              │  ┌──────────────────┐ │  │  Riverpod state mgmt    │
              │  │ Biosignal Hooks  │ │  └──────────┬──────────────┘
              │  │ • Eye tracking   │ │             │
              │  │ • Voice analysis │ │             │
              │  │ • Keystroke dyn. │ │             │
              │  │ • Health Connect│ │              │
              │  └────────┬─────────┘ │             │
              └───────────┼───────────┘             │
                          │    REST API (HTTPS)      │
                          └──────────┬───────────────┘
                                     │
              ┌──────────────────────▼──────────────────────┐
              │     Render (api.neurasense.cc)               │
              │     FastAPI + Uvicorn                        │
              │                                              │
              │  ┌──────────────────────────────────────┐   │
              │  │          Core AI Services              │   │
              │  │  • Stealth PHQ-9 (Dual-role CoT)     │   │
              │  │  • JITAI Engine v1 + v2               │   │
              │  │  • Multi-modal Emotion Fusion         │   │
              │  │  • Digital Phenotyping Engine          │   │
              │  │  • Trend Prediction (RF+LR)           │   │
              │  │  • Clock Drawing Test Scorer           │   │
              │  │  • Dual-Modality Validation            │   │
              │  │  • Knowledge Graph Reasoning           │   │
              │  └──────────────────────────────────────┘   │
              └──────┬──────────┬──────────┬────────────────┘
                     │          │          │
         ┌───────────▼┐  ┌─────▼─────┐  ┌─▼────────────┐
         │ Supabase   │  │ ZhipuAI   │  │ Neo4j        │
         │ PostgreSQL │  │ GLM-4     │  │ (optional)   │
         │ (primary)  │  │ Flash/4V  │  │ Knowledge    │
         └────────────┘  └───────────┘  │ Graph        │
                                        └──────────────┘
```

---

## 4. Core Algorithm Implementations (Detailed)

### 4.1 Stealth PHQ-9 Assessment (`stealth_phq9.py`, 2165 lines)

**Concept**: Embedded clinical depression screening within natural conversation, invisible to the user.

**Dual-Role Chain-of-Thought (CoT) Prompting**:
- **Role A (User-facing)**: Warm Rogerian counselor — unconditional positive regard, 2-3 sentence empathetic responses, never mentions "assessment" or "scoring"
- **Role B (Hidden)**: Clinical evaluator — analyzes user input against PHQ-9's 9 symptom dimensions, outputs structured JSON scores

**PHQ-9 Dimensions Tracked**:
1. Anhedonia (loss of interest)
2. Depressed mood
3. Sleep disturbance
4. Fatigue
5. Appetite change
6. Low self-worth
7. Concentration difficulty
8. Psychomotor changes
9. Suicidal ideation [CRITICAL]

**Scoring Protocol**:
- Each dimension: 0-3 scale (0=not at all, 1=several days, 2=more than half days, 3=nearly every day)
- Update strategy: **highest-score-wins** — new scores only overwrite if higher
- Evidence accumulation across multiple dialog turns
- Total: 0-27, mapped to severity levels (none/mild/moderate/moderately severe/severe)

**Crisis Detection**:
- **Trie-based keyword detection** (O(n) complexity) for 30+ Chinese & English self-harm keywords
- Immediate crisis response with hotline numbers when triggered

**LLM Output Format**:
```json
{
  "thought_process": "Chain-of-thought reasoning",
  "phq9_updates": [{"symptom_id": 4, "score": 3, "confidence": "high"}],
  "risk_flag": false,
  "reply_to_user": "Empathetic response"
}
```

**Fallback**: Rule-based keyword matching + severity adverb detection when LLM is unavailable

---

### 4.2 JITAI Engine — Two Generations

#### Generation 1: Vulnerability-Score Engine (`jitai/engine.py`, 422 lines)

**Vulnerability Score Calculation**:
```
V = w1×EMA_mood + w2×Stressors + w3×BioFatigue + w4×JournalEmotion + w5×ScaleTrend + w6×TimeRisk

Weights: EMA(25%), Stressors(15%), BioFatigue(20%), Journal(15%), ScaleTrend(15%), Time(10%)

Feature transformations:
- EMA mood: (10 - mood) / 9  → reverse-scored
- Stressors: min(count/5, 1.0)
- BioFatigue: fatigue_index (0-1)
- Time risk: elevated during late night (22:00-02:00) and early morning (06:00-10:00)
```

**Risk Levels**: HIGH (>=0.7), MEDIUM (>=0.4), LOW (<0.4)

**Intervention Selection**: Emotion-driven → Time-driven → Activity-driven rules
- 4 types: BREATHING, CBT, GRATITUDE, COMMUNITY

#### Generation 2: Rule-Based Recommendation Engine (`recommendation.py`, 523 lines)

**5-Tier Priority System**:
| Tier | Priority | Trigger |
|------|----------|---------|
| CRISIS | 0 | Self-harm indicators |
| ACUTE | 1 | High stress + low mood |
| PREVENTIVE | 2 | Worsening trends |
| MAINTENANCE | 3 | Regular practice |
| DEFAULT | 4 | General wellness |

**Tailoring Variables**:
- Check-in data (mood, stress, energy, sleep_quality)
- Temporal context (hour, period, day_of_week, is_weekend)
- 7-day trends (mood_avg, stress_avg, mood_slope, direction)
- Engagement history (days_since_last_completion, tools_completed_7d)

**Condition Engine**: Supports nested AND/OR/NOT boolean logic with operators (<, <=, >, >=, ==, !=, in, between)

**10 Core Rules** (configurable via `jitai_rules.json`):
- R001: High stress + low mood → DBT STOP, TIPP (priority 900)
- R002: High stress → Breathing 4-7-8, PMR (800)
- R003: Low mood → Thought record, 3 good things (750)
- R004: Poor sleep → 54321 grounding (770)
- R005: Low energy → 1-min mindfulness (600)
- R006: Late night → 54321 sleep aid (650)
- R007: Worsening trend → STOP, thought record (850)
- R008: Engagement gap → 1-min mindfulness (300)
- R009: Moderate anxiety → Worry time, box breathing (500)
- R010: All good → 3 good things, maintenance mindfulness (200)

**Proximal Outcome Tracking**: Records delivery → opened → completed/dismissed lifecycle with post-intervention mood and helpfulness ratings

---

### 4.3 Multi-Modal Biosignal Collection (Frontend Hooks)

#### Eye Tracking (`useOculometricSensor.ts`, 734 lines)
- **Technology**: MediaPipe Face Mesh (468 facial landmarks)
- **EAR (Eye Aspect Ratio)**: `EAR = (dist(p2,p6) + dist(p3,p5)) / (2 * dist(p1,p4))`
- **Blink State Machine** (Hysteresis Thresholding):
  - OPEN → BLINKING: EAR < 0.25 for 3 consecutive frames
  - BLINKING → OPEN: EAR >= 0.30
- **PERCLOS**: Sliding window 1800 frames (60s @ 30fps)
  - `drowsinessIndex = (closed_frames / total_frames) * 100%`
- **Fatigue Levels**: NORMAL (<15%), MILD (15-30%), MODERATE (30-50%), SEVERE (>50%)
- **Output**: leftEAR, rightEAR, avgEAR, blinkCount, blinkRate(BPM), drowsinessIndex, fatigueLevel

#### Voice Analysis (`useVoiceAnalyzer.ts`, 380 lines)
- **Technology**: AudioWorklet (Web Audio API)
- **Features extracted**:
  - Fundamental frequency (pitch, Hz)
  - Jitter (period-to-period variation, ms) → anxiety/fatigue proxy
  - Shimmer (amplitude variation, dB) → stress proxy
  - Speech/silence detection (RMS threshold)
  - Speaking/silence duration ratio
- **Derived metrics**: jitterPercent, shimmerPercent, speechActivityLevel

#### Keystroke Dynamics (`useKeystrokeDynamics.ts`, 379 lines)
- **Raw metrics**: flight time, dwell time, backspace rate, pause frequency
- **Anxiety Index** (0-100):
  ```
  = flightVariance/10000 * 0.3 * 30
  + dwellVariance/5000  * 0.2 * 30
  + errorRate           * 0.3 * 5
  + pauseFrequency      * 0.3 * 10
  ```
- **Focus Score** (0-100): consistency(40%) + speed(30%) + rhythm regularity(30%)

#### Biosignal Aggregator (`useBioSignalAggregator.ts`, 312 lines)
- **Aggregation window**: 5 seconds
- **Strategy**: Moving average across high-frequency samples (60fps eye, 100Hz audio)
- **Output**: avg_blink_rate, avg_ear, fatigue_index, voice_jitter, shimmer, sample_count

---

### 4.4 Multi-Modal Emotion Fusion (`emotion/fusion.py`, 378 lines)

**Smiling Depression Detection** — Key differentiator:
```
Condition: verbal_content = POSITIVE/NEUTRAL  AND  voice_depression_index >= 2.0
→ Flag: Possible masked depression

Voice Depression Index = Σ [
  low_speech_rate(1.0) +        // < 100 wpm
  high_pause_ratio(1.0) +       // > 0.35
  low_energy(1.5) +             // < 0.3 (highest weight)
  low_pitch(0.5) +              // < 100 Hz
  long_pauses(0.5)              // > 0.8s
]
Maximum = 4.5
```

**Risk Levels**:
- HIGH: depression_index >= 3.5 with positive verbal content
- MODERATE: depression_index >= 2.5 with positive verbal content
- LOW: depression_index >= 2.0 with positive verbal content

**Text Sentiment**: Keyword-based positive/negative counting (simplified; production would use NLP models)

---

### 4.5 Dual-Modality Validation (`validation/dual_modality.py`, 317 lines)

Compares subjective (self-report questionnaires) vs objective (biosignal) indicators:

**Subjective Index** = PHQ-9(40%) + GAD-7(30%) + SDS(15%) + SAS(15%)
**Objective Index** = voice_stress(25%) + fatigue(15%) + attention(15%) + keystroke_anxiety(20%) + keystroke_focus(10%) + stroop_cognition(15%)

**Risk Classification**:
| Discrepancy | Condition | Tag |
|-------------|-----------|-----|
| <= 20 | — | CONSISTENT |
| > 20 | low subjective, high objective | HIDDEN_ANXIETY |
| > 20 | high subjective, low objective | OVER_REPORTING |
| > 20 | other | ATTENTION_NEEDED |

---

### 4.6 Digital Phenotyping (`phenotyping/feature_engine.py`, 101 lines)

**9-Dimensional Feature Vector**:
1. `hrv_normalized` — Heart rate variability / baseline
2. `sleep_efficiency_proxy` — min(1.0, sleep_minutes / 480)
3. `log_steps` — np.log1p(step_count)
4. `hr_volatility` — std(heart_rate_series)
5. `voice_stress` — jitter * 10
6. `fatigue_level` — fatigue_index direct
7. `psychomotor_agitation` — keystroke_variability
8. `mood_avg` — EMA mood / 10.0
9. `stress_count` — stressors / 5.0

**Derived Wellness Metrics** (frontend `useDigitalPhenotyping.ts`):
- `activityEntropy` = Shannon entropy of HRV distribution
- `physiologicalStressIndex` = 1 - (HRV/baseline + 0.5)
- `socialExposureProxy` = steps/10k * 0.6 + activity_min/60 * 0.4
- `overallWellbeingScore` = sleep(0.25) + activity(0.20) + stress(0.25) + mood(0.30)

---

### 4.7 Trend Prediction (`prediction/trend_predictor.py`, 286 lines)

**Model**: Ensemble of Random Forest (n=50, depth=5) and Linear Regression
**Fusion**: `prediction = 0.7 * RF + 0.3 * LR`

**Feature Engineering** (7 features):
1. Previous PHQ-9 score
2. PHQ-9 delta (change from prior)
3. Voice stress level
4. Keystroke anxiety index
5. Time progress
6. Historical mean
7. Historical std

**Output**: 7-day PHQ-9 prediction curve + 95% confidence interval + trend direction (improving/stable/worsening) + risk level

**Confidence**: `base = min(1.0, n_points/10) * 0.8 + modality_bonus(0.1*voice + 0.1*keystroke)`

---

### 4.8 Clock Drawing Test Scorer (`scoring/clock_scorer.py`, 617 lines)

**Scoring System** (Rouleau simplified, 0-3):
1. Clock face (0/1): Circle completeness
2. Numbers (0/1): All 1-12 present, evenly distributed
3. Hands (0/1): Two hands pointing to 11:10

**Method 1 (Primary)**: ZhipuAI GLM-4V visual model analysis
**Method 2 (Fallback)**: OpenCV pipeline — grayscale → Gaussian blur → adaptive threshold → Hough circles → Hough lines → contour analysis

---

### 4.9 Knowledge Graph Reasoning (`knowledge/`)

**Graph Service** (`graph_service.py`, 500 lines):
- Neo4j Cypher queries: Symptom → Disease → Treatment paths
- 9 symptom types, 3+ disease types (MDD, GAD, Hypothyroidism)
- N-hop path traversal

**Clinical Logic** (`clinical_logic.py`):
- Weighted path scoring: `Score(D) = Σ Weight × Severity`
- Urgent symptom detection (suicidal ideation, hallucinations)
- Fallback: Python dictionary-based symptom-disease mapping

---

### 4.10 Embodied Avatar System

**Live2D Virtual Avatar** (`VirtualAvatar.tsx`, 163KB):
- Model: Kei (Cubism 4)
- Lip sync: TTS-driven random ParamMouthOpenY (0.3-0.8) at 100ms intervals
- Eye tracking: Mouse position → ParamAngleX/Y (-30 to +30 degrees)
- Emotion system: 8 emotions mapped to facial parameters (ParamBrowLY, ParamMouthForm, etc.)

**Embodied Avatar** (`EmbodiedAvatar.tsx`, 428KB):
- **Respiratory Entrainment**: BreathingController — sinusoidal wave, 4-phase cycle (inhale 40%, hold 10%, exhale 40%, rest 10%), 4-10 BPM adjustable
- **Affective Mirroring**: AffectiveMirror — gradually guides user expression from mirrored state to calm target over 60-300 seconds
- Inputs: fatigue_index, jitter, blink_rate, is_speaking

---

### 4.11 Unified Chat API Pipeline

```
User Message + Biosignals (blink_rate, voice_jitter, fatigue_index)
    │
    ▼
POST /api/v1/chat → unified_chat.py
    │
    ├── asyncio.gather (parallel):
    │   ├── LLM Stealth PHQ-9 (generate reply + update 9-dimension scores)
    │   └── Neo4j Graph Reasoning (symptoms → potential disorders)
    │
    ▼
Aggregated result → reply_text + avatar_command
                     ├── emotion (calm/sad/neutral/anxious)
                     ├── breathing_bpm
                     └── enable_entrainment
    │
    ▼
Frontend: Render AI reply + Drive Live2D Avatar + Breathing guide
```

---

## 5. Module Implementation Status

### Fully Implemented (Production-Ready)

| Module | Key Technical Detail |
|--------|---------------------|
| Stealth PHQ-9 Assessment | Dual-role CoT + Trie crisis detection + highest-score-wins accumulation |
| JITAI v1 Engine | 6-feature weighted vulnerability scoring + emotion/time/activity-driven selection |
| JITAI v2 Recommendation Engine | 5-tier rule priority + tailoring variables + proximal outcome tracking |
| Emotion Fusion | Smiling depression detection (text-voice cross-modal inconsistency) |
| Dual-Modality Validation | Subjective-objective discrepancy analysis (hidden anxiety detection) |
| Trend Prediction | RF+LR ensemble, 7-day PHQ-9 forecast with confidence intervals |
| Clock Drawing Test | AI vision (GLM-4V) + OpenCV fallback, Rouleau scoring |
| Eye Tracking Hook | MediaPipe EAR + PERCLOS + hysteresis blink state machine |
| Voice Analysis Hook | Jitter/Shimmer/pitch extraction via AudioWorklet |
| Keystroke Dynamics Hook | Anxiety index + focus score from typing patterns |
| Biosignal Aggregator | 5-second sliding window multi-modal signal fusion |
| Digital Phenotyping | 9-dimensional feature vector from passive + active + biometric sources |
| Live2D Avatar | Cubism 4 Kei model with lip sync, emotion mapping, eye tracking |
| 3D Breathing Guide | Sinusoidal 4-phase respiratory entrainment (4-10 BPM) |
| Affective Mirroring | Gradual emotional state guidance from mirrored to calm target |
| Psychometric Scales | PHQ-9/GAD-7/PSS/SAS/SDS with AI interpretation + PDF export |
| AI Counselor Dialog | Rogerian approach + TTS + emotion tagging + crisis keyword detection |
| TTS | Edge-TTS, 5 voices, 6 emotion styles |
| PDF Reports | ReportLab with Chinese font support |
| Knowledge Graph | Neo4j Cypher + Python fallback mapping |
| Gamification | Streak tracking + points + achievement badges + leaderboard |
| Community | Posts/replies/likes/private messages/rankings |
| PWA | Service Worker + offline caching + install prompt |

### Thesis-Specific Additions (Innovation Points 1 & 3)

These modules were added specifically for the thesis research and are fully implemented:

| Module | File | Purpose |
|--------|------|---------|
| Sensor Quality Estimator | `assessment/sensor_quality_estimator.py` | Weighted tri-modality quality gating Q(t): eye 0.35, voice 0.35, keystroke 0.30 |
| Multimodal Evidence Encoder | `assessment/multimodal_evidence_encoder.py` | Maps biosignals to PHQ-9 item support scores (items 3, 4, 7, 8 only) |
| Confidence Calibrator | `assessment/confidence_calibrator.py` | Sigmoid-based confidence with per-item thresholds; gates score updates |
| Embedded Assessment Service | `assessment/embedded_assessment_service.py` | Core orchestrator: fuses text + bio evidence per Eq(1), supports C1/C2/C3 experimental conditions |
| Hidden Distress Index | `emotion/hidden_distress_index.py` | HDI computation per Eq(5): `HDI = max{0, z_obj - z_sem} + η·max{0, z_obj - z_self}` |
| Discordance Reasoner | `validation/discordance_reasoner.py` | Rule-based explanation generator: 7 signal detections + 6 reason templates |
| Innovation Logger | `database/innovation_logger.py` | Supabase persistence for assessment evidence and HDI events |
| Evaluation Scripts | `scripts/eval_*.py` | Offline evaluation: weighted kappa, MAE, AUC, Brier score, macro-F1 |

**Key design constraints:**
- PHQ-9 item 9 (suicidal ideation) is **never** updated by biosignals
- Low sensor quality triggers deterministic fallback to text-only mode
- Three experimental conditions: C1 (text-only), C2 (full multimodal), C3 (ablation without quality gating)
- All outputs are non-diagnostic screening estimates, not clinical diagnoses

### Partially Implemented (Prototype/Proof-of-Concept)

| Module | Current State | Limitation |
|--------|--------------|------------|
| Facial Emotion Detection | Camera access + UI complete | Core detection uses **weighted random simulation**, not real ML |
| Text Sentiment in Fusion | Keyword matching | Not proper NLP model, limited vocabulary |
| Voice Feature Accuracy | AudioWorklet pipeline complete | Precision limited, reference values only |
| Phenotyping Predictor | RandomForest model exists | Trained on **synthetic random data**, needs real user data |
| Vector Memory | Hash-based pseudo-embedding | Not real sentence-transformer, JSON storage |
| Knowledge Graph Scale | 3 diseases, 9 symptoms | DSM-5 coverage extremely low, static weights |

### Flutter App Status (~30% Complete)

| Feature | Status |
|---------|--------|
| Aurora Flow theme + Rive animations | Done |
| Today page (daily check-in) | Done |
| Chat page (AI counselor) | Done |
| Me page (profile) | Done |
| Bottom navigation | Done |
| Assessment center | In development |
| Toolbox / Programs / Journal | In development |
| Biosignal collection | Not started |
| Eye/voice/keystroke tracking | Not started (platform limitations) |

---

## 6. Database Schema (Supabase PostgreSQL)

| Table | Key Fields | Purpose |
|-------|-----------|---------|
| `users` | id, username, nickname, password_hash, created_at | User accounts |
| `assessment_records` | user_id, scale_type, total_score, answers, severity, ai_interpretation | Scale history |
| `journal_entries` | user_id, content, mood_tags, created_at | Mood diary |
| `ema_records` | user_id, mood, stress, energy, sleep, context | EMA check-ins |
| `checkin_records` | user_id, mood, stress, energy, sleep, date | Daily check-ins |
| `programs` | id, title, description, category, duration_days, difficulty | Course metadata |
| `program_days` | program_id, day_number, title, learn_text, tool_id, video_url | Course sessions |
| `user_programs` | user_id, program_id, current_day, started_at, completed_at | Course progress |
| `tool_items` | id, name, category, icon, description, is_active | Toolbox entries (41 items) |
| `community_posts` | user_id, content, likes, category, is_anonymous | Community posts |
| `community_messages` | sender_id, receiver_id, content, read_at | Private messages |
| `onboarding_data` | user_id, completed, goals, preferences, completed_at | Onboarding state |
| `user_memory` | user_id, content, embedding_hash, created_at | Dialog memory |
| `notifications` | user_id, type, content, read, created_at | Notifications |
| `recommendation_log` | user_id, tool_id, status, post_mood, helpfulness | JITAI v2 tracking |
| `assessment_turn_evidence` | session_id, turn_id, user_id, text_evidence_json, biosignal_snapshot_json, sensor_quality_json, contradiction_json, confidence_json, updated_item_scores_json, total_score, mode, condition, fallback_reasons_json | Per-turn multimodal assessment log (Innovation 1) |
| `hidden_distress_events` | session_id, turn_id, sem_pos, obj_dist, gap_self, hdi, risk_level, reason_json, voice/fatigue/keystroke/trend components | Per-turn HDI detection results (Innovation 3) |
| `assessment_groundtruth` | session_id, participant_id, phq9_total, phq9_items_json, gad7_total, distress_vas, burden_score, intrusiveness_score | Post-session explicit questionnaire (pilot study reference) |

---

## 7. API Endpoints (16 Routers, 50+ Endpoints)

### Core AI Endpoints
```
POST /api/v1/chat                                Unified dialog (message + biosignals → reply + avatar cmd)
POST /api/v1/counselor/chat                      Direct AI counselor dialog
POST /api/v1/assessment/stealth/chat             Stealth PHQ-9 dialog assessment
GET  /api/v1/assessment/stealth/{id}/summary     Assessment summary
POST /api/v1/emotion/analyze                     Multi-modal emotion analysis
POST /api/v1/biosignal/analyze                   Multi-modal biosignal AI analysis
POST /api/v1/assessments/cdt/score               Clock Drawing Test scoring
POST /api/v1/jitai/engine                        JITAI v1 vulnerability computation
GET  /api/v1/checkins/recommendations/today      JITAI v2 personalized recommendations
POST /api/v1/prediction/trend                    7-day PHQ-9 trend prediction
POST /api/v1/validation/compare                  Dual-modality validation
POST /api/v1/graph/symptoms                      Knowledge graph symptom query
GET  /api/v1/graph/inference/{user_id}           Graph-based disease reasoning
```

### Data & Utility Endpoints
```
POST /api/v1/auth/register|login|logout          Authentication (JWT)
GET  /api/v1/auth/wechat                         WeChat OAuth
POST /api/v1/tts                                 Text-to-speech (Edge-TTS)
POST /api/v1/report/pdf                          PDF report generation
/api/v1/checkin/*                                Daily check-ins
/api/v1/programs/*                               Therapeutic programs
/api/v1/tools/*                                  Toolbox CRUD
/api/v1/journal/*                                Mood diary
/api/v1/ema/*                                    EMA records
/api/v1/community/*                              Community features
/api/v1/phenotyping/*                            Digital phenotyping
/api/v1/profile/*                                User profile
/api/v1/memory/*                                 Dialog memory
/api/v1/notifications/*                          Notifications
```

---

## 8. Key Data Flows

### 8.1 JITAI v2 Decision Flow
```
Daily Check-in (mood/stress/energy/sleep)
    │
    ▼
GET /recommendations/today
    │
    ├── Build Tailoring Variable Context:
    │   ├── checkin: {mood, stress, energy, sleep_quality}
    │   ├── context: {hour, period, day_of_week, is_weekend}
    │   ├── trend: {mood_avg_7d, stress_avg_7d, mood_slope, direction}
    │   └── engagement: {days_since_last, tools_completed_7d}
    │
    ├── Evaluate 10 Rules (nested AND/OR/NOT conditions)
    │   → Sort by (tier_rank ASC, priority DESC)
    │   → Deduplicate by tool_id
    │
    ├── Return: recommended_tools[] + task + matched_rules[]
    │
    ▼
User completes/dismisses tool
    │
    ▼
POST /recommendations/outcome
    ├── status: opened → completed/dismissed/abandoned
    ├── duration_sec, post_mood, helpfulness
    └── Stored in recommendation_log for future iteration
```

### 8.2 Multi-Modal Sensing → Dialog Pipeline
```
                     ┌── Eye: MediaPipe (60fps) ──┐
                     │                              │
User Interaction ────┼── Voice: AudioWorklet ───────┼── Aggregator (5s) ──┐
                     │                              │                      │
                     └── Keyboard: keydown/up ──────┘                      │
                                                                           │
                              User types message ─────────────────────────┤
                                                                           │
                                                                           ▼
                                                              POST /api/v1/chat
                                                                    │
                                              ┌─────────────────────┼─────────────────┐
                                              │                     │                   │
                                     Stealth PHQ-9          Graph Reasoning      Emotion Fusion
                                     (CoT + LLM)           (Neo4j/fallback)    (text + voice)
                                              │                     │                   │
                                              └─────────────────────┼───────────────────┘
                                                                    │
                                                                    ▼
                                                         {reply, avatar_cmd,
                                                          risk_flag, phq9_scores}
```

---

## 9. Environment Variables

**Backend (Render)**:
```
ZHIPU_API_KEY=          # Required — ZhipuAI API key
SUPABASE_URL=           # Required — Supabase project URL
SUPABASE_SERVICE_KEY=   # Required — service_role key
JWT_SECRET=             # Required — JWT signing secret
NEO4J_URI=              # Optional — bolt://...
NEO4J_USER=             # Optional
NEO4J_PASSWORD=         # Optional
WECHAT_APP_ID=          # Optional
WECHAT_APP_SECRET=      # Optional
```

**Frontend (Vercel)**:
```
VITE_API_BASE=https://api.neurasense.cc/api/v1
```

---

## 10. Technical Constraints

- **Web Frontend**: React 19 + TypeScript + Vite + TailwindCSS (fixed)
- **Mobile Frontend**: Flutter 3.x + Riverpod (fixed)
- **Backend**: FastAPI + Python 3.11+ (fixed)
- **Primary Database**: Supabase PostgreSQL
- **LLM**: ZhipuAI GLM-4-Flash (env: `ZHIPU_API_KEY`)
- **Deployment**: Frontend on Vercel, Backend on Render (auto-deploy main branch)
- **API**: RESTful, CORS allow all origins
- **Auth**: JWT token via URL parameter `?token=` or Authorization header

---

## 11. Research Directions & References

| Research Direction | Project Module | Key References |
|-------------------|---------------|----------------|
| mHealth Applications | PWA + Flutter + full feature set | Linardon et al., 2020, *World Psychiatry* |
| JITAI | JITAI v1 + v2 engines | Nahum-Shani et al., 2018, *Health Psychology* |
| LLM in Clinical Assessment | Stealth PHQ-9 (dual-role CoT) | Wei et al., 2022, *NeurIPS* (CoT Prompting) |
| Digital Phenotyping | Feature engine + biosignal hooks | Onnela & Rauch, 2016, *Neuropsychopharmacology* |
| Multimodal Affective Computing | emotion/fusion.py + biosignal panel | Poria et al., 2017, *Information Fusion* |
| Smiling Depression Detection | Dual-modality validation | Rnic et al., 2023, *Clinical Psychology Review* |
| Knowledge Graph Reasoning | clinical_logic.py + Neo4j | Edge et al., 2024, *arXiv* (GraphRAG) |
| Respiratory Entrainment | BreathingController + EmbodiedAvatar | Russo et al., 2017, *Frontiers in Human Neuroscience* |
| Clock Drawing Test | DrawingCanvas + clock_scorer.py | Shulman, 2000, *Int. J. Geriatric Psychiatry* |
| Gamification in Mental Health | Streak/points/achievements | Johnson et al., 2016, *Computers in Human Behavior* |
