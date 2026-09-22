import assert from 'node:assert/strict';
import test from 'node:test';
import { MAX_FALHAS, JANELA_MS, bloqueadoPor, limparFalhas, registrarFalha } from './limite.ts';
import { DURACAO_S, criarSessao, sessaoValida } from './sessao.ts';
import { hashSenha, verificarSenha } from './senha.ts';

const SEGREDO = 'x'.repeat(32);

test('senha certa passa, errada não, hash malformado não', async () => {
	const h = await hashSenha('correta-e-longa');
	assert.equal(await verificarSenha('correta-e-longa', h), true);
	assert.equal(await verificarSenha('errada', h), false);
	assert.equal(await verificarSenha('correta-e-longa', 'scrypt:1:2'), false);
	assert.equal(await verificarSenha('correta-e-longa', ''), false);
});

test('sessão vale até expirar e nunca depois', () => {
	const agora = 1_000_000;
	const s = criarSessao(SEGREDO, agora);
	assert.equal(sessaoValida(s, SEGREDO, agora + 1), true);
	assert.equal(sessaoValida(s, SEGREDO, agora + DURACAO_S * 1000), false);
});

test('sessão adulterada ou de outro segredo é rejeitada', () => {
	const s = criarSessao(SEGREDO);
	const [exp, sig] = s.split('.');
	assert.equal(sessaoValida(`${+exp + 999999}.${sig}`, SEGREDO), false, 'estender a validade');
	assert.equal(sessaoValida(s, 'y'.repeat(32)), false, 'segredo rotacionado');
	assert.equal(sessaoValida('lixo', SEGREDO), false);
	assert.equal(sessaoValida(undefined, SEGREDO), false);
});

test('bloqueia na quinta falha e libera quando a janela passa', () => {
	const ip = '203.0.113.1';
	const t0 = 5_000_000;
	for (let i = 0; i < MAX_FALHAS - 1; i++) registrarFalha(ip, t0);
	assert.equal(bloqueadoPor(ip, t0), 0);
	registrarFalha(ip, t0);
	assert.ok(bloqueadoPor(ip, t0) > 0);
	assert.equal(bloqueadoPor(ip, t0 + JANELA_MS), 0);
});

test('login certo zera as falhas; IPs não se misturam', () => {
	const t0 = 9_000_000;
	for (let i = 0; i < MAX_FALHAS; i++) registrarFalha('203.0.113.2', t0);
	assert.equal(bloqueadoPor('203.0.113.3', t0), 0);
	limparFalhas('203.0.113.2');
	assert.equal(bloqueadoPor('203.0.113.2', t0), 0);
});
