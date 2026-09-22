import assert from 'node:assert/strict';
import test from 'node:test';
import { limitesDoDia, proximoPrazo, somarCiclo } from './datas.ts';

const TZ = 'America/Sao_Paulo'; // UTC-3, sem horario de verao

test('o dia civil local vira uma janela UTC deslocada', () => {
	const { inicio, fim } = limitesDoDia(Date.parse('2026-09-22T15:00:00Z'), TZ);
	assert.equal(new Date(inicio).toISOString(), '2026-09-22T03:00:00.000Z');
	assert.equal(new Date(fim).toISOString(), '2026-09-23T02:59:59.999Z');
});

test('instante que ja e o dia seguinte em UTC ainda pertence ao dia local', () => {
	const { inicio } = limitesDoDia(Date.parse('2026-09-23T01:00:00Z'), TZ);
	assert.equal(new Date(inicio).toISOString(), '2026-09-22T03:00:00.000Z');
});

test('mais um mes a partir de 31 de janeiro faz clamp em fevereiro', () => {
	const t = somarCiclo(Date.parse('2026-01-31T12:00:00Z'), 1, 'month', TZ);
	assert.equal(new Date(t).toISOString(), '2026-02-28T12:00:00.000Z');
});

test('o ciclo seguinte parte do prazo ja ajustado, nao do dia 31', () => {
	const fev = somarCiclo(Date.parse('2026-01-31T12:00:00Z'), 1, 'month', TZ);
	assert.equal(new Date(somarCiclo(fev, 1, 'month', TZ)).toISOString(), '2026-03-28T12:00:00.000Z');
});

test('recorrente atrasada por varios ciclos pula para a proxima futura', () => {
	const proximo = proximoPrazo(
		'2026-01-05T12:00:00Z',
		1,
		'week',
		TZ,
		Date.parse('2026-02-01T00:00:00Z')
	);
	assert.equal(proximo, '2026-02-02T12:00:00.000Z');
});

test('o proximo prazo e sempre futuro, mesmo com o prazo ja no limite', () => {
	const agora = Date.parse('2026-03-10T09:00:00Z');
	const proximo = proximoPrazo('2026-03-10T09:00:00Z', 1, 'day', TZ, agora);
	assert.equal(proximo, '2026-03-11T09:00:00.000Z');
});
