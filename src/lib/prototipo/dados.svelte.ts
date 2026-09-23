// PROTÓTIPO #14 — descartável. Dados falsos em memória, nada persiste.

export type Tarefa = {
	id: number;
	projeto: string;
	titulo: string;
	prazo: string | null; // 'hoje' | 'amanhã' | '12 out' ...
	atrasada: boolean;
	labels: string[];
	prioridade: 0 | 1 | 2 | 3;
	sub: [number, number] | null; // feitas, total
	feita: boolean;
	descricao: string;
};

export const smartLists = ['Hoje', '7 dias', 'Atrasadas', 'Sem prazo', 'Todas as abertas'];
export const projetos = ['Herbário', 'Casa', 'projMan', 'Artigo DwC', 'Viagem'];
export const filtros = ['Urgentes do herbário', 'Sem label'];

const titulos = [
	'Revisar exsicatas do lote 12',
	'Pagar IPTU',
	'Protótipo do shell',
	'Responder revisor 2',
	'Reservar hotel em Manaus',
	'Trocar filtro da piscina',
	'Mapear colunas para DwC',
	'Atualizar template do UNRAID',
	'Ler artigo sobre SKOS-XL',
	'Comprar fita para etiquetas'
];
const prazos = [null, 'hoje', 'amanhã', 'sex', '12 out', '3 nov'];
const labels = ['urgente', 'campo', 'leitura', 'admin'];

export const tarefas: Tarefa[] = $state(
	Array.from({ length: 200 }, (_, i) => ({
		id: i + 1,
		projeto: projetos[i % projetos.length],
		titulo: titulos[i % titulos.length] + (i >= titulos.length ? ` (${i + 1})` : ''),
		prazo: prazos[(i * 7) % prazos.length],
		atrasada: i % 11 === 3,
		labels: labels.filter((_, j) => (i + j) % 4 === 0),
		prioridade: ((i * 3) % 4) as 0 | 1 | 2 | 3,
		sub: i % 5 === 0 ? [i % 3, 3] : null,
		feita: false,
		descricao: 'Texto rico do TipTap aqui. Lista, **negrito**, link.'
	}))
);

/** Estado simulado vem de `?estado=vazio|carregando|offline`. Filtro falso das smart lists. */
export function daLista(lista: string): Tarefa[] {
	if (lista === 'Hoje') return tarefas.filter((t) => t.prazo === 'hoje' || t.atrasada);
	if (lista === 'Atrasadas') return tarefas.filter((t) => t.atrasada);
	if (lista === 'Sem prazo') return tarefas.filter((t) => !t.prazo);
	if (lista === '7 dias') return tarefas.filter((t) => t.prazo && t.prazo.length < 7);
	if (projetos.includes(lista)) return tarefas.filter((t) => t.projeto === lista);
	return tarefas;
}

/** Mutação falsa. Em `offline`, falha como falharia o fetch sem rede (#5). */
export function alternar(t: Tarefa, estado: string): string | null {
	if (estado === 'offline') return 'Sem conexão: a tarefa não foi marcada. Tente de novo.';
	t.feita = !t.feita;
	return null;
}

export function criar(titulo: string, projeto: string, prazo: string | null, estado: string) {
	if (estado === 'offline') return 'Sem conexão: a tarefa não foi criada.';
	tarefas.unshift({
		id: tarefas.length + 1,
		projeto,
		titulo,
		prazo,
		atrasada: false,
		labels: [],
		prioridade: 0,
		sub: null,
		feita: false,
		descricao: ''
	});
	return null;
}

export const corPrioridade = ['transparent', '#6b9bd1', '#e0a030', '#d9534f'];
