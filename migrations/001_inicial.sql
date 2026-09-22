-- projMan: schema v1 (#9). Decisões em docs/decisoes/09-schema.md.
-- Instantes: TEXT ISO-8601 UTC (#8). Posições: REAL, ponto médio (#7).

CREATE TABLE projects (
  id          INTEGER PRIMARY KEY,
  title       TEXT    NOT NULL CHECK (length(trim(title)) > 0),
  description TEXT    NOT NULL DEFAULT '',
  hex_color   TEXT    CHECK (hex_color GLOB '[0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f]'),
  position    REAL    NOT NULL DEFAULT 0,
  archived    INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1)),
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ')),
  updated_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ'))
);

CREATE TABLE tasks (
  id               INTEGER PRIMARY KEY,
  project_id       INTEGER NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  parent_task_id   INTEGER REFERENCES tasks (id) ON DELETE CASCADE,
  title            TEXT    NOT NULL CHECK (length(trim(title)) > 0),
  description      TEXT    NOT NULL DEFAULT '',  -- HTML do TipTap, já sanitizado (#4)
  description_text TEXT    NOT NULL DEFAULT '',  -- derivado, alimenta o FTS5
  done             INTEGER NOT NULL DEFAULT 0 CHECK (done IN (0, 1)),
  done_at          TEXT,
  due_date         TEXT,
  due_all_day      INTEGER NOT NULL DEFAULT 1 CHECK (due_all_day IN (0, 1)),
  start_date       TEXT,
  end_date         TEXT,
  priority         INTEGER NOT NULL DEFAULT 0 CHECK (priority BETWEEN 0 AND 5), -- 0 = sem prioridade
  repeat_every     INTEGER CHECK (repeat_every > 0),
  repeat_unit      TEXT    CHECK (repeat_unit IN ('day', 'week', 'month', 'year')),
  created_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ')),
  updated_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ')),
  CHECK ((repeat_every IS NULL) = (repeat_unit IS NULL)),
  CHECK (done = 0 OR done_at IS NOT NULL), -- recorrente reaberta guarda o done_at do último ciclo (#8)
  CHECK (parent_task_id IS NULL OR parent_task_id <> id)
);

-- Subtarefa: um nível só. A mãe não pode ser subtarefa, a subtarefa não pode ter
-- filhas, e as duas vivem no mesmo projeto. Um nível elimina ciclos por construção.
CREATE TRIGGER tasks_parent_ins BEFORE INSERT ON tasks
WHEN NEW.parent_task_id IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'subtarefa: mae invalida')
  WHERE NOT EXISTS (SELECT 1 FROM tasks
                    WHERE id = NEW.parent_task_id
                      AND parent_task_id IS NULL
                      AND project_id = NEW.project_id);
END;

CREATE TRIGGER tasks_parent_upd BEFORE UPDATE OF parent_task_id, project_id ON tasks
BEGIN
  SELECT RAISE(ABORT, 'subtarefa: mae invalida')
  WHERE NEW.parent_task_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM tasks
                    WHERE id = NEW.parent_task_id
                      AND parent_task_id IS NULL
                      AND project_id = NEW.project_id);
  SELECT RAISE(ABORT, 'subtarefa: tarefa com filhas nao pode virar subtarefa')
  WHERE NEW.parent_task_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM tasks WHERE parent_task_id = NEW.id);
  SELECT RAISE(ABORT, 'subtarefa: filhas ficariam noutro projeto')
  WHERE NEW.project_id <> OLD.project_id
    AND EXISTS (SELECT 1 FROM tasks WHERE parent_task_id = NEW.id);
END;

CREATE TABLE labels (
  id        INTEGER PRIMARY KEY,
  title     TEXT NOT NULL UNIQUE COLLATE NOCASE CHECK (length(trim(title)) > 0),
  hex_color TEXT CHECK (hex_color GLOB '[0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f]')
);

CREATE TABLE task_labels (
  task_id  INTEGER NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
  label_id INTEGER NOT NULL REFERENCES labels (id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, label_id)
) WITHOUT ROWID;

CREATE TABLE project_views (
  id                INTEGER PRIMARY KEY,
  project_id        INTEGER NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  view_kind         TEXT    NOT NULL CHECK (view_kind IN ('list', 'kanban', 'table')),
  position          REAL    NOT NULL DEFAULT 0,
  default_bucket_id INTEGER REFERENCES buckets (id) ON DELETE SET NULL,
  done_bucket_id    INTEGER REFERENCES buckets (id) ON DELETE SET NULL,
  UNIQUE (project_id, view_kind) -- três views fixas (#7). CRUD depois = remover este UNIQUE
);

CREATE TABLE buckets (
  id              INTEGER PRIMARY KEY,
  project_view_id INTEGER NOT NULL REFERENCES project_views (id) ON DELETE CASCADE,
  title           TEXT    NOT NULL CHECK (length(trim(title)) > 0),
  position        REAL    NOT NULL DEFAULT 0,
  wip_limit       INTEGER NOT NULL DEFAULT 0 CHECK (wip_limit >= 0) -- 0 = sem limite; só sinaliza (#7)
);

CREATE TABLE task_buckets (
  task_id         INTEGER NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
  project_view_id INTEGER NOT NULL REFERENCES project_views (id) ON DELETE CASCADE,
  bucket_id       INTEGER NOT NULL REFERENCES buckets (id) ON DELETE CASCADE,
  position        REAL    NOT NULL,
  PRIMARY KEY (task_id, project_view_id) -- um card por Kanban
) WITHOUT ROWID;

CREATE TABLE task_positions (
  task_id         INTEGER NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
  project_view_id INTEGER NOT NULL REFERENCES project_views (id) ON DELETE CASCADE,
  position        REAL    NOT NULL,
  PRIMARY KEY (task_id, project_view_id)
) WITHOUT ROWID;

CREATE TABLE comments (
  id         INTEGER PRIMARY KEY,
  task_id    INTEGER NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
  body       TEXT    NOT NULL CHECK (length(trim(body)) > 0), -- HTML sanitizado
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ')),
  updated_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ'))
);

-- O arquivo vive em FILES_PATH/<stored_name>. O nome no disco é gerado pelo
-- servidor, nunca vem do cliente. Órfãos no disco saem na varredura do boot.
CREATE TABLE attachments (
  id          INTEGER PRIMARY KEY,
  task_id     INTEGER NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
  file_name   TEXT    NOT NULL,
  stored_name TEXT    NOT NULL UNIQUE,
  mime        TEXT    NOT NULL,
  size        INTEGER NOT NULL CHECK (size >= 0),
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ'))
);

CREATE TABLE saved_filters (
  id       INTEGER PRIMARY KEY,
  title    TEXT NOT NULL CHECK (length(trim(title)) > 0),
  filter   TEXT NOT NULL CHECK (json_valid(filter)),
  position REAL NOT NULL DEFAULT 0
);

-- Read-only por construção (#1): não há coluna de permissão a errar.
CREATE TABLE link_shares (
  id         INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  hash       TEXT    NOT NULL UNIQUE CHECK (length(hash) = 40),
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ'))
);

-- Índices escritos a partir das consultas reais.
-- Smart lists: WHERE done = 0 AND due_date <op> ?   (Hoje, 7 dias, Atrasadas)
CREATE INDEX tasks_abertas_prazo ON tasks (due_date) WHERE done = 0;
-- Smart list "Sem prazo" e "Todas as abertas"
CREATE INDEX tasks_abertas_sem_prazo ON tasks (created_at) WHERE done = 0 AND due_date IS NULL;
-- Views do projeto: WHERE project_id = ? AND done = ?
CREATE INDEX tasks_projeto ON tasks (project_id, done);
-- Subtarefas de uma tarefa; também serve os triggers acima
CREATE INDEX tasks_mae ON tasks (parent_task_id) WHERE parent_task_id IS NOT NULL;
-- Kanban: cards de uma coluna em ordem
CREATE INDEX task_buckets_coluna ON task_buckets (bucket_id, position);
-- List/Table: tarefas de uma view em ordem
CREATE INDEX task_positions_view ON task_positions (project_view_id, position);
CREATE INDEX buckets_view ON buckets (project_view_id, position);
CREATE INDEX task_labels_label ON task_labels (label_id);
CREATE INDEX comments_tarefa ON comments (task_id, created_at);
CREATE INDEX attachments_tarefa ON attachments (task_id);
CREATE INDEX link_shares_projeto ON link_shares (project_id);

-- Busca (#2): FTS5 como external content table, sincronizada por triggers.
CREATE VIRTUAL TABLE tasks_fts USING fts5 (
  title, description_text,
  content = 'tasks', content_rowid = 'id',
  tokenize = 'unicode61 remove_diacritics 2'
);

CREATE TRIGGER tasks_fts_ins AFTER INSERT ON tasks BEGIN
  INSERT INTO tasks_fts (rowid, title, description_text)
  VALUES (NEW.id, NEW.title, NEW.description_text);
END;

CREATE TRIGGER tasks_fts_del AFTER DELETE ON tasks BEGIN
  INSERT INTO tasks_fts (tasks_fts, rowid, title, description_text)
  VALUES ('delete', OLD.id, OLD.title, OLD.description_text);
END;

CREATE TRIGGER tasks_fts_upd AFTER UPDATE OF title, description_text ON tasks BEGIN
  INSERT INTO tasks_fts (tasks_fts, rowid, title, description_text)
  VALUES ('delete', OLD.id, OLD.title, OLD.description_text);
  INSERT INTO tasks_fts (rowid, title, description_text)
  VALUES (NEW.id, NEW.title, NEW.description_text);
END;

-- Projeto novo nasce com as três views e as três colunas (#7).
CREATE TRIGGER projects_views AFTER INSERT ON projects BEGIN
  INSERT INTO project_views (project_id, view_kind, position)
  VALUES (NEW.id, 'list', 1), (NEW.id, 'kanban', 2), (NEW.id, 'table', 3);
  INSERT INTO buckets (project_view_id, title, position)
  SELECT id, b.title, b.position
  FROM project_views,
       (SELECT 'A fazer' AS title, 1 AS position
        UNION ALL SELECT 'Fazendo', 2
        UNION ALL SELECT 'Feito', 3) AS b
  WHERE project_id = NEW.id AND view_kind = 'kanban';
  UPDATE project_views SET
    default_bucket_id = (SELECT id FROM buckets WHERE project_view_id = project_views.id AND title = 'A fazer'),
    done_bucket_id    = (SELECT id FROM buckets WHERE project_view_id = project_views.id AND title = 'Feito')
  WHERE project_id = NEW.id AND view_kind = 'kanban';
END;
