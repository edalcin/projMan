import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { env } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';
import { buscarAnexo, apagarAnexo } from '$lib/server/anexos';
import { db } from '$lib/server/db';
import type { RequestHandler } from './$types';

function idValido(param: string | undefined): number {
	const id = Number(param);
	if (!Number.isInteger(id) || id <= 0) error(400, 'id inválido.');
	return id;
}

/** GET /api/anexos/<id> → bytes do arquivo, com o nome original no download. */
export const GET: RequestHandler = async ({ params }) => {
	const anexo = buscarAnexo(db, idValido(params.id));
	if (!anexo) error(404, 'anexo não existe.');
	const filesPath = env.FILES_PATH ?? '/files';
	let bytes;
	try {
		bytes = await readFile(join(filesPath, anexo.stored_name));
	} catch {
		error(404, 'arquivo não existe em disco.');
	}
	return new Response(bytes, {
		headers: {
			'Content-Type': anexo.mime,
			'Content-Length': String(anexo.size),
			'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(anexo.file_name)}`
		}
	});
};

/** DELETE /api/anexos/<id> → 204. Apaga a linha e o arquivo (ADR 0005). */
export const DELETE: RequestHandler = async ({ params }) => {
	if (!(await apagarAnexo(db, env.FILES_PATH ?? '/files', idValido(params.id)))) error(404, 'anexo não existe.');
	return new Response(null, { status: 204 });
};
