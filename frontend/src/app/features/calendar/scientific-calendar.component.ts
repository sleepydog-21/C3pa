import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CalendarService, ScientificEvent, CreateEventPayload } from '../../core/services/calendar.service';
import { VoiceInputBtnComponent } from '../../shared/components/voice-input-btn.component';

@Component({
  selector: 'app-scientific-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule, VoiceInputBtnComponent],
  template: `
    <div class="calendar-container">
      <!-- Encabezado Institucional -->
      <div class="calendar-header">
        <div>
          <h2>📅 Calendario Científico y Cronograma de Hitos</h2>
          <p>Trazabilidad temporal de reuniones colegiadas, entrega de muestras inter-laboratorio y plazos de acuerdos.</p>
        </div>
        <button class="btn-create-event" (click)="openCreateModal()">
          + Agendar Evento o Hito Científico
        </button>
      </div>

      <!-- Barra de Filtros -->
      <div class="filter-toolbar">
        <!-- Filtro por Línea Temática -->
        <div class="filter-group">
          <label>Línea Temática:</label>
          <select [(ngModel)]="selectedSpace" (change)="loadEvents()">
            <option value="all">🌐 Todas las Líneas</option>
            <option value="space-general">Consorcio General</option>
            <option value="space-linea1">Línea 1: Nanocelulosa y Síntesis</option>
            <option value="space-linea2">Línea 2: Biomateriales y Citotoxicidad</option>
            <option value="space-linea3">Línea 3: Liberación Controlada</option>
          </select>
        </div>

        <!-- Filtro por Tipo de Evento -->
        <div class="filter-chips">
          <button
            class="chip-btn"
            [class.active]="selectedType === 'ALL'"
            (click)="setTypeFilter('ALL')"
          >
            Todos
          </button>
          <button
            class="chip-btn"
            [class.active]="selectedType === 'SAMPLE_DELIVERY'"
            (click)="setTypeFilter('SAMPLE_DELIVERY')"
          >
            🧪 Entrega de Muestras
          </button>
          <button
            class="chip-btn"
            [class.active]="selectedType === 'MEETING'"
            (click)="setTypeFilter('MEETING')"
          >
            🔬 Reunión Técnica
          </button>
          <button
            class="chip-btn"
            [class.active]="selectedType === 'DEADLINE'"
            (click)="setTypeFilter('DEADLINE')"
          >
            📌 Límite de Acuerdo
          </button>
          <button
            class="chip-btn"
            [class.active]="selectedType === 'CONVOCATORIA'"
            (click)="setTypeFilter('CONVOCATORIA')"
          >
            📢 Convocatoria
          </button>
        </div>
      </div>

      <!-- Lista Cronológica de Eventos e Hitos -->
      <div class="events-timeline">
        @for (evt of events(); track evt.id) {
          <div class="event-card" [ngClass]="getCardClass(evt.event_type)">
            <div class="event-time-col">
              <span class="event-day">{{ evt.start_time | date:'d' }}</span>
              <span class="event-month">{{ evt.start_time | date:'MMM' | uppercase }}</span>
              <span class="event-hour" *ngIf="!evt.is_all_day">{{ evt.start_time | date:'shortTime' }}</span>
              <span class="event-allday" *ngIf="evt.is_all_day">Todo el día</span>
            </div>

            <div class="event-main-col">
              <div class="event-top-meta">
                <span class="event-type-pill" [ngClass]="evt.event_type.toLowerCase()">
                  {{ getTypeLabel(evt.event_type) }}
                </span>
                <span class="event-space-pill">{{ evt.space_name || 'Consorcio General' }}</span>
              </div>

              <h3 class="event-title">{{ evt.title }}</h3>
              <p class="event-desc" *ngIf="evt.description">{{ evt.description }}</p>

              <div class="event-footer-meta">
                <span class="event-location" *ngIf="evt.location_or_url">
                  📍 {{ evt.location_or_url }}
                </span>
                <span class="event-responsible" *ngIf="evt.responsible_name">
                  👤 Responsable: <strong>{{ evt.responsible_name }}</strong>
                </span>
              </div>
            </div>

            <div class="event-actions-col">
              <button class="btn-delete-event" (click)="deleteEvent(evt.id)" title="Eliminar evento">
                🗑️
              </button>
            </div>
          </div>
        } @empty {
          <div class="empty-events-box">
            <span class="empty-icon">📅</span>
            <h3>No hay eventos programados en este filtro</h3>
            <p>Utiliza el botón superior para agendar una reunión técnica, entrega de muestras o fecha límite de hito.</p>
          </div>
        }
      </div>

      <!-- Modal para Crear Nuevo Evento -->
      <div *ngIf="isModalOpen" class="modal-backdrop" (click)="closeModal()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Agendar Evento o Hito Científico</h3>
            <button class="btn-close" (click)="closeModal()">✕</button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <div class="field-label-row">
                <label>Título del Evento / Hito:</label>
                <app-voice-input-btn
                  [compact]="true"
                  [tooltip]="'Dictar título del evento'"
                  (textTranscribed)="onVoiceEventTitle($event)"
                />
              </div>
              <input
                type="text"
                [(ngModel)]="newEventTitle"
                placeholder="Ej: Entrega de muestra lote 4B para espectrometría"
              />
            </div>

            <div class="form-row">
              <div class="form-group flex-1">
                <label>Tipo de Evento:</label>
                <select [(ngModel)]="newEventType">
                  <option value="SAMPLE_DELIVERY">🧪 Entrega de Muestras / Lotes</option>
                  <option value="MEETING">🔬 Reunión Técnica de Línea</option>
                  <option value="DEADLINE">📌 Fecha Límite de Acuerdo / Tarea</option>
                  <option value="CONVOCATORIA">📢 Convocatoria de Financiamiento</option>
                </select>
              </div>

              <div class="form-group flex-1">
                <label>Línea Temática:</label>
                <select [(ngModel)]="newEventSpace">
                  <option value="space-general">Consorcio General</option>
                  <option value="space-linea1">Línea 1: Nanocelulosa y Síntesis</option>
                  <option value="space-linea2">Línea 2: Biomateriales y Citotoxicidad</option>
                  <option value="space-linea3">Línea 3: Liberación Controlada</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group flex-1">
                <label>Fecha y Hora de Inicio:</label>
                <input type="datetime-local" [(ngModel)]="newEventStartTime" />
              </div>
              <div class="form-group flex-1">
                <label>Fecha y Hora de Fin:</label>
                <input type="datetime-local" [(ngModel)]="newEventEndTime" />
              </div>
            </div>

            <div class="form-group">
              <label>Lugar o Enlace de Videollamada:</label>
              <input
                type="text"
                [(ngModel)]="newEventLocation"
                placeholder="Ej: Laboratorio 204 o https://meet.consorcio.org/linea1"
              />
            </div>

            <div class="form-group">
              <label>Investigador Responsable:</label>
              <input
                type="text"
                [(ngModel)]="newEventResponsible"
                placeholder="Ej: Administrador, Dr. Carlos Méndez..."
              />
            </div>

            <div class="form-group">
              <div class="field-label-row">
                <label>Descripción / Objetivo Metodológico:</label>
                <app-voice-input-btn
                  [tooltip]="'Dictar descripción con Whisper'"
                  (textTranscribed)="onVoiceEventDescription($event)"
                />
              </div>
              <textarea
                rows="3"
                [(ngModel)]="newEventDescription"
                placeholder="Detalla los entregables, protocolo a seguir o puntos de la reunión..."
              ></textarea>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-cancel" (click)="closeModal()">Cancelar</button>
            <button class="btn-save" (click)="saveEvent()">Guardar en el Calendario</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .calendar-container {
      max-width: 1200px;
      margin: 0 auto;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #0f172a;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .calendar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }
    .calendar-header h2 {
      margin: 0 0 4px 0;
      color: #1e3a8a;
      font-size: 24px;
      font-weight: 700;
    }
    .calendar-header p {
      margin: 0;
      color: #64748b;
      font-size: 14px;
    }
    .btn-create-event {
      background: #1e3a8a;
      color: #ffffff;
      border: none;
      padding: 10px 18px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
      transition: background 0.15s;
    }
    .btn-create-event:hover {
      background: #1d4ed8;
    }
    .filter-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px 18px;
      gap: 16px;
      flex-wrap: wrap;
    }
    .filter-group {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 600;
      color: #475569;
    }
    .filter-group select {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 13px;
      color: #0f172a;
      outline: none;
    }
    .filter-chips {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .chip-btn {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      color: #475569;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.15s;
    }
    .chip-btn:hover {
      background: #e2e8f0;
    }
    .chip-btn.active {
      background: #1e40af;
      color: #ffffff;
      border-color: #1e40af;
      font-weight: 600;
    }
    .events-timeline {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .event-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      display: flex;
      padding: 16px 20px;
      gap: 20px;
      align-items: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
      transition: transform 0.15s, box-shadow 0.15s;
      border-left: 5px solid #94a3b8;
    }
    .event-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.06);
    }
    .event-card.sample_delivery { border-left-color: #059669; }
    .event-card.meeting { border-left-color: #1e40af; }
    .event-card.deadline { border-left-color: #d97706; }
    .event-card.convocatoria { border-left-color: #7c3aed; }

    .event-time-col {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-width: 65px;
      padding-right: 18px;
      border-right: 1px solid #f1f5f9;
    }
    .event-day {
      font-size: 26px;
      font-weight: 800;
      color: #0f172a;
      line-height: 1;
    }
    .event-month {
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      margin-top: 2px;
    }
    .event-hour, .event-allday {
      font-size: 10px;
      color: #94a3b8;
      margin-top: 4px;
      font-weight: 500;
    }
    .event-main-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .event-top-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
    }
    .event-type-pill {
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: 700;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .event-type-pill.sample_delivery { background: #d1fae5; color: #065f46; }
    .event-type-pill.meeting { background: #dbeafe; color: #1e40af; }
    .event-type-pill.deadline { background: #fef3c7; color: #92400e; }
    .event-type-pill.convocatoria { background: #f3e8ff; color: #6b21a8; }

    .event-space-pill {
      background: #f1f5f9;
      color: #475569;
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: 500;
    }
    .event-title {
      margin: 0;
      font-size: 16px;
      color: #0f172a;
      font-weight: 700;
    }
    .event-desc {
      margin: 0;
      font-size: 13px;
      color: #475569;
      line-height: 1.4;
    }
    .event-footer-meta {
      display: flex;
      align-items: center;
      gap: 16px;
      font-size: 12px;
      color: #64748b;
      margin-top: 4px;
      flex-wrap: wrap;
    }
    .btn-delete-event {
      background: transparent;
      border: none;
      font-size: 16px;
      cursor: pointer;
      opacity: 0.4;
      transition: opacity 0.15s;
    }
    .btn-delete-event:hover {
      opacity: 1;
    }
    .empty-events-box {
      background: #ffffff;
      border: 1px dashed #cbd5e1;
      border-radius: 12px;
      padding: 50px 20px;
      text-align: center;
      color: #64748b;
    }
    .empty-icon { font-size: 40px; margin-bottom: 8px; display: inline-block; }

    /* Modal */
    .modal-backdrop {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(15, 23, 42, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    }
    .modal-card {
      background: #ffffff;
      border-radius: 12px;
      width: 90%;
      max-width: 580px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
      overflow: hidden;
    }
    .modal-header {
      background: #f8fafc;
      padding: 16px 20px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .modal-header h3 { margin: 0; font-size: 17px; color: #1e3a8a; }
    .btn-close { background: none; border: none; font-size: 18px; cursor: pointer; color: #64748b; }
    .modal-body { padding: 20px; display: flex; flex-direction: column; gap: 14px; max-height: 70vh; overflow-y: auto; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label { font-size: 12px; font-weight: 600; color: #334155; }
    .form-group input, .form-group select, .form-group textarea {
      padding: 8px 12px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 13px;
      color: #0f172a;
      outline: none;
    }
    .form-row { display: flex; gap: 12px; }
    .flex-1 { flex: 1; }
    .modal-footer {
      background: #f8fafc;
      padding: 14px 20px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }
    .btn-cancel {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 13px;
      cursor: pointer;
    }
    .btn-save {
      background: #1e3a8a;
      color: #ffffff;
      border: none;
      padding: 8px 18px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-save:hover { background: #1d4ed8; }
    .field-label-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }
  `]
})
export class ScientificCalendarComponent implements OnInit {
  private calendarService = inject(CalendarService);

  events = signal<ScientificEvent[]>([]);
  selectedSpace = 'all';
  selectedType = 'ALL';

  isModalOpen = false;
  newEventTitle = '';
  newEventType = 'SAMPLE_DELIVERY';
  newEventSpace = 'space-linea1';
  newEventStartTime = '';
  newEventEndTime = '';
  newEventLocation = '';
  newEventResponsible = 'Administrador';
  newEventDescription = '';

  onVoiceEventTitle(text: string): void {
    if (this.newEventTitle.trim()) {
      this.newEventTitle += ' ' + text;
    } else {
      this.newEventTitle = text;
    }
  }

  onVoiceEventDescription(text: string): void {
    if (this.newEventDescription.trim()) {
      this.newEventDescription += ' ' + text;
    } else {
      this.newEventDescription = text;
    }
  }

  ngOnInit() {
    this.loadEvents();
  }

  loadEvents() {
    this.calendarService.getEvents(this.selectedSpace, this.selectedType).subscribe({
      next: (list) => this.events.set(list),
      error: () => {}
    });
  }

  setTypeFilter(type: string) {
    this.selectedType = type;
    this.loadEvents();
  }

  getTypeLabel(type: string): string {
    switch (type) {
      case 'SAMPLE_DELIVERY': return '🧪 Entrega de Muestras';
      case 'MEETING': return '🔬 Reunión Técnica';
      case 'DEADLINE': return '📌 Límite de Acuerdo';
      case 'CONVOCATORIA': return '📢 Convocatoria';
      default: return 'Evento';
    }
  }

  getCardClass(type: string): string {
    return type.toLowerCase();
  }

  openCreateModal() {
    const now = new Date();
    const plusOneHour = new Date(now.getTime() + 60 * 60 * 1000);
    this.newEventStartTime = now.toISOString().slice(0, 16);
    this.newEventEndTime = plusOneHour.toISOString().slice(0, 16);
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  saveEvent() {
    if (!this.newEventTitle.trim()) {
      alert('Por favor ingresa un título para el evento.');
      return;
    }

    const payload: CreateEventPayload = {
      title: this.newEventTitle.trim(),
      description: this.newEventDescription.trim(),
      event_type: this.newEventType,
      space_id: this.newEventSpace,
      start_time: new Date(this.newEventStartTime).toISOString(),
      end_time: new Date(this.newEventEndTime).toISOString(),
      is_all_day: false,
      location_or_url: this.newEventLocation.trim(),
      responsible_name: this.newEventResponsible.trim()
    };

    this.calendarService.createEvent(payload).subscribe({
      next: (created) => {
        this.events.update(list => [...list, created].sort((a, b) => a.start_time.localeCompare(b.start_time)));
        this.closeModal();
      },
      error: (err) => {
        alert('Error al guardar evento: ' + (err?.error?.detail || err.message));
      }
    });
  }

  deleteEvent(eventId: string) {
    if (!confirm('¿Deseas eliminar este evento del cronograma?')) return;
    this.calendarService.deleteEvent(eventId).subscribe({
      next: () => {
        this.events.update(list => list.filter(e => e.id !== eventId));
      },
      error: () => {
        alert('No se pudo eliminar el evento.');
      }
    });
  }
}
