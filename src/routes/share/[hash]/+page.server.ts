import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import type { PageServerLoad } from './$types';

// Read-only por construção (#10): este grupo de rotas só tem `load`. Nenhuma
// action, nenhum +server.ts. O hook ainda recusa todo método que não seja GET.
// Mostra título, estado, prazo, labels e descrição. Não mostra comentários
// nem anexos: são o diário privado da tarefa.
export const load: PageServerLoad = ({ params }) => {
	if (!/^[A-Za-z0-9_-]{40}$/.test(params.hash)) error(404);
	const projeto = db
		.prepare(
			`SELECT p.id, p.title, p.description FROM link_shares l
			 JOIN projects p ON p.id = l.project_id WHERE l.hash = ?`
		)
		.get(params.hash) as { id: number; title: string; description: string } | undefined;
	// Mesmo 404 para hash inexistente e malformado: não confirma a existência de nada.
	if (!projeto) error(404);

	const tarefas = db
		.prepare(
			`SELECT t.id, t.parent_task_id, t.title, t.description, t.done, t.due_date, t.due_all_day,
			        (SELECT group_concat(l.title, ', ') FROM task_labels tl
			         JOIN labels l ON l.id = tl.label_id WHERE tl.task_id = t.id) AS labels
			 FROM tasks t
			 LEFT JOIN project_views v ON v.project_id = t.project_id AND v.view_kind = 'list'
			 LEFT JOIN task_positions tp ON tp.task_id = t.id AND tp.project_view_id = v.id
			 WHERE t.project_id = ?
			 ORDER BY t.done, tp.position, t.id`
		)
		.all(projeto.id);
	return { projeto, tarefas };
};
