import { createHash, timingSafeEqual } from 'node:crypto';
import type Database from 'better-sqlite3';
import { partesLocais } from '../datas.ts';

/** Token do feed confere com ICAL_TOKEN. Sem token configurado (ou curto), o feed não existe. */
export function tokenValido(obtido: string, esperado: string | undefined): boolean {
	if (!esperado || esperado.length < 32) return false;
	// digest dos dois: mesmo tamanho sempre, o tempo não vaza o comprimento
	const h = (s: string) => createHash('sha256').update(s).digest();
	return timingSafeEqual(h(obtido), h(esperado));
}

const escapar = (s: string) => s.replace(/[\\;,]/g, (c) => '\\' + c).replace(/\r?\n/g, '\\n');

/** Dobra a linha em 75 octetos (RFC 5545 §3.1) sem partir um caractere UTF-8. */
function dobrar(linha: string): string {
	const partes: string[] = [];
	let atual = '';
	let bytes = 0;
	for (const c of linha) {
		const n = Buffer.byteLength(c);
		if (bytes + n > (partes.length ? 74 : 75)) {
			partes.push(atual);
			atual = '';
			bytes = 0;
		}
		atual += c;
		bytes += n;
	}
	partes.push(atual);
	return partes.join('\r\n ');
}

const utc = (iso: string) => iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '');

type Linha = { id: number; title: string; due_date: string; due_all_day: number; updated_at: string; projeto: string };

/**
 * Feed global (#12): toda tarefa aberta com prazo, de projeto não arquivado,
 * como VEVENT. Feita ou apagada some no próximo refresh do cliente.
 * Recorrente = só o próximo prazo, sem RRULE (#8 pula ciclos e faz clamp no
 * fim do mês; uma RRULE divergiria e mostraria ciclos futuros como pendentes).
 */
export function feedIcal(db: Database.Database, tz: string): string {
	const tarefas = db
		.prepare(
			`SELECT t.id, t.title, t.due_date, t.due_all_day, t.updated_at, p.title AS projeto
			 FROM tasks t JOIN projects p ON p.id = t.project_id
			 WHERE t.done = 0 AND t.due_date IS NOT NULL AND p.archived = 0
			 ORDER BY t.due_date, t.id`
		)
		.all() as Linha[];

	const linhas = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//projMan//PT-BR', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:projMan'];
	for (const t of tarefas) {
		let inicio: string;
		if (t.due_all_day) {
			// dia civil local (#8): o instante guardado é o fim do dia no TZ
			const { ano, mes, dia } = partesLocais(Date.parse(t.due_date), tz);
			inicio = `DTSTART;VALUE=DATE:${ano}${String(mes).padStart(2, '0')}${String(dia).padStart(2, '0')}`;
		} else inicio = `DTSTART:${utc(t.due_date)}`;
		// ponytail: sem DTEND. RFC 5545: DATE dura um dia, DATE-TIME é um instante.
		// Se um cliente desenhar mal o instante, some DTEND = prazo + 30 min.
		linhas.push(
			'BEGIN:VEVENT',
			`UID:task-${t.id}@projman`,
			`DTSTAMP:${utc(t.updated_at)}`,
			inicio,
			`SUMMARY:${escapar(t.title)}`,
			`DESCRIPTION:${escapar('Projeto: ' + t.projeto)}`,
			'END:VEVENT'
		);
	}
	linhas.push('END:VCALENDAR');
	return linhas.map(dobrar).join('\r\n') + '\r\n';
}
