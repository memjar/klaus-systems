/**
 * Observer Auth — Self-hosted push authentication by AXE Technology.
 * Adapted for klaus.systems (CSS modules, green theme).
 *
 * Flow: POST /observer/start → poll /observer/check/{id} → phone approves → store device token
 * Backend proxy: klausimi-backend /observer/* → observer-auth :8001 /auth/*
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ── Storage Keys (consistent across all AXE products) ─────────────────────
export const OBSERVER_STORAGE = {
  DEVICE_ID: 'observer_device_id',
  AUTH_EXPIRY: 'observer_auth_expiry',
} as const

// ── Config ────────────────────────────────────────────────────────────────
export const OBSERVER_CONFIG = {
  AUTH_DURATION_MS: 7 * 24 * 60 * 60 * 1000, // 7 days
  POLL_INTERVAL_MS: 2000,
  SESSION_TIMEOUT_S: 300,
} as const

// ── Endpoints (all go through API_BASE proxy) ─────────────────────────────
export const OBSERVER_ENDPOINTS = {
  START: `${API_BASE}/observer/start`,
  CHECK: (sessionId: string) => `${API_BASE}/observer/check/${sessionId}`,
  SCAN: (sessionId: string) => `${API_BASE}/observer/scan/${sessionId}`,
  APP: `${API_BASE}/observer/app`,
} as const

// ── Helpers ───────────────────────────────────────────────────────────────

/** Check if device has a valid (non-expired) auth token */
export function isAuthenticated(): boolean {
  const deviceId = localStorage.getItem(OBSERVER_STORAGE.DEVICE_ID)
  const expiry = localStorage.getItem(OBSERVER_STORAGE.AUTH_EXPIRY)
  if (!deviceId || !expiry) return false
  return Date.now() < parseInt(expiry, 10)
}

/** Store auth credentials after successful approval */
export function storeAuth(deviceId: string): void {
  localStorage.setItem(OBSERVER_STORAGE.DEVICE_ID, deviceId)
  localStorage.setItem(
    OBSERVER_STORAGE.AUTH_EXPIRY,
    String(Date.now() + OBSERVER_CONFIG.AUTH_DURATION_MS)
  )
}

/** Clear auth (logout) */
export function clearAuth(): void {
  localStorage.removeItem(OBSERVER_STORAGE.DEVICE_ID)
  localStorage.removeItem(OBSERVER_STORAGE.AUTH_EXPIRY)
}
