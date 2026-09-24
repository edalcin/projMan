// Ponte para o seed em Python (scripts/seed-vikunja.py) reaproveitar a MESMA
// whitelist de src/lib/server/html.ts, sem duplicá-la: lê um array JSON de HTML
// bruto (stdin), devolve um array JSON de { html, texto } já sanitizados (stdout).
import { paraTexto, sanitizar } from '../src/lib/server/html.ts';

let entrada = '';
for await (const pedaco of process.stdin) entrada += pedaco;

const brutos: string[] = JSON.parse(entrada || '[]');
const saida = brutos.map((h) => {
	const html = sanitizar(h ?? '');
	return { html, texto: paraTexto(html) };
});
process.stdout.write(JSON.stringify(saida));
