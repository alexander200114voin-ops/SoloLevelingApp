import { useState, useRef, useEffect } from 'react';
import { Panel } from '@/components/Panel';
import { useGame } from '@/game/GameProvider';
import { Send, Terminal } from 'lucide-react';

interface Message {
  sender: 'hunter' | 'system';
  text: string;
}

export function SystemChat() {
  const { state } = useGame();
  const isEn = state.language === 'en';
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Загрузка сохраненной истории чата из реляционной таблицы SQLite бэкенда
  const loadChatHistory = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/system/chat/history', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        setMessages(await res.json());
      }
    } catch (err) { 
      console.error("Не удалось загрузить логи связи с Монархом", err); 
    }
  };

  useEffect(() => { 
    loadChatHistory(); 
  }, []);

  useEffect(() => {
    //if ('speechSynthesis' in window) {
    //  window.speechSynthesis.getVoices(); // Прогреваем список голосов при входе на вкладку
    //}
    loadChatHistory();
  }, []);


  // Функция синтеза речи (Чеканный бас ИИ Системы)
    const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel(); // Мгновенно прерываем прошлую речь, если она шла

    // Очищаем текст от скобок и логов [СИСТЕМА], чтобы ИИ их не читал
    const cleanText = text
      .replace(/\[.*?\]/g, '')
      .replace(/\(.*?\)/g, '')
      .trim(); 

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // НАСТРОЙКА КРУТОГО АНГЛИЙСКОГО ГОЛОСА
    utterance.lang = 'en-US'; // Переключаем движок на американский английский
    
    const voices = window.speechSynthesis.getVoices();
    
    // Ищем качественные мужские английские голоса в вашей Windows
    const epicVoice = voices.find(v => 
      (v.lang.startsWith('en') && v.name.includes('David')) || 
      (v.lang.startsWith('en') && v.name.includes('George')) ||
      (v.lang.startsWith('en') && v.name.includes('Male')) ||
      v.lang.startsWith('en')
    );
    
    if (epicVoice) {
      utterance.voice = epicVoice;
    }
    
    // Эпичные Cyberpunk настройки звука:
    utterance.pitch = 0.45; // Опускаем голос до утробного, тяжелого баса Системы
    utterance.rate = 0.88;  // Слегка замедляем темп, делая речь властной и весомой
    
    window.speechSynthesis.speak(utterance);
  };


  // Отправка отчета о тренировке ИИ-агенту Ollama
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input;
    setInput('');
    setMessages((prev) => [...prev, { sender: 'hunter', text: userText }]);
    setLoading(true);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/system/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText })
      });
      
      if (!response.ok) {
        throw new Error("Бэкенд вернул сетевую ошибку");
      }
      
      const data = await response.json();
      setMessages((prev) => [...prev, { sender: 'system', text: data.response }]);
      speakText(data.response); // Запуск голосового движка
    } catch (err) {
      setMessages((prev) => [...prev, { sender: 'system', text: '[КРИТИЧЕСКИЙ СБОЙ]: Связь с ядром Монарха разорвана.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Panel title={isEn ? "Monarch Link / AI System" : "Связь с Монархом / ИИ Системы"} code="SYS-CHAT">
      <div className="flex flex-col h-[55vh] border border-purple-900/20 bg-black/40 p-4 rounded">
        {/* Окно вывода переписки */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-2 mb-4 font-mono text-sm">
          {messages.map((m, idx) => (
            <div key={idx} className={`flex ${m.sender === 'hunter' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-4 py-2.5 border rounded ${m.sender === 'hunter' ? 'border-purple-500/30 bg-purple-950/10 text-gray-200' : 'border-red-500/30 bg-red-950/5 text-purple-400 text-glow'}`}>
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="text-xs text-purple-400/60 animate-pulse uppercase tracking-widest flex items-center gap-2">
              <Terminal size={12} className="animate-spin" /> Transmitting telemetry payload...
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
        
        {/* Форма ввода текста */}
        <form onSubmit={handleSend} className="flex gap-2">
          <input 
            type="text" 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            disabled={loading} 
            placeholder={isEn ? "Enter telemetry report..." : "Введите отчет о тренировке..."} 
            className="flex-1 bg-ink-900 border border-purple-900/40 px-4 py-3 rounded text-sm font-mono text-white focus:outline-none focus:border-purple-500 transition" 
          />
          <button type="submit" disabled={loading} className="btn-hud !px-4">
            <Send size={16} />
          </button>
        </form>
      </div>
    </Panel>
  );
}
