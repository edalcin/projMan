// Posição REAL por ponto médio (ADR 0001, #16).
export const PASSO = 1024; // espaçamento inicial e após renumerar
export const MIN = 0.01; // vão abaixo disto → renumerar a coluna/view

/** Posição para um item entre `antes` e `depois` (null = ponta). */
export function entre(antes: number | null, depois: number | null): number {
	if (antes === null && depois === null) return PASSO;
	if (antes === null) return depois! - PASSO;
	if (depois === null) return antes + PASSO;
	return (antes + depois) / 2;
}
