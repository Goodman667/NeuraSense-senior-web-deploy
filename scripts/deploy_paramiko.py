#!/usr/bin/env python3
"""One-shot SSH deployment helper for local validation.

GitHub Actions uses scripts/deploy_ssh.sh with key-based auth.  This helper is
kept for manual smoke deployments from Windows environments where rsync/SSH key
setup is not available yet.  It reads credentials only from environment
variables and never stores them in the repository.
"""

from __future__ import annotations

import argparse
import fnmatch
import os
import posixpath
import stat
import sys
import time
from pathlib import Path

import paramiko


EXCLUDE_DIRS = {".venv", "__pycache__", "data"}
EXCLUDE_FILES = {".env"}
EXCLUDE_PATTERNS = ("*.pyc",)
RUNTIME_DATA_FILES = {
    "users.json",
    "sessions.json",
    "private_messages.json",
    "daily_checkins.json",
    "assessment_history.json",
    "community_posts.json",
    "user_profiles.json",
    "notifications.json",
    "tool_completions.json",
    "tool_favorites.json",
    "recommendation_log.json",
    "program_progress.json",
    "assessment_results.json",
    "senior_daily_summaries.json",
    "senior_help_events.json",
    "senior_memory.json",
    "senior_support_contacts.json",
    "senior_user_preferences.json",
    "senior_voice_interviews.json",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Deploy NeuraSense over SSH with paramiko")
    parser.add_argument("--workspace", default=str(Path(__file__).resolve().parents[1]))
    parser.add_argument("--host", default=os.environ.get("DEPLOY_HOST"))
    parser.add_argument("--user", default=os.environ.get("DEPLOY_USER", "root"))
    parser.add_argument("--password", default=os.environ.get("DEPLOY_PASSWORD"))
    parser.add_argument("--port", type=int, default=int(os.environ.get("DEPLOY_PORT", "22")))
    parser.add_argument("--target-root", default="/opt/neurasense-senior-web-deploy")
    parser.add_argument("--target-frontend", default="/var/www/neurasense")
    return parser.parse_args()


def should_skip_backend(path: Path, root: Path) -> bool:
    rel = path.relative_to(root)
    parts = set(rel.parts)
    if parts & EXCLUDE_DIRS:
        return True
    if path.name in EXCLUDE_FILES:
        return True
    return any(fnmatch.fnmatch(path.name, pattern) for pattern in EXCLUDE_PATTERNS)


def posix_join(*parts: str) -> str:
    return posixpath.join(*[p.strip("/") for p in parts if p]) if parts[0] != "/" else posixpath.join(*parts)


def mkdir_p(sftp: paramiko.SFTPClient, remote_dir: str) -> None:
    remote_dir = remote_dir.rstrip("/") or "/"
    stack: list[str] = []
    cur = remote_dir
    while cur not in {"", "/"}:
        try:
            sftp.stat(cur)
            break
        except FileNotFoundError:
            stack.append(cur)
            cur = posixpath.dirname(cur)
    for item in reversed(stack):
        try:
            sftp.mkdir(item)
        except OSError:
            pass


def upload_file(sftp: paramiko.SFTPClient, local: Path, remote: str) -> None:
    mkdir_p(sftp, posixpath.dirname(remote))
    sftp.put(str(local), remote)


def list_remote(sftp: paramiko.SFTPClient, remote_dir: str) -> dict[str, paramiko.SFTPAttributes]:
    try:
        return {item.filename: item for item in sftp.listdir_attr(remote_dir)}
    except FileNotFoundError:
        return {}


def remove_remote(sftp: paramiko.SFTPClient, remote_path: str) -> None:
    try:
        attrs = sftp.stat(remote_path)
    except FileNotFoundError:
        return
    if stat.S_ISDIR(attrs.st_mode):
        for item in sftp.listdir_attr(remote_path):
            remove_remote(sftp, posixpath.join(remote_path, item.filename))
        sftp.rmdir(remote_path)
    else:
        sftp.remove(remote_path)


def sync_tree(
    sftp: paramiko.SFTPClient,
    local_root: Path,
    remote_root: str,
    *,
    delete: bool,
    skip_runtime_data: bool = False,
    backend_root: Path | None = None,
) -> tuple[int, int]:
    uploaded = 0
    removed = 0
    mkdir_p(sftp, remote_root)

    for local in local_root.rglob("*"):
        if local.is_dir():
            continue
        if backend_root and should_skip_backend(local, backend_root):
            continue
        if skip_runtime_data and local.name in RUNTIME_DATA_FILES:
            continue
        rel = local.relative_to(local_root).as_posix()
        upload_file(sftp, local, posixpath.join(remote_root, rel))
        uploaded += 1

    if delete:
        local_files = {
            p.relative_to(local_root).as_posix()
            for p in local_root.rglob("*")
            if p.is_file()
            and not (backend_root and should_skip_backend(p, backend_root))
            and not (skip_runtime_data and p.name in RUNTIME_DATA_FILES)
        }
        remote_files: list[str] = []

        def walk_remote(base: str, rel_base: str = "") -> None:
            for name, attrs in list_remote(sftp, base).items():
                rel = f"{rel_base}/{name}".strip("/")
                full = posixpath.join(base, name)
                if stat.S_ISDIR(attrs.st_mode):
                    if backend_root and name in EXCLUDE_DIRS:
                        continue
                    walk_remote(full, rel)
                else:
                    remote_files.append(rel)

        walk_remote(remote_root)
        for rel in remote_files:
            if rel not in local_files:
                remove_remote(sftp, posixpath.join(remote_root, rel))
                removed += 1

    return uploaded, removed


def run(client: paramiko.SSHClient, command: str, timeout: int = 600) -> None:
    print(f"[remote] $ {command}")
    stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
    out = stdout.read().decode(errors="replace")
    err = stderr.read().decode(errors="replace")
    code = stdout.channel.recv_exit_status()
    if out.strip():
        print(out.rstrip())
    if err.strip():
        print(err.rstrip(), file=sys.stderr)
    if code != 0:
        raise RuntimeError(f"remote command failed with exit code {code}: {command}")


def main() -> None:
    args = parse_args()
    if not args.host or not args.password:
        raise SystemExit("DEPLOY_HOST and DEPLOY_PASSWORD are required for local paramiko deploy")

    workspace = Path(args.workspace).resolve()
    backend = workspace / "backend"
    frontend_dist = workspace / "frontend" / "dist"
    if not (backend / "requirements.txt").exists():
        raise SystemExit(f"missing backend requirements: {backend / 'requirements.txt'}")
    if not (frontend_dist / "index.html").exists():
        raise SystemExit(f"missing frontend build: {frontend_dist / 'index.html'}")

    target_backend = posixpath.join(args.target_root, "backend")

    print(f"[deploy:paramiko] connecting to {args.user}@{args.host}:{args.port}")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        hostname=args.host,
        username=args.user,
        password=args.password,
        port=args.port,
        timeout=20,
        banner_timeout=20,
        auth_timeout=20,
    )
    sftp = client.open_sftp()
    try:
        run(client, f"mkdir -p '{target_backend}' '{target_backend}/data' '{args.target_frontend}'")

        print("[deploy:paramiko] uploading backend application")
        uploaded, removed = sync_tree(
            sftp,
            backend,
            target_backend,
            delete=True,
            backend_root=backend,
        )
        print(f"[deploy:paramiko] backend uploaded={uploaded}, removed={removed}")

        data_dir = backend / "data"
        if data_dir.exists():
            print("[deploy:paramiko] uploading bundled backend data")
            uploaded, _ = sync_tree(
                sftp,
                data_dir,
                posixpath.join(target_backend, "data"),
                delete=False,
                skip_runtime_data=True,
            )
            print(f"[deploy:paramiko] data uploaded={uploaded}")

        print("[deploy:paramiko] uploading frontend dist")
        uploaded, removed = sync_tree(sftp, frontend_dist, args.target_frontend, delete=True)
        print(f"[deploy:paramiko] frontend uploaded={uploaded}, removed={removed}")

        remote_script = f"""
set -euo pipefail
TARGET_BACKEND='{target_backend}'
BACKEND_VENV="$TARGET_BACKEND/.venv"
if [ ! -x "$BACKEND_VENV/bin/python" ]; then
  if command -v uv >/dev/null 2>&1; then
    uv venv --python 3.11 "$BACKEND_VENV"
  else
    python3 -m venv "$BACKEND_VENV"
  fi
fi
if command -v uv >/dev/null 2>&1; then
  uv pip install --python "$BACKEND_VENV/bin/python" -r "$TARGET_BACKEND/requirements.txt"
else
  "$BACKEND_VENV/bin/pip" install --upgrade pip
  "$BACKEND_VENV/bin/pip" install -r "$TARGET_BACKEND/requirements.txt"
fi
systemctl restart neurasense-backend.service
sleep 5
curl --fail --silent --show-error --max-time 20 http://127.0.0.1:8000/health >/dev/null
curl --fail --silent --show-error --max-time 20 http://127.0.0.1/api/v1/health >/dev/null
curl --fail --silent --show-error --max-time 20 http://127.0.0.1/ >/dev/null
"""
        run(client, f"bash -lc {remote_script!r}", timeout=900)
    finally:
        sftp.close()
        client.close()

    print("[deploy:paramiko] waiting for public edge")
    time.sleep(3)


if __name__ == "__main__":
    main()
