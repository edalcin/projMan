// Regras de data do projMan (#8). Todo instante guardado e' UTC; o fuso local
// entra so' na borda. Sem biblioteca de datas: Intl ja' converte.

export type RepeatUnit = 'day' | 'week' | 'month' | 'year';

type Partes = { ano: number; mes: number; dia: number; h: number; min: number; s: number };

/** Componentes do instante no fuso pedido. */
export function partesLocais(ms: number, tz: string): Partes {
	const p = Object.fromEntries(
		new Intl.DateTimeFormat('en-US', {
			timeZone: tz,
			hourCycle: 'h23',
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		})
			.formatToParts(new Date(ms))
			.map((x) => [x.type, x.value])
	) as Record<string, string>;
	return { ano: +p.year, mes: +p.month, dia: +p.day, h: +p.hour % 24, min: +p.minute, s: +p.second };
}

/** Instante UTC de uma data/hora civil no fuso pedido. */
export function deLocal(p: Partes, tz: string, msExtra = 0): number {
	const alvo = Date.UTC(p.ano, p.mes - 1, p.dia, p.h, p.min, p.s, msExtra);
	let t = alvo;
	// duas passadas bastam: a segunda corrige a virada de offset (DST)
	for (let i = 0; i < 2; i++) {
		const q = partesLocais(t, tz);
		t += alvo - Date.UTC(q.ano, q.mes - 1, q.dia, q.h, q.min, q.s, msExtra);
	}
	return t;
}

/**
 * Regra unica das smart lists: [00:00:00.000, 23:59:59.999] no fuso local,
 * devolvido em UTC. Hoje, 7 dias, Atrasadas e Sem prazo usam esta e so' esta.
 */
export function limitesDoDia(ms: number, tz: string): { inicio: number; fim: number } {
	const { ano, mes, dia } = partesLocais(ms, tz);
	return {
		inicio: deLocal({ ano, mes, dia, h: 0, min: 0, s: 0 }, tz),
		fim: deLocal({ ano, mes, dia, h: 23, min: 59, s: 59 }, tz, 999)
	};
}

/** Soma um ciclo no calendario local. Mes e ano fazem clamp no ultimo dia do mes. */
export function somarCiclo(ms: number, every: number, unit: RepeatUnit, tz: string): number {
	const p = partesLocais(ms, tz);
	if (unit === 'day' || unit === 'week') {
		// dia civil, nao 24h fixas: atravessa virada de DST sem deslocar a hora
		const d = new Date(Date.UTC(p.ano, p.mes - 1, p.dia + every * (unit === 'week' ? 7 : 1)));
		return deLocal(
			{ ...p, ano: d.getUTCFullYear(), mes: d.getUTCMonth() + 1, dia: d.getUTCDate() },
			tz
		);
	}
	const total = p.ano * 12 + (p.mes - 1) + every * (unit === 'year' ? 12 : 1);
	const ano = Math.floor(total / 12);
	const mes = (total % 12) + 1;
	const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
	return deLocal({ ...p, ano, mes, dia: Math.min(p.dia, ultimoDia) }, tz);
}

/**
 * Proximo prazo de uma tarefa recorrente. Parte sempre do prazo anterior,
 * nunca da data de conclusao, e pula os ciclos ja' vencidos em vez de
 * acumular instancias.
 */
export function proximoPrazo(
	prazoISO: string,
	every: number,
	unit: RepeatUnit,
	tz: string,
	agora = Date.now()
): string {
	let t = Date.parse(prazoISO);
	// ponytail: laco simples. Mil ciclos sao instantaneos; se doer, troque por
	// salto aritmetico direto.
	do {
		t = somarCiclo(t, every, unit, tz);
	} while (t <= agora);
	return new Date(t).toISOString();
}
