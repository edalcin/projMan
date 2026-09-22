import { building } from '$app/environment';
import { env } from '$env/dynamic/private';
import Database from 'better-sqlite3';
import { migrar } from './migrar';

function abrir() {
	const db = new Database(env.DB_PATH ?? '/data/projman.db');
	// Pragmas de #2. foreign_keys vem desligado por padrão no SQLite: sem ele,
	// nenhum ON DELETE CASCADE do schema acontece.
	db.pragma('journal_mode = WAL');
	db.pragma('busy_timeout = 5000');
	db.pragma('synchronous = NORMAL');
	db.pragma('foreign_keys = ON');
	// Vite embute os .sql no build: a imagem não precisa copiar a pasta.
	migrar(db, import.meta.glob('/migrations/*.sql', { query: '?raw', import: 'default', eager: true }));
	return db;
}

// O build do SvelteKit importa os módulos de servidor para analisá-los; nessa
// fase não há banco nem DB_PATH. Nenhuma rota roda durante o build.
export const db = building ? (undefined as unknown as Database.Database) : abrir();
