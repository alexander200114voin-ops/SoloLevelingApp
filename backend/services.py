import datetime
import random
import math
import database

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
    
    today_str = datetime.date.today().isoformat()

    # Извлекаем текущие квесты из daily_progress
    current_quests = database.get_daily_progress_list()

    if not current_quests or not p.get("last_gate_date"):
        p["last_gate_date"] = today_str
        p["penalty"] = 0
        p["system_message"] = "System core stabilized. Daily directives generated."
        # ИЗМЕНЕНО: sync_daily_progress вместо ручного DELETE/INSERT
        database.sync_daily_progress(p["level"])
        return p

    if p["last_gate_date"] == today_str:
        # ДОБАВЛЕНО: синхронизация на случай, если админ добавил/удалил квест
        database.sync_daily_progress(p["level"])
        return p

    # СМЕНА КАЛЕНДАРНОГО ДНЯ: Начисляем штраф за вчерашний провал
    all_done = all(q["completed"] for q in current_quests)

    if not all_done:
        p["penalty"] = 1
        # Случайный выбор карательного квеста
        penalty_base_quest = random.choice(current_quests)
        penalty_target = math.floor(penalty_base_quest["target"] * 1.25)
        p["system_message"] = f"PENALTY_ACTIVE:{penalty_base_quest['key']}:0:{penalty_target}"
    else:
        p["penalty"] = 0
        p["system_message"] = "Daily directives cleared. System stabilizes."
        with database.get_db_connection() as conn:
            for q in current_quests:
                conn.execute(
                    "INSERT INTO daily_history (date, quest_key, final_progress, final_target) VALUES (?,?,?,?)",
                    (p["last_gate_date"], q["key"], q["progress"], q["target"])
                )
            conn.commit()

    p["last_gate_date"] = today_str

    # Если штрафа нет — генерируем новые квесты на новый день
    if p["penalty"] == 0:        
        database.sync_daily_progress(p["level"])

    return p

def advance_quest_progress(p: dict, quest_key: str, amount: float) -> tuple[dict, str]:
    """Учет прогресса с поддержкой выполнения штрафного квеста"""
    # Если активен ШТРАФ
    if p["penalty"] == 1:
        if p["system_message"] and p["system_message"].startswith("PENALTY_ACTIVE:"):
            parts = p["system_message"].split(":")
            # ДОБАВЛЕНО: защита от битого system_message (раньше падало с ValueError)
            if len(parts) != 4:
                return p, "System penalty state corrupted."
            _, p_key, p_curr, p_target = parts

            if quest_key != p_key:
                return p, f"ACCESS DENIED! Complete the penalty task first: {p_key.upper()}!"

            new_curr = max(0.0, min(float(p_target), float(p_curr) + amount))

            # Если штрафной квест закрыт!
            if new_curr >= float(p_target):
                p["penalty"] = 0
                p["system_message"] = "Penalty cleared. Generative daily directives restored."                
                database.sync_daily_progress(p["level"])
                return p, "⚡ PENALTY OVER! System access granted. Daily quests generated!"
            else:
                p["system_message"] = f"PENALTY_ACTIVE:{p_key}:{new_curr}:{p_target}"
                return p, f"Penalty progress: {new_curr}/{p_target}"
        return p, "System penalty state corrupted."
    
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

        # Награда — только за ПЕРВОЕ достижение target
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
    # ДОБАВЛЕНО: фиксируем сегодняшнюю дату, чтобы check_daily_rollover
    # не воспринял это как «смену дня» и не поставил штраф снова.
    p["last_gate_date"] = datetime.date.today().isoformat()
    p["system_message"] = "Penalty lifted. Directives generated."
    # ИЗМЕНЕНО: sync_daily_progress вместо «пустых» квестов
    database.sync_daily_progress(p["level"])
    return p
