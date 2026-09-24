import sanitizeHtml from 'sanitize-html';

// Whitelist do TipTap (StarterKit + Link) — #4, ADR 0002. Cobre parágrafo,
// negrito, itálico, riscado, código, listas, task list, link, títulos h1-h3,
// citação, linha horizontal e tabela (mesmo sem extensão ativa hoje: cola de
// HTML externo pode trazer essas tags, e a whitelist é a única defesa).
const TAGS = [
	'p',
	'br',
	'strong',
	'em',
	's',
	'code',
	'pre',
	'ul',
	'ol',
	'li',
	'a',
	'h1',
	'h2',
	'h3',
	'blockquote',
	'hr',
	'label',
	'input',
	'span',
	'table',
	'thead',
	'tbody',
	'tr',
	'th',
	'td'
];

const ATRIBUTOS: sanitizeHtml.IOptions['allowedAttributes'] = {
	a: ['href', 'target', 'rel'],
	ul: ['data-type'],
	li: ['data-checked'],
	input: ['type', 'checked', 'disabled'],
	th: ['colspan', 'rowspan'],
	td: ['colspan', 'rowspan'],
	'*': []
};

const ESQUEMAS = ['http', 'https', 'mailto'];

const OPCOES: sanitizeHtml.IOptions = {
	allowedTags: TAGS,
	allowedAttributes: ATRIBUTOS,
	allowedSchemes: ESQUEMAS,
	allowedSchemesByTag: { a: ESQUEMAS },
	disallowedTagsMode: 'discard',
	transformTags: {
		// Todo link ganha target/rel — mesmo tratamento para link interno e
		// externo, mais simples que distinguir os dois (#4).
		a: (_tagName, attribs) => ({
			tagName: 'a',
			attribs: { href: attribs.href ?? '', target: '_blank', rel: 'noopener noreferrer nofollow' }
		})
	}
};

/** HTML do TipTap → HTML seguro para gravar e renderizar com `{@html}` (#4, ADR 0002). */
export function sanitizar(html: string): string {
	return sanitizeHtml(html ?? '', OPCOES);
}

// Fecho de bloco sem espaço (`</li><li>`) colaria palavras na extração de texto.
const FIM_DE_BLOCO = /<\/(p|li|h[1-6]|blockquote|td|th|tr)>|<br\s*\/?>/gi;

/** Segunda passagem sobre HTML já sanitizado: texto puro para o FTS5 (#4, ADR 0002). */
export function paraTexto(htmlSanitizado: string): string {
	const espacado = (htmlSanitizado ?? '').replace(FIM_DE_BLOCO, '$& ');
	return sanitizeHtml(espacado, { allowedTags: [], allowedAttributes: {} })
		.replace(/\s+/g, ' ')
		.trim();
}
