"""Banco novo com os dados de um projeto do Vikunja (só leitura na API).

Não é importador do produto (importadores estão fora do v1). Serve para o banco
de dev e para a carga inicial da produção. Cria o banco do zero:

    python scripts/seed-vikunja.py "Entre Ciências" .dev-wipe-me.db
    python scripts/seed-vikunja.py "Entre Ciências" projman.db --substituir

VIKUNJA_URL e VIKUNJA_TOKEN vêm do ambiente ou do `.env` local (ignorado pelo
git; nunca commitar). Um banco que já existe só é trocado com `--substituir`.
Fica de fora: comentários e anexos (item 8) e o HTML da descrição (só o texto
vai para description_text até a sanitização do item 4).
"""

import html
import json
import os
import re
import sqlite3
import sys
import urllib.request
from pathlib import Path

# .env local sem dependência: KEY=valor por linha; o ambiente tem precedência.
_env = Path(__file__).resolve().parent.parent / '.env'
if _env.exists():
    for _linha in _env.read_text(encoding='utf-8').splitlines():
        _k, _, _v = _linha.partition('=')
        if _v and not _k.lstrip().startswith('#'):
            os.environ.setdefault(_k.strip(), _v.strip())

API = os.environ.get('VIKUNJA_URL', 'https://vikunja.dalc.in/api/v1')
NULO = '0001-01-01T00:00:00Z'  # "sem data" no Vikunja
BUCKET = {'To-Do': 'A fazer', 'Doing': 'Fazendo', 'Done': 'Feito'}


def vk(caminho):
    # Sem User-Agent o Cloudflare na frente do Vikunja responde 403.
    req = urllib.request.Request(
        API + caminho,
        headers={'Authorization': 'Bearer ' + os.environ['VIKUNJA_TOKEN'], 'User-Agent': 'projman-seed/1'},
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read()), r.headers


def paginas(caminho):
    itens, pagina = [], 1
    while True:
        lote, h = vk(f'{caminho}{"&" if "?" in caminho else "?"}per_page=200&page={pagina}')
        itens += lote or []
        if pagina >= int(h.get('x-pagination-total-pages') or 1):
            return itens
        pagina += 1


def instante(v):
    """ISO do Vikunja → formato canônico do projMan (toISOString, com ms)."""
    return None if not v or v == NULO else v.replace('Z', '.000Z') if '.' not in v else v


def texto(h):
    return html.unescape(re.sub(r'<[^>]+>', ' ', re.sub(r'<!--.*?-->', '', h or ''))).split()


def main(nome, destino, substituir):
    # Proteção contra perda de dados: trocar um banco existente exige pedido explícito.
    if Path(destino).exists() and not substituir:
        sys.exit(f'{destino} já existe. Use --substituir para apagá-lo e recriar.')
    projeto = next(p for p in vk('/projects')[0] if p['title'] == nome)
    views = {v['view_kind']: v for v in vk(f'/projects/{projeto["id"]}/views')[0]}
    lista = views['list']['id']
    tarefas = paginas(f'/projects/{projeto["id"]}/views/{lista}/tasks?filter=done%3Dtrue%7C%7Cdone%3Dfalse')
    feitas = paginas(f'/projects/{projeto["id"]}/views/{lista}/tasks?filter=done%3Dtrue')
    tarefas = list({t['id']: t for t in tarefas + feitas}.values())
    coluna = {}  # id da tarefa no Vikunja → título do bucket
    if 'kanban' in views:
        for b in vk(f'/projects/{projeto["id"]}/views/{views["kanban"]["id"]}/tasks?per_page=500')[0]:
            for t in b.get('tasks') or []:
                coluna[t['id']] = BUCKET.get(b['title'], 'A fazer')

    Path(destino).unlink(missing_ok=True)
    for sufixo in ('-wal', '-shm'):
        Path(destino + sufixo).unlink(missing_ok=True)
    db = sqlite3.connect(destino)
    db.execute('PRAGMA foreign_keys = ON')
    for i, f in enumerate(sorted(Path('migrations').glob('*.sql')), 1):
        db.executescript(f.read_text(encoding='utf-8'))
        db.execute(f'PRAGMA user_version = {i}')

    pid = db.execute('INSERT INTO projects (title, position) VALUES (?, 1024)', (nome,)).lastrowid
    vl = db.execute("SELECT id FROM project_views WHERE project_id = ? AND view_kind = 'list'", (pid,)).fetchone()[0]
    vkb = db.execute("SELECT id FROM project_views WHERE project_id = ? AND view_kind = 'kanban'", (pid,)).fetchone()[0]
    buckets = dict(db.execute('SELECT title, id FROM buckets WHERE project_view_id = ?', (vkb,)))

    labels = {}
    for t in tarefas:
        for l in t.get('labels') or []:
            if l['title'] not in labels:
                cor = (l.get('hex_color') or '').lower().lstrip('#') or None
                labels[l['title']] = db.execute('INSERT INTO labels (title, hex_color) VALUES (?, ?)', (l['title'], cor)).lastrowid

    # Mães antes das filhas: o schema só aceita subtarefa de uma tarefa de 1º nível.
    mae = {s['id']: t['id'] for t in tarefas for s in (t.get('related_tasks') or {}).get('subtask') or []}
    ids = {}
    for t in sorted(tarefas, key=lambda t: (t['id'] in mae, t['position'])):
        due = instante(t['due_date'])
        pai = ids.get(mae.get(t['id']))
        try:
            novo = db.execute(
                'INSERT INTO tasks (project_id, parent_task_id, title, description_text, done, done_at, due_date,'
                ' due_all_day, priority, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
                (pid, pai, t['title'], ' '.join(texto(t['description'])), int(t['done']),
                 instante(t['done_at']) if t['done'] else None, due,
                 1 if due and due[11:16] in ('12:00', '00:00') else 0,  # Vikunja não marca "dia inteiro"
                 min(max(t['priority'], 0), 5), instante(t['created'])),
            ).lastrowid
        except sqlite3.IntegrityError:  # neta no Vikunja: vira tarefa de 1º nível
            print('subtarefa de 2º nível promovida:', t['title'])
            novo = db.execute('INSERT INTO tasks (project_id, title) VALUES (?, ?)', (pid, t['title'])).lastrowid
        ids[t['id']] = novo
        db.executemany('INSERT INTO task_labels VALUES (?, ?)', [(novo, labels[l['title']]) for l in t.get('labels') or []])
        db.execute('INSERT INTO task_positions VALUES (?, ?, ?)', (novo, vl, t['position']))
        col = 'Feito' if t['done'] else coluna.get(t['id'], 'A fazer')
        db.execute('INSERT INTO task_buckets VALUES (?, ?, ?, ?)', (novo, vkb, buckets[col], t['position']))
    db.commit()
    print(f'{nome}: {len(ids)} tarefas ({sum(t["done"] for t in tarefas)} feitas, {len(mae)} subtarefas), {len(labels)} labels → {destino}')


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if a != '--substituir']
    main(args[0], args[1], '--substituir' in sys.argv)
