import type { Todo } from "../types/todo";

export const TODO_STORAGE_KEY = "todoapp:v1";

function sortTodos(todos: Todo[]): Todo[] {
  return [...todos].sort((a, b) => {
    if (b.createdAt !== a.createdAt) {
      return b.createdAt - a.createdAt;
    }

    return b.id.localeCompare(a.id);
  });
}

function normalizeTitle(title: string): string {
  return title.trim();
}

export function createTodo(params: {
  id: string;
  title: string;
  createdAt: number;
}): Todo | null {
  const normalizedTitle = normalizeTitle(params.title);
  if (!normalizedTitle) {
    return null;
  }

  return {
    id: params.id,
    title: normalizedTitle,
    completed: false,
    createdAt: params.createdAt,
    completedAt: null,
  };
}

export function addTodo(todos: Todo[], todo: Todo): Todo[] {
  return sortTodos([todo, ...todos]);
}

export function toggleTodo(todos: Todo[], id: string, now: number): Todo[] {
  return todos.map((todo) => {
    if (todo.id !== id) {
      return todo;
    }

    const nextCompleted = !todo.completed;
    return {
      ...todo,
      completed: nextCompleted,
      completedAt: nextCompleted ? now : null,
    };
  });
}

export function deleteTodo(todos: Todo[], id: string): Todo[] {
  return todos.filter((todo) => todo.id !== id);
}

export function coerceTodos(raw: unknown): Todo[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const parsed: Todo[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const candidate = item as Record<string, unknown>;
    if (
      typeof candidate.id === "string" &&
      typeof candidate.title === "string" &&
      typeof candidate.completed === "boolean" &&
      typeof candidate.createdAt === "number"
    ) {
      const title = normalizeTitle(candidate.title);
      if (!title) {
        continue;
      }

      const completedAt =
        candidate.completed === true &&
        typeof candidate.completedAt === "number" &&
        Number.isFinite(candidate.completedAt)
          ? candidate.completedAt
          : null;

      parsed.push({
        id: candidate.id,
        title,
        completed: candidate.completed,
        createdAt: candidate.createdAt,
        completedAt,
      });
    }
  }

  return sortTodos(parsed);
}