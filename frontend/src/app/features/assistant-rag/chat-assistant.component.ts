import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RAGService, ChatMessage } from '../../core/services/rag.service';
import { RAGSource } from '../../core/models/scientific.models';
import { VoiceInputBtnComponent } from '../../shared/components/voice-input-btn.component';

@Component({
  selector: 'app-chat-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule, VoiceInputBtnComponent],
  template: `
    <div class="rag-chat-card">
      <!-- Encabezado del Asistente -->
      <div class="chat-header">
        <div class="assistant-avatar">🤖</div>
        <div class="assistant-info">
          <h3>Asistente Científico & Memoria Viva del Consorcio</h3>
          <span class="status-badge">RAG Híbrido: Bibliografía, Actividad de Laboratorios & Comentarios</span>
        </div>
      </div>

      <!-- Historial de Conversación -->
      <div class="messages-container">
        @for (msg of messages(); track $index) {
          <div [ngClass]="['message-bubble', msg.sender]">
            <div class="message-meta">
              <span class="sender-name">{{ msg.sender === 'user' ? 'Tú' : 'Asistente GPT' }}</span>
              <span class="message-time">{{ msg.timestamp | date:'shortTime' }}</span>
            </div>
            <div class="message-content">
              <p style="white-space: pre-line;">{{ msg.content }}</p>
            </div>

            <!-- Fuentes y Enlaces Interactivos Directos (Deep Links) -->
            @if (msg.sources && msg.sources.length > 0) {
              <div class="sources-drawer">
                <span class="sources-title">🔗 Evidencia, Enlaces Directos & Contexto del Proyecto:</span>
                <div class="sources-grid">
                  @for (source of msg.sources; track source.title) {
                    <div class="source-card" [class.unresolved-card]="source.is_unresolved" [class.mention-card]="source.source_type === 'MENTION'">
                      <div class="source-header">
                        <span class="badge-type" [ngClass]="getSourceBadgeClass(source)">
                          {{ getSourceBadgeLabel(source) }}
                        </span>
                        <span class="source-date" *ngIf="source.date">{{ source.date | date:'dd MMM' }}</span>
                      </div>

                      <div class="source-title-row">
                        <strong>{{ source.title }}</strong>
                      </div>

                      <div class="source-author-row" *ngIf="source.author">
                        <span>👤 {{ source.author }}</span>
                        <span class="space-dot" *ngIf="source.space_name">• {{ source.space_name }}</span>
                      </div>

                      <blockquote class="source-snippet">
                        "{{ source.snippet }}"
                      </blockquote>

                      <button (click)="goToSource(source)" class="btn-deep-link">
                        <span>{{ source.deep_link_label || '👉 Ver en la plataforma' }}</span>
                        <span class="arrow-icon">→</span>
                      </button>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        }

        @if (isLoading()) {
          <div class="message-bubble assistant loading">
            <div class="spinner"></div>
            <span>Consultando bibliografía, hilos de discusión y actividad de los laboratorios...</span>
          </div>
        }
      </div>

      <!-- Preguntas Sugeridas Clave del Consorcio -->
      <div class="suggestions-chips">
        <span class="chips-title">Consultas Rápidas:</span>
        <button (click)="askPrompt('¿Qué comentarios o dudas faltan resolver en los papers?')">
          ⏳ ¿Qué comentarios faltan resolver?
        </button>
        <button (click)="askPrompt('¿En dónde me han etiquetado o mencionado recientemente?')">
          🏷️ ¿Dónde me han etiquetado?
        </button>
        <button (click)="askPrompt('¿El laboratorio del Dr. Carlos Méndez qué ha hecho recientemente?')">
          🔬 Actividad del Dr. Carlos Méndez
        </button>
        <button (click)="askPrompt('¿Qué acuerdos y decisiones formalizadas tenemos activas?')">
          📌 Acuerdos y Decisiones
        </button>
        <button (click)="askPrompt('¿Qué bibliografía y metodología tenemos sobre síntesis de nanocelulosa?')">
          📚 Bibliografía de Nanocelulosa
        </button>
      </div>

      <!-- Barra de Envío con Dictado de Voz -->
      <div class="chat-input-bar">
        <input
          type="text"
          [(ngModel)]="userInput"
          (keyup.enter)="sendMessage()"
          placeholder="Pregunta o dicta sobre bibliografía, modelos metabólicos, comentarios..."
          [disabled]="isLoading()"
        />
        <app-voice-input-btn 
          [tooltip]="'Dictar pregunta al Asistente RAG por voz'"
          (textTranscribed)="onVoiceInput($event)"
        />
        <button (click)="sendMessage()" [disabled]="isLoading() || !userInput.trim()">
          Enviar
        </button>
      </div>
    </div>
  `,
  styles: [`
    .rag-chat-card {
      display: flex;
      flex-direction: column;
      height: 680px;
      max-width: 900px;
      margin: 0 auto;
      border-radius: 12px;
      background: #ffffff;
      color: #0f172a;
      border: 1px solid #e2e8f0;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
    }

    .chat-header {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 16px 20px;
      background: #ffffff;
      border-bottom: 1px solid #e2e8f0;
    }

    .assistant-avatar {
      font-size: 24px;
      background: #eff6ff;
      width: 44px;
      height: 44px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #bfdbfe;
    }

    .assistant-info h3 {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 700;
      color: #0f172a;
    }

    .status-badge {
      font-size: 0.76rem;
      color: #1e40af;
      font-weight: 500;
    }

    .messages-container {
      flex: 1;
      padding: 20px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
      background: #f8fafc;
    }

    .message-bubble {
      max-width: 88%;
      padding: 14px 18px;
      border-radius: 12px;
      line-height: 1.5;
      font-size: 0.92rem;
    }

    .message-bubble.user {
      align-self: flex-end;
      background: #1e3a8a;
      border: 1px solid #1e40af;
      color: #ffffff;
    }

    .message-bubble.assistant {
      align-self: flex-start;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      color: #1e293b;
      width: 95%;
      box-shadow: 0 2px 4px rgba(15, 23, 42, 0.04);
    }

    .message-meta {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      font-size: 0.72rem;
      color: #64748b;
      margin-bottom: 6px;
    }

    .message-bubble.user .message-meta {
      color: #93c5fd;
    }

    .sender-name {
      font-weight: 700;
    }

    .sources-drawer {
      margin-top: 14px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
    }

    .sources-title {
      font-size: 0.8rem;
      font-weight: 700;
      color: #1e40af;
      display: block;
      margin-bottom: 10px;
    }

    .sources-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 12px;
    }

    .source-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      transition: border-color 0.15s, box-shadow 0.15s;
    }

    .source-card:hover {
      border-color: #93c5fd;
      box-shadow: 0 2px 6px rgba(15, 23, 42, 0.06);
    }

    .source-card.unresolved-card {
      border-left: 3px solid #d97706;
      background: #fffbeb;
    }

    .source-card.mention-card {
      border-left: 3px solid #7c3aed;
      background: #faf5ff;
    }

    .source-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .badge-type {
      font-size: 0.68rem;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .badge-type.badge-unresolved {
      background: #fef3c7;
      color: #92400e;
    }

    .badge-type.badge-mention {
      background: #ede9fe;
      color: #5b21b6;
    }

    .badge-type.badge-activity {
      background: #d1fae5;
      color: #065f46;
    }

    .badge-type.badge-pdf {
      background: #dbeafe;
      color: #1e40af;
    }

    .badge-type.badge-decision {
      background: #e0e7ff;
      color: #3730a3;
    }

    .source-date {
      font-size: 0.7rem;
      color: #64748b;
    }

    .source-title-row strong {
      font-size: 0.84rem;
      color: #0f172a;
      line-height: 1.3;
    }

    .source-author-row {
      font-size: 0.74rem;
      color: #475569;
    }

    .space-dot {
      color: #94a3b8;
    }

    .source-snippet {
      margin: 4px 0 8px;
      font-size: 0.78rem;
      font-style: italic;
      color: #475569;
      border-left: 2px solid #cbd5e1;
      padding-left: 8px;
      line-height: 1.4;
    }

    .btn-deep-link {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #1e40af;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: all 0.15s;
    }

    .btn-deep-link:hover {
      background: #eff6ff;
      color: #1d4ed8;
      border-color: #93c5fd;
    }

    .arrow-icon {
      font-size: 0.9rem;
    }

    .message-bubble.loading {
      display: flex;
      align-items: center;
      gap: 12px;
      color: #64748b;
      font-size: 0.84rem;
    }

    .spinner {
      width: 18px;
      height: 18px;
      border: 2px solid #cbd5e1;
      border-top-color: #1e40af;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .suggestions-chips {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      background: #ffffff;
      border-top: 1px solid #e2e8f0;
      overflow-x: auto;
      white-space: nowrap;
    }

    .chips-title {
      font-size: 0.74rem;
      color: #64748b;
      font-weight: 600;
    }

    .suggestions-chips button {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      color: #334155;
      padding: 5px 12px;
      border-radius: 20px;
      font-size: 0.78rem;
      cursor: pointer;
      transition: all 0.15s;
    }

    .suggestions-chips button:hover {
      border-color: #1e40af;
      color: #1e40af;
      background: #eff6ff;
    }

    .chat-input-bar {
      display: flex;
      padding: 14px 18px;
      background: #ffffff;
      border-top: 1px solid #e2e8f0;
      gap: 10px;
    }

    .chat-input-bar input {
      flex: 1;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      color: #0f172a;
      padding: 10px 16px;
      border-radius: 8px;
      font-size: 0.88rem;
    }

    .chat-input-bar input:focus {
      outline: none;
      border-color: #1e40af;
      background: #ffffff;
    }

    .chat-input-bar button {
      background: #1e40af;
      color: #fff;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.88rem;
      cursor: pointer;
      transition: background 0.15s;
    }

    .chat-input-bar button:hover:not(:disabled) {
      background: #1d4ed8;
    }

    .chat-input-bar button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `]
})
export class ChatAssistantComponent {
  private ragService = inject(RAGService);

  messages = signal<ChatMessage[]>([
    {
      sender: 'assistant',
      content: '¡Hola! Soy la memoria viva del consorcio Conect. Puedo responder preguntas sobre la bibliografía técnica, qué avances o publicaciones ha hecho recientemente cualquier investigador o laboratorio (ej. Dr. Carlos Méndez), qué comentarios o dudas metodológicas faltan resolver en los papers, o dónde has sido mencionada(@). ¿En qué puedo asistirte hoy?',
      timestamp: new Date()
    }
  ]);

  userInput = '';
  isLoading = signal(false);

  onVoiceInput(text: string): void {
    if (this.userInput.trim()) {
      this.userInput += ' ' + text;
    } else {
      this.userInput = text;
    }
  }

  sendMessage(): void {
    const text = this.userInput.trim();
    if (!text || this.isLoading()) return;

    this.messages.update(prev => [
      ...prev,
      { sender: 'user', content: text, timestamp: new Date() }
    ]);

    this.userInput = '';
    this.isLoading.set(true);

    const history = this.messages().map(m => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.content
    }));

    this.ragService.askAssistant(text, undefined, history).subscribe({
      next: (resp) => {
        this.isLoading.set(false);
        this.messages.update(prev => [
          ...prev,
          {
            sender: 'assistant',
            content: resp.answer,
            sources: resp.sources,
            timestamp: new Date()
          }
        ]);
      },
      error: () => {
        this.isLoading.set(false);
        this.messages.update(prev => [
          ...prev,
          {
            sender: 'assistant',
            content: 'Lo siento, ocurrió un error temporal al consultar el servidor RAG.',
            timestamp: new Date()
          }
        ]);
      }
    });
  }

  askPrompt(prompt: string): void {
    this.userInput = prompt;
    this.sendMessage();
  }

  goToSource(source: RAGSource): void {
    // Despacha un evento global de navegación hacia app.component
    const event = new CustomEvent('navigate-to-deep-link', { detail: source });
    window.dispatchEvent(event);
  }

  getSourceBadgeClass(source: RAGSource): string {
    if (source.is_unresolved) return 'badge-unresolved';
    if (source.source_type === 'MENTION') return 'badge-mention';
    if (source.source_type === 'RESEARCHER_ACTIVITY') return 'badge-activity';
    if (source.source_type === 'DECISION') return 'badge-decision';
    return 'badge-pdf';
  }

  getSourceBadgeLabel(source: RAGSource): string {
    if (source.is_unresolved) return '⏳ No Resuelto';
    if (source.source_type === 'MENTION') return '🏷️ Mención Directa';
    if (source.source_type === 'RESEARCHER_ACTIVITY') return '🔬 Actividad Lab';
    if (source.source_type === 'DECISION') return '📌 Acuerdo';
    return '📄 Paper / Doc';
  }
}
