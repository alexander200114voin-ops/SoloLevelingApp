import datetime
import random
import math
import database
import json
from schemas import AgentResponse, AgentAction, ALLOWED_GOALS

def get_required_xp(level: int) -> int:
    return 100 + (level - 1) * 60

def get_hunter_titles(level: int) -> tuple[str, str]:
    if level >= 45: return "Теневой Монарх", "Shadow Monarch"
    elif level >= 36: return "Охотник S-ранга", "S-Rank Hunter"
    elif level >= 28: return "Охотник A-ранга", "A-Rank Hunter"
    elif level >= 20: return "Охотник B-ранга", "B-Rank Hunter"
    elif level >= 12: return "Охотник C-ранга", "C-Rank Hunter"
    elif level >= 6: return "Охотник D-ранга", "D-Rank Hunter"
    return "Охотник E-ранга", "E-Rank Hunter"

def slugify_ru(text: str) -> str:
    """Пункт 8: Автоматическая генерация уникального ID на латинице из русского текста"""
    char_map = {'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'zh','з':'z','и':'i','й':'j','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'h','ц':'c','ч':'ch','ш':'sh','щ':'shch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya'}
    slug = "".join(char_map.get(c, c) for c in text.lower())
    slug = "".join(c for c in slug if c.isalnum() or c == '_')
    return slug if slug else f"quest_{int(datetime.datetime.now().timestamp())}"

def check_daily_rollover(p: dict):
    """Идеальная синхронизация дат: защищено от ложных штрафов при первом входе"""
    today_str = datetime.date.today().isoformat()

    current_quests = database.get_daily_progress_list()

    if not current_quests or not p.get("last_rollover_date"):
        p["last_rollover_date"] = today_str
        p["penalty"] = 0
        p["penalty_quest_key"] = None
        p["penalty_progress"] = 0.0
        p["penalty_target"] = 0.0
        p["system_message"] = "System core stabilized. Daily directives generated."
        database.sync_daily_progress(p["level"])
        return p

    if p["last_rollover_date"] == today_str:
        database.sync_daily_progress(p["level"])
        return p

    all_done = all(q["completed"] for q in current_quests)

    if not all_done:
        p["penalty"] = 1
        penalty_base_quest = random.choice(current_quests)
        penalty_target = math.floor(penalty_base_quest["target"] * 1.25)
        # ИЗМЕНЕНО: penalty-состояние — в отдельные поля
        p["penalty_quest_key"] = penalty_base_quest["key"]
        p["penalty_progress"] = 0.0
        p["penalty_target"] = float(penalty_target)
        p["system_message"] = "Penalty active. Complete the task."
    else:
        p["penalty"] = 0
        p["penalty_quest_key"] = None
        p["penalty_progress"] = 0.0
        p["penalty_target"] = 0.0
        p["system_message"] = "Daily directives cleared. System stabilizes."

        with database.get_db_connection() as conn:
            for q in current_quests:
                conn.execute(
                    "INSERT INTO daily_history (date, quest_key, final_progress, final_target) VALUES (?,?,?,?)",
                    (p["last_rollover_date"], q["key"], q["progress"], q["target"])
                )
            conn.commit()

    p["last_rollover_date"] = today_str

    if p["penalty"] == 0:
        database.sync_daily_progress(p["level"])

    return p


def advance_quest_progress(p: dict, quest_key: str, amount: float) -> tuple[dict, str]:
    """Учет прогресса с поддержкой выполнения штрафного квеста"""
    # Если активен ШТРАФ
    if p["penalty"] == 1:
        p_key = p.get("penalty_quest_key")
        p_curr = p.get("penalty_progress", 0.0)
        p_target = p.get("penalty_target", 0.0)

        if not p_key or p_target <= 0:
            return p, "Penalty state corrupted. Contact admin."

        if quest_key != p_key:
            return p, f"ACCESS DENIED! Complete the penalty task first: {p_key.upper()}!"

        new_curr = max(0.0, min(float(p_target), float(p_curr) + amount))

        if new_curr >= float(p_target):
            p["penalty"] = 0
            p["penalty_quest_key"] = None
            p["penalty_progress"] = 0.0
            p["penalty_target"] = 0.0
            p["system_message"] = "Penalty cleared. Generative daily directives restored."
            database.sync_daily_progress(p["level"])
            return p, "⚡ PENALTY OVER! System access granted. Daily quests generated!"
        else:
            p["penalty_progress"] = new_curr
            return p, f"Penalty progress: {new_curr}/{p_target}"

    # Обычная логика: UPSERT
    with database.get_db_connection() as conn:
        row = conn.execute("SELECT * FROM daily_progress WHERE key = ?", (quest_key,)).fetchone()

        if not row:
            g = conn.execute("SELECT * FROM global_registry WHERE key = ?", (quest_key,)).fetchone()
            if not g:
                return p, f"Quest '{quest_key}' not found in registry."
            scaled_target = math.floor(g["target_base"] * (1 + (p["level"] - 1) * 0.08))
            conn.execute(
                "INSERT INTO daily_progress (key, progress, target, completed) VALUES (?, 0.0, ?, 0)",
                (quest_key, scaled_target)
            )
            conn.commit()
            row = conn.execute("SELECT * FROM daily_progress WHERE key = ?", (quest_key,)).fetchone()

        quest = dict(row)
        was_completed = quest["completed"] == 1
        new_progress = max(0.0, quest["progress"] + amount)
        new_completed = 1 if new_progress >= quest["target"] else 0

        conn.execute(
            "UPDATE daily_progress SET progress = ?, completed = ? WHERE key = ?",
            (new_progress, new_completed, quest_key)
        )
        conn.commit()

        if new_completed == 1 and not was_completed:
            p["gold"] += 30
            p, msg = award_xp(p, 40)
            return p, f"Directive cleared! +30 Gold, +40 XP. {msg}"
    return p, "Progress updated."

def award_xp(p: dict, amount: int) -> tuple[dict, str]:
    p["xp"] += amount
    leveled_up = False
    while p["xp"] >= p["xp_needed"]:
        p["xp"] -= p["xp_needed"]
        p["level"] += 1
        p["stat_points"] += 3
        p["xp_needed"] = get_required_xp(p["level"])
        ru_t, en_t = get_hunter_titles(p["level"])
        p["title_ru"] = ru_t
        p["title_en"] = en_t
        leveled_up = True
    return p, ("Level Up!" if leveled_up else "")


# КОНФИГУРАЦИЯ БОНУСОВ ТЕНЕВОЙ АРМИИ (Взято из ShadowArmy.tsx)
SHADOW_CONFIG = {
    "igris": {"strength": 4, "dexterity": 2},
    "vyper": {"agility": 3, "dexterity": 1},
    "tank": {"strength": 5},
    "kalligal": {"intelligence": 4, "agility": 2},
    "tusk": {"intelligence": 6, "dexterity": 2},
    "beru": {"strength": 8, "agility": 6, "intelligence": 4, "dexterity": 4}
}

def get_total_stats_with_shadows(p: dict) -> dict:
    """Расчет суммарных стат Охотника с учетом пассивных бонусов ВСЕХ извлеченных теней"""
    total = {
        "strength": p["strength"],
        "agility": p["agility"],
        "intelligence": p["intelligence"],
        "dexterity": p["dexterity"]
    }
    
    # Каждая извлеченная тень из массива shadows_owned дает пассивный бонус, даже если не задеплоена
    shadows_owned = p.get("shadows_owned", [])
    for shadow_id in shadows_owned:
        boost = SHADOW_CONFIG.get(shadow_id, {})
        for stat_key, value in boost.items():
            if stat_key in total:
                total[stat_key] += value
    return total

def execute_gate_raid(p: dict, gate: dict) -> tuple[dict, dict]:
    """Централизованный расчет исхода рейда во Врата данжа"""
    totals = get_total_stats_with_shadows(p)
    
    # 1. Формула шанса победы из Gates.tsx
    stat_value = totals.get(gate["stat_used"], 10)
    stat_bonus = min(0.25, max(0.0, (stat_value - 10) * 0.015))
    level_edge = max(0, p["level"] - gate["min_level"]) * 0.01
    
    success_chance = min(0.97, gate["success_rate_base"] + stat_bonus + level_edge)
    
    # 2. Рандом на стороне сервера Python
    import random
    success = random.random() < success_chance
    
    if success:
        p["gold"] += gate["gold_reward"]
        p, xp_msg = award_xp(p, gate["xp_reward"])
        outcome = {
            "success": True,
            "gold": gate["gold_reward"],
            "xp": gate["xp_reward"],
            "narrative": f"SUCCESS! You successfully cleared the [{gate['rank']}-Rank] Dungeon. The boss has been eliminated."
        }
    else:
        # При провале Охотник теряет 25% от базового золота в качестве штрафа за отступление
        gold_loss = round(gate["gold_reward"] * 0.25)
        p["gold"] = max(0, p["gold"] - gold_loss)
        outcome = {
            "success": False,
            "gold": -gold_loss,
            "xp": 0,
            "narrative": f"FAILURE! The [{gate['rank']}-Rank] Dungeon turned against you. You retreated, wounded and lost {gold_loss} Gold."
        }
    
    p["last_gate_date"] = datetime.date.today().isoformat()
    return p, outcome

def extract_shadow_soldier(p: dict, shadow_id: str, cost: int) -> tuple[dict, bool]:
    """Логика покупки/извлечения тени за золото"""
    if p["gold"] < cost:
        return p, False
        
    shadows_owned = p.get("shadows_owned", [])
    if shadow_id in shadows_owned:
        return p, False  # Тень уже извлечена
        
    p["gold"] -= cost
    
    # Записываем извлеченную тень в реляционную таблицу
    with database.get_db_connection() as conn:
        conn.execute("INSERT OR IGNORE INTO extracted_shadows (shadow_id, extracted_at) VALUES (?, ?)", (shadow_id, datetime.datetime.now().isoformat()))
        conn.commit()
        
    return p, True

def lift_penalty(p: dict) -> dict:
    p["penalty"] = 0
    p["penalty_quest_key"] = None
    p["penalty_progress"] = 0.0
    p["penalty_target"] = 0.0
    p["last_rollover_date"] = datetime.date.today().isoformat()
    p["system_message"] = "Penalty lifted. Directives generated."
    database.sync_daily_progress(p["level"])
    return p


def parse_agent_response(raw: str) -> AgentResponse | None:
    """
    Парсит JSON-ответ LLM. Возвращает AgentResponse или None при ошибке.
    """
    try:
        data = json.loads(raw)
        return AgentResponse.model_validate(data)
    except Exception as e:
        print(f"[AGENT] JSON parse error: {e}")
        return None


def apply_agent_actions(p: dict, actions: list[AgentAction], ai_allowed_keys: list[str], secure_keys: list[str]) -> tuple[dict, list[str]]:
    """
    Применяет действия агента к профилю. Возвращает (обновлённый p, список применённых действий).
    Валидирует: ключ существует, не secure, amount/target в разумных пределах.
    """
    applied = []
    for action in actions:
        if action.type == "quest_progress":
            if not action.key or action.amount is None:
                continue
            if action.key in secure_keys:
                applied.append(f"BLOCKED: {action.key} is SECURE")
                continue
            if action.key not in ai_allowed_keys:
                applied.append(f"BLOCKED: {action.key} not AI-controlled")
                continue
            if action.amount <= 0 or action.amount > 1000:
                applied.append(f"BLOCKED: amount {action.amount} out of range")
                continue
            p, msg = advance_quest_progress(p, action.key, action.amount)
            applied.append(f"{action.key.upper()} +{action.amount}")

        elif action.type == "update_goal":
            if not action.goal or action.goal not in ALLOWED_GOALS:
                applied.append(f"BLOCKED: goal '{action.goal}' not allowed")
                continue
            p["fitness_goal"] = action.goal
            applied.append(f"GOAL -> {action.goal.upper()}")

        elif action.type == "create_quest":
            if not action.key or action.key in secure_keys:
                applied.append(f"BLOCKED: cannot create/overwrite '{action.key}'")
                continue
            if not action.label_ru or not action.label_en or not action.target or not action.unit_ru or not action.unit_en or not action.quest_type:
                applied.append("BLOCKED: create_quest missing fields")
                continue
            if action.quest_type not in ("strength", "agility", "intelligence", "dexterity"):
                applied.append(f"BLOCKED: quest_type '{action.quest_type}' invalid")
                continue
            with database.get_db_connection() as conn:
                existing = conn.execute("SELECT is_ai_controlled FROM global_registry WHERE key = ?", (action.key,)).fetchone()
                if existing and existing["is_ai_controlled"] == 0:
                    applied.append(f"BLOCKED: '{action.key}' exists and is SECURE")
                    continue
                conn.execute("""
                    INSERT OR REPLACE INTO global_registry (key, label_ru, label_en, target_base, unit_ru, unit_en, type, is_ai_controlled)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
                """, (action.key, action.label_ru, action.label_en, float(action.target), action.unit_ru, action.unit_en, action.quest_type))
                scaled_target = math.floor(float(action.target) * (1 + (p["level"] - 1) * 0.08))
                conn.execute("INSERT OR REPLACE INTO daily_progress (key, progress, target, completed) VALUES (?, 0.0, ?, 0)", (action.key, scaled_target))
                conn.commit()
            applied.append(f"NEW QUEST: {action.label_en}")

        # ДОБАВЛЕНО: изменение target существующего квеста
        elif action.type == "update_quest_target":
            if not action.key or action.new_target is None:
                applied.append("BLOCKED: update_quest_target missing key/new_target")
                continue
            if action.key in secure_keys:
                applied.append(f"BLOCKED: {action.key} is SECURE")
                continue
            if action.key not in ai_allowed_keys:
                applied.append(f"BLOCKED: {action.key} not AI-controlled")
                continue
            if action.new_target <= 0 or action.new_target > 10000:
                applied.append(f"BLOCKED: target {action.new_target} out of range")
                continue
            with database.get_db_connection() as conn:
                # Проверяем, что квест существует
                row = conn.execute("SELECT key FROM global_registry WHERE key = ?", (action.key,)).fetchone()
                if not row:
                    applied.append(f"BLOCKED: quest '{action.key}' not found")
                    continue
                # Обновляем target_base в global_registry (для будущих rollover)
                conn.execute("UPDATE global_registry SET target_base = ? WHERE key = ?", (float(action.new_target), action.key))
                # Пересчитываем target под текущий уровень и обновляем daily_progress
                scaled = math.floor(float(action.new_target) * (1 + (p["level"] - 1) * 0.08))
                conn.execute("UPDATE daily_progress SET target = ? WHERE key = ?", (scaled, action.key))
                conn.commit()
            applied.append(f"TARGET {action.key.upper()} -> {action.new_target}")

    return p, applied