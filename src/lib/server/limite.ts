// Rate limit do login (#3, #10): 5 falhas por IP em 15 minutos. Em memória:
// um processo só, e reiniciar o container zerar os contadores é aceitável.
// ponytail: o Map cresce com IPs distintos; limpa na checagem. Se virar alvo
// de varredura em massa, limitar no Cloudflare (WAF) em vez de aqui.
export const MAX_FALHAS = 5;
export const JANELA_MS = 15 * 60 * 1000;

const falhas = new Map<string, { n: number; desde: number }>();

/** Segundos até liberar, ou 0 se o IP pode tentar. */
export function bloqueadoPor(ip: string, agora = Date.now()): number {
	const f = falhas.get(ip);
	if (!f) return 0;
	if (agora - f.desde >= JANELA_MS) {
		falhas.delete(ip);
		return 0;
	}
	return f.n >= MAX_FALHAS ? Math.ceil((f.desde + JANELA_MS - agora) / 1000) : 0;
}

export function registrarFalha(ip: string, agora = Date.now()) {
	const f = falhas.get(ip);
	if (!f || agora - f.desde >= JANELA_MS) falhas.set(ip, { n: 1, desde: agora });
	else f.n++;
}

export function limparFalhas(ip: string) {
	falhas.delete(ip);
}
