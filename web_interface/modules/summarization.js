// Модуль для работы с суммаризацией транскрипций
class SummarizationManager {
    constructor(apiManager, uiManager) {
        this.apiManager = apiManager;
        this.uiManager = uiManager;
        this.currentTaskId = null;
        this.currentSummary = null;
        this.isLoading = false;
    }

    // Инициализация обработчиков событий
    initializeEventListeners() {
        console.log('[Summarization] Модуль суммаризации инициализирован');
    }

    // Установка текущего ID задачи
    setCurrentTaskId(taskId) {
        console.log('[Summarization] Установка нового taskId:', taskId);
        this.currentTaskId = taskId;
        this.currentSummary = null;
        
        // Обновляем UI если секция уже отображается
        const section = document.getElementById('summarizationCollapsible');
        if (section && section.style.display !== 'none') {
            this.updateSummarizationUI();
        }
    }

    // Создание секции суммаризации
    createSummarizationSection() {
        const section = document.createElement('div');
        section.className = 'summarization-section';
        section.id = 'summarizationSection';
        section.style.display = 'none';
        
        section.innerHTML = `
            <div class="summarization-header">
                <div class="summarization-title">
                    <i class="fas fa-brain"></i>
                    <h3>AI Суммаризация</h3>
                    <span class="summarization-status" id="summarizationStatus">Готово к анализу</span>
                </div>
                <div class="summarization-actions">
                    <button class="btn btn-primary" id="generateSummaryBtn" onclick="window.summarizationManager?.generateSummary()">
                        <i class="fas fa-magic"></i> Создать суммари
                    </button>
                </div>
            </div>
            <div class="summarization-info">
                <i class="fas fa-info-circle"></i>
                AI агент загрузит JSON транскрипцию из S3, проанализирует её, выберет оптимальную стратегию суммаризации и создаст структурированное саммари с ключевыми моментами.
            </div>
            <div class="summarization-result" id="summarizationResult" style="display: none;">
                <!-- Результат суммаризации будет добавлен динамически -->
            </div>
        `;
        
        return section;
    }

    // Показать секцию суммаризации
    showSummarizationSection() {
        let section = document.getElementById('summarizationSection');
        
        if (!section) {
            // Создаем секцию если её нет
            section = this.createSummarizationSection();
            
            // Вставляем после секции загрузок
            const downloadsSection = document.getElementById('downloadsCollapsible');
            if (downloadsSection && downloadsSection.parentNode) {
                downloadsSection.parentNode.insertBefore(section, downloadsSection.nextSibling);
            } else {
                // Если секции загрузок нет, вставляем в результаты
                const resultsSection = document.getElementById('resultsSection');
                if (resultsSection) {
                    resultsSection.appendChild(section);
                }
            }
        }
        
        section.style.display = 'block';
        
        // Обновляем состояние кнопки и информации в зависимости от доступности данных
        this.updateSummarizationUI();
    }

    // Обновление UI суммаризации
    updateSummarizationUI() {
        // Добавляем небольшую задержку чтобы убедиться что DOM обновился
        setTimeout(() => {
            console.log('[Summarization] Обновление UI суммаризации...');
            
            const generateBtn = document.getElementById('generateSummaryBtn');
            const infoDiv = document.querySelector('.summarization-info');
            
            if (!generateBtn || !infoDiv) {
                console.warn('[Summarization] Элементы UI не найдены');
                return;
            }
            
            const hasValidData = this.hasValidTranscriptionData();
            console.log('[Summarization] hasValidData:', hasValidData);
            
            if (hasValidData) {
                generateBtn.disabled = false;
                generateBtn.innerHTML = '<i class="fas fa-magic"></i> Создать суммари';
                this.updateSummarizationStatus('Готово к анализу', 'default');
                
                infoDiv.innerHTML = `
                    <i class="fas fa-info-circle"></i>
                    AI агент загрузит JSON транскрипцию из S3, проанализирует её, выберет оптимальную стратегию суммаризации и создаст структурированное саммари с ключевыми моментами.
                `;
                
                console.log('[Summarization] ✅ UI обновлен - данные доступны');
            } else {
                generateBtn.disabled = true;
                generateBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Нет данных';
                this.updateSummarizationStatus('Нет данных для анализа', 'error');
                
                infoDiv.innerHTML = `
                    <i class="fas fa-exclamation-triangle"></i>
                    Для создания суммари необходимо сначала выбрать завершенную транскрипцию из истории или создать новую транскрипцию. JSON файл должен быть доступен в S3.
                `;
                
                console.log('[Summarization] ❌ UI обновлен - данные недоступны');
            }
        }, 100);
    }

    // Скрыть секцию суммаризации
    hideSummarizationSection() {
        const section = document.getElementById('summarizationSection');
        if (section) {
            section.style.display = 'none';
        }
    }



    // Генерация суммари
    async generateSummary() {
        console.log('[Summarization] Начало генерации суммари');
        console.log('[Summarization] Текущий taskId:', this.currentTaskId);
        console.log('[Summarization] isLoading:', this.isLoading);
        
        if (this.isLoading) {
            console.warn('[Summarization] Генерация отменена - загрузка уже в процессе');
            return;
        }

        if (!this.currentTaskId) {
            console.warn('[Summarization] Генерация отменена - нет taskId');
            this.uiManager.showError('Не выбрана транскрипция для анализа. Пожалуйста, выберите завершенную транскрипцию из истории или создайте новую.');
            return;
        }

        // Проверяем доступность данных
        if (!this.hasValidTranscriptionData()) {
            console.warn('[Summarization] Генерация отменена - нет валидных данных транскрипции');
            this.uiManager.showError('Данные транскрипции недоступны. Убедитесь, что транскрипция завершена и загружена.');
            return;
        }

        this.isLoading = true;
        this.updateSummarizationStatus('Генерация суммари...', 'loading');
        
        const generateBtn = document.getElementById('generateSummaryBtn');
        if (generateBtn) {
            generateBtn.disabled = true;
            generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Анализирую...';
        }

        try {
            console.log('[Summarization] Отправка запроса на бэкенд...');
            // Отправляем запрос на бэкенд для создания суммаризации
            const response = await this.apiManager.makeRequest(`${CONFIG.API.ENDPOINTS.SUMMARIZE}/${this.currentTaskId}`, {
                method: 'POST'
            });
            
            if (response && response.summary) {
                console.log('[Summarization] Суммари получено успешно');
                this.currentSummary = response.summary;
                this.displaySummary(response.summary);
                this.updateSummarizationStatus('Суммари готово', 'success');
            } else {
                throw new Error('Не удалось создать суммари');
            }

        } catch (error) {
            console.error('[Summarization] Ошибка генерации суммари:', error);
            this.updateSummarizationStatus('Ошибка генерации', 'error');
            
            // Показываем более подробную ошибку пользователю
            let errorMessage = 'Ошибка при создании суммари';
            if (error.message.includes('Failed to fetch')) {
                errorMessage += ': Проблема с сетевым подключением или сервер недоступен';
            } else if (error.message.includes('Не установлен ID задачи')) {
                errorMessage += ': Не выбрана транскрипция для анализа';
            } else if (error.message.includes('JSON файл недоступен в S3')) {
                errorMessage += ': JSON файл транскрипции недоступен в облачном хранилище';
            } else if (error.message.includes('Ошибка скачивания JSON из S3')) {
                errorMessage += ': Не удалось загрузить файл транскрипции из облачного хранилища';
            } else if (error.message.includes('API error')) {
                errorMessage += ': Ошибка сервера суммаризации. Попробуйте позже.';
            } else {
                errorMessage += ': ' + error.message;
            }
            
            this.uiManager.showError(errorMessage);
        } finally {
            this.isLoading = false;
            
            if (generateBtn) {
                generateBtn.disabled = false;
                generateBtn.innerHTML = '<i class="fas fa-magic"></i> Создать суммари';
            }
        }
    }

    // Получение данных транскрипции
    async getTranscriptionData() {
        try {
            console.log('[Summarization] Получение данных транскрипции для задачи:', this.currentTaskId);
            
            if (!this.currentTaskId) {
                throw new Error('Не установлен ID задачи');
            }
            
            // Получаем S3 ссылки через downloads manager
            console.log('[Summarization] Получение S3 ссылок...');
            let s3Links = null;
            
            // Сначала пробуем получить из downloads manager
            if (window.downloadsManager && window.downloadsManager.currentS3Links) {
                s3Links = window.downloadsManager.currentS3Links;
                console.log('[Summarization] S3 ссылки получены из downloads manager');
            } else {
                // Если нет, запрашиваем через API
                console.log('[Summarization] Запрос S3 ссылок через API...');
                s3Links = await this.apiManager.getS3Links(this.currentTaskId);
            }
            
            if (!s3Links || !s3Links.json) {
                throw new Error('JSON файл недоступен в S3');
            }
            
            console.log('[Summarization] Найдена S3 ссылка на JSON:', s3Links.json);
            
            // Скачиваем JSON напрямую из S3
            console.log('[Summarization] Скачивание JSON из S3...');
            const response = await fetch(s3Links.json);
            
            if (!response.ok) {
                throw new Error(`Ошибка скачивания JSON из S3: ${response.status} ${response.statusText}`);
            }
            
            const jsonData = await response.json();
            console.log('[Summarization] JSON данные получены из S3, размер:', JSON.stringify(jsonData).length, 'символов');
            
            // Проверяем структуру данных
            if (!jsonData.segments || !Array.isArray(jsonData.segments)) {
                console.warn('[Summarization] Неожиданная структура данных:', jsonData);
                throw new Error('Неверная структура данных транскрипции');
            }
            
            console.log('[Summarization] Найдено сегментов:', jsonData.segments.length);
            return jsonData;
            
        } catch (error) {
            console.error('[Summarization] Ошибка получения данных транскрипции:', error);
            
            // Попробуем получить данные из текущего транскрипта как fallback
            try {
                console.log('[Summarization] Попытка получить данные из текущего транскрипта...');
                const currentTranscript = window.transcriptManager?.getCurrentTranscript();
                
                if (currentTranscript && Array.isArray(currentTranscript) && currentTranscript.length > 0) {
                    console.log('[Summarization] Данные получены из текущего транскрипта, сегментов:', currentTranscript.length);
                    
                    // Преобразуем в нужный формат
                    const transcriptionData = {
                        segments: currentTranscript,
                        task_id: this.currentTaskId
                    };
                    
                    return transcriptionData;
                }
            } catch (transcriptError) {
                console.error('[Summarization] Ошибка получения данных из транскрипта:', transcriptError);
            }
            
            throw error;
        }
    }

    // Проверка доступности данных для суммаризации
    hasValidTranscriptionData() {
        console.log('[Summarization] Проверка доступности данных...');
        console.log('[Summarization] currentTaskId:', this.currentTaskId);
        
        // Проверяем есть ли S3 ссылки с JSON
        const downloadsManager = window.downloadsManager;
        console.log('[Summarization] downloadsManager:', downloadsManager);
        
        if (downloadsManager) {
            console.log('[Summarization] downloadsManager.currentS3Links:', downloadsManager.currentS3Links);
            const s3Links = downloadsManager.currentS3Links;
            if (s3Links) {
                console.log('[Summarization] s3Links.json:', s3Links.json);
                if (s3Links.json) {
                    console.log('[Summarization] ✅ JSON файл найден в S3');
                    return true;
                }
            }
        }
        
        // Или есть ли текущий транскрипт
        const transcriptManager = window.transcriptManager;
        console.log('[Summarization] transcriptManager:', transcriptManager);
        
        if (transcriptManager) {
            const currentTranscript = transcriptManager.getCurrentTranscript();
            console.log('[Summarization] currentTranscript length:', currentTranscript?.length);
            
            if (this.currentTaskId && currentTranscript && Array.isArray(currentTranscript) && currentTranscript.length > 0) {
                console.log('[Summarization] ✅ Текущий транскрипт найден');
                return true;
            }
        }
        
        console.log('[Summarization] ❌ Данные для суммаризации не найдены');
        return false;
    }

    // Получение конфигурации суммаризации с сервера
    async getSummarizationConfig() {
        try {
            console.log('[Summarization] Получение конфигурации суммаризации с сервера...');
            const response = await this.apiManager.makeRequest(CONFIG.API.ENDPOINTS.SUMMARIZATION_CONFIG);
            
            if (response && response.api_url) {
                console.log('[Summarization] Конфигурация получена:', response);
                return response;
            } else {
                throw new Error('Некорректная конфигурация получена от сервера');
            }
        } catch (error) {
            console.error('[Summarization] Ошибка получения конфигурации с сервера:', error);
            
            // Fallback на конфигурацию из CONFIG.js (если есть)
            console.log('[Summarization] Использование fallback конфигурации...');
            return {
                api_url: window.CONFIG?.SUMMARIZATION?.API_URL || 'http://localhost:11434/v1/chat/completions',
                api_key: window.CONFIG?.SUMMARIZATION?.API_KEY || 'your-api-key-here',
                model: window.CONFIG?.SUMMARIZATION?.MODEL || 'llama3.1:8b',
                max_tokens: window.CONFIG?.SUMMARIZATION?.MAX_TOKENS || 4000,
                temperature: window.CONFIG?.SUMMARIZATION?.TEMPERATURE || 0.1,
                has_api_key: window.CONFIG?.SUMMARIZATION?.API_KEY && window.CONFIG?.SUMMARIZATION?.API_KEY !== 'your-api-key-here'
            };
        }
    }

    // Вызов API суммаризации
    async callSummarizationAPI(transcriptionData) {
        console.log('[Summarization] Начало вызова API суммаризации');
        
        // Получаем конфигурацию с сервера
        const config = await this.getSummarizationConfig();
        const apiUrl = config.api_url;
        const apiKey = config.api_key;
        const model = config.model;
        const maxTokens = config.max_tokens;
        const temperature = config.temperature;

        try {
            // Извлекаем данные по спикерам
            console.log('[Summarization] Извлечение данных по спикерам...');
            const speakersData = this.extractSpeakerData(transcriptionData);
            const speakerPercentages = this.calculateSpeakingTime(transcriptionData);
            const totalDuration = this.calculateTotalDuration(transcriptionData);

            console.log('[Summarization] Найдено спикеров:', Object.keys(speakersData).length);
            console.log('[Summarization] Общая продолжительность:', totalDuration.toFixed(1), 'минут');

            // Создаем промпт
            console.log('[Summarization] Создание промпта...');
            const prompt = this.createSummarizationPrompt(speakersData, speakerPercentages, totalDuration);
            console.log('[Summarization] Размер промпта:', prompt.length, 'символов');

            // JSON схема для structured output
            const summarizationSchema = {
                "type": "object",
                "properties": {
                    "strategy_analysis": {
                        "type": "object",
                        "properties": {
                            "chosen_strategy": {"type": "string"},
                            "reasoning": {"type": "string"},
                            "alternative_strategies": {"type": "array", "items": {"type": "string"}}
                        },
                        "required": ["chosen_strategy", "reasoning", "alternative_strategies"]
                    },
                    "key_milestones": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "timestamp": {"type": "string"},
                                "speaker": {"type": "string"},
                                "milestone": {"type": "string"},
                                "importance": {"type": "string", "enum": ["high", "medium", "low"]}
                            },
                            "required": ["timestamp", "speaker", "milestone", "importance"]
                        }
                    },
                    "speakers_analysis": {
                        "type": "object",
                        "additionalProperties": {
                            "type": "object",
                            "properties": {
                                "main_topics": {"type": "array", "items": {"type": "string"}},
                                "speaking_time_percentage": {"type": "number"},
                                "key_points": {"type": "array", "items": {"type": "string"}}
                            },
                            "required": ["main_topics", "speaking_time_percentage", "key_points"]
                        }
                    },
                    "final_summary": {
                        "type": "object",
                        "properties": {
                            "overall_theme": {"type": "string"},
                            "main_discussion_points": {"type": "array", "items": {"type": "string"}},
                            "conclusions": {"type": "array", "items": {"type": "string"}},
                            "action_items": {"type": "array", "items": {"type": "string"}},
                            "duration_minutes": {"type": "number"}
                        },
                        "required": ["overall_theme", "main_discussion_points", "conclusions", "action_items", "duration_minutes"]
                    }
                },
                "required": ["strategy_analysis", "key_milestones", "speakers_analysis", "final_summary"]
            };

            const requestData = {
                "messages": [
                    {
                        "role": "system",
                        "content": "Ты - эксперт по анализу и суммаризации разговоров. Твоя задача - создать структурированное и информативное саммари транскрипции, выбрав оптимальную стратегию анализа и выделив ключевые моменты."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                "model": model,
                "max_tokens": maxTokens,
                "temperature": temperature,
                "guided_json": JSON.stringify(summarizationSchema),
                "guided_decoding_backend": "xgrammar",
                "frequency_penalty": 0,
                "presence_penalty": 0,
                "top_p": 0.9,
                "n": 1,
                "stream": false
            };

            console.log('[Summarization] Отправка запроса к LLM API...');
            console.log('[Summarization] URL:', apiUrl);
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(requestData)
            });

            console.log('[Summarization] Ответ от LLM API получен, статус:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[Summarization] Ошибка LLM API:', response.status, errorText);
                throw new Error(`API error: ${response.status} - ${errorText}`);
            }

            const result = await response.json();
            console.log('[Summarization] Результат от LLM получен');
            
            if (!result.choices || !result.choices[0] || !result.choices[0].message) {
                console.error('[Summarization] Неожиданная структура ответа:', result);
                throw new Error('Неверная структура ответа от LLM API');
            }
            
            const summaryJson = JSON.parse(result.choices[0].message.content);
            console.log('[Summarization] Суммари успешно распарсено');
            
            return summaryJson;
            
        } catch (error) {
            console.error('[Summarization] Ошибка в callSummarizationAPI:', error);
            throw error;
        }
    }

    // Извлечение данных по спикерам
    extractSpeakerData(transcriptionData) {
        const speakersData = {};
        
        if (transcriptionData.segments) {
            transcriptionData.segments.forEach(segment => {
                const speaker = segment.speaker || 'UNKNOWN';
                const text = segment.text?.trim();
                
                if (!speakersData[speaker]) {
                    speakersData[speaker] = [];
                }
                
                if (text) {
                    speakersData[speaker].push(text);
                }
            });
        }
        
        return speakersData;
    }

    // Вычисление времени говорения
    calculateSpeakingTime(transcriptionData) {
        const speakerTimes = {};
        let totalTime = 0;
        
        if (transcriptionData.segments) {
            transcriptionData.segments.forEach(segment => {
                const speaker = segment.speaker || 'UNKNOWN';
                const duration = (segment.end || 0) - (segment.start || 0);
                
                if (!speakerTimes[speaker]) {
                    speakerTimes[speaker] = 0;
                }
                
                speakerTimes[speaker] += duration;
                totalTime += duration;
            });
        }
        
        // Конвертируем в проценты
        const speakerPercentages = {};
        Object.keys(speakerTimes).forEach(speaker => {
            speakerPercentages[speaker] = totalTime > 0 ? 
                Math.round((speakerTimes[speaker] / totalTime) * 100 * 100) / 100 : 0;
        });
        
        return speakerPercentages;
    }

    // Вычисление общей продолжительности
    calculateTotalDuration(transcriptionData) {
        if (transcriptionData.segments && transcriptionData.segments.length > 0) {
            const lastSegment = transcriptionData.segments[transcriptionData.segments.length - 1];
            return (lastSegment.end || 0) / 60; // в минутах
        }
        return 0;
    }

    // Создание промпта для суммаризации
    createSummarizationPrompt(speakersData, speakerPercentages, totalDuration) {
        let prompt = `Проанализируй следующую транскрипцию разговора и создай структурированное саммари.

ДАННЫЕ РАЗГОВОРА:
Общая продолжительность: ${totalDuration.toFixed(1)} минут

`;

        Object.keys(speakersData).forEach(speaker => {
            const texts = speakersData[speaker];
            const percentage = speakerPercentages[speaker] || 0;
            prompt += `\n${speaker} (говорил ${percentage}% времени):\n`;
            prompt += texts.join('\n'); // Передаем весь контекст без ограничений
            prompt += '\n' + '='.repeat(50) + '\n';
        });

        prompt += `
ЗАДАЧА:
1. Выбери оптимальную стратегию суммаризации (хронологическая, тематическая, по спикерам, или комбинированная)
2. Обоснуй свой выбор стратегии
3. Выдели ключевые моменты разговора с временными метками
4. Проанализируй вклад каждого спикера
5. Создай финальное саммари с основными выводами

Отвечай строго в соответствии с заданной JSON схемой.`;

        return prompt;
    }

    // Отображение суммари
    displaySummary(summary) {
        const resultContainer = document.getElementById('summarizationResult');
        if (!resultContainer) return;

        resultContainer.innerHTML = this.createSummaryHTML(summary);
        resultContainer.style.display = 'block';
    }

    // Создание HTML для суммари
    createSummaryHTML(summary) {
        return `
            <div class="summary-container">
                <div class="summary-header">
                    <h4><i class="fas fa-chart-line"></i> Результат анализа</h4>
                    <div class="summary-actions">
                        <button class="btn btn-outline btn-small" onclick="window.summarizationManager?.downloadSummary()">
                            <i class="fas fa-download"></i> Скачать
                        </button>
                        <button class="btn btn-outline btn-small" onclick="window.summarizationManager?.copySummary()">
                            <i class="fas fa-copy"></i> Копировать
                        </button>
                    </div>
                </div>

                <div class="summary-sections">
                    <!-- Стратегия анализа -->
                    <div class="summary-section">
                        <div class="section-header">
                            <h5><i class="fas fa-lightbulb"></i> Стратегия анализа</h5>
                        </div>
                        <div class="section-content">
                            <div class="strategy-chosen">
                                <strong>Выбранная стратегия:</strong> ${summary.strategy_analysis.chosen_strategy}
                            </div>
                            <div class="strategy-reasoning">
                                <strong>Обоснование:</strong> ${summary.strategy_analysis.reasoning}
                            </div>
                        </div>
                    </div>

                    <!-- Ключевые моменты -->
                    <div class="summary-section">
                        <div class="section-header">
                            <h5><i class="fas fa-star"></i> Ключевые моменты</h5>
                        </div>
                        <div class="section-content">
                            <div class="milestones-list">
                                ${summary.key_milestones.map(milestone => `
                                    <div class="milestone-item importance-${milestone.importance}">
                                        <div class="milestone-header">
                                            <span class="milestone-time">${milestone.timestamp}</span>
                                            <span class="milestone-speaker">${milestone.speaker}</span>
                                            <span class="milestone-importance ${milestone.importance}">${this.getImportanceLabel(milestone.importance)}</span>
                                        </div>
                                        <div class="milestone-text">${milestone.milestone}</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>

                    <!-- Анализ спикеров -->
                    <div class="summary-section">
                        <div class="section-header">
                            <h5><i class="fas fa-users"></i> Анализ спикеров</h5>
                        </div>
                        <div class="section-content">
                            <div class="speakers-grid">
                                ${Object.keys(summary.speakers_analysis).map(speaker => {
                                    const analysis = summary.speakers_analysis[speaker];
                                    return `
                                        <div class="speaker-card">
                                            <div class="speaker-header">
                                                <h6>${speaker}</h6>
                                                <span class="speaking-time">${analysis.speaking_time_percentage}% времени</span>
                                            </div>
                                            <div class="speaker-topics">
                                                <strong>Основные темы:</strong>
                                                <div class="topics-list">
                                                    ${analysis.main_topics.map(topic => `<span class="topic-tag">${topic}</span>`).join('')}
                                                </div>
                                            </div>
                                            <div class="speaker-points">
                                                <strong>Ключевые пункты:</strong>
                                                <ul>
                                                    ${analysis.key_points.map(point => `<li>${point}</li>`).join('')}
                                                </ul>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    </div>

                    <!-- Финальное саммари -->
                    <div class="summary-section">
                        <div class="section-header">
                            <h5><i class="fas fa-clipboard-check"></i> Итоговое саммари</h5>
                        </div>
                        <div class="section-content">
                            <div class="final-summary">
                                <div class="summary-theme">
                                    <strong>Общая тема:</strong> ${summary.final_summary.overall_theme}
                                </div>
                                
                                <div class="summary-points">
                                    <strong>Основные пункты обсуждения:</strong>
                                    <ul>
                                        ${summary.final_summary.main_discussion_points.map(point => `<li>${point}</li>`).join('')}
                                    </ul>
                                </div>

                                <div class="summary-conclusions">
                                    <strong>Выводы:</strong>
                                    <ul>
                                        ${summary.final_summary.conclusions.map(conclusion => `<li>${conclusion}</li>`).join('')}
                                    </ul>
                                </div>

                                <div class="summary-actions-items">
                                    <strong>Действия:</strong>
                                    <ul>
                                        ${summary.final_summary.action_items.map(action => `<li>${action}</li>`).join('')}
                                    </ul>
                                </div>

                                <div class="summary-duration">
                                    <strong>Продолжительность:</strong> ${summary.final_summary.duration_minutes.toFixed(1)} минут
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Получение метки важности
    getImportanceLabel(importance) {
        const labels = {
            'high': 'Высокая',
            'medium': 'Средняя',
            'low': 'Низкая'
        };
        return labels[importance] || importance;
    }

    // Обновление статуса суммаризации
    updateSummarizationStatus(status, type = 'default') {
        const statusElement = document.getElementById('summarizationStatus');
        if (statusElement) {
            statusElement.textContent = status;
            statusElement.className = `summarization-status ${type}`;
        }
    }

    // Скачивание суммари
    downloadSummary() {
        if (!this.currentSummary) return;

        const blob = new Blob([JSON.stringify(this.currentSummary, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `summary_${this.currentTaskId}_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Копирование суммари
    async copySummary() {
        if (!this.currentSummary) return;

        try {
            await navigator.clipboard.writeText(JSON.stringify(this.currentSummary, null, 2));
            
            // Показываем уведомление
            const button = event.target.closest('button');
            const originalText = button.innerHTML;
            button.innerHTML = '<i class="fas fa-check"></i> Скопировано';
            button.classList.add('success');
            
            setTimeout(() => {
                button.innerHTML = originalText;
                button.classList.remove('success');
            }, 2000);
            
        } catch (error) {
            console.error('Ошибка копирования:', error);
        }
    }

    // Очистка текущего состояния
    clearCurrentState() {
        this.currentTaskId = null;
        this.currentSummary = null;
        this.isLoading = false;
        this.hideSummarizationSection();
    }
}

 