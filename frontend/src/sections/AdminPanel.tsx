import { useState, useEffect } from 'react';
import { Panel } from '@/components/Panel';
import { useGame } from '@/game/GameProvider';
import { Plus, Trash2, Edit2, RotateCcw, UserCheck, ShieldCheck } from 'lucide-react';

interface GlobalQuest {
  key: string;
  label_ru: string;
  label_en: string;
  target_base: number;
  unit_ru: string;
  unit_en: string;
  type: string;
  is_ai_controlled: number;
}

export function AdminPanel() {
  const { state, pushToast, syncWithServer } = useGame();
  const isEn = state.language === 'en';
  const [quests, setQuests] = useState<GlobalQuest[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  
  // Калибровка имени профиля Охотника
  const [profileName, setProfileName] = useState(state.name || '');

  // Поля конфигурации формы директив
  const [key, setKey] = useState('');
  const [labelRu, setLabelRu] = useState('');
  const [labelEn, setLabelEn] = useState('');
  const [targetBase, setTargetBase] = useState(10);
  const [unitRu, setUnitRu] = useState('');
  const [unitEn, setUnitEn] = useState('');
  const [type, setType] = useState('strength');
  const [isAiControlled, setIsAiControlled] = useState(true); // ПО УМОЛЧАНИЮ ВСЕГДА TRUE (1)

  const loadGlobalQuests = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/admin/quests', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setQuests(data);
        } else {
          setQuests([]);
        }
      }
    } catch (err) {
      console.error('Ошибка загрузки реестра директив', err);
      setQuests([]);
    }
  };

  useEffect(() => { 
    loadGlobalQuests(); 
  }, []);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) return;
    try {
      const res = await fetch('http://127.0.0.1:8000/api/admin/update-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: profileName.trim() })
      });
      if (res.ok) {        
        await syncWithServer();
        pushToast({
          title: isEn ? "IDENTITY MUTATED" : "ЛИЧНОСТЬ ПЕРЕЗАПИСАНА",
          body: isEn ? "Monarch telemetry updated successfully." : "Новое имя Охотника зафиксировано в ядре Системы.",
          tone: "success"
        });
      }
    } catch (err) { 
      pushToast({ title: "SYSTEM ERROR", body: "Failed to transmit payload", tone: "danger" });
    }
};

  // Клик по кнопке карандаша — подставляем данные квеста в форму для изменения
 const startEditQuest = (q: GlobalQuest) => {
    setIsEditing(true);
    setKey(q.key);
    setLabelRu(q.label_ru);
    setLabelEn(q.label_en);
    setTargetBase(q.target_base);
    setUnitRu(q.unit_ru);
    setUnitEn(q.unit_en);
    setType(q.type);
    setIsAiControlled(q.is_ai_controlled === 1);
  };

  // Сброс формы в режим создания нового квеста
  const resetForm = () => {
    setIsEditing(false);
    setKey(''); setLabelRu(''); setLabelEn(''); setTargetBase(10); setUnitRu(''); setUnitEn(''); setType('strength');
    setIsAiControlled(true);
  }

  const handleAddOrEditQuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing && !key) return;
    if (!isEditing && !labelRu.trim()) return; // При создании ключ сгенерирует бэк, при изменении — он фиксирован
    if (!labelRu.trim() || !labelEn.trim()) return;
    
    try {
      const res = await fetch('http://127.0.0.1:8000/api/admin/add-quest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: isEditing ? key : "",
          label_ru: labelRu.trim(),
          label_en: labelEn.trim(),
          target_base: Number(targetBase),
          unit_ru: unitRu.trim(),
          unit_en: unitEn.trim(),
          type: type,
          is_ai_controlled: isAiControlled ? 1 : 0
        })
      });     
      if (res.ok) {
        resetForm();
        await loadGlobalQuests();
        await syncWithServer();         
        pushToast({
          title: isEn ? "REGISTRY RECALIBRATED" : "РЕЕСТР ПЕРЕРАССЧИТАН",
          body: isEn ? "System configuration directives successfully updated." : "Параметры тренировочной директивы успешно изменены в SQLite.",
          tone: "info"
        });
      }
    } catch (err) { 
      pushToast({ title: "REGISTRY CRASH", body: "Configuration packet lost", tone: "danger" });
    }
  };

  const handleDeleteQuest = async (questKey: string) => {
    if (!confirm(isEn ? `Delete ${questKey}?` : `Удалить директиву ${questKey}?`)) return;
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/admin/quests/${questKey}`, { 
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        if (key === questKey) resetForm();
        await loadGlobalQuests();
        await syncWithServer();
      }
    } catch (err) { 
      alert("Error executing purge protocol"); 
    }
  };

  
    return (
    <div className="space-y-5">
      <Panel title={isEn ? "Operator Calibration" : "Калибровка Оператора"} code="SYS-PROFILE">
  {/* СЕКЦИЯ 1: КАЛИБРОВКА ИМЕНИ ОХОТНИКА */}      
  <form onSubmit={handleUpdateName} className="flex flex-wrap gap-3 font-mono text-xs items-end">
    <div className="flex-1 min-w-[220px]">
      <label className="block mb-1 text-purple-400">{isEn ? "Active Operator Name" : "Текущее Имя Оператора"}</label>
      <input type="text" value={profileName} onChange={(e) => setProfileName(e.target.value)} className="w-full bg-ink-900 border border-purple-900/40 p-2.5 rounded focus:outline-none focus:border-purple-500 text-white font-bold text-sm" />
    </div>
    <button type="submit" className="btn-hud !py-2.5 flex items-center gap-2">
      <UserCheck size={14} /> {isEn ? "Rewrite Profile" : "Перезаписать Профиль"}
    </button>
  </form>

  {/* ДОБАВЛЕНО (пункт 3): кнопка сброса штрафа — перенесена из обычного UI сюда.
      Позволяет админу разблокировать профиль, если состояние штрафа повреждено. */}
  {state.daily?.penalty && (
    <div className="mt-4 border border-red-500/40 bg-red-500/5 p-3">
      <p className="font-mono text-xs text-red-300 mb-2">
        {isEn ? "Penalty is active. Clear it manually (admin override)." : "Штраф активен. Снять вручную (админ-режим)."}
      </p>
      <button
        onClick={async () => {
          try {
            const res = await fetch('http://127.0.0.1:8000/api/system/clear-penalty', { method: 'POST' });
            if (res.ok) {
              await syncWithServer();
              pushToast({ title: 'PENALTY CLEARED', body: 'Admin override applied.', tone: 'success' });
            }
          } catch (err) { console.error(err); }
        }}
        className="btn-hud w-full !border-red-500/40 hover:!border-red-500 hover:!bg-red-900/20 !text-red-400 hover:!text-white"
      >
        {isEn ? "Clear Penalty (Admin)" : "Снять штраф (Админ)"}
      </button>
    </div>
  )}
</Panel>	
	
		<div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
		  {/* СЕКЦИЯ 2 - ЛЕВАЯ КОЛОНКА: ДИНАМИЧЕСКАЯ ФОРМА (ДОБАВЛЕНИЕ / РЕДАКТИРОВАНИЕ) */}
		  <Panel title={isEditing ? (isEn ? "Modify Directive" : "Модификация Директивы") : (isEn ? "Create Directive" : "Создание Директивы")} code="SYS-CONFIG" className="lg:col-span-1">
			<form onSubmit={handleAddOrEditQuest} className="space-y-3 font-mono text-xs text-gray-300">
			  {isEditing && (
				<div>
				  <label className="block mb-1 text-red-400 font-bold">MUTATION LOCK / SYSTEM ID</label>
				  <input type="text" value={key} disabled className="w-full bg-red-950/10 border border-red-900/40 p-2 rounded text-red-400 opacity-80 cursor-not-allowed" />
				</div>
			  )}
			  <div className="grid grid-cols-2 gap-2">
				<div>
				  <label className="block mb-1 text-purple-400">{isEn ? "Label (RU)" : "Название (RU)"}</label>
				  <input type="text" value={labelRu} onChange={(e) => setLabelRu(e.target.value)} className="w-full bg-ink-900 border border-purple-900/40 p-2 rounded focus:outline-none focus:border-purple-500 text-white" placeholder="Подтягивания" />
				</div>
				<div>
				  <label className="block mb-1 text-purple-400">{isEn ? "Label (EN)" : "Name (EN)"}</label>
				  <input type="text" value={labelEn} onChange={(e) => setLabelEn(e.target.value)} className="w-full bg-ink-900 border border-purple-900/40 p-2 rounded focus:outline-none focus:border-purple-500 text-white" placeholder="Pull-ups" />
				</div>
			  </div>
			  <div>
				<label className="block mb-1 text-purple-400">{isEn ? "Base Target (LV 1)" : "Базовая цель (для 1 уровня)"}</label>
				<input type="number" value={targetBase} onChange={(e) => setTargetBase(Number(e.target.value))} className="w-full bg-ink-900 border border-purple-900/40 p-2 rounded focus:outline-none focus:border-purple-500 text-white" />
			  </div>
			  <div className="grid grid-cols-2 gap-2">
				<div>
				  <label className="block mb-1 text-purple-400">{isEn ? "Unit (RU)" : "Ед. изм. (RU)"}</label>
				  <input type="text" value={unitRu} onChange={(e) => setUnitRu(e.target.value)} className="w-full bg-ink-900 border border-purple-900/40 p-2 rounded focus:outline-none focus:border-purple-500 text-white" placeholder="раз" />
				</div>
				<div>
				  <label className="block mb-1 text-purple-400">{isEn ? "Unit (EN)" : "Unit (EN)"}</label>
				  <input type="text" value={unitEn} onChange={(e) => setUnitEn(e.target.value)} className="w-full bg-ink-900 border border-purple-900/40 p-2 rounded focus:outline-none focus:border-purple-500 text-white" placeholder="reps" />
				</div>
			  </div>
			  <div>
				<label className="block mb-1 text-purple-400">{isEn ? "Governing Attribute" : "Управляющий Атрибут"}</label>
				<select value={type} onChange={(e) => setType(e.target.value)} className="w-full bg-ink-900 border border-purple-900/40 p-2 rounded focus:outline-none focus:border-purple-500 text-white bg-[#0b0b0f]">
				  <option value="strength">STRENGTH (Сила)</option>
				  <option value="agility">AGILITY (Ловкость)</option>
				  <option value="intelligence">INTELLIGENCE (Интеллект)</option>
				  <option value="dexterity">DEXTERITY (Выносливость)</option>
				</select>
			  </div>

			  {/* ТУМБЛЕР: РАЗРЕШЕНИЕ УПРАВЛЕНИЯ ИИ (С дефолтом в true) */}
			  <div className="flex items-center gap-2 border border-purple-950/40 bg-purple-950/10 p-2.5 rounded">
				<input type="checkbox" id="aiCtrl" checked={isAiControlled} onChange={(e) => setIsAiControlled(e.target.checked)} className="h-4 w-4 rounded border-purple-900 bg-ink-900 text-purple-600 focus:ring-purple-500 cursor-pointer" />
				<label htmlFor="aiCtrl" className="cursor-pointer select-none font-bold text-purple-300">
				  {isEn ? "Permit AI Management" : "Разрешить ИИ управление"}
				</label>
			  </div>
			  
			  <div className="flex gap-2 pt-2">
				<button type="submit" className="flex-1 btn-hud !py-2.5 flex items-center justify-center gap-2">
				  <Plus size={14} /> {isEditing ? (isEn ? "Save System State" : "Сохранить Изменения") : (isEn ? "Inject Directive" : "Внедрить Директиву")}
				</button>
				{isEditing && (
          <button type="button" onClick={resetForm} className="btn-hud !px-3 !bg-gray-900 hover:!bg-gray-800" title="Cancel Edit">
            <RotateCcw size={14} className="text-gray-400" />
          </button>
        )}
			  </div>
			</form>
		  </Panel>

		  {/* ПРАВАЯ КОЛОНКА: РЕЕСТР ВСЕХ ТЕКУЩИХ ШАБЛОНОВ КВЕСТОВ С КНОПКАМИ ПРАВКИ */}
		  <Panel title={isEn ? "Active Global Registry" : "Активный реестр директив"} code="SYS-REGISTRY" className="lg:col-span-2">
			<div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2">
			  {quests.length === 0 ? (
				<div className="text-gray-500 font-mono text-center py-10">
				  {isEn ? "No active templates discovered inside Registry." : "Глобальный реестр пуст или бэк заблокирован."}
				</div>
			  ) : (
				quests.map((q) => (
				  <div key={q.key} className="p-3 border border-purple-900/10 bg-black/30 flex justify-between items-center group hover:border-purple-900/30 transition">
					<div className="font-mono text-xs">
					  <p className="font-bold text-white text-sm">
						{isEn ? q.label_en : q.label_ru} <span className="text-purple-400 text-xs font-normal">[{q.key}]</span>
					  </p>
					  <p className="text-gray-500 mt-1 uppercase tracking-wider text-[10px]">
						{isEn ? 'Base Target' : 'Базовая цель'}: <span className="text-purple-300">{q.target_base} {isEn ? q.unit_en : q.unit_ru}</span> · {isEn ? 'Stat' : 'Атрибут'}: <span className="text-gray-400">{q.type}</span>
					  </p>
					</div>
					<div className="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition">
					  <button onClick={() => startEditQuest(q)} className="p-2 border border-transparent hover:border-purple-500/30 hover:bg-purple-950/20 text-gray-400 hover:text-purple-400 rounded transition" title="Edit Directive">
						<Edit2 size={14} />
					  </button>
					  <button onClick={() => handleDeleteQuest(q.key)} className="p-2 border border-transparent hover:border-red-500/30 hover:bg-red-950/20 text-gray-600 hover:text-red-400 rounded transition" title="Delete Directive">
						<Trash2 size={14} />
					  </button>
					</div>
				  </div>
				))
			  )}
			</div>
		  </Panel>
		</div>
	</div>
  );
}
