import { existsSync } from 'node:fs';
import type Database from 'better-sqlite3';

/**
 * Aplica, em ordem, as migrações ainda não aplicadas. A versão vive em
 * `PRAGMA user_version`: a migração N leva o banco à versão N. Cada uma roda
 * numa transação, então uma falha deixa o banco na versão anterior (#2).
 * Antes de migrar um banco já em uso, grava `<banco>.v<atual>.bak` por
 * `VACUUM INTO`: é o ponto de volta de um rollback de imagem (#13).
 */
export function migrar(db: Database.Database, migracoes: Record<string, string>) {
	const atual = db.pragma('user_version', { simple: true }) as number;
	const pendentes = Object.entries(migracoes)
		.map(([nome, sql]) => ({ versao: parseInt(nome.split('/').pop()!, 10), sql }))
		.sort((a, b) => a.versao - b.versao)
		.filter((m) => m.versao > atual);
	if (atual > 0 && pendentes.length && !db.memory) {
		const bak = `${db.name}.v${atual}.bak`;
		if (!existsSync(bak)) db.prepare('VACUUM INTO ?').run(bak);
	}
	for (const { versao, sql } of pendentes) {
		db.transaction(() => {
			db.exec(sql);
			db.pragma(`user_version = ${versao}`);
		})();
	}
}
