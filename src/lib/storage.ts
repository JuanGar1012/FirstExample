import { TODO_STORAGE_KEY, coerceTodos } from "./todos";
import type { ActivityEntry, CompletedLogEntry, TodoAppState } from "../types/todo";

type TodoStoragePayloadV2 = {
  version: 2;
  todos: TodoAppState["todos"];
  sequence: number;
  completedLog: CompletedLogEntry[];
  activity: ActivityEntry[];
};

const CURRENT_USER_STORAGE_KEY = "todoapp:user:v1";

const DEFAULT_STATE: TodoAppState = {
  todos: [],
  sequence: 0,
  completedLog: [],
  activity: [],
};

function createDefaultState(): TodoAppState {
  return {
    todos: [],
    sequence: 0,
    completedLog: [],
    activity: [],
  };
}

function normalizeUsernameForKey(username: string): string {
  return username.trim().toLowerCase();
}

function coerceCompletedLog(raw: unknown): CompletedLogEntry[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const parsed: CompletedLogEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const candidate = item as Record<string, unknown>;
    if (
      typeof candidate.id === "string" &&
      typeof candidate.title === "string" &&
      typeof candidate.completedAt === "number" &&
      Number.isFinite(candidate.completedAt)
    ) {
      parsed.push({
        id: candidate.id,
        title: candidate.title.trim(),
        completedAt: candidate.completedAt,
      });
    }
  }

  return parsed
    .filter((entry) => entry.title.length > 0)
    .sort((a, b) => b.completedAt - a.completedAt);
}

function coerceActivity(raw: unknown): ActivityEntry[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const parsed: ActivityEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const candidate = item as Record<string, unknown>;
    if (
      typeof candidate.id === "string" &&
      typeof candidate.title === "string" &&
      typeof candidate.at === "number" &&
      Number.isFinite(candidate.at) &&
      (candidate.type === "added" ||
        candidate.type === "completed" ||
        candidate.type === "reopened" ||
        candidate.type === "deleted")
    ) {
      parsed.push({
        id: candidate.id,
        type: candidate.type,
        title: candidate.title.trim(),
        at: candidate.at,
      });
    }
  }

  return parsed
    .filter((entry) => entry.title.length > 0)
    .sort((a, b) => b.at - a.at)
    .slice(0, 200);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function coerceSequence(raw: unknown): number {
  return typeof raw === "number" && Number.isFinite(raw) ? raw : 0;
}

function parseState(raw: string | null): TodoAppState | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || typeof parsed.version !== "number") {
      return null;
    }

    if (parsed.version === 1 || parsed.version === 2) {
      return {
        todos: coerceTodos(parsed.todos),
        sequence: coerceSequence(parsed.sequence),
        completedLog: parsed.version === 2 ? coerceCompletedLog(parsed.completedLog) : [],
        activity: parsed.version === 2 ? coerceActivity(parsed.activity) : [],
      };
    }

    return null;
  } catch {
    return null;
  }
}

export function getTodoStorageKeyForUser(username: string): string {
  const normalized = normalizeUsernameForKey(username);
  return normalized ? `${TODO_STORAGE_KEY}:${normalized}` : TODO_STORAGE_KEY;
}

export function sanitizeUsername(username: string): string {
  return username.trim();
}

export function loadCurrentUsername(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(CURRENT_USER_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  const username = sanitizeUsername(raw);
  return username.length > 0 ? username : null;
}

export function saveCurrentUsername(username: string): void {
  if (typeof window === "undefined") {
    return;
  }

  const sanitized = sanitizeUsername(username);
  if (!sanitized) {
    return;
  }

  window.localStorage.setItem(CURRENT_USER_STORAGE_KEY, sanitized);
}

export function clearCurrentUsername(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
}

export function getEmptyTodoState(): TodoAppState {
  return createDefaultState();
}

export function loadTodoState(storageKey = TODO_STORAGE_KEY): TodoAppState {
  if (typeof window === "undefined") {
    return DEFAULT_STATE;
  }

  const direct = parseState(window.localStorage.getItem(storageKey));
  if (direct) {
    return direct;
  }

  if (storageKey !== TODO_STORAGE_KEY) {
    const legacy = parseState(window.localStorage.getItem(TODO_STORAGE_KEY));
    if (legacy) {
      return legacy;
    }
  }

  return DEFAULT_STATE;
}

export function saveTodoState(state: TodoAppState, storageKey = TODO_STORAGE_KEY): void {
  if (typeof window === "undefined") {
    return;
  }

  const payload: TodoStoragePayloadV2 = {
    version: 2,
    todos: state.todos,
    sequence: state.sequence,
    completedLog: state.completedLog,
    activity: state.activity,
  };

  window.localStorage.setItem(storageKey, JSON.stringify(payload));
}