import assert from 'node:assert/strict';
import test from 'node:test';
import { formatarPrazo } from './prazo.ts';

const TZ = 'America/Sao_Paulo';
const AGORA = Date.parse('2026-09-22T15:00:00.000Z'); // 22/09 12:00 local

test('prazo relativo ao dia local, atrasada só antes do início de hoje', () => {
	const f = (iso: string, diaInteiro = true) => formatarPrazo(iso, diaInteiro, TZ, AGORA);
	// 23/09 02:59 UTC ainda é 22/09 local: hoje, não amanhã
	assert.deepEqual(f('2026-09-23T02:59:59.999Z'), { texto: 'hoje', atrasada: false });
	// vence hoje com hora já passada: fica em Hoje, não atrasada (#11)
	assert.deepEqual(f('2026-09-22T12:00:00.000Z', false), { texto: 'hoje 09:00', atrasada: false });
	assert.deepEqual(f('2026-09-23T15:00:00.000Z'), { texto: 'amanhã', atrasada: false });
	assert.deepEqual(f('2026-09-22T02:59:59.999Z'), { texto: 'ontem', atrasada: true });
	assert.deepEqual(f('2026-10-12T15:00:00.000Z'), { texto: '12 de out', atrasada: false });
	assert.equal(f('2027-01-05T15:00:00.000Z').texto, '5 de jan de 2027');
});
