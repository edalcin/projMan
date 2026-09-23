/** Smart lists na ordem da sidebar (#11). `chave` = chave de `SMART` no servidor. */
export const SMART_LISTS = [
	{ chave: 'hoje', nome: 'Hoje', icone: 'bx-sun' },
	{ chave: '7-dias', nome: '7 dias', icone: 'bx-calendar-week' },
	{ chave: 'atrasadas', nome: 'Atrasadas', icone: 'bx-alarm-exclamation' },
	{ chave: 'sem-prazo', nome: 'Sem prazo', icone: 'bx-calendar-x' },
	{ chave: 'abertas', nome: 'Todas as abertas', icone: 'bx-list-ul' }
] as const;
