import { limitesDoDia, partesLocais } from './datas.ts';

const DIA = 86_400_000;

/**
 * Prazo como a linha da lista mostra (#14): "hoje", "amanhã", "ontem" ou "12 out"
 * (com o ano só se não for o corrente), mais a hora quando não é dia inteiro.
 * Tudo no fuso do servidor (#8). `atrasada` usa a regra da smart list Atrasadas:
 * antes do início de hoje.
 */
export function formatarPrazo(iso: string, diaInteiro: boolean, tz: string, agora = Date.now()) {
	const ms = Date.parse(iso);
	const hoje = limitesDoDia(agora, tz);
	const dia = limitesDoDia(ms, tz).inicio;
	// dias civis de diferença; round absorve a virada de DST (23 h ou 25 h)
	const delta = Math.round((dia - hoje.inicio) / DIA);
	const p = partesLocais(ms, tz);
	const data =
		delta === 0
			? 'hoje'
			: delta === 1
				? 'amanhã'
				: delta === -1
					? 'ontem'
					: new Intl.DateTimeFormat('pt-BR', {
							timeZone: tz,
							day: 'numeric',
							month: 'short',
							year: p.ano === partesLocais(agora, tz).ano ? undefined : 'numeric'
						})
							.format(ms)
							.replace('.', '');
	const hora = diaInteiro ? '' : ` ${String(p.h).padStart(2, '0')}:${String(p.min).padStart(2, '0')}`;
	return { texto: data + hora, atrasada: ms < hoje.inicio };
}
