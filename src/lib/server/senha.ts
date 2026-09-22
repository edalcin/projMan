import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt) as (
	senha: string,
	sal: Buffer,
	tamanho: number,
	opcoes: { N: number; r: number; p: number; maxmem: number }
) => Promise<Buffer>;

// OWASP para scrypt (#3). maxmem sobe porque 128 * N * r passa do default de 32 MiB.
const N = 131072;
const R = 8;
const P = 1;
const maxmem = 256 * 1024 * 1024;

/** Formato: scrypt:N:r:p:<sal base64>:<hash base64>. Sem `$`, que o shell e o compose interpretam. */
export async function hashSenha(senha: string): Promise<string> {
	const sal = randomBytes(16);
	const hash = await scryptAsync(senha, sal, 64, { N, r: R, p: P, maxmem });
	return ['scrypt', N, R, P, sal.toString('base64'), hash.toString('base64')].join(':');
}

export async function verificarSenha(senha: string, guardado: string): Promise<boolean> {
	const [alg, n, r, p, sal, hash] = guardado.split(':');
	if (alg !== 'scrypt' || !hash || !sal) return false;
	const esperado = Buffer.from(hash, 'base64');
	if (esperado.length === 0) return false;
	const obtido = await scryptAsync(senha, Buffer.from(sal, 'base64'), esperado.length, {
		N: +n,
		r: +r,
		p: +p,
		maxmem
	});
	return timingSafeEqual(obtido, esperado);
}
