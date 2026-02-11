import { TODO_STORAGE_KEY, coerceTodos } from "./todos";
import type { ActivityEntry, CompletedLogEntry, TodoAppState } from "../types/todo";

type TodoStoragePayloadV2 = {
  version: 2;
  todos: TodoAppState["todos"];
  sequence: number;
  completedLog: CompletedLogEntry[];
  activity: ActivityEntry[];
};

type LegacyPayloadV1 = {
  version: 1;
  todos: unknown;
  sequence: unknown;
};

const DEFAULT_STATE: TodoAppState = {
  todos: [],
  sequence: 0,
  completedLog: [],
  activity: [],
};

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

export function loadTodoState(): TodoAppState {
  if (typeof window === "undefined") {
    return DEFAULT_STATE;
  }

  const raw = window.localStorage.getItem(TODO_STORAGE_KEY);
  if (!raw) {
    return DEFAULT_STATE;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || typeof parsed.version !== "number") {
      return DEFAULT_STATE;
    }

    if (parsed.version === 1) {
      return {
        todos: coerceTodos(parsed.todos),
        sequence:
          typeof parsed.sequence === "number" && Number.isFinite(parsed.sequence)
            ? parsed.sequence
            : 0,
        completedLog: [],
        activity: [],
      };
    }

    if (parsed.version === 2) {
      return {
        todos: coerceTodos(parsed.todos),
        sequence:
          typeof parsed.sequence === "number" && Number.isFinite(parsed.sequence)
            ? parsed.sequence
            : 0,
        completedLog: coerceCompletedLog(parsed.completedLog),
        activity: coerceActivity(parsed.activity),
      };
    }

    return DEFAULT_STATE;
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveTodoState(state: TodoAppState): void {
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

  window.localStorage.setItem(TODO_STORAGE_KEY, JSON.stringify(payload));
}