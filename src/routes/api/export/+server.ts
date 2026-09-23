import { env } from '$env/dynamic/private';
import { Readable } from 'node:stream';
import { db } from '$lib/server/db';
import { exportar } from '$lib/server/exportar';

/** GET /api/export — baixa o `.tar.gz` (#12). Exige sessão (hook). */
export function GET() {
	const dia = new Date().toISOString().slice(0, 10);
	return new Response(Readable.toWeb(exportar(db, env.FILES_PATH ?? '/files')) as ReadableStream, {
		headers: {
			'Content-Type': 'application/gzip',
			'Content-Disposition': `attachment; filename="projman-${dia}.tar.gz"`,
			'Cache-Control': 'no-store'
		}
	});
}
