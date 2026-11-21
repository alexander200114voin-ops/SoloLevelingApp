import { useState, useRef, useEffect } from 'react';
import { Panel } from '@/components/Panel';
import { useGame } from '@/game/GameProvider';
import { Send, Terminal } from 'lucide-react';

interface Message {
  sender: 'hunter' | 'system';
  text: string;
  actions?: string[];
}

export function SystemChat() {
  const { state, syncWithServer } = useGame();
  const isEn = state.language === 'en';
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

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

  // ИЗМЕНЕНО: один useEffect вместо двух (был баг — двойной вызов)
  useEffect(() => { 
    loadChatHistory(); 
  }, []);

  // ДОБАВЛЕНО: автоскролл к новому сообщению
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const cleanText = text
      .replace(/\[.*?\]/g, '')
      .replace(/\(.*?\)/g, '')
      .trim(); 

    const utterance = new SpeechSynthesisUtterance(cleanText);
    // ИЗМЕНЕНО: язык по state.language, а не всегда en-US
    utterance.lang = isEn ? 'en-US' : 'ru-RU';
    
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => 
      (isEn && v.lang.startsWith('en') && (v.name.includes('David') || v.name.includes('George') || v.name.includes('Male'))) ||
      (!isEn && v.lang.startsWith('ru'))
    ) || voices.find(v => v.lang.startsWith(isEn ? 'en' : 'ru'));
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    utterance.pitch = 0.45;
    utterance.rate = 0.88;
    
    window.speechSynthesis.speak(utterance);
  };

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
      // ИЗМЕНЕНО: читаем data.reply (а не data.response), плюс data.actions
      setMessages((prev) => [...prev, { sender: 'system', text: data.reply, actions: data.actions }]);
      speakText(data.reply);
      if (data.actions && data.actions.length > 0) {
        await syncWithServer();
      }
    } catch (err) {
      setMessages((prev) => [...prev, { sender: 'system', text: '[КРИТИЧЕСКИЙ СБОЙ]: Связь с ядром Монарха разорвана.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Panel title={isEn ? "Monarch Link / AI System" : "Связь с Монархом / ИИ Системы"} code="SYS-CHAT">
      <div className="flex flex-col h-[55vh] border border-purple-900/20 bg-black/40 p-4 rounded">
        <div className="flex-1 overflow-y-auto space-y-3 pr-2 mb-4 font-mono text-sm">
          {messages.map((m, idx) => (
            <div key={idx} className={`flex ${m.sender === 'hunter' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-4 py-2.5 border rounded ${m.sender === 'hunter' ? 'border-purple-500/30 bg-purple-950/10 text-gray-200' : 'border-red-500/30 bg-red-950/5 text-purple-400 text-glow'}`}>
                {m.text}
                {/* ДОБАВЛЕНО: бейджи применённых действий */}
                {m.actions && m.actions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {m.actions.map((a, i) => (
                      <span key={i} className="text-[10px] px-1.5 py-0.5 border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 rounded">
                        {a}
                      </span>
                    ))}
                  </div>
                )}
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