import os
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = Path(os.getenv('ARTIVO_DB', str(ROOT / 'data/artivo.sqlite3')))

class Connection(sqlite3.Connection):
    def __exit__(self, *args):
        try:
            return super().__exit__(*args)
        finally:
            self.close()

def connect():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(DB_PATH, timeout=15, factory=Connection)
    db.row_factory = sqlite3.Row
    db.execute('PRAGMA foreign_keys=ON')
    return db

def init():
    with connect() as db:
        db.executescript((ROOT / 'artivo/schema.sql').read_text())
        columns = {r[1] for r in db.execute('PRAGMA table_info(reports)')}
        if 'target_kind' not in columns:
            db.execute("ALTER TABLE reports ADD COLUMN target_kind TEXT DEFAULT 'BOOKING'")
        if 'target_id' not in columns:
            db.execute('ALTER TABLE reports ADD COLUMN target_id INTEGER')

def rows(cursor):
    return [dict(r) for r in cursor.fetchall()]
