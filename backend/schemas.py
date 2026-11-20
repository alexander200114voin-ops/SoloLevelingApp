from pydantic import BaseModel
from typing import List, Optional

class StatsModel(BaseModel):
    strength: int
    agility: int
    intelligence: int
    dexterity: int

class QuestStateModel(BaseModel):
    key: str
    label_ru: str
    label_en: str
    progress: float
    target: float
    unit_ru: str
    unit_en: str
    type: str
    completed: bool

class DailyModel(BaseModel):
    date: str
    quests: List[QuestStateModel]
    penalty: bool

class HunterStateModel(BaseModel):
    name: str
    level: int
    xp: int
    xp_needed: int
    gold: int
    title_ru: str
    title_en: str
    stats: StatsModel
    statPoints: int
    shadowsOwned: List[str]
    activeShadow: Optional[str] = None
    lastGateDate: Optional[str] = None
    daily: DailyModel
    language: str
    system_message: Optional[str] = None    
    weight: float = 70.0
    height: float = 170.0
    age: int = 25
    fitness_goal: str = "all-round"

class TrainRequest(BaseModel):
    stat_key: str

class QuestProgressRequest(BaseModel):
    quest_key: str
    amount: float

class LanguageRequest(BaseModel):
    lang: str

class ChatRequest(BaseModel):
    message: str

class ChatMessageResponse(BaseModel):
    sender: str
    text: str

class AdminQuestModel(BaseModel):
    key: str
    label_ru: str
    label_en: str
    target_base: float
    unit_ru: str
    unit_en: str
    type: str
    is_ai_controlled: int = 1


class GateRaidRequest(BaseModel):
    rank: str
    label: str
    min_level: int
    stat_used: str
    gold_reward: int
    xp_reward: int
    success_rate_base: float

class ShadowExtractionRequest(BaseModel):
    shadow_id: str
    cost: int

class ShadowDeployRequest(BaseModel):
    shadow_id: Optional[str] = None

class NameUpdateRequest(BaseModel):
    name: str