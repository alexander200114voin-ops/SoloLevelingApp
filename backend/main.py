from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import sqlite3
import datetime
import re
import math
import ollama
import database
import services
from schemas import (
    HunterStateModel, TrainRequest, QuestProgressRequest, 
    LanguageRequest, ChatRequest, AdminQuestModel,
    GateRaidRequest, ShadowExtractionRequest, ShadowDeployRequest, 
    NameUpdateRequest
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
    
    quests = database.get_daily_progress_list()
    return {
        "name": p["name"], "level": p["level"], "xp": p["xp"], "xp_needed": p["xp_needed"], "gold": p["gold"],
        "title_ru": p["title_ru"], "title_en": p["title_en"], "statPoints": p["stat_points"],
        "language": p["language"], "system_message": p["system_message"],
        "stats": {"strength": p["strength"], "agility": p["agility"], "intelligence": p["intelligence"], "dexterity": p["dexterity"]},
        "shadowsOwned": p.get("shadows_owned", []),
        "activeShadow": p.get("active_shadow"), 
        "lastGateDate": p["last_gate_date"],
        "daily": {"date": p["last_gate_date"], "penalty": bool(p["penalty"]), "quests": quests},
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
    if p["penalty"] == 0:
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
    
    if p["last_gate_date"] == today_str:
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
    
    # Инициализируем язык общения на основе первого слова сообщения (простая автопроверка)
    user_msg_lower = request.message.lower()
    has_cyrillic = bool(re.search('[а-яА-Я]', user_msg_lower))
    chat_lang = "ru" if has_cyrillic else "en"
    
    # 1. Записываем текущую реплику охотника в лог БД
    with sqlite3.connect(database.DB_PATH) as conn:
        conn.execute("INSERT INTO chat_history (timestamp, sender, message_text) VALUES (?, 'hunter', ?)", (timestamp, request.message))
        conn.commit()
        
    # 2. ДИНАМИЧЕСКАЯ ВЫГРУЗКА ПРАВ ДОСТУПА КВЕСТОВ ИЗ SQLITE
    all_quests = database.get_all_global_quests()
    ai_allowed_keys = [q["key"] for q in all_quests if q.get("is_ai_controlled", 1) == 1]
    secure_keys = [q["key"] for q in all_quests if q.get("is_ai_controlled", 1) == 0]
    
    # 3. ФОРМИРОВАНИЕ СИСТЕМНОГО ПРОМПТА НА ОСНОВЕ ДАННЫХ ИЗ БД
    system_prompt = (
        f"You are the 'System' onboard AI and legendary personal fitness trainer from Solo Leveling. "
        f"Your tone is cold, dominant, and absolute. Address the user strictly as 'Hunter'.\n"
        f"CRITICAL RULE 1: Respond STRICTLY in the language of the last user message. If they speak Russian, respond in Russian. If English, respond in English.\n\n"
        f"CURRENT HUNTER STATUS (DATABASE DATA):\n"
        f"- Level: {p['level']} (Rank: {p['title_en'] if chat_lang == 'en' else p['title_ru']})\n"
        f"- Specs: Age: {p['age']}, Weight: {p['weight']}kg, Height: {p['height']}cm.\n"
        f"- Current Strategy Focus: {p['fitness_goal']}.\n\n"
        f"DYNAMIC DIRECTIVES ACCESS (READ FROM SQLITE):\n"
        f"- AI MANAGEMENT ALLOWED FOR KEYS: {', '.join(ai_allowed_keys) if ai_allowed_keys else 'None'}\n"
        f"- AI ACCESS STRICTLY FORBIDDEN (SECURE SYSTEM DIRECTIVES): {', '.join(secure_keys) if secure_keys else 'None'}\n\n"
        f"As an Elite Trainer, motivate the Hunter and push them past their limits. "
        f"You can command progress tracking or database alterations by appending these service tokens at the very end of your response:\n"
        f"1. To add progress to an ALLOWED quest: [ACTION:QUEST_KEY=AMOUNT] (e.g. [ACTION:pushups=15]).\n"
        f"2. To scale target reps/difficulty up or down based on data: [ACTION:QUEST_KEY=AMOUNT].\n"
        f"3. To completely inject a new training goal into the profile: [UPDATE_GOAL:new_focus_name].\n"
        f"4. To generate a brand new training task: [AI_CREATE_QUEST:key=slug;label_ru=Название;label_en=Name;target=number;unit_ru=раз;unit_en=reps;type=stat_type].\n"
        f"WARNING: Never issue tokens or touch keys listed in the SECURE list! Doing so violates System protocols. Keep responses short (max 3-4 sentences)."
    )

    ollama_messages = [{'role': 'system', 'content': system_prompt}]
    
    # Выгружаем скользящее окно истории для памяти контекста
    with database.get_db_connection() as conn:
        rows = conn.execute("SELECT sender, message_text FROM chat_history ORDER BY id DESC LIMIT 15").fetchall()
        for r in reversed(rows):
            role = 'user' if r["sender"] == 'hunter' else 'assistant'
            ollama_messages.append({'role': role, 'content': r["message_text"]})
            
    try:
        response = ollama.chat(model='qwen2.5:7b', messages=ollama_messages)
        ai_reply = response['message']['content']
        
        # Парсинг команд [ACTION:...]
        match_action = re.search(r"\[ACTION:\s*(\w+)\s*=\s*([\d\.]+)\]", ai_reply)
        if match_action:
            quest_key = match_action.group(1).strip()
            amount = float(match_action.group(2).strip())
            
            # Проверка безопасности: не пытается ли ИИ взломать защищенный квест
            if quest_key in secure_keys:
                ai_reply = re.sub(r"\[ACTION:.*?\]", "", ai_reply).strip()
                ai_reply += "\n\n[SYSTEM ERROR]: AI attempt to mutate SECURE directive blocked."
            else:
                p, msg = services.advance_quest_progress(p, quest_key, amount)
                database.save_profile_dict(p)
                ai_reply = re.sub(r"\[ACTION:.*?\]", "", ai_reply).strip()
                ai_reply += f"\n\n[SYSTEM]: Telemetry synced. {quest_key.upper()} updated: +{amount}." if chat_lang == "en" else f"\n\n[СИСТЕМА]: Данные занесены в БД. Директива {quest_key.upper()} обновлена: +{amount}."

        # Парсинг [UPDATE_GOAL:...]
        match_goal = re.search(r"\[UPDATE_GOAL:\s*(\w+)\s*\]", ai_reply)
        if match_goal:
            new_goal = match_goal.group(1).strip()
            p["fitness_goal"] = new_goal
            database.save_profile_dict(p)
            ai_reply = re.sub(r"\[UPDATE_GOAL:.*?\]", "", ai_reply).strip()
            ai_reply += f"\n\n[SYSTEM]: Goal updated to {new_goal.upper()}." if chat_lang == "en" else f"\n\n[СИСТЕМА]: Фокус программы изменен на: {new_goal.upper()}."

        # Парсинг [AI_CREATE_QUEST:...]
        match_create = re.search(r"\[AI_CREATE_QUEST:(.*?)\]", ai_reply)
        if match_create:
            try:
                raw_params = match_create.group(1).split(";")
                params = {param.split("=").strip(): param.split("=").strip() for param in raw_params}
                
                with sqlite3.connect(database.DB_PATH) as conn:
                    conn.execute("""
                        INSERT OR REPLACE INTO global_registry (key, label_ru, label_en, target_base, unit_ru, unit_en, type, is_ai_controlled)
                        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
                    """, (params["key"], params["label_ru"], params["label_en"], float(params["target"]), params["unit_ru"], params["unit_en"], params["type"]))
                    
                    scaled_target = math.floor(float(params["target"]) * (1 + (p["level"] - 1) * 0.08))
                    conn.execute("INSERT OR REPLACE INTO daily_progress VALUES (?, 0.0, ?, 0)", (params["key"], scaled_target))
                    conn.commit()
                
                ai_reply = re.sub(r"\[AI_CREATE_QUEST:.*?\]", "", ai_reply).strip()
                ai_reply += f"\n\n[SYSTEM]: Generated new task {params['label_en']}." if chat_lang == "en" else f"\n\n[СИСТЕМА]: ИИ создал новую задачу: {params['label_ru']}."
            except Exception as e:
                ai_reply = re.sub(r"\[AI_CREATE_QUEST:.*?\]", "", ai_reply).strip()

        # Записываем финальный ответ Системы в БД
        with sqlite3.connect(database.DB_PATH) as conn:
            conn.execute("INSERT INTO chat_history (timestamp, sender, message_text) VALUES (?, 'system', ?)", (datetime.datetime.now().isoformat(), ai_reply))
            conn.commit()
            
        return {"response": ai_reply}
    except Exception as e:
        return {"response": f"[SYSTEM ERROR]: Ollama offline. {str(e)}"}

