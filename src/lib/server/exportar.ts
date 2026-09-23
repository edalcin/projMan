import { randomBytes } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable, pipeline } from 'node:stream';
import { createGzip } from 'node:zlib';
import Database from 'better-sqlite3';

const BLOCO = 512;

/** Cabeçalho ustar. Tamanho em 11 dígitos octais: teto de 8 GiB por arquivo. */
function cabecalho(nome: string, tamanho: number, mtimeMs: number): Buffer {
	if (Buffer.byteLength(nome) > 100) throw new Error(`export: nome longo demais para ustar: ${nome}`);
	const h = Buffer.alloc(BLOCO);
	const octal = (n: number, largura: number) => n.toString(8).padStart(largura, '0') + '\0';
	h.write(nome, 0);
	h.write(octal(0o644, 7), 100);
	h.write(octal(0, 7), 108); // uid
	h.write(octal(0, 7), 116); // gid
	h.write(octal(tamanho, 11), 124);
	h.write(octal(Math.floor(mtimeMs / 1000), 11), 136);
	h.write(' '.repeat(8), 148); // checksum conta como espaços
	h.write('0', 156); // arquivo comum
	h.write('ustar\u000000', 257);
	let soma = 0;
	for (const b of h) soma += b;
	h.write(octal(soma, 6) + ' ', 148);
	return h;
}

async function* entradas(dbPath: string, arquivos: { nome: string; caminho: string }[]) {
	try {
		for (const { nome, caminho } of arquivos) {
			let s;
			try {
				s = await stat(caminho);
			} catch {
				continue; // anexo apagado entre o snapshot e a leitura: o banco manda
			}
			yield cabecalho(nome, s.size, s.mtimeMs);
			yield* createReadStream(caminho);
			if (s.size % BLOCO) yield Buffer.alloc(BLOCO - (s.size % BLOCO));
		}
		yield Buffer.alloc(BLOCO * 2); // fim do arquivo tar
	} finally {
		// roda também quando o download é cancelado
		await rm(dbPath, { force: true });
	}
}

/**
 * Export (#12): `.tar.gz` com `projman.db` (snapshot por VACUUM INTO) e
 * `files/<stored_name>` de cada anexo que o snapshot referencia. Órfãos no
 * disco ficam de fora. Stream: memória constante, qualquer que seja o tamanho.
 * Restaurar = descompactar nos volumes (README); não há rota de import.
 */
export function exportar(db: Database.Database, filesPath: string): Readable {
	const snapshot = join(tmpdir(), `projman-export-${randomBytes(8).toString('hex')}.db`);
	db.prepare('VACUUM INTO ?').run(snapshot);
	const copia = new Database(snapshot, { readonly: true });
	const anexos = copia.prepare('SELECT stored_name FROM attachments ORDER BY id').pluck().all() as string[];
	copia.close();
	const arquivos = [
		{ nome: 'projman.db', caminho: snapshot },
		...anexos.map((n) => ({ nome: `files/${n}`, caminho: join(filesPath, n) }))
	];
	const gz = createGzip();
	// pipeline, não pipe: cancelar o download destrói a fonte e o finally apaga o snapshot
	pipeline(Readable.from(entradas(snapshot, arquivos)), gz, () => {});
	return gz;
}
