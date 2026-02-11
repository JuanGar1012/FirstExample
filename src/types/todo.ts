export type Todo = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
  completedAt: number | null;
};

export type CompletedLogEntry = {
  id: string;
  title: string;
  completedAt: number;
};

export type ActivityType = "added" | "completed" | "reopened" | "deleted";

export type ActivityEntry = {
  id: string;
  type: ActivityType;
  title: string;
  at: number;
};

export type TodoAppState = {
  todos: Todo[];
  sequence: number;
  completedLog: CompletedLogEntry[];
  activity: ActivityEntry[];
};