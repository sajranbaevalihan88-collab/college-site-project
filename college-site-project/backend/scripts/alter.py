import sqlite3
conn = sqlite3.connect('../database/sqlite.db')
try:
    conn.execute('ALTER TABLE notifications ADD COLUMN target_audience TEXT DEFAULT "ALL"')
    conn.commit()
    print("Success")
except Exception as e:
    print(e)
