import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buffer } from 'node:stream/consumers';
import test from 'node:test';
import Database from 'better-sqlite3';
import { exportar } from './exportar.ts';
import { feedIcal, tokenValido } from './ical.ts';
import { migrar } from './migrar.ts';

const dir = new URL('../../../migrations/', import.meta.url);

function banco(caminho = ':memory:') {
	const db = new Database(caminho);
	db.pragma('foreign_keys = ON');
	migrar(db, Object.fromEntries(readdirSync(dir).map((f) => [f, readFileSync(new URL(f, dir), 'utf8')])));
	db.prepare("INSERT INTO projects (id, title) VALUES (1, 'Herbário'), (2, 'Velho')").run();
	db.prepare('UPDATE projects SET archived = 1 WHERE id = 2').run();
	const t = db.prepare('INSERT INTO tasks (id, project_id, title, due_date, due_all_day, done, done_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
	t.run(1, 1, 'dia inteiro', '2026-09-23T02:59:59.999Z', 1, 0, null); // fim de 22/09 em SP
	t.run(2, 1, 'com hora; vírgula, e\nlinha', '2026-09-22T17:30:00.000Z', 0, 0, null);
	t.run(3, 1, 'sem prazo', null, 1, 0, null);
	t.run(4, 1, 'feita', '2026-09-22T17:30:00.000Z', 0, 1, '2026-09-22T18:00:00.000Z');
	t.run(5, 2, 'arquivado', '2026-09-22T17:30:00.000Z', 0, 0, null);
	t.run(6, 1, 'ç'.repeat(80), '2026-09-24T12:00:00.000Z', 0, 0, null);
	return db;
}

test('feed: só abertas com prazo de projeto ativo, dia civil local, texto escapado e dobrado', () => {
	const ics = feedIcal(banco(), 'America/Sao_Paulo');
	assert.deepEqual([...ics.matchAll(/^UID:task-(\d+)@projman/gm)].map((m) => +m[1]), [2, 1, 6]);
	assert.match(ics, /UID:task-1@projman\r\nDTSTAMP:\d{8}T\d{6}Z\r\nDTSTART;VALUE=DATE:20260922\r\n/, 'dia do TZ, não do UTC');
	assert.match(ics, /DTSTART:20260922T173000Z/);
	assert.match(ics, /SUMMARY:com hora\\; vírgula\\, e\\nlinha/);
	for (const l of ics.split('\r\n')) assert.ok(Buffer.byteLength(l) <= 75, l);
	assert.ok(!ics.includes('\uFFFD'));
	// desdobrar devolve o título inteiro, sem caractere partido
	assert.ok(ics.replace(/\r\n /g, '').includes('SUMMARY:' + 'ç'.repeat(80)));
	assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
});

test('token do feed', () => {
	const tok = 'a'.repeat(40);
	assert.ok(tokenValido(tok, tok));
	assert.ok(!tokenValido('b'.repeat(40), tok));
	assert.ok(!tokenValido('', undefined), 'sem ICAL_TOKEN o feed não existe');
	assert.ok(!tokenValido('curto', 'curto'), 'token curto é recusado');
});

test('export: tar.gz que o tar do sistema abre, com snapshot e só os anexos referenciados', async () => {
	const base = mkdtempSync(join(tmpdir(), 'projman-teste-'));
	try {
		const files = join(base, 'files');
		mkdirSync(files);
		const db = banco(join(base, 'origem.db'));
		db.pragma('journal_mode = WAL');
		writeFileSync(join(files, 'abc123'), 'conteúdo do anexo');
		writeFileSync(join(files, 'orfao'), 'fica de fora');
		db.prepare("INSERT INTO attachments (task_id, file_name, stored_name, mime, size) VALUES (1, 'nota.txt', 'abc123', 'text/plain', 18)").run();
		const antes = readdirSync(tmpdir()).filter((f) => f.startsWith('projman-export-')).length;

		writeFileSync(join(base, 'saida.tar.gz'), await buffer(exportar(db, files)));
		const destino = join(base, 'x');
		mkdirSync(destino);
		execFileSync('tar', ['-xzf', 'saida.tar.gz', '-C', 'x'], { cwd: base });

		assert.deepEqual(readdirSync(destino).sort(), ['files', 'projman.db']);
		assert.deepEqual(readdirSync(join(destino, 'files')), ['abc123']);
		assert.equal(readFileSync(join(destino, 'files', 'abc123'), 'utf8'), 'conteúdo do anexo');
		const copia = new Database(join(destino, 'projman.db'), { readonly: true });
		assert.equal(copia.prepare('SELECT count(*) FROM tasks').pluck().get(), 6);
		copia.close();
		db.close();
		assert.equal(readdirSync(tmpdir()).filter((f) => f.startsWith('projman-export-')).length, antes, 'snapshot apagado');
	} finally {
		rmSync(base, { recursive: true, force: true });
	}
});
