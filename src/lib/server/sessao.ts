import { createHmac, timingSafeEqual } from 'node:crypto';

export const COOKIE = 'sessao';
export const DURACAO_S = 60 * 60 * 24 * 30;

const assinar = (dados: string, segredo: string) =>
	createHmac('sha256', segredo).update(dados).digest('base64url');

/**
 * Cookie sem estado (#3, #10): `<expira em ms>.<HMAC>`. Um usuário só, então o
 * payload é só a validade. Revogar tudo = trocar SESSION_SECRET.
 */
export function criarSessao(segredo: string, agora = Date.now()): string {
	const expira = String(agora + DURACAO_S * 1000);
	return `${expira}.${assinar(expira, segredo)}`;
}

export function sessaoValida(valor: string | undefined, segredo: string, agora = Date.now()): boolean {
	if (!valor) return false;
	const [expira, assinatura] = valor.split('.');
	if (!expira || !assinatura) return false;
	const esperado = Buffer.from(assinar(expira, segredo));
	const obtido = Buffer.from(assinatura);
	return (
		obtido.length === esperado.length && timingSafeEqual(obtido, esperado) && +expira > agora
	);
}
