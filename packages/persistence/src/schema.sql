CREATE TABLE IF NOT EXISTS beliefs (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 1.0,
  source TEXT NOT NULL DEFAULT 'perception',
  tags TEXT NOT NULL DEFAULT '[]',
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  priority REAL NOT NULL DEFAULT 0.5,
  status TEXT NOT NULL DEFAULT 'pending',
  success_condition TEXT NOT NULL DEFAULT '',
  preconditions TEXT NOT NULL DEFAULT '[]',
  deadline TEXT,
  parent_goal_id TEXT
);

CREATE TABLE IF NOT EXISTS intentions (
  id TEXT PRIMARY KEY,
  goal_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  current_step_index INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  execution_history TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  goal_pattern TEXT NOT NULL,
  trigger_condition TEXT NOT NULL DEFAULT '',
  steps TEXT NOT NULL DEFAULT '[]',
  estimated_cost REAL NOT NULL DEFAULT 1.0,
  source TEXT NOT NULL DEFAULT 'library'
);
