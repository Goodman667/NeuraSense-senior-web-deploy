# Automated Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add push-to-deploy automation for the NeuraSense deployment snapshot repository using a self-hosted GitHub Actions runner on the production server.

**Architecture:** GitHub Actions runs on the production server via a self-hosted runner. The workflow checks out code, builds the frontend, syncs frontend and backend files into the live deployment directories, preserves live secrets/runtime data, restarts the backend service, and verifies health.

**Tech Stack:** GitHub Actions, self-hosted runner, bash, rsync, Python venv, systemd, nginx

---

### Task 1: Add workflow and deployment scripts

**Files:**
- Create: `.github/workflows/deploy.yml`
- Create: `scripts/deploy_self_hosted.sh`
- Create: `scripts/healthcheck.sh`

- [ ] Define workflow trigger on `push` to `main` and `workflow_dispatch`.
- [ ] Setup Node 22 and Python 3.12 in the workflow.
- [ ] Build frontend using `VITE_API_BASE=/api/v1`.
- [ ] Sync backend/frontend into live directories using `rsync`.
- [ ] Restart backend service and execute health checks.

### Task 2: Add operational documentation

**Files:**
- Create: `docs/AUTOMATED_DEPLOYMENT.md`
- Create: `docs/superpowers/specs/2026-05-05-automated-deployment-design.md`
- Create: `docs/superpowers/plans/2026-05-05-automated-deployment.md`

- [ ] Document architecture, trigger mode, preserved files, and troubleshooting commands.
- [ ] Record the design choice and current production assumptions.

### Task 3: Validate by real deployment

**Files:**
- Modify: repository state / GitHub Actions run history

- [ ] Push workflow to `main`.
- [ ] Confirm the self-hosted runner picks up the job.
- [ ] Verify the workflow succeeds.
- [ ] Verify `https://neura.ha7e.com/` and `/senior` remain healthy after deployment.
