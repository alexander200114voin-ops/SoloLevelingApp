from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import sqlite3
import datetime
import math
import ollama
import database
import services
import json
from schemas import (
    HunterStateModel, TrainRequest, QuestProgressRequest, 
    LanguageRequest, ChatRequest, AdminQuestModel,
    GateRaidRequest, ShadowExtractionRequest, ShadowDeployRequest, 
    NameUpdateRequest, AgentResponse
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    database.init_db()
    yield

app = FastAPI(title="Solo Leveling Core v3.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/hunter", response_model=HunterStateModel)
def get_hunter_full_state():
    p = database.load_profile_dict()
    p = services.check_daily_rollover(p)
    database.save_profile_dict(p)
    
    today_str = datetime.date.today().isoformat()
    with database.get_db_connection() as conn:
        row = conn.execute("SELECT COUNT(*) as c FROM gate_raids WHERE date = ?", (today_str,)).fetchone()
        can_raid_today = (row["c"] == 0)
    
    quests = database.get_daily_progress_list()
    return {
        "name": p["name"], "level": p["level"], "xp": p["xp"], "xp_needed": p["xp_needed"], "gold": p["gold"],
        "title_ru": p["title_ru"], "title_en": p["title_en"], "statPoints": p["stat_points"],
        "language": p["language"], "system_message": p["system_message"],
        "stats": {"strength": p["strength"], "agility": p["agility"], "intelligence": p["intelligence"], "dexterity": p["dexterity"]},
        "shadowsOwned": p.get("shadows_owned", []),
        "activeShadow": p.get("active_shadow"), 
        "lastGateDate": p["last_gate_date"],
        "canRaidToday": can_raid_today,
        # ДОБАВЛЕНО: penalty-поля
        "penaltyQuestKey": p.get("penalty_quest_key"),
        "penaltyProgress": p.get("penalty_progress", 0.0),
        "penaltyTarget": p.get("penalty_target", 0.0),
        "daily": {"date": p.get("last_rollover_date"), "penalty": bool(p["penalty"]), "quests": quests},
        "weight": p.get("weight", 70.0), "height": p.get("height", 175.0), "age": p.get("age", 25), "fitness_goal": p.get("fitness_goal", "all-round")
    }

@app.post("/api/hunter/train")
def train_stat(request: TrainRequest):
    p = database.load_profile_dict()
    if p["penalty"] == 1:
        raise HTTPException(status_code=400, detail="LOCKED: Clear Penalty first!")
    if p["stat_points"] <= 0:
        raise HTTPException(status_code=400, detail="No PTS")
        
    p["stat_points"] -= 1
    p[request.stat_key] += 1
    database.save_profile_dict(p)
    return get_hunter_full_state()

@app.post("/api/quests/progress")
def progress_quest(request: QuestProgressRequest):
    p = database.load_profile_dict()
    p, msg = services.advance_quest_progress(p, request.quest_key, request.amount)
    if p["penalty"] == 0 and msg:
        p["system_message"] = msg
    database.save_profile_dict(p)
    return get_hunter_full_state()

@app.post("/api/system/clear-penalty")
def clear_penalty():
    p = database.load_profile_dict()
    p = services.lift_penalty(p)
    database.save_profile_dict(p)
    return get_hunter_full_state()

@app.post("/api/hunter/language")
def set_lang(request: LanguageRequest):
    p = database.load_profile_dict()
    p["language"] = request.lang
    database.save_profile_dict(p)
    return {"status": "success"}

# ----------------------------------------------------------------
# ЦЕНТРАЛИЗОВАННЫЙ ГЕЙМПЛЕЙ: ВРАТА И ТЕНИ
# ----------------------------------------------------------------

@app.post("/api/gates/raid")
def raid_gate(request: GateRaidRequest):
    """Маршрут рейда во Врата данжа со всеми расчетами на бэке"""
    p = database.load_profile_dict()
    today_str = datetime.date.today().isoformat()

    with database.get_db_connection() as conn:
        row = conn.execute("SELECT COUNT(*) as c FROM gate_raids WHERE date = ?", (today_str,)).fetchone()
        if row["c"] > 0:
            raise HTTPException(status_code=400, detail="You have already raided a gate today!")
    if p["level"] < request.min_level:
        raise HTTPException(status_code=400, detail="Insufficient Hunter level!")
        
    gate_data = {
        "rank": request.rank, "stat_used": request.stat_used, "min_level": request.min_level,
        "gold_reward": request.gold_reward, "xp_reward": request.xp_reward, "success_rate_base": request.success_rate_base
    }
    
    p, outcome = services.execute_gate_raid(p, gate_data)
    database.save_profile_dict(p)
    
    # Записываем лог рейда в реляционную таблицу gate_raids
    with database.get_db_connection() as conn:
        conn.execute(
            "INSERT INTO gate_raids (date, rank, label, success, gold_change, xp_change) VALUES (?, ?, ?, ?, ?, ?)",
            (today_str, request.rank, request.label, 1 if outcome["success"] else 0, outcome["gold"], outcome["xp"])
        )
        conn.commit()
        
    return {"state": get_hunter_full_state(), "outcome": outcome}

@app.post("/api/shadows/extract")
def extract_shadow(request: ShadowExtractionRequest):
    """Маршрут покупки/извлечения тени за золото"""
    p = database.load_profile_dict()
    p, success = services.extract_shadow_soldier(p, request.shadow_id, request.cost)
    if not success:
        raise HTTPException(status_code=400, detail="Extraction failed: Insufficient gold or shadow already exists.")
    database.save_profile_dict(p)
    return get_hunter_full_state()

@app.post("/api/shadows/deploy")
def deploy_shadow(request: ShadowDeployRequest):
    """Смена активного компаньона в профиле Охотника"""
    p = database.load_profile_dict()
    p["active_shadow"] = request.shadow_id
    database.save_profile_dict(p)
    return get_hunter_full_state()

# ----------------------------------------------------------------
# АДМИНКА
# ----------------------------------------------------------------

@app.get("/api/admin/quests")
def admin_get_quests():
    return database.get_all_global_quests()

@app.post("/api/admin/add-quest")
def admin_add_quest(request: AdminQuestModel):
    """Умное добавление и редактирование квестов без изменения оригинального ID"""
    # 1. Генерируем ключ латиницей только если это абсолютно новый квест
    generated_key = request.key if request.key else services.slugify_ru(request.label_ru)
    
    with sqlite3.connect(database.DB_PATH) as conn:
        # Использование продвинутого синтаксиса ON CONFLICT гарантирует неприкосновенность ID!
        conn.execute("""
            INSERT INTO global_registry 
                (key, label_ru, label_en, target_base, unit_ru, unit_en, type, is_ai_controlled)
            VALUES 
                (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET
                label_ru=excluded.label_ru,
                label_en=excluded.label_en,
                target_base=excluded.target_base,
                unit_ru=excluded.unit_ru,
                unit_en=excluded.unit_en,
                type=excluded.type,
                is_ai_controlled=excluded.is_ai_controlled
        """, (generated_key, request.label_ru, request.label_en, request.target_base, request.unit_ru, request.unit_en, request.type, request.is_ai_controlled))
        conn.commit()
        
    # 2. Обновляем масштабированную цель в текущем дне
    p = database.load_profile_dict()
    scaled_target = math.floor(request.target_base * (1 + (p["level"] - 1) * 0.08))
    
    with sqlite3.connect(database.DB_PATH) as conn:
        conn.execute("""
            INSERT INTO daily_progress (key, progress, target, completed)
            VALUES (?, 0.0, ?, 0)
            ON CONFLICT(key) DO UPDATE SET
                target=excluded.target
        """, (generated_key, scaled_target))
        conn.commit()
        
    return {"status": "success"}


@app.post("/api/admin/update-name")
def admin_update_profile_name(request: NameUpdateRequest): 
    p = database.load_profile_dict()
    new_name = request.name.strip()
    if not new_name:
        raise HTTPException(status_code=400, detail="Name cannot be empty")
    p["name"] = new_name
    database.save_profile_dict(p)
    return {"status": "success", "updated_name": new_name}

@app.delete("/api/admin/quests/{key}")
def admin_delete_quest(key: str):
    with sqlite3.connect(database.DB_PATH) as conn:
        conn.execute("DELETE FROM global_registry WHERE key = ?", (key,))
        conn.execute("DELETE FROM daily_progress WHERE key = ?", (key,))
        conn.commit()
    return {"status": "success"}

# ----------------------------------------------------------------
# ЧАТ С OLLAMA
# ----------------------------------------------------------------

@app.get("/api/system/chat/history")
def get_chat_history():
    with database.get_db_connection() as conn:
        rows = conn.execute("SELECT sender, message_text as text FROM chat_history ORDER BY id ASC").fetchall()
        return [dict(r) for r in rows]

@app.post("/api/system/chat")
def system_chat(request: ChatRequest):
    p = database.load_profile_dict()
    timestamp = datetime.datetime.now().isoformat()

    chat_lang = p.get("language", "ru")

    # 1. Записываем реплику охотника
    with sqlite3.connect(database.DB_PATH) as conn:
        conn.execute("INSERT INTO chat_history (timestamp, sender, message_text) VALUES (?, 'hunter', ?)", (timestamp, request.message))
        conn.commit()

    # 2. Права доступа
    all_quests = database.get_all_global_quests()
    ai_allowed_keys = [q["key"] for q in all_quests if q.get("is_ai_controlled", 1) == 1]
    secure_keys = [q["key"] for q in all_quests if q.get("is_ai_controlled", 1) == 0]

    # 3. Список текущих квестов для промпта
    daily_quests = database.get_daily_progress_list()
    quest_lines = []
    for q in daily_quests:
        unit = q["unit_ru"] if chat_lang == "ru" else q["unit_en"]
        access = "SECURE" if q["key"] in secure_keys else "AI"
        quest_lines.append(f"  - {q['key']}: {q['progress']}/{q['target']} {unit} [{access}]")
    quest_info = "\n".join(quest_lines) if quest_lines else "  (none)"

    # 4. Системный промпт
    lang_name = "Russian" if chat_lang == "ru" else "English"
    system_prompt = (
        f"You are the 'System' AI and legendary fitness trainer from Solo Leveling. "
        f"Tone: cold, dominant, absolute. Address the user as 'Hunter'. "
        f"Respond STRICTLY in {lang_name}.\n\n"
        f"HUNTER PROFILE:\n"
        f"- Level: {p['level']} ({p['title_ru'] if chat_lang == 'ru' else p['title_en']})\n"
        f"- Age: {p['age']}, Weight: {p['weight']}kg, Height: {p['height']}cm\n"
        f"- Fitness goal: {p['fitness_goal']}\n\n"
        f"CURRENT DAILY QUESTS:\n{quest_info}\n\n"
        f"AI-CONTROLLED KEYS (you may modify): {', '.join(ai_allowed_keys) if ai_allowed_keys else 'None'}\n"
        f"SECURE KEYS (FORBIDDEN — never touch): {', '.join(secure_keys) if secure_keys else 'None'}\n\n"
        f"You MUST respond with VALID JSON matching this schema:\n"
        f'{{"reply": "your message to Hunter (2-4 sentences)", "actions": [ ... ]}}\n\n'
        f"Action types:\n"
        f'1. {{"type": "quest_progress", "key": "<key>", "amount": <number>}} — log progress. amount must be 0 < amount <= 1000.\n'
        f'2. {{"type": "update_goal", "goal": "<goal>"}} — change fitness goal. Allowed: strength, agility, intelligence, dexterity, all-round, weight-loss, endurance.\n'
        f'3. {{"type": "update_quest_target", "key": "<key>", "new_target": <number>}} — change target of an existing AI-controlled quest.\n'
        f'4. {{"type": "create_quest", "key": "<slug>", "label_ru": "...", "label_en": "...", "target": <num>, "unit_ru": "...", "unit_en": "...", "quest_type": "strength|agility|intelligence|dexterity"}} — create new task.\n\n'
        f"IMPORTANT RULES:\n"
        f"- If the Hunter asks for a training program but you lack CRITICAL info "
        f"(activity level, injuries, available equipment, or if profile data seems outdated), "
        f"ASK 1-2 clarifying questions FIRST before creating/changing quests. "
        f"Use an empty actions array in that case.\n"
        f"- You already know age, weight, height, goal. Do NOT ask for these again unless the Hunter says they changed.\n"
        f"- Never touch SECURE keys.\n"
        f"- If no action is needed (e.g. you're just asking a question), use empty actions array.\n"
        f"- Keep reply short (2-4 sentences).\n\n"
        f"EXAMPLES:\n"
        f'User: "I did 20 pushups"\n'
        f'Assistant: {{"reply": "Logged, Hunter. 20 pushups. Keep pushing.", "actions": [{{"type": "quest_progress", "key": "pushups", "amount": 20}}]}}\n\n'
        f'User: "Make me a training program"\n'
        f'Assistant: {{"reply": "Before I design your regimen, Hunter — what is your current activity level, and do you have any injuries I should account for?", "actions": []}}\n\n'
        f'User: "Set running to 10 km"\n'
        f'Assistant: {{"reply": "Directive updated. Running target is now 10 km.", "actions": [{{"type": "update_quest_target", "key": "running", "new_target": 10}}]}}'
    )

    ollama_messages = [{'role': 'system', 'content': system_prompt}]

    # История (скользящее окно 15)
    with database.get_db_connection() as conn:
        rows = conn.execute("SELECT sender, message_text FROM chat_history ORDER BY id DESC LIMIT 15").fetchall()
        for r in reversed(rows):
            role = 'user' if r["sender"] == 'hunter' else 'assistant'
            ollama_messages.append({'role': role, 'content': r["message_text"]})

    try:
        # ИЗМЕНЕНО: нативная JSON Schema вместо строки 'json'
        from schemas import AgentResponse
        response = ollama.chat(
            model='qwen3:8b',
            messages=ollama_messages,
            format=AgentResponse.model_json_schema()
        )
        raw_reply = response['message']['content']

        parsed = services.parse_agent_response(raw_reply)
        if not parsed:
            ai_reply = raw_reply
            applied = []
        else:
            ai_reply = parsed.reply
            p, applied = services.apply_agent_actions(p, parsed.actions, ai_allowed_keys, secure_keys)
            database.save_profile_dict(p)

        if applied:
            marker = "\n\n[СИСТЕМА]: " if chat_lang == "ru" else "\n\n[SYSTEM]: "
            ai_reply += marker + " | ".join(applied)

        with sqlite3.connect(database.DB_PATH) as conn:
            conn.execute("INSERT INTO chat_history (timestamp, sender, message_text) VALUES (?, 'system', ?)", (datetime.datetime.now().isoformat(), ai_reply))
            conn.commit()

        return {"reply": ai_reply, "actions": applied}
    except Exception as e:
        return {"reply": f"[SYSTEM ERROR]: Ollama offline. {str(e)}", "actions": []}