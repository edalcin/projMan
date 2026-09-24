import assert from 'node:assert/strict';
import test from 'node:test';
import { paraTexto, sanitizar } from './html.ts';

test('sanitizar remove tags fora da whitelist (script)', () => {
	assert.equal(sanitizar('<script>alert(1)</script><p>oi</p>'), '<p>oi</p>');
});

test('sanitizar remove atributo de evento (onerror) e a tag não permitida junto', () => {
	assert.equal(sanitizar('<img src=x onerror="alert(1)"><p>oi</p>'), '<p>oi</p>');
});

test('sanitizar bloqueia esquema javascript: no href', () => {
	assert.equal(sanitizar('<a href="javascript:alert(1)">click</a>'), '<a target="_blank" rel="noopener noreferrer nofollow">click</a>');
});

test('sanitizar bloqueia esquema data: no href', () => {
	assert.equal(sanitizar('<a href="data:text/html,evil">click</a>'), '<a target="_blank" rel="noopener noreferrer nofollow">click</a>');
});

test('sanitizar mantém http(s)/mailto e sempre adiciona rel/target no link', () => {
	assert.equal(
		sanitizar('<a href="https://example.com">ex</a>'),
		'<a href="https://example.com" target="_blank" rel="noopener noreferrer nofollow">ex</a>'
	);
	assert.equal(
		sanitizar('<a href="mailto:a@b.com">mail</a>'),
		'<a href="mailto:a@b.com" target="_blank" rel="noopener noreferrer nofollow">mail</a>'
	);
});

test('sanitizar mantém formatação básica do TipTap', () => {
	assert.equal(
		sanitizar('<p><strong>Bold</strong> <em>it</em> <s>ris</s> <code>c</code></p><ul><li>um</li></ul><ol><li>dois</li></ol>'),
		'<p><strong>Bold</strong> <em>it</em> <s>ris</s> <code>c</code></p><ul><li>um</li></ul><ol><li>dois</li></ol>'
	);
});

test('paraTexto extrai texto puro e separa blocos com espaço', () => {
	const html = sanitizar('<p>Um</p><ul><li>item 1</li><li>item 2</li></ul><p>Fim.</p>');
	assert.equal(paraTexto(html), 'Um item 1 item 2 Fim.');
});

test('paraTexto normaliza espaços e ignora HTML residual', () => {
	assert.equal(paraTexto('<p>a   b</p>\n<p>c</p>'), 'a b c');
});

test('sanitizar e paraTexto lidam com string vazia', () => {
	assert.equal(sanitizar(''), '');
	assert.equal(paraTexto(''), '');
});
