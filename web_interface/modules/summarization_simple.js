// Упрощенный модуль для работы с суммаризацией транскрипций (бэкенд версия)
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
        console.log('[Summarization] Модуль суммаризации инициализирован (бэкенд версия)');
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
                AI агент загрузит JSON транскрипцию из S3, проанализирует её на сервере и создаст структурированное саммари с ключевыми моментами.
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
                    AI агент загрузит JSON транскрипцию из S3, проанализирует её на сервере и создаст структурированное саммари с ключевыми моментами.
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
            let errorMessage = 'Произошла ошибка при создании суммари.';
            
            if (error.message) {
                errorMessage += ` Детали: ${error.message}`;
            }
            
            this.uiManager.showError(errorMessage);
            
        } finally {
            this.isLoading = false;
            
            // Восстанавливаем кнопку
            if (generateBtn) {
                generateBtn.disabled = false;
                generateBtn.innerHTML = '<i class="fas fa-magic"></i> Создать суммари';
            }
        }
    }

    // Получение данных транскрипции (упрощенная версия)
    async getTranscriptionData() {
        // Этот метод больше не используется, так как обработка происходит на бэкенде
        return null;
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

    // Отображение суммари
    displaySummary(summary) {
        console.log('[Summarization] Отображение суммари...');
        
        const resultDiv = document.getElementById('summarizationResult');
        if (!resultDiv) {
            console.error('[Summarization] Элемент результата не найден');
            return;
        }
        
        // Создаем HTML для отображения суммари
        const summaryHtml = this.createSummaryHTML(summary);
        resultDiv.innerHTML = summaryHtml;
        resultDiv.style.display = 'block';
        
        // Прокручиваем к результату
        resultDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Создание HTML для суммари
    createSummaryHTML(summary) {
        let html = `
            <div class="summary-container">
                <div class="summary-header">
                    <div class="summary-title">
                        <i class="fas fa-brain"></i>
                        <h4>Результат суммаризации</h4>
                    </div>
                    <div class="summary-actions">
                        <button class="btn btn-sm btn-secondary" onclick="window.summarizationManager?.downloadSummary()">
                            <i class="fas fa-download"></i> Скачать
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="window.summarizationManager?.copySummary()">
                            <i class="fas fa-copy"></i> Копировать
                        </button>
                    </div>
                </div>
        `;
        
        // Стратегия анализа
        if (summary.strategy_analysis) {
            html += `
                <div class="summary-section">
                    <h5><i class="fas fa-lightbulb"></i> Стратегия анализа</h5>
                    <div class="strategy-info">
                        <p><strong>Выбранная стратегия:</strong> ${summary.strategy_analysis.chosen_strategy}</p>
                        <p><strong>Обоснование:</strong> ${summary.strategy_analysis.reasoning}</p>
                    </div>
                </div>
            `;
        }
        
        // Ключевые моменты
        if (summary.key_milestones && summary.key_milestones.length > 0) {
            html += `
                <div class="summary-section">
                    <h5><i class="fas fa-star"></i> Ключевые моменты</h5>
                    <div class="milestones-list">
            `;
            
            summary.key_milestones.forEach(milestone => {
                const importanceClass = this.getImportanceLabel(milestone.importance);
                html += `
                    <div class="milestone-item ${importanceClass}">
                        <div class="milestone-header">
                            <span class="milestone-time">${milestone.timestamp}</span>
                            <span class="milestone-speaker">${milestone.speaker}</span>
                            <span class="milestone-importance ${milestone.importance}">${milestone.importance}</span>
                        </div>
                        <div class="milestone-content">${milestone.milestone}</div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        }
        
        // Анализ спикеров
        if (summary.speakers_analysis) {
            html += `
                <div class="summary-section">
                    <h5><i class="fas fa-users"></i> Анализ спикеров</h5>
                    <div class="speakers-analysis">
            `;
            
            Object.entries(summary.speakers_analysis).forEach(([speaker, analysis]) => {
                html += `
                    <div class="speaker-analysis">
                        <h6>${speaker} (${analysis.speaking_time_percentage}% времени)</h6>
                        <div class="speaker-topics">
                            <strong>Основные темы:</strong>
                            <ul>
                                ${analysis.main_topics.map(topic => `<li>${topic}</li>`).join('')}
                            </ul>
                        </div>
                        <div class="speaker-points">
                            <strong>Ключевые точки:</strong>
                            <ul>
                                ${analysis.key_points.map(point => `<li>${point}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        }
        
        // Финальное саммари
        if (summary.final_summary) {
            html += `
                <div class="summary-section">
                    <h5><i class="fas fa-clipboard-check"></i> Итоговое саммари</h5>
                    <div class="final-summary">
                        <div class="summary-theme">
                            <strong>Общая тема:</strong> ${summary.final_summary.overall_theme}
                        </div>
                        <div class="summary-duration">
                            <strong>Продолжительность:</strong> ${summary.final_summary.duration_minutes} минут
                        </div>
                        
                        <div class="summary-points">
                            <strong>Основные точки обсуждения:</strong>
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
                        
                        ${summary.final_summary.action_items.length > 0 ? `
                            <div class="summary-actions">
                                <strong>Действия:</strong>
                                <ul>
                                    ${summary.final_summary.action_items.map(action => `<li>${action}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }
        
        html += `
            </div>
        `;
        
        return html;
    }

    // Получение класса важности
    getImportanceLabel(importance) {
        const labels = {
            'high': 'importance-high',
            'medium': 'importance-medium',
            'low': 'importance-low'
        };
        return labels[importance] || 'importance-medium';
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
        if (!this.currentSummary) {
            this.uiManager.showError('Нет данных для скачивания');
            return;
        }
        
        const summaryText = JSON.stringify(this.currentSummary, null, 2);
        const blob = new Blob([summaryText], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `summary_${this.currentTaskId}_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.uiManager.showSuccess('Суммари скачано');
    }

    // Копирование суммари
    async copySummary() {
        if (!this.currentSummary) {
            this.uiManager.showError('Нет данных для копирования');
            return;
        }
        
        try {
            const summaryText = JSON.stringify(this.currentSummary, null, 2);
            await navigator.clipboard.writeText(summaryText);
            this.uiManager.showSuccess('Суммари скопировано в буфер обмена');
        } catch (error) {
            console.error('[Summarization] Ошибка копирования:', error);
            this.uiManager.showError('Ошибка копирования в буфер обмена');
        }
    }

    // Очистка текущего состояния
    clearCurrentState() {
        this.currentTaskId = null;
        this.currentSummary = null;
        this.isLoading = false;
        
        const resultDiv = document.getElementById('summarizationResult');
        if (resultDiv) {
            resultDiv.style.display = 'none';
            resultDiv.innerHTML = '';
        }
    }
} 