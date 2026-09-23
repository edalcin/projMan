// PROTÓTIPO #16 — posição REAL por ponto médio + renumeração.
// Self-check: node src/lib/prototipo/posicao.ts

export const PASSO = 1024; // espaçamento inicial e após renumerar
export const MIN = 0.01; // abaixo disto, renumera a coluna (#7)

/** Posição para um card entre `antes` e `depois` (null = ponta da coluna). */
export function entre(antes: number | null, depois: number | null) {
	if (antes === null && depois === null) return PASSO;
	if (antes === null) return depois! - PASSO;
	if (depois === null) return antes + PASSO;
	return (antes + depois) / 2;
}

/** Quantas inserções seguidas no mesmo vão cabem antes de renumerar. */
export function folga(passo: number) {
	let a = 0, b = passo, n = 0;
	while (b - a >= MIN) (b = (a + b) / 2), n++;
	return n;
}

if (typeof process !== 'undefined' && import.meta.url === `file:///${process.argv[1]?.replaceAll('\\', '/')}`) {
	// Dinâmico: este módulo também vai para o browser, e node:assert não.
	const { equal } = await import('node:assert/strict');
	equal(entre(null, null), PASSO);
	equal(entre(1024, 2048), 1536);
	equal(entre(null, 1024), 0);
	equal(entre(2048, null), 3072);
	equal(folga(1), 7);
	equal(folga(PASSO), 17);
	console.log('ok: passo 1 →', folga(1), 'inserções; passo', PASSO, '→', folga(PASSO));
}
