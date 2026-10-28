import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DecisionService, DecisionItem, TaskItem } from '../../core/services/decision.service';
import { VoiceInputBtnComponent } from '../../shared/components/voice-input-btn.component';

@Component({
  selector: 'app-decisions-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule, VoiceInputBtnComponent],
  template: `
    <div class="decisions-container">
      <!-- Encabezado con Métricas de Cumplimiento -->
      <div class="decisions-header">
        <div>
          <h2>📌 Acuerdos Formales y Tareas del Consorcio</h2>
          <p>Trazabilidad entre las discusiones del equipo y las decisiones adoptadas, con compromisos verificables.</p>
        </div>

        <button class="btn-new-decision" (click)="isFormOpen.set(!isFormOpen())">
          {{ isFormOpen() ? '✕ Cancelar' : '+ Formalizar Nuevo Acuerdo' }}
        </button>
      </div>

      <!-- Barra de Métricas Globales -->
      <div class="metrics-summary-bar">
        <div class="metric-box">
          <span class="metric-val">{{ decisions().length }}</span>
          <span class="metric-lbl">Acuerdos Consensuados</span>
        </div>
        <div class="metric-box">
          <span class="metric-val">{{ totalTasksCount() }}</span>
          <span class="metric-lbl">Tareas Derivadas</span>
        </div>
        <div class="metric-box">
          <span class="metric-val highlight">{{ doneTasksCount() }}</span>
          <span class="metric-lbl">Tareas Cumplidas</span>
        </div>
        <div class="metric-box progress-box">
          <div class="progress-info">
            <span>Avance Global de Compromisos:</span>
            <strong>{{ globalPercentage() }}%</strong>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" [style.width.%]="globalPercentage()"></div>
          </div>
        </div>
      </div>

      <!-- Formulario Desplegable para Formalizar Acuerdo -->
      @if (isFormOpen()) {
        <div class="decision-form-card">
          <h4>📝 Registro de Acuerdo Formal del Consorcio</h4>
          <p class="form-hint">Registra formalmente una resolución para que conste en la memoria del proyecto y sea indexada por la IA.</p>

          <div class="form-grid">
            <div class="form-group full">
              <div class="field-label-row">
                <label>Título del Acuerdo / Decisión:</label>
                <app-voice-input-btn
                  [compact]="true"
                  [tooltip]="'Dictar título del acuerdo'"
                  (textTranscribed)="onVoiceFormTitle($event)"
                />
              </div>
              <input
                type="text"
                [(ngModel)]="formTitle"
                placeholder="Ej: Adopción del protocolo de extracción enzimática para la fase piloto"
              />
            </div>

            <div class="form-group">
              <label>Línea de Investigación Asignada:</label>
              <select [(ngModel)]="formSpaceId">
                <option value="space-general">🌐 Consorcio General</option>
                <option value="space-nanocelulosa">🧪 Línea 1: Nanocelulosa y Síntesis</option>
                <option value="space-biomateriales">🔬 Línea 2: Biomateriales y Citotoxicidad</option>
                <option value="space-farmacologia">💊 Línea 3: Farmacología y Liberación</option>
              </select>
            </div>

            <div class="form-group">
              <div class="field-label-row">
                <label>Discusión o Post de Origen (Opcional):</label>
                <app-voice-input-btn
                  [compact]="true"
                  [tooltip]="'Dictar origen'"
                  (textTranscribed)="onVoiceFormOrigin($event)"
                />
              </div>
              <input
                type="text"
                [(ngModel)]="formOrigin"
                placeholder="Ej: Hilo sobre absorbancia formazán del 24 de octubre"
              />
            </div>

            <div class="form-group full">
              <div class="field-label-row">
                <label>Justificación Científica / Rationale (¿Por qué se acordó esto?):</label>
                <app-voice-input-btn
                  [tooltip]="'Dictar justificación científica con Whisper'"
                  (textTranscribed)="onVoiceFormRationale($event)"
                />
              </div>
              <textarea
                [(ngModel)]="formRationale"
                rows="3"
                placeholder="Resume la evidencia experimental o consenso que sustenta la decisión..."
              ></textarea>
            </div>
          </div>

          <!-- Sección de Tareas Derivadas -->
          <div class="tasks-builder-section">
            <div class="tasks-builder-header">
              <h5>Tareas Derivadas Inmediatas ({{ pendingTasks.length }})</h5>
              <button class="btn-add-task-row" (click)="addTaskRow()">+ Añadir Tarea</button>
            </div>

            @for (t of pendingTasks; track $index) {
              <div class="task-row-inputs">
                <input
                  type="text"
                  [(ngModel)]="t.title"
                  placeholder="Descripción de la tarea concreta..."
                  class="task-title-input"
                />
                <app-voice-input-btn
                  [compact]="true"
                  [tooltip]="'Dictar tarea'"
                  (textTranscribed)="onVoiceTaskTitle($index, $event)"
                />
                <select [(ngModel)]="t.assigned_to_id" (change)="onAssigneeChange(t)">
                  <option value="00000000-0000-0000-0000-000000000001">Dra. Elena Ramos</option>
                  <option value="u-carlos">Dr. Carlos Méndez</option>
                  <option value="u-sofia">Dra. Sofía Alarcón</option>
                  <option value="u-ricardo">Dr. Ricardo Valenzuela</option>
                </select>
                <input type="date" [(ngModel)]="t.due_date" class="task-date-input" />
                <button class="btn-remove-task" (click)="removeTaskRow($index)">✕</button>
              </div>
            }
          </div>

          <div class="form-actions">
            <button class="btn-cancel" (click)="isFormOpen.set(false)">Descartar</button>
            <button
              class="btn-save"
              (click)="submitDecision()"
              [disabled]="isSaving() || !formTitle.trim() || !formRationale.trim()"
            >
              {{ isSaving() ? 'Guardando...' : 'Formalizar Acuerdo' }}
            </button>
          </div>
        </div>
      }

      <!-- Filtro por Línea Temática -->
      <div class="filter-strip">
        <span class="filter-label">Filtrar por Línea:</span>
        <button
          class="pill-btn"
          [class.active]="selectedSpaceId() === 'all'"
          (click)="filterBySpace('all')"
        >
          Todas las Líneas
        </button>
        <button
          class="pill-btn"
          [class.active]="selectedSpaceId() === 'space-general'"
          (click)="filterBySpace('space-general')"
        >
          🌐 Consorcio General
        </button>
        <button
          class="pill-btn"
          [class.active]="selectedSpaceId() === 'space-nanocelulosa'"
          (click)="filterBySpace('space-nanocelulosa')"
        >
          🧪 Nanocelulosa
        </button>
        <button
          class="pill-btn"
          [class.active]="selectedSpaceId() === 'space-biomateriales'"
          (click)="filterBySpace('space-biomateriales')"
        >
          🔬 Biomateriales
        </button>
        <button
          class="pill-btn"
          [class.active]="selectedSpaceId() === 'space-farmacologia'"
          (click)="filterBySpace('space-farmacologia')"
        >
          💊 Farmacología
        </button>
      </div>

      <!-- Lista de Acuerdos Formales -->
      <div class="decisions-list">
        @for (dec of decisions(); track dec.id) {
          <article class="decision-card">
            <!-- Encabezado de la Decisión -->
            <div class="decision-header">
              <div class="header-left-meta">
                <span class="badge-decision approved">✓ ACUERDO CONSENSUADO</span>
                <span class="space-badge">{{ dec.space_name }}</span>
                <span class="date-text">Adoptado el {{ dec.resolved_at | date:'d MMM yyyy' }}</span>
              </div>
              <div class="header-right-recorder">
                <span>Registrado por: <strong>{{ dec.recorded_by.full_name }}</strong></span>
              </div>
            </div>

            <!-- Título y Justificación -->
            <div class="decision-body">
              <h3 class="decision-title">{{ dec.title }}</h3>
              <div class="rationale-block">
                <strong>Justificación Científica:</strong>
                <p>{{ dec.rationale }}</p>
              </div>
              @if (dec.origin_discussion_title) {
                <div class="origin-tag">
                  🔗 Origen: <em>{{ dec.origin_discussion_title }}</em>
                </div>
              }
            </div>

            <!-- Progreso y Tareas Derivadas -->
            <div class="tasks-container">
              <div class="tasks-header-row">
                <span class="tasks-title">📋 Tareas y Compromisos Derivados ({{ dec.tasks_done_count }}/{{ dec.tasks_count }} completadas):</span>
                <div class="task-mini-progress">
                  <div class="mini-progress-fill" [style.width.%]="calcPercentage(dec)"></div>
                </div>
              </div>

              <div class="tasks-table">
                @for (task of dec.tasks; track task.id) {
                  <div class="task-item-row" [class.done]="task.status === 'DONE'">
                    <!-- Checkbox de estado interactivo -->
                    <button
                      class="btn-task-status-toggle"
                      [class.checked]="task.status === 'DONE'"
                      (click)="toggleTask(dec, task)"
                      title="Clic para cambiar estado"
                    >
                      {{ task.status === 'DONE' ? '✓' : '' }}
                    </button>

                    <!-- Título de la tarea -->
                    <div class="task-info-col">
                      <span class="task-name" [class.strikethrough]="task.status === 'DONE'">
                        {{ task.title }}
                      </span>
                      @if (task.description) {
                        <small class="task-subdesc">{{ task.description }}</small>
                      }
                    </div>

                    <!-- Responsable con avatar -->
                    <div class="task-assignee">
                      <img [src]="task.assigned_to.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'" class="assignee-avatar" />
                      <span>{{ task.assigned_to.full_name }}</span>
                    </div>

                    <!-- Fecha de entrega -->
                    <div class="task-due-date">
                      @if (task.due_date) {
                        <span class="date-chip" [class.urgent]="isUrgent(task)">
                          📅 {{ task.due_date | date:'d MMM' }}
                        </span>
                      }
                    </div>

                    <!-- Estado Badge -->
                    <div class="task-badge-col">
                      <select
                        [ngModel]="task.status"
                        (ngModelChange)="onStatusSelectChange(dec, task, $event)"
                        class="status-dropdown"
                        [ngClass]="task.status.toLowerCase()"
                      >
                        <option value="TODO">Por hacer</option>
                        <option value="IN_PROGRESS">En progreso</option>
                        <option value="DONE">Completada</option>
                      </select>
                    </div>
                  </div>
                }
              </div>
            </div>
          </article>
        } @empty {
          <div class="empty-state">
            <span class="empty-icon">📌</span>
            <h4>No hay acuerdos formalizados con este filtro</h4>
            <p>Utiliza el botón de arriba para formalizar el primer acuerdo de esta línea.</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .decisions-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
      max-width: 1250px;
      margin: 0 auto;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #0f172a;
    }
    .decisions-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .decisions-header h2 {
      margin: 0 0 4px 0;
      font-size: 24px;
      color: #1e3a8a;
      font-weight: 700;
    }
    .decisions-header p {
      margin: 0;
      font-size: 14px;
      color: #64748b;
    }
    .btn-new-decision {
      background: #1e40af;
      color: #fff;
      border: none;
      padding: 9px 18px;
      border-radius: 7px;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
      transition: background 0.15s;
    }
    .btn-new-decision:hover {
      background: #1d4ed8;
    }
    /* Metrics Summary Bar */
    .metrics-summary-bar {
      display: grid;
      grid-template-columns: 180px 180px 180px 1fr;
      gap: 16px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 16px 20px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
    }
    .metric-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .metric-val {
      font-size: 26px;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.1;
    }
    .metric-val.highlight {
      color: #059669;
    }
    .metric-lbl {
      font-size: 11px;
      color: #64748b;
      margin-top: 4px;
      font-weight: 500;
    }
    .progress-box {
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 8px;
    }
    .progress-info {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      color: #475569;
    }
    .progress-info strong {
      color: #059669;
    }
    .progress-bar-bg {
      height: 8px;
      background: #e2e8f0;
      border-radius: 4px;
      overflow: hidden;
    }
    .progress-bar-fill {
      height: 100%;
      background: #059669;
      border-radius: 4px;
      transition: width 0.3s;
    }
    /* Decision Form */
    .decision-form-card {
      background: #ffffff;
      border: 1px solid #93c5fd;
      border-radius: 12px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      box-shadow: 0 4px 12px rgba(30, 64, 175, 0.08);
      animation: fadeIn 0.2s ease-in;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-6px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .decision-form-card h4 {
      margin: 0;
      font-size: 18px;
      color: #1e3a8a;
      font-weight: 700;
    }
    .form-hint {
      margin: 0;
      font-size: 12px;
      color: #64748b;
    }
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .form-group.full {
      grid-column: 1 / -1;
    }
    .form-group label {
      font-size: 12px;
      font-weight: 600;
      color: #334155;
    }
    .form-group input, .form-group select, .form-group textarea {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      color: #0f172a;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 13px;
      outline: none;
    }
    .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
      border-color: #1e40af;
      background: #ffffff;
    }
    .tasks-builder-section {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .tasks-builder-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .tasks-builder-header h5 {
      margin: 0;
      font-size: 14px;
      color: #1e3a8a;
      font-weight: 600;
    }
    .btn-add-task-row {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #1e40af;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
    .task-row-inputs {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .task-title-input {
      flex: 2;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #0f172a;
      padding: 6px 10px;
      border-radius: 6px;
      font-size: 12px;
    }
    .task-row-inputs select, .task-date-input {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #0f172a;
      padding: 6px 10px;
      border-radius: 6px;
      font-size: 12px;
    }
    .btn-remove-task {
      background: transparent;
      border: none;
      color: #dc2626;
      font-size: 14px;
      cursor: pointer;
    }
    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }
    .btn-cancel {
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #cbd5e1;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
    }
    .btn-save {
      background: #1e40af;
      color: #fff;
      border: none;
      padding: 8px 18px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
    }
    /* Filter Strip */
    .filter-strip {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
    }
    .filter-label {
      font-size: 12px;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
    }
    .pill-btn {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #475569;
      padding: 5px 12px;
      border-radius: 16px;
      font-size: 12px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.15s;
    }
    .pill-btn:hover {
      background: #f1f5f9;
    }
    .pill-btn.active {
      background: #1e40af;
      border-color: #1e40af;
      color: #ffffff;
      font-weight: 600;
    }
    /* Decisions Cards */
    .decisions-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .decision-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 22px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      border-left: 4px solid #059669;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }
    .decision-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }
    .header-left-meta {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .badge-decision.approved {
      background: #ecfdf5;
      color: #059669;
      font-size: 10px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 4px;
      letter-spacing: 0.5px;
    }
    .space-badge {
      background: #eff6ff;
      color: #1e40af;
      border: 1px solid #dbeafe;
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: 500;
    }
    .date-text {
      font-size: 11px;
      color: #64748b;
    }
    .header-right-recorder {
      font-size: 12px;
      color: #64748b;
    }
    .decision-title {
      margin: 0 0 8px 0;
      font-size: 17px;
      color: #0f172a;
      font-weight: 700;
      line-height: 1.35;
    }
    .rationale-block {
      background: #f8fafc;
      border-radius: 8px;
      padding: 10px 14px;
      border-left: 3px solid #1e40af;
      border-top: 1px solid #e2e8f0;
      border-right: 1px solid #e2e8f0;
      border-bottom: 1px solid #e2e8f0;
      font-size: 13px;
      color: #334155;
      line-height: 1.45;
    }
    .origin-tag {
      font-size: 11px;
      color: #64748b;
      margin-top: 6px;
    }
    .tasks-container {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px;
      margin-top: 4px;
    }
    .tasks-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .tasks-title {
      font-size: 13px;
      font-weight: 600;
      color: #334155;
    }
    .task-mini-progress {
      width: 120px;
      height: 6px;
      background: #e2e8f0;
      border-radius: 3px;
      overflow: hidden;
    }
    .mini-progress-fill {
      height: 100%;
      background: #059669;
      transition: width 0.3s;
    }
    .tasks-table {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .task-item-row {
      display: flex;
      align-items: center;
      gap: 12px;
      background: #ffffff;
      padding: 10px 14px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      transition: all 0.15s;
    }
    .task-item-row.done {
      border-color: #a7f3d0;
      background: #f0fdf4;
      opacity: 0.9;
    }
    .btn-task-status-toggle {
      width: 22px;
      height: 22px;
      border-radius: 6px;
      border: 2px solid #cbd5e1;
      background: #ffffff;
      color: #fff;
      font-size: 13px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      flex-shrink: 0;
      transition: all 0.15s;
    }
    .btn-task-status-toggle.checked {
      background: #059669;
      border-color: #059669;
    }
    .task-info-col {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .task-name {
      font-size: 13px;
      color: #0f172a;
      font-weight: 500;
    }
    .task-name.strikethrough {
      text-decoration: line-through;
      color: #94a3b8;
    }
    .task-subdesc {
      font-size: 11px;
      color: #64748b;
    }
    .task-assignee {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #475569;
    }
    .assignee-avatar {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      object-fit: cover;
    }
    .date-chip {
      font-size: 11px;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      color: #475569;
      padding: 3px 8px;
      border-radius: 4px;
    }
    .date-chip.urgent {
      background: #fef2f2;
      border-color: #fecaca;
      color: #dc2626;
      font-weight: 600;
    }
    .status-dropdown {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 11px;
      cursor: pointer;
      color: #0f172a;
    }
    .status-dropdown.todo { color: #475569; }
    .status-dropdown.in_progress { color: #d97706; font-weight: 600; }
    .status-dropdown.done { color: #059669; font-weight: 600; }
    .empty-state {
      text-align: center;
      padding: 50px 20px;
      background: #ffffff;
      border: 1px dashed #cbd5e1;
      border-radius: 12px;
      color: #64748b;
    }
    .empty-state h4 {
      margin: 8px 0 4px 0;
      color: #0f172a;
    }
    .decision-body {
      font-size: 13px;
      color: #334155;
      line-height: 1.45;
    }
    .origin-tag {
      font-size: 11px;
      color: #64748b;
      margin-top: 6px;
    }
    .tasks-container {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px;
      margin-top: 4px;
    }
    .tasks-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .tasks-title {
      font-size: 13px;
      font-weight: 600;
      color: #0f172a;
    }
    .task-mini-progress {
      width: 120px;
      height: 6px;
      background: #e2e8f0;
      border-radius: 3px;
      overflow: hidden;
    }
    .mini-progress-fill {
      height: 100%;
      background: #059669;
      transition: width 0.3s;
    }
    .tasks-table {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .task-item-row {
      display: flex;
      align-items: center;
      gap: 12px;
      background: #f8fafc;
      padding: 10px 14px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      transition: all 0.15s;
    }
    .task-item-row.done {
      border-color: #a7f3d0;
      background: #f0fdf4;
    }
    .btn-task-status-toggle {
      width: 22px;
      height: 22px;
      border-radius: 6px;
      border: 2px solid #64748b;
      background: transparent;
      color: #fff;
      font-size: 13px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      flex-shrink: 0;
      transition: all 0.15s;
    }
    .btn-task-status-toggle.checked {
      background: #10b981;
      border-color: #10b981;
    }
    .task-info-col {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .task-name {
      font-size: 13px;
      color: #f1f5f9;
    }
    .task-name.strikethrough {
      text-decoration: line-through;
      color: #64748b;
    }
    .task-subdesc {
      font-size: 11px;
      color: #64748b;
    }
    .task-assignee {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #cbd5e1;
    }
    .assignee-avatar {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      object-fit: cover;
    }
    .date-chip {
      font-size: 11px;
      background: #1e293b;
      color: #94a3b8;
      padding: 3px 8px;
      border-radius: 4px;
    }
    .date-chip.urgent {
      background: rgba(239, 68, 68, 0.2);
      color: #f87171;
      font-weight: 600;
    }
    .status-dropdown {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 11px;
      cursor: pointer;
      color: #0f172a;
    }
    .status-dropdown.todo { color: #64748b; }
    .status-dropdown.in_progress { color: #d97706; font-weight: 600; }
    .status-dropdown.done { color: #059669; font-weight: 600; }
    .empty-state {
      padding: 50px 20px;
      text-align: center;
      background: #ffffff;
      border-radius: 8px;
      border: 1px dashed #cbd5e1;
    }
    .empty-icon {
      font-size: 40px;
      display: block;
      margin-bottom: 8px;
    }
    .empty-state h4 {
      margin: 0 0 4px 0;
      color: #0f172a;
    }
    .empty-state p {
      margin: 0;
      font-size: 13px;
      color: #64748b;
    }
    .field-label-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }
  `]
})
export class DecisionsTasksComponent implements OnInit {
  decisionService = inject(DecisionService);

  decisions = signal<DecisionItem[]>([]);
  selectedSpaceId = signal<string>('all');
  isFormOpen = signal<boolean>(false);
  isSaving = signal<boolean>(false);

  // Formulario nuevo acuerdo
  formTitle = '';
  formSpaceId = 'space-general';
  formRationale = '';
  formOrigin = '';

  onVoiceFormTitle(text: string): void {
    if (this.formTitle.trim()) {
      this.formTitle += ' ' + text;
    } else {
      this.formTitle = text;
    }
  }

  onVoiceFormOrigin(text: string): void {
    if (this.formOrigin.trim()) {
      this.formOrigin += ' ' + text;
    } else {
      this.formOrigin = text;
    }
  }

  onVoiceFormRationale(text: string): void {
    if (this.formRationale.trim()) {
      this.formRationale += ' ' + text;
    } else {
      this.formRationale = text;
    }
  }

  onVoiceTaskTitle(index: number, text: string): void {
    if (this.pendingTasks[index]) {
      const prev = this.pendingTasks[index].title || '';
      if (prev.trim()) {
        this.pendingTasks[index].title = prev + ' ' + text;
      } else {
        this.pendingTasks[index].title = text;
      }
    }
  }

  pendingTasks: {
    title: string;
    description?: string;
    assigned_to_id: string;
    assigned_to_name: string;
    due_date?: string;
  }[] = [
    {
      title: 'Validar condiciones experimentales en réplicas triplicadas',
      assigned_to_id: 'u-carlos',
      assigned_to_name: 'Dr. Carlos Méndez',
      due_date: '2026-10-30'
    }
  ];

  ngOnInit() {
    this.loadDecisions();
  }

  loadDecisions() {
    this.decisionService.getDecisions(this.selectedSpaceId()).subscribe({
      next: (list) => this.decisions.set(list),
      error: () => {}
    });
  }

  filterBySpace(spaceId: string) {
    this.selectedSpaceId.set(spaceId);
    this.loadDecisions();
  }

  totalTasksCount = computed(() => {
    return this.decisions().reduce((acc, d) => acc + d.tasks_count, 0);
  });

  doneTasksCount = computed(() => {
    return this.decisions().reduce((acc, d) => acc + d.tasks_done_count, 0);
  });

  globalPercentage = computed(() => {
    const total = this.totalTasksCount();
    if (total === 0) return 0;
    return Math.round((this.doneTasksCount() / total) * 100);
  });

  calcPercentage(dec: DecisionItem): number {
    if (dec.tasks_count === 0) return 0;
    return Math.round((dec.tasks_done_count / dec.tasks_count) * 100);
  }

  isUrgent(task: TaskItem): boolean {
    if (!task.due_date || task.status === 'DONE') return false;
    const due = new Date(task.due_date).getTime();
    const now = new Date().getTime();
    const diffDays = (due - now) / (1000 * 3600 * 24);
    return diffDays >= 0 && diffDays <= 4;
  }

  addTaskRow() {
    this.pendingTasks.push({
      title: '',
      assigned_to_id: '00000000-0000-0000-0000-000000000001',
      assigned_to_name: 'Dra. Elena Ramos',
      due_date: ''
    });
  }

  removeTaskRow(index: number) {
    this.pendingTasks.splice(index, 1);
  }

  onAssigneeChange(t: any) {
    const names: Record<string, string> = {
      '00000000-0000-0000-0000-000000000001': 'Dra. Elena Ramos',
      'u-carlos': 'Dr. Carlos Méndez',
      'u-sofia': 'Dra. Sofía Alarcón',
      'u-ricardo': 'Dr. Ricardo Valenzuela'
    };
    t.assigned_to_name = names[t.assigned_to_id] || 'Investigador';
  }

  submitDecision() {
    if (!this.formTitle.trim() || !this.formRationale.trim()) return;

    this.isSaving.set(true);
    this.decisionService.createDecision({
      space_id: this.formSpaceId,
      title: this.formTitle.trim(),
      rationale: this.formRationale.trim(),
      origin_discussion_title: this.formOrigin.trim() || undefined,
      initial_tasks: this.pendingTasks.filter(t => t.title.trim().length > 0)
    }).subscribe({
      next: (created) => {
        this.decisions.update(prev => [created, ...prev]);
        this.isSaving.set(false);
        this.isFormOpen.set(false);
        // Limpiar formulario
        this.formTitle = '';
        this.formRationale = '';
        this.formOrigin = '';
        this.pendingTasks = [];
      },
      error: () => this.isSaving.set(false)
    });
  }

  toggleTask(dec: DecisionItem, task: TaskItem) {
    const newStatus = task.status === 'DONE' ? 'TODO' : 'DONE';
    this.decisionService.updateTaskStatus(task.id, newStatus).subscribe({
      next: (updated) => {
        task.status = updated.status;
        dec.tasks_done_count = dec.tasks.filter(t => t.status === 'DONE').length;
      }
    });
  }

  onStatusSelectChange(dec: DecisionItem, task: TaskItem, newStatus: string) {
    this.decisionService.updateTaskStatus(task.id, newStatus).subscribe({
      next: (updated) => {
        task.status = updated.status;
        dec.tasks_done_count = dec.tasks.filter(t => t.status === 'DONE').length;
      }
    });
  }
}
