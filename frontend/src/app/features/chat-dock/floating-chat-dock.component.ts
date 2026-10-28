import { Component, inject, signal, ElementRef, ViewChildren, QueryList, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatDockService, DockChatWindow, DirectChatSession, RagChatSession, ResearcherContact } from '../../core/services/chat-dock.service';
import { VoiceInputBtnComponent } from '../../shared/components/voice-input-btn.component';

@Component({
  selector: 'app-floating-chat-dock',
  standalone: true,
  imports: [CommonModule, FormsModule, VoiceInputBtnComponent],
  template: `
    <aside class="floating-chat-dock" aria-label="Bandeja de chats del consorcio">
      <!-- Menú Desplegable de Contactos del Consorcio -->
      <div class="contacts-menu-wrapper">
        @if (chatService.isContactsMenuOpen()) {
          <div class="contacts-popover">
            <div class="popover-header">
              <span>Investigadores C3pa</span>
              <button class="btn-close-popover" (click)="chatService.toggleContactsMenu()">✕</button>
            </div>
            <div class="contacts-list">
              <!-- Opción Asistente RAG -->
              <div class="contact-item ai-contact" (click)="openRag()">
                <div class="contact-avatar-box">
                  <span class="ai-icon">🤖</span>
                  <span class="status-dot online"></span>
                </div>
                <div class="contact-meta">
                  <strong>Asistente C3pa (RAG)</strong>
                  <small>Memoria viva del consorcio</small>
                </div>
              </div>

              <!-- Lista de Investigadores -->
              @for (contact of chatService.contacts(); track contact.id) {
                <div class="contact-item" (click)="chatService.openDirectChat(contact)">
                  <div class="contact-avatar-box">
                    <img [src]="contact.avatarUrl" [alt]="contact.name" class="contact-avatar" />
                    <span class="status-dot" [class.online]="contact.isOnline"></span>
                  </div>
                  <div class="contact-meta">
                    <strong>{{ contact.name }}</strong>
                    <small>{{ contact.role }} • {{ contact.institution }}</small>
                  </div>
                </div>
              }
            </div>
          </div>
        }

        <!-- Botón Píldora para Abrir Menú de Chats -->
        <button
          class="btn-launcher-pill"
          (click)="chatService.toggleContactsMenu()"
          title="Abrir directorio de chats del consorcio"
        >
          <span class="pill-icon">💬</span>
          <span class="pill-label">Chats</span>
          <span class="pill-badge">{{ chatService.contacts().length }}</span>
        </button>
      </div>

      <!-- Ventanas de Chat Abiertas (Estilo Facebook Dock) -->
      @for (win of chatService.activeWindows(); track win.id) {
        @if (win.type === 'rag') {
          <!-- Ventana Pop-up de Asistente RAG -->
          <div class="chat-window rag-window" [class.minimized]="win.isMinimized">
            <!-- Header de la Ventana -->
            <div class="window-header" (click)="chatService.toggleMinimize(win.id)">
              <div class="header-left">
                <span class="header-avatar-ai">🤖</span>
                <div class="header-title-box">
                  <span class="header-title">Asistente RAG</span>
                  <small class="header-status">Memoria Viva</small>
                </div>
              </div>
              <div class="header-actions" (click)="$event.stopPropagation()">
                <button
                  class="btn-window-action"
                  (click)="chatService.toggleMinimize(win.id)"
                  [title]="win.isMinimized ? 'Expandir' : 'Minimizar'"
                >
                  {{ win.isMinimized ? '▢' : '—' }}
                </button>
                <button
                  class="btn-window-action"
                  (click)="chatService.closeWindow(win.id)"
                  title="Cerrar ventana"
                >
                  ✕
                </button>
              </div>
            </div>

            <!-- Cuerpo Expandido de RAG -->
            @if (!win.isMinimized) {
              <div class="window-body" #scrollContainer>
                <div class="messages-list">
                  @for (msg of win.messages; track $index) {
                    <div class="message-row" [class.user]="msg.sender === 'user'" [class.bot]="msg.sender === 'assistant'">
                      <div class="bubble">
                        <p class="bubble-text">{{ msg.content }}</p>
                        <span class="bubble-time">{{ msg.timestamp | date:'shortTime' }}</span>
                      </div>

                      <!-- Fuentes compactas en el popup -->
                      @if (msg.sources && msg.sources.length > 0) {
                        <div class="popup-sources">
                          <span class="sources-label">Fuentes vinculadas:</span>
                          @for (src of msg.sources.slice(0, 2); track $index) {
                            <div class="mini-source-chip">
                              <span class="src-icon">📄</span>
                              <span class="src-text">{{ src.title }}</span>
                            </div>
                          }
                        </div>
                      }
                    </div>
                  }

                  @if (win.isLoading) {
                    <div class="message-row bot loading-row">
                      <div class="bubble loading-bubble">
                        <span class="typing-dot"></span>
                        <span class="typing-dot"></span>
                        <span class="typing-dot"></span>
                      </div>
                    </div>
                  }
                </div>

                <!-- Chips Rápidos en Pop-up -->
                <div class="quick-chips">
                  <button (click)="sendRagPrompt('¿Qué comentarios o dudas faltan resolver en los papers?')">
                    ⏳ Dudas pendientes
                  </button>
                  <button (click)="sendRagPrompt('¿Qué ha publicado recientemente el laboratorio de Carlos?')">
                    🔬 Avances Carlos
                  </button>
                </div>

                <!-- Input de Consulta RAG con Dictado de Voz -->
                <div class="window-footer">
                  <input
                    type="text"
                    [(ngModel)]="ragInputText"
                    (keyup.enter)="submitRagQuery()"
                    placeholder="Preguntar o dictar..."
                    [disabled]="win.isLoading"
                  />
                  <app-voice-input-btn
                    [compact]="true"
                    [tooltip]="'Dictar por voz al asistente RAG'"
                    (textTranscribed)="onVoiceRagInput($event)"
                  />
                  <button
                    class="btn-send"
                    (click)="submitRagQuery()"
                    [disabled]="win.isLoading || !ragInputText.trim()"
                  >
                    ➤
                  </button>
                </div>
              </div>
            }
          </div>
        } @else {
          <!-- Ventana Pop-up de Chat Directo con Investigador (Estilo Facebook) -->
          <div class="chat-window direct-window" [class.minimized]="win.isMinimized">
            <!-- Header de Chat Directo -->
            <div class="window-header" (click)="chatService.toggleMinimize(win.id)">
              <div class="header-left">
                <div class="avatar-with-dot">
                  <img [src]="win.avatarUrl" [alt]="win.researcherName" class="direct-header-avatar" />
                  <span class="status-dot" [class.online]="win.isOnline"></span>
                </div>
                <div class="header-title-box">
                  <span class="header-title">{{ win.researcherName }}</span>
                  <small class="header-status">{{ win.isOnline ? 'En línea' : 'Ausente' }}</small>
                </div>
              </div>
              <div class="header-actions" (click)="$event.stopPropagation()">
                <button
                  class="btn-window-action"
                  (click)="chatService.toggleMinimize(win.id)"
                  [title]="win.isMinimized ? 'Expandir' : 'Minimizar'"
                >
                  {{ win.isMinimized ? '▢' : '—' }}
                </button>
                <button
                  class="btn-window-action"
                  (click)="chatService.closeWindow(win.id)"
                  title="Cerrar chat"
                >
                  ✕
                </button>
              </div>
            </div>

            <!-- Cuerpo Expandido de Chat Directo -->
            @if (!win.isMinimized) {
              <div class="window-body" #scrollContainer>
                <div class="researcher-intro-bar">
                  <span>{{ win.researcherRole }} • {{ win.researcherInstitution }}</span>
                </div>
                <div class="messages-list">
                  @for (msg of win.messages; track msg.id) {
                    <div class="message-row" [class.user]="msg.sender === 'me'" [class.them]="msg.sender === 'them'">
                      <div class="bubble">
                        <p class="bubble-text">{{ msg.content }}</p>
                        <span class="bubble-time">{{ msg.timestamp | date:'shortTime' }}</span>
                      </div>
                    </div>
                  }
                </div>

                <!-- Input de Chat Directo con Dictado de Voz -->
                <div class="window-footer">
                  <input
                    type="text"
                    [(ngModel)]="directInputMap[win.id]"
                    (keyup.enter)="submitDirectMessage(win.id)"
                    placeholder="Escribe o dicta un mensaje..."
                  />
                  <app-voice-input-btn
                    [compact]="true"
                    [tooltip]="'Dictar mensaje por voz'"
                    (textTranscribed)="onVoiceDirectInput(win.id, $event)"
                  />
                  <button
                    class="btn-send"
                    (click)="submitDirectMessage(win.id)"
                    [disabled]="!directInputMap[win.id]"
                  >
                    ➤
                  </button>
                </div>
              </div>
            }
          </div>
        }
      }
    </aside>
  `,
  styles: [`
    .floating-chat-dock {
      position: fixed;
      bottom: 0;
      right: 20px;
      z-index: 1000;
      display: flex;
      align-items: flex-end;
      gap: 12px;
      pointer-events: none;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    /* Cada ventana y el menú de contactos tienen pointer-events */
    .contacts-menu-wrapper,
    .chat-window {
      pointer-events: auto;
    }

    /* Botón Lanzador de Directorio */
    .contacts-menu-wrapper {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }

    .btn-launcher-pill {
      background: #1e3a8a;
      color: #ffffff;
      border: 1px solid #1e40af;
      padding: 9px 16px;
      border-radius: 24px 24px 0 0;
      font-size: 0.86rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 -2px 10px rgba(15, 23, 42, 0.12);
      transition: background 0.15s, transform 0.15s;
    }

    .btn-launcher-pill:hover {
      background: #1d4ed8;
    }

    .pill-icon {
      font-size: 1rem;
    }

    .pill-badge {
      background: #3b82f6;
      color: #fff;
      font-size: 0.72rem;
      padding: 1px 6px;
      border-radius: 10px;
      font-weight: 700;
    }

    /* Popover de Directorio de Contactos */
    .contacts-popover {
      position: absolute;
      bottom: 46px;
      right: 0;
      width: 290px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(15, 23, 42, 0.15);
      overflow: hidden;
      animation: popoverFadeIn 0.15s ease-out;
    }

    @keyframes popoverFadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .popover-header {
      background: #f8fafc;
      padding: 10px 14px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.85rem;
      font-weight: 700;
      color: #0f172a;
    }

    .btn-close-popover {
      background: transparent;
      border: none;
      color: #64748b;
      cursor: pointer;
      font-size: 0.9rem;
    }

    .contacts-list {
      max-height: 320px;
      overflow-y: auto;
    }

    .contact-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      cursor: pointer;
      border-bottom: 1px solid #f1f5f9;
      transition: background 0.15s;
    }

    .contact-item:hover {
      background: #f8fafc;
    }

    .contact-item.ai-contact {
      background: #eff6ff;
      border-bottom: 1px solid #dbeafe;
    }

    .contact-item.ai-contact:hover {
      background: #dbeafe;
    }

    .contact-avatar-box {
      position: relative;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .contact-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      object-fit: cover;
    }

    .ai-icon {
      font-size: 20px;
    }

    .status-dot {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #94a3b8;
      border: 2px solid #ffffff;
    }

    .status-dot.online {
      background: #10b981;
    }

    .contact-meta {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .contact-meta strong {
      font-size: 0.82rem;
      color: #0f172a;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .contact-meta small {
      font-size: 0.72rem;
      color: #64748b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Estructura de Ventanas de Chat */
    .chat-window {
      width: 330px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 10px 10px 0 0;
      box-shadow: 0 -2px 16px rgba(15, 23, 42, 0.12);
      display: flex;
      flex-direction: column;
      transition: height 0.2s ease;
    }

    .chat-window.minimized {
      width: 220px;
    }

    .window-header {
      background: #1e3a8a;
      color: #ffffff;
      padding: 10px 12px;
      border-radius: 9px 9px 0 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      user-select: none;
    }

    .rag-window .window-header {
      background: #1e3a8a;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 8px;
      overflow: hidden;
    }

    .header-avatar-ai {
      font-size: 18px;
    }

    .avatar-with-dot {
      position: relative;
      width: 26px;
      height: 26px;
    }

    .direct-header-avatar {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      object-fit: cover;
    }

    .header-title-box {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .header-title {
      font-size: 0.82rem;
      font-weight: 700;
      color: #ffffff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .header-status {
      font-size: 0.68rem;
      color: #93c5fd;
    }

    .header-actions {
      display: flex;
      gap: 6px;
    }

    .btn-window-action {
      background: transparent;
      border: none;
      color: #e2e8f0;
      font-size: 0.82rem;
      cursor: pointer;
      padding: 2px 6px;
      border-radius: 4px;
      transition: background 0.15s;
    }

    .btn-window-action:hover {
      background: rgba(255, 255, 255, 0.2);
      color: #ffffff;
    }

    /* Cuerpo de la Ventana */
    .window-body {
      height: 380px;
      display: flex;
      flex-direction: column;
      background: #f8fafc;
    }

    .researcher-intro-bar {
      background: #eff6ff;
      border-bottom: 1px solid #dbeafe;
      padding: 6px 12px;
      font-size: 0.72rem;
      color: #1e40af;
      font-weight: 500;
      text-align: center;
    }

    .messages-list {
      flex: 1;
      padding: 12px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .message-row {
      display: flex;
      flex-direction: column;
      max-width: 82%;
    }

    .message-row.user {
      align-self: flex-end;
    }

    .message-row.user .bubble {
      background: #1e3a8a;
      color: #ffffff;
      border-bottom-right-radius: 2px;
    }

    .message-row.user .bubble-time {
      color: #93c5fd;
    }

    .message-row.bot, .message-row.them {
      align-self: flex-start;
    }

    .message-row.bot .bubble, .message-row.them .bubble {
      background: #ffffff;
      color: #0f172a;
      border: 1px solid #e2e8f0;
      border-bottom-left-radius: 2px;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
    }

    .bubble {
      padding: 8px 12px;
      border-radius: 12px;
      font-size: 0.82rem;
      line-height: 1.4;
    }

    .bubble-text {
      margin: 0;
      word-break: break-word;
      white-space: pre-wrap;
    }

    .bubble-time {
      font-size: 0.65rem;
      color: #64748b;
      margin-top: 4px;
      display: block;
      text-align: right;
    }

    /* Fuentes Compactas RAG en Pop-up */
    .popup-sources {
      margin-top: 6px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .sources-label {
      font-size: 0.68rem;
      color: #1e40af;
      font-weight: 700;
    }

    .mini-source-chip {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 3px 6px;
      font-size: 0.7rem;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 4px;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    .src-text {
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Chips Rápidos */
    .quick-chips {
      display: flex;
      gap: 6px;
      padding: 6px 10px;
      background: #ffffff;
      border-top: 1px solid #e2e8f0;
      overflow-x: auto;
      white-space: nowrap;
    }

    .quick-chips button {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      color: #334155;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 0.72rem;
      cursor: pointer;
      transition: all 0.15s;
    }

    .quick-chips button:hover {
      background: #eff6ff;
      border-color: #1e40af;
      color: #1e40af;
    }

    /* Footer con Input */
    .window-footer {
      display: flex;
      padding: 8px 10px;
      background: #ffffff;
      border-top: 1px solid #e2e8f0;
      gap: 6px;
    }

    .window-footer input {
      flex: 1;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      color: #0f172a;
      padding: 6px 10px;
      border-radius: 6px;
      font-size: 0.82rem;
      outline: none;
    }

    .window-footer input:focus {
      border-color: #1e40af;
      background: #ffffff;
    }

    .btn-send {
      background: #1e40af;
      color: #ffffff;
      border: none;
      border-radius: 6px;
      padding: 6px 12px;
      font-size: 0.82rem;
      cursor: pointer;
      font-weight: 700;
    }

    .btn-send:hover:not(:disabled) {
      background: #1d4ed8;
    }

    .btn-send:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    /* Animación de carga */
    .loading-bubble {
      display: flex;
      gap: 4px;
      padding: 8px 14px;
    }

    .typing-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #94a3b8;
      animation: typing 1s infinite alternate;
    }

    .typing-dot:nth-child(2) { animation-delay: 0.2s; }
    .typing-dot:nth-child(3) { animation-delay: 0.4s; }

    @keyframes typing {
      from { transform: translateY(0); opacity: 0.4; }
      to { transform: translateY(-4px); opacity: 1; }
    }
  `]
})
export class FloatingChatDockComponent {
  chatService = inject(ChatDockService);

  ragInputText = '';
  directInputMap: { [key: string]: string } = {};

  openRag(): void {
    this.chatService.openRagChat();
    this.chatService.isContactsMenuOpen.set(false);
  }

  submitRagQuery(): void {
    if (!this.ragInputText.trim()) return;
    const query = this.ragInputText;
    this.ragInputText = '';
    this.chatService.sendRagMessage(query);
  }

  sendRagPrompt(prompt: string): void {
    this.chatService.sendRagMessage(prompt);
  }

  submitDirectMessage(chatId: string): void {
    const text = this.directInputMap[chatId];
    if (!text || !text.trim()) return;
    this.directInputMap[chatId] = '';
    this.chatService.sendDirectMessage(chatId, text);
  }

  onVoiceRagInput(text: string): void {
    if (this.ragInputText.trim()) {
      this.ragInputText += ' ' + text;
    } else {
      this.ragInputText = text;
    }
  }

  onVoiceDirectInput(winId: string, text: string): void {
    const prev = this.directInputMap[winId] || '';
    if (prev.trim()) {
      this.directInputMap[winId] = prev + ' ' + text;
    } else {
      this.directInputMap[winId] = text;
    }
  }
}
