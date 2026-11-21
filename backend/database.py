import sqlite3
import datetime
import math

DB_PATH = "hunter.db"

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        
        # 1. Глобальный реестр шаблонов квестов
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS global_registry (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                key TEXT UNIQUE, label_ru TEXT, label_en TEXT,
                target_base REAL, unit_ru TEXT, unit_en TEXT, type TEXT,
                is_ai_controlled INTEGER DEFAULT 1
            )
        """)
        
        # 2. Базовые характеристики Охотника
        # ИЗМЕНЕНО: добавлены penalty_quest_key, penalty_progress, penalty_target —
        # penalty-состояние вынесено из system_message в отдельные поля.
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS hunter_profile (
                id INTEGER PRIMARY KEY,
                name TEXT, level INTEGER, xp INTEGER, xp_needed INTEGER, gold INTEGER,
                stat_points INTEGER, title_ru TEXT, title_en TEXT, language TEXT, penalty INTEGER,
                strength INTEGER, agility INTEGER, intelligence INTEGER, dexterity INTEGER,
                system_message TEXT, last_gate_date TEXT, active_shadow TEXT,
                weight REAL, height REAL, age INTEGER, fitness_goal TEXT,
                last_rollover_date TEXT,
                penalty_quest_key TEXT,
                penalty_progress REAL DEFAULT 0,
                penalty_target REAL DEFAULT 0
            )
        """)
        
        # 3. Текущий прогресс квестов на сегодня
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS daily_progress (
                key TEXT PRIMARY KEY, progress REAL, target REAL, completed INTEGER
            )
        """)
        
        # 4. ТЕНЕВАЯ АРМИЯ: Таблица извлеченных теней (Реляционная связь)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS extracted_shadows (
                shadow_id TEXT PRIMARY KEY,
                extracted_at TEXT
            )
        """)
        
        # 5. ВРАТА: Таблица истории рейдов (Реляционная связь)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS gate_raids (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT, rank TEXT, label TEXT, success INTEGER, gold_change INTEGER, xp_change INTEGER
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS daily_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT, quest_key TEXT, final_progress REAL, final_target REAL
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS chat_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp TEXT, sender TEXT, message_text TEXT
            )
        """)
                       
        # ДОБАВЛЕНО: обратная совместимость — если penalty=1 и system_message в формате PENALTY_ACTIVE:...,
        # переносим значения в новые поля, а system_message очищаем.
        cursor.execute("SELECT penalty, system_message FROM hunter_profile WHERE id = 1")
        row = cursor.fetchone()
        if row and row[0] == 1 and row[1] and row[1].startswith("PENALTY_ACTIVE:"):
            parts = row[1].split(":")
            if len(parts) == 4:
                cursor.execute(
                    "UPDATE hunter_profile SET penalty_quest_key = ?, penalty_progress = ?, penalty_target = ?, system_message = ? WHERE id = 1",
                    (parts[1], float(parts[2]), float(parts[3]), "Penalty active. Complete the task.")
                )
        
        # Заполняем дефолтные квесты
        cursor.execute("SELECT COUNT(*) FROM global_registry")
        if cursor.fetchone()[0] == 0:
            defaults = [
                ("pushups", "Отжимания", "Push-ups", 50.0, "раз", "reps", "strength", 1),
                ("running", "Бег", "Running", 5.0, "км", "km", "agility", 1),
                ("studying", "Учеба", "Studying", 60.0, "мин", "min", "intelligence", 0),
                ("coding", "Кодинг", "Coding", 90.0, "мин", "min", "dexterity", 0)
            ]
            cursor.executemany("INSERT INTO global_registry (key, label_ru, label_en, target_base, unit_ru, unit_en, type, is_ai_controlled) VALUES (?,?,?,?,?,?,?,?)", defaults)
            
        # Заполняем базовый профиль
        cursor.execute("SELECT COUNT(*) FROM hunter_profile")
        if cursor.fetchone()[0] == 0:
            cursor.execute("""
                INSERT INTO hunter_profile (
                    id, name, level, xp, xp_needed, gold, stat_points, title_ru, title_en, language, penalty,
                    strength, agility, intelligence, dexterity, system_message, last_gate_date, active_shadow,
                    weight, height, age, fitness_goal, last_rollover_date,
                    penalty_quest_key, penalty_progress, penalty_target
                ) VALUES (
                    1, 'Sung Jinwoo', 1, 0, 100, 100, 5, 'Охотник E-ранга', 'E-Rank Hunter', 'ru', 0,
                    10, 10, 10, 10, 'System initialized.', NULL, NULL,
                    70.0, 170.0, 25, 'all-round', NULL,
                    NULL, 0.0, 0.0
                )
            """)
        conn.commit()    


def load_profile_dict() -> dict:
    with get_db_connection() as conn:
        row = conn.execute("SELECT * FROM hunter_profile WHERE id = 1").fetchone()
        if not row:
            return {}
        p = dict(row)
        
        # Выгружаем список извлеченных теней из реляционной таблицы extracted_shadows
        shadow_rows = conn.execute("SELECT shadow_id FROM extracted_shadows").fetchall()
        p["shadows_owned"] = [r["shadow_id"] for r in shadow_rows]
        return p

def save_profile_dict(p: dict):
    with get_db_connection() as conn:
        conn.execute("""
            UPDATE hunter_profile SET
                name = ?, level=?, xp=?, xp_needed=?, gold=?, stat_points=?, title_ru=?, title_en=?,
                language=?, penalty=?, strength=?, agility=?, intelligence=?, dexterity=?,
                system_message=?, last_gate_date=?, active_shadow=?, weight=?, height=?, age=?, fitness_goal=?,
                last_rollover_date=?, penalty_quest_key=?, penalty_progress=?, penalty_target=?
            WHERE id = 1
        """, (p["name"], p["level"], p["xp"], p["xp_needed"], p["gold"], p["stat_points"], p["title_ru"], p["title_en"],
              p["language"], p["penalty"], p["strength"], p["agility"], p["intelligence"], p["dexterity"],
              p["system_message"], p["last_gate_date"], p.get("active_shadow"), p["weight"], p["height"], p["age"], p["fitness_goal"],
              p.get("last_rollover_date"), p.get("penalty_quest_key"), p.get("penalty_progress", 0.0), p.get("penalty_target", 0.0)))
        conn.commit()

def get_all_global_quests() -> list:
    with get_db_connection() as conn:
        return [dict(r) for r in conn.execute("SELECT * FROM global_registry").fetchall()]

def get_daily_progress_list() -> list:
    with get_db_connection() as conn:
        progress_rows = conn.execute("SELECT * FROM daily_progress").fetchall()
        progress_map = {r["key"]: r for r in progress_rows}
        
        global_quests = get_all_global_quests()
        result = []
        for g in global_quests:
            prog = progress_map.get(g["key"], {"progress": 0.0, "target": g["target_base"], "completed": 0})
            result.append({
                "key": g["key"], "label_ru": g["label_ru"], "label_en": g["label_en"],
                "progress": prog["progress"], "target": prog["target"],
                "unit_ru": g["unit_ru"], "unit_en": g["unit_en"],
                "type": g["type"], "completed": bool(prog["completed"])
            })
        return result

def sync_daily_progress(level: int):
    """
    Гарантирует, что daily_progress содержит ровно те ключи, что в global_registry.
    - Удаляет осиротевшие ключи (квесты, удалённые из global_registry).
    - Добавляет недостающие (новые квесты, пустая таблица после сброса).
    - Существующие квесты не трогает (прогресс сохраняется).
    """
    global_templates = get_all_global_quests()
    with get_db_connection() as conn:
        existing = {r["key"] for r in conn.execute("SELECT key FROM daily_progress").fetchall()}
        valid = {g["key"] for g in global_templates}

        # Удаляем осиротевшие
        for orphan in existing - valid:
            conn.execute("DELETE FROM daily_progress WHERE key = ?", (orphan,))

        # Добавляем недостающие
        for g in global_templates:
            if g["key"] not in existing:
                scaled_target = math.floor(g["target_base"] * (1 + (level - 1) * 0.08))
                conn.execute(
                    "INSERT INTO daily_progress (key, progress, target, completed) VALUES (?, 0.0, ?, 0)",
                    (g["key"], scaled_target)
                )
        conn.commit()
