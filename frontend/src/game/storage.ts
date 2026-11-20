import type { HunterState } from './types';
import { freshHunter, rolloverDaily } from './engine';

// ИСПРАВЛЕНО: Полный корректный адрес локального хоста и порта FastAPI
const API_URL = 'http://127.0.0.1:8000/api';

/**
 * Загрузка состояния Охотника напрямую из базы данных SQLite (FastAPI)
 */
export async function loadHunter(): Promise<HunterState> {
  try {
    const response = await fetch(`${API_URL}/hunter`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn('Система бэкенда вернула ошибку, загружаем локальный сейв...');
      return freshHunter();
    }

    const dbState = await response.json();
    
    // Подмешиваем дефолтные функции ролловера движка, чтобы не ломать типы React
    return rolloverDaily({ ...freshHunter(), ...dbState });
  } catch (error) {
    console.error('Не удалось связаться с Системой (FastAPI не запущен). Инициализация автономного режима.', error);
    return freshHunter();
  }
}

/**
 * Сохранение состояния Охотника в базу данных SQLite (FastAPI)
 */
export async function saveHunter(state: HunterState): Promise<void> {
  try {
    await fetch(`${API_URL}/hunter`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(state),
    });
  } catch (error) {
    console.error('Ошибка синхронизации данных с сервером Системы:', error);
  }
}
