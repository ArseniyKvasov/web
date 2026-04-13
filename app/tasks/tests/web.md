**Контекст:** После получения транскрипта от ML сервиса, веб-бекенд должен запросить генерацию теста у ML сервиса.

**Новый эндпоинт в ML сервисе (хост `vm4116226.firstbyte.club`):**

```JSON
POST http://vm4116226.firstbyte.club/test/generate
GET  http://vm4116226.firstbyte.club/test/health
```


**Интеграция в существующий процесс:**

После того как веб-бекенд получил все `transcript` сообщения от ML (ML закрыл соединение), выполнить параллельно или последовательно:

1. Генерация конспекта (`/summary/summarize`)

2. Генерация теста (`/test/generate`) — **новая задача**

**Параметры запроса к `/test/generate`:**

```JSON
{
  "transcript": [{"start_ms": 0, "text": "..."}],
  "num_questions": 10
}
```


**Формат данных в задаче:**

```JSON
{
  "id": "task-uuid",
  "status": "processing|done|failed",
  "transcript": [{"start_ms": 0, "text": "..."}],
  "summary": [{"subtopic": "...", "content": "..."}],
  "test": [
    {
      "question_id": 1,
      "question_text": "...",
      "question_type": "multiple_choice",
      "options": ["..."],
      "correct_answer": 0,
      "explanation": "...",
      "subtopic": "..."
    }
  ],
  "error": null
}
```


**Обработка ошибок:**

|Ситуация|Действие|
|-|-|
|`/test/health` вернул `llm_available: false`|`task["error"] = "Test generation unavailable"`, статус `failed`|
|Таймаут 180 секунд|`task["error"] = "Test generation timeout"`, статус `failed`|
|ML вернул ошибку|`task["error"] = response.message`, статус `failed`|

**Рекомендация:** Запускать генерацию конспекта и теста параллельно для сокращения времени ожидания.

**Healthcheck:** обновить `/health` чтобы показывать доступность `/test/health`

