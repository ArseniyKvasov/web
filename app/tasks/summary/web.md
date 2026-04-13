**Контекст:** После получения транскрипта от ML сервиса, веб-бекенд должен запросить генерацию конспекта у ML сервиса.

**Новый эндпоинт в ML сервисе (хост `vm4116226.firstbyte.club`** - станет доступен после настройки nginx (задача Михаила)**):**

```JSON
POST http://vm4116226.firstbyte.club/summary/summarize
GET  http://vm4116226.firstbyte.club/summary/health
```


**Интеграция в существующий процесс:**

После того как веб-бекенд получил все `transcript` сообщения от ML (ML закрыл соединение), выполнить:

1. Собрать все полученные сегменты транскрипта в массив

2. Отправить POST запрос на `http://vm4116226.firstbyte.club/summary/summarize`

3. Дождаться ответа с конспектом

4. Сохранить конспект в задачу (`task["summary"] = response.summary`)

5. Отправить обновление клиенту через WebSocket `/ws/tasks/{task_id}`

**Формат данных в задаче:**

```JSON
{
  "id": "task-uuid",
  "status": "processing|done|failed",
  "transcript": [{"start_ms": 0, "text": "..."}],
  "summary": [{"subtopic": "...", "content": "..."}],
  "error": null
}
```


**Обработка ошибок:**

|Ситуация|Действие|
|-|-|
|`/summary/health` вернул `llm_available: false`|`task["error"] = "LLM service unavailable"`, статус `failed`|
|Таймаут 60 секунд|`task["error"] = "Summary generation timeout"`, статус `failed`|
|ML вернул ошибку|`task["error"] = response.message`, статус `failed`|

**Healthcheck:** обновить `/health` чтобы показывать доступность `/summary/health`



