// Gera o valor de ADMIN_PASSWORD_HASH. Uso: node scripts/hash-senha.ts
// A senha é lida do terminal sem eco, nunca do argv (que fica no histórico do shell).
// Também aceita pipe: `echo senha | node scripts/hash-senha.ts`.
import { hashSenha } from '../src/lib/server/senha.ts';

const tty = process.stdin.isTTY;
process.stderr.write('Senha: ');
if (tty) process.stdin.setRawMode(true);
let senha = '';
leitura: for await (const pedaco of process.stdin) {
	for (const c of String(pedaco)) {
		if (c === '\u0003') process.exit(130); // Ctrl+C
		if (c === '\r' || c === '\n') break leitura;
		senha = c === '\u007f' || c === '\b' ? senha.slice(0, -1) : senha + c;
	}
}
if (tty) process.stdin.setRawMode(false);
process.stdin.pause();
process.stderr.write('\n');

if (senha.length < 12) {
	console.error('Use ao menos 12 caracteres.');
	process.exit(1);
}
console.log(await hashSenha(senha));
