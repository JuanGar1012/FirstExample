import { CSSProperties, FormEvent, KeyboardEvent, MouseEvent, useEffect, useMemo, useRef, useState } from "react";
import { addTodo, createTodo, deleteTodo, toggleTodo } from "./lib/todos";
import { loadTodoState, saveTodoState } from "./lib/storage";
import type { ActivityEntry, ActivityType, CompletedLogEntry, Todo, TodoAppState } from "./types/todo";

type MenuKey = "board" | "completed" | "insights" | "activity";

type FireworkBurst = {
  id: number;
  x: number;
  y: number;
};

type ThrowAnimation = {
  id: number;
  todoId: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  tx: number;
  ty: number;
};

const MENU_ITEMS: Array<{ key: MenuKey; label: string }> = [
  { key: "board", label: "Board" },
  { key: "completed", label: "Completed Log" },
  { key: "insights", label: "Insights" },
  { key: "activity", label: "Activity" },
];

const FIREWORK_COLORS = ["#60a5fa", "#3b82f6", "#2563eb", "#93c5fd", "#38bdf8", "#0ea5e9"];
const FIREWORK_ANGLES = Array.from({ length: 12 }, (_, index) =>
  (index / 12) * Math.PI * 2
);

const ACTIVITY_LABEL: Record<ActivityType, string> = {
  added: "Added",
  completed: "Completed",
  reopened: "Reopened",
  deleted: "Deleted",
};

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function isSameLocalDay(left: number, right: number): boolean {
  const leftDate = new Date(left);
  const rightDate = new Date(right);

  return (
    leftDate.getFullYear() === rightDate.getFullYear() &&
    leftDate.getMonth() === rightDate.getMonth() &&
    leftDate.getDate() === rightDate.getDate()
  );
}

function createActivity(type: ActivityType, title: string, at: number, seed: string): ActivityEntry {
  return {
    id: `${at}-${seed}-${type}`,
    type,
    title,
    at,
  };
}

function prependActivity(current: ActivityEntry[], entry: ActivityEntry): ActivityEntry[] {
  return [entry, ...current]
    .sort((a, b) => (b.at !== a.at ? b.at - a.at : b.id.localeCompare(a.id)))
    .slice(0, 200);
}

function prependCompletedLog(current: CompletedLogEntry[], entry: CompletedLogEntry): CompletedLogEntry[] {
  return [entry, ...current]
    .sort((a, b) => b.completedAt - a.completedAt)
    .slice(0, 300);
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M4 7h16" strokeLinecap="round" />
      <path d="M9 4h6a1 1 0 0 1 1 1v2H8V5a1 1 0 0 1 1-1Z" />
      <path d="M7 7l1 12a1 1 0 0 0 1 .92h6a1 1 0 0 0 1-.92L17 7" />
      <path d="M10 11v5M14 11v5" strokeLinecap="round" />
    </svg>
  );
}

export default function App() {
  const [state, setState] = useState<TodoAppState>(() => loadTodoState());
  const [inputValue, setInputValue] = useState("");
  const [activeMenu, setActiveMenu] = useState<MenuKey>("board");
  const [bursts, setBursts] = useState<FireworkBurst[]>([]);
  const [throwAnimation, setThrowAnimation] = useState<ThrowAnimation | null>(null);
  const [showTrashCan, setShowTrashCan] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const listItemRefs = useRef<Record<string, HTMLLIElement | null>>({});
  const timeoutIds = useRef<number[]>([]);
  const animationSequence = useRef(0);

  useEffect(() => {
    saveTodoState(state);
  }, [state]);

  useEffect(() => {
    return () => {
      for (const timeoutId of timeoutIds.current) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  const insightStats = useMemo(() => {
    const total = state.todos.length;
    const completed = state.todos.filter((todo) => todo.completed).length;
    const active = total - completed;
    const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100);
    const now = Date.now();
    const completedToday = state.completedLog.filter((entry) => isSameLocalDay(entry.completedAt, now)).length;
    const lastCompleted = state.completedLog[0] ?? null;

    return {
      total,
      completed,
      active,
      completionRate,
      completedToday,
      lastCompleted,
    };
  }, [state.completedLog, state.todos]);

  function scheduleTimeout(callback: () => void, ms: number): void {
    const timeoutId = window.setTimeout(callback, ms);
    timeoutIds.current.push(timeoutId);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setState((current) => {
      const nextSequence = current.sequence + 1;
      const createdAt = Date.now();
      const todo = createTodo({
        id: `${createdAt}-${nextSequence}`,
        title: inputValue,
        createdAt,
      });

      if (!todo) {
        return current;
      }

      return {
        ...current,
        todos: addTodo(current.todos, todo),
        sequence: nextSequence,
        activity: prependActivity(
          current.activity,
          createActivity("added", todo.title, createdAt, `${todo.id}-${nextSequence}`)
        ),
      };
    });

    setInputValue("");
    inputRef.current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      const form = event.currentTarget.form;
      if (form) {
        form.requestSubmit();
      }
    }
  }

  function launchFireworks(x: number, y: number) {
    const burstId = animationSequence.current + 1;
    animationSequence.current = burstId;

    setBursts((current) => [...current, { id: burstId, x, y }]);
    scheduleTimeout(() => {
      setBursts((current) => current.filter((burst) => burst.id !== burstId));
    }, 900);
  }

  function handleToggle(todo: Todo, event: MouseEvent<HTMLButtonElement>) {
    const wasCompleted = todo.completed;
    const now = Date.now();

    setState((current) => {
      const existing = current.todos.find((entry) => entry.id === todo.id);
      if (!existing) {
        return current;
      }

      const nextCompleted = !existing.completed;
      const completedLog = nextCompleted
        ? prependCompletedLog(current.completedLog, {
            id: existing.id,
            title: existing.title,
            completedAt: now,
          })
        : current.completedLog;

      return {
        ...current,
        todos: toggleTodo(current.todos, todo.id, now),
        completedLog,
        activity: prependActivity(
          current.activity,
          createActivity(nextCompleted ? "completed" : "reopened", existing.title, now, existing.id)
        ),
      };
    });

    if (!wasCompleted) {
      const rect = event.currentTarget.getBoundingClientRect();
      launchFireworks(rect.left + rect.width / 2, rect.top + rect.height / 2);
    }
  }

  function handleDelete(todo: Todo) {
    const node = listItemRefs.current[todo.id];
    const now = Date.now();

    if (!node) {
      setState((current) => ({
        ...current,
        todos: deleteTodo(current.todos, todo.id),
        activity: prependActivity(current.activity, createActivity("deleted", todo.title, now, todo.id)),
      }));
      return;
    }

    const rect = node.getBoundingClientRect();
    const targetX = window.innerWidth - 74;
    const targetY = window.innerHeight - 78;
    const animationId = animationSequence.current + 1;
    animationSequence.current = animationId;

    setShowTrashCan(true);
    setThrowAnimation({
      id: animationId,
      todoId: todo.id,
      title: todo.title,
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
      tx: targetX - (rect.left + rect.width / 2),
      ty: targetY - (rect.top + rect.height / 2),
    });

    scheduleTimeout(() => {
      setState((current) => ({
        ...current,
        todos: deleteTodo(current.todos, todo.id),
        activity: prependActivity(current.activity, createActivity("deleted", todo.title, now, todo.id)),
      }));
    }, 620);

    scheduleTimeout(() => {
      setThrowAnimation((current) => (current?.id === animationId ? null : current));
    }, 950);

    scheduleTimeout(() => {
      setShowTrashCan(false);
    }, 1100);
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe,#bfdbfe_42%,#e0f2fe_100%)] px-4 py-12 text-slate-900">
      <section className="mx-auto w-full max-w-3xl rounded-3xl border border-blue-100/90 bg-white/90 p-6 shadow-[0_24px_64px_-28px_rgba(30,64,175,0.55)] backdrop-blur">
        <header className="mb-5 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-600">Task board</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">To-Do Focus Flow</h1>
          <p className="text-sm text-slate-500">Modern workflow with animation, history, and productivity insights.</p>
        </header>

        <nav aria-label="Task menu" className="mb-6 flex flex-wrap gap-2">
          {MENU_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setActiveMenu(item.key)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                activeMenu === item.key
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                  : "border border-blue-100 bg-blue-50/50 text-blue-700 hover:bg-blue-100"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {activeMenu === "board" ? (
          <>
            <form onSubmit={handleSubmit} aria-label="Add todo" className="mb-6">
              <label htmlFor="todo-title" className="text-sm font-medium text-slate-700">
                New task
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  id="todo-title"
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(event) => setInputValue(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Plan your next win"
                  className="h-12 flex-1 rounded-xl border border-blue-100 bg-white px-4 text-base outline-none ring-blue-400 transition focus:ring-2"
                />
                <button
                  type="submit"
                  className="h-12 rounded-xl bg-blue-600 px-5 font-semibold text-white transition hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
            </form>

            {state.todos.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-blue-200 bg-blue-50/50 px-4 py-10 text-center text-slate-500">
                No tasks yet.
              </p>
            ) : (
              <ul className="space-y-3">
                {state.todos.map((todo) => {
                  const isThrowing = throwAnimation?.todoId === todo.id;

                  return (
                    <li
                      key={todo.id}
                      ref={(node) => {
                        listItemRefs.current[todo.id] = node;
                      }}
                      className={`flex items-center gap-3 rounded-2xl border border-blue-100 bg-white px-4 py-3 shadow-sm transition ${
                        isThrowing ? "opacity-0" : "opacity-100"
                      }`}
                    >
                      <button
                        type="button"
                        aria-label={
                          todo.completed
                            ? `Mark ${todo.title} incomplete`
                            : `Mark ${todo.title} complete`
                        }
                        onClick={(event) => handleToggle(todo, event)}
                        className={`min-w-20 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                          todo.completed
                            ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                        }`}
                      >
                        {todo.completed ? "Undo" : "Done"}
                      </button>

                      <span
                        className={`flex-1 text-base ${
                          todo.completed ? "text-slate-400 line-through" : "text-slate-800"
                        }`}
                      >
                        {todo.title}
                      </span>

                      <button
                        type="button"
                        aria-label={`Delete ${todo.title}`}
                        onClick={() => handleDelete(todo)}
                        disabled={isThrowing}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <TrashIcon className="h-4 w-4" />
                        Delete
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        ) : null}

        {activeMenu === "completed" ? (
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">Completed Timeline</h2>
            {state.completedLog.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-blue-200 bg-blue-50/50 px-4 py-8 text-center text-slate-500">
                No completed tasks yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {state.completedLog.map((entry) => (
                  <li
                    key={`${entry.id}-${entry.completedAt}`}
                    className="rounded-xl border border-blue-100 bg-white px-4 py-3"
                  >
                    <p className="font-medium text-slate-800">{entry.title}</p>
                    <p className="text-sm text-slate-500">
                      Completed {dateFormatter.format(entry.completedAt)} at {dateTimeFormatter.format(entry.completedAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {activeMenu === "insights" ? (
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">Portfolio Insights</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <article className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                <p className="text-sm text-blue-700">Completion Rate</p>
                <p className="text-3xl font-bold text-blue-900">{insightStats.completionRate}%</p>
              </article>
              <article className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                <p className="text-sm text-blue-700">Completed Today</p>
                <p className="text-3xl font-bold text-blue-900">{insightStats.completedToday}</p>
              </article>
              <article className="rounded-2xl border border-blue-100 bg-white p-4">
                <p className="text-sm text-slate-500">Total Tasks</p>
                <p className="text-2xl font-semibold text-slate-900">{insightStats.total}</p>
              </article>
              <article className="rounded-2xl border border-blue-100 bg-white p-4">
                <p className="text-sm text-slate-500">Open Tasks</p>
                <p className="text-2xl font-semibold text-slate-900">{insightStats.active}</p>
              </article>
            </div>
            <p className="mt-3 text-sm text-slate-500">
              Last completion: {insightStats.lastCompleted ? dateTimeFormatter.format(insightStats.lastCompleted.completedAt) : "N/A"}
            </p>
          </section>
        ) : null}

        {activeMenu === "activity" ? (
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">Recent Activity</h2>
            {state.activity.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-blue-200 bg-blue-50/50 px-4 py-8 text-center text-slate-500">
                No activity yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {state.activity.map((event) => (
                  <li key={event.id} className="rounded-xl border border-blue-100 bg-white px-4 py-3">
                    <p className="text-sm font-semibold text-blue-700">{ACTIVITY_LABEL[event.type]}</p>
                    <p className="font-medium text-slate-800">{event.title}</p>
                    <p className="text-sm text-slate-500">{dateTimeFormatter.format(event.at)}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}
      </section>

      <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden" aria-hidden>
        {bursts.map((burst) => (
          <div key={burst.id} className="firework-burst" style={{ left: burst.x, top: burst.y }}>
            {FIREWORK_ANGLES.map((angle, index) => {
              const distance = 52 + (index % 3) * 16;
              const particleStyle = {
                "--dx": `${Math.cos(angle) * distance}px`,
                "--dy": `${Math.sin(angle) * distance}px`,
                "--color": FIREWORK_COLORS[index % FIREWORK_COLORS.length],
              } as CSSProperties;

              return <span key={`${burst.id}-${index}`} className="firework-particle" style={particleStyle} />;
            })}
          </div>
        ))}
      </div>

      {throwAnimation ? (
        <div className="pointer-events-none fixed inset-0 z-50" aria-hidden>
          <div
            className="throw-card"
            style={
              {
                left: throwAnimation.x,
                top: throwAnimation.y,
                width: throwAnimation.width,
                minHeight: throwAnimation.height,
                "--tx": `${throwAnimation.tx}px`,
                "--ty": `${throwAnimation.ty}px`,
              } as CSSProperties
            }
          >
            {throwAnimation.title}
          </div>
        </div>
      ) : null}

      {showTrashCan ? (
        <div className="pointer-events-none fixed bottom-5 right-5 z-50 origin-bottom trash-pop" aria-hidden>
          <div className="rounded-2xl border border-blue-100 bg-white/95 p-3 text-blue-700 shadow-xl">
            <TrashIcon className="h-8 w-8" />
          </div>
        </div>
      ) : null}
    </main>
  );
}