// profile-resolver.mjs (ESM)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function getUserDataDir(channel = 'stable') {
  const platform = os.platform();
  const home = os.homedir();

  if (platform === 'darwin') {
    const base = path.join(home, 'Library', 'Application Support', 'Google');
    if (channel === 'beta') return path.join(base, 'Chrome Beta');
    if (channel === 'canary') return path.join(base, 'Chrome Canary');
    if (channel === 'dev') return path.join(base, 'Chrome Dev');
    return path.join(base, 'Chrome'); // stable
  }

  if (platform === 'win32') {
    const local = process.env.LOCALAPPDATA;
    const base = path.join(local, 'Google', 'Chrome');
    if (channel === 'beta') return path.join(base, 'User Data Beta');
    if (channel === 'canary') return path.join(base, 'User Data SxS');
    if (channel === 'dev') return path.join(base, 'User Data Dev');
    return path.join(base, 'User Data'); // stable
  }

  // Linux（若用 Chromium 請自行調整）
  const config = process.env.XDG_CONFIG_HOME || path.join(home, '.config');
  if (channel === 'beta') return path.join(config, 'google-chrome-beta');
  if (channel === 'unstable' || channel === 'canary') return path.join(config, 'google-chrome-unstable');
  if (channel === 'dev') return path.join(config, 'google-chrome-unstable');
  return path.join(config, 'google-chrome'); // stable
}

export function findProfileDirByEmail(email, { channel = 'stable' } = {}) {
  const userDataDir = getUserDataDir(channel);
  const localStatePath = path.join(userDataDir, 'Local State');

  // 先從 Local State 嘗試
  try {
    const raw = fs.readFileSync(localStatePath, 'utf8');
    const j = JSON.parse(raw);
    const info = j?.profile?.info_cache || j?.profile?.profiles || {};
    for (const [dirName, meta] of Object.entries(info)) {
      const hay = JSON.stringify(meta).toLowerCase();
      if (hay.includes(email.toLowerCase())) {
        return { userDataDir, profileDirectory: dirName };
      }
    }
  } catch (_) {}

  // 掃描常見 Profile 資料夾的 Preferences
  const candidates = ['Default', ...Array.from({ length: 20 }, (_, i) => `Profile ${i + 1}`)];
  for (const dirName of candidates) {
    const pref = path.join(userDataDir, dirName, 'Preferences');
    try {
      const txt = fs.readFileSync(pref, 'utf8').toLowerCase();
      if (txt.includes(email.toLowerCase())) {
        return { userDataDir, profileDirectory: dirName };
      }
    } catch (_) {}
  }

  return null; // 找不到
}
