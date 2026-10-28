import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TriageService, TriageItem, TriageSummary } from '../../core/services/triage.service';
import { VoiceInputBtnComponent } from '../../shared/components/voice-input-btn.component';

@Component({
  selector: 'app-triage-inbox',
  standalone: true,
  imports: [CommonModule, FormsModule, VoiceInputBtnComponent],
  template: `
    <div class="triage-container">
      <!-- Encabezado Institucional del Centro de Triage -->
      <header class="triage-header">
        <div class="header-main">
          <div class="header-icon-badge">🎯</div>
          <div>
            <h2>Centro de Triage y Resolución Colegiada</h2>
            <p>Revisa y resuelve una a una las menciones donde se te etiquetó, dudas sobre tus artículos y consultas metodológicas del consorcio.</p>
          </div>
        </div>

        <!-- Métricas Rápidas en Vivo -->
        <div class="triage-stats-row">
          <div class="stat-pill pending">
            <span class="stat-num">{{ summary().total_pending }}</span>
            <span class="stat-label">Pendientes</span>
          </div>
          <div class="stat-pill mentions">
            <span class="stat-num">&#64;{{ summary().direct_mentions_pending }}</span>
            <span class="stat-label">Menciones a ti</span>
          </div>
          <div class="stat-pill resolved">
            <span class="stat-num">✓ {{ summary().total_resolved }}</span>
            <span class="stat-label">Resueltas</span>
          </div>
        </div>
      </header>

      <!-- Barra de Control: Modos de Vista y Filtros -->
      <div class="triage-controls-bar">
        <div class="view-mode-toggle">
          <button
            class="btn-mode"
            [class.active]="viewMode() === 'focus'"
            (click)="viewMode.set('focus')"
          >
            🎯 Modo Enfoque 1 a 1
          </button>
          <button
            class="btn-mode"
            [class.active]="viewMode() === 'list'"
            (click)="viewMode.set('list')"
          >
            📋 Vista de Bandeja ({{ items().length }})
          </button>
        </div>

        <div class="filter-pills">
          <button
            class="btn-filter"
            [class.active]="filterStatus() === 'pending'"
            (click)="setFilterStatus('pending')"
          >
            ⏳ Por Resolver
          </button>
          <button
            class="btn-filter"
            [class.active]="filterStatus() === 'resolved'"
            (click)="setFilterStatus('resolved')"
          >
            ✓ Ya Resueltas
          </button>
          <button
            class="btn-filter"
            [class.active]="filterStatus() === 'all'"
            (click)="setFilterStatus('all')"
          >
            Todas
          </button>
        </div>
      </div>

      <!-- ===================================================================== -->
      <!-- CASO A: MODO ENFOQUE 1 A 1 (Resolución secuencial guiada)            -->
      <!-- ===================================================================== -->
      @if (viewMode() === 'focus') {
        @if (items().length > 0 && currentItem(); as item) {
          <div class="focus-card-wrapper">
            <!-- Barra Superior de Navegación 1 a 1 -->
            <div class="step-progress-bar">
              <div class="step-indicator">
                <span class="step-badge">Elemento {{ currentIndex() + 1 }} de {{ items().length }}</span>
                <span class="item-priority-badge" [ngClass]="item.priority">
                  {{ item.priority === 'urgent' ? '🔴 Urgente' : (item.priority === 'high' ? '🟠 Alta Prioridad' : '🔵 Consulta Técnica') }}
                </span>
                <span class="item-source-badge" [ngClass]="item.source_type.toLowerCase()">
                  {{ item.source_type === 'PDF' ? '📑 Artículo PDF' : (item.source_type === 'IMAGE' ? '🔬 Micrografía SEM' : '💬 Debate Foro') }}
                </span>
              </div>

              <!-- Mini Navegación Rápida -->
              <div class="nav-buttons">
                <button
                  class="btn-nav"
                  [disabled]="currentIndex() === 0"
                  (click)="prevItem()"
                  title="Elemento anterior"
                >
                  ← Anterior
                </button>
                <button
                  class="btn-nav"
                  [disabled]="currentIndex() >= items().length - 1"
                  (click)="nextItem()"
                  title="Elemento siguiente"
                >
                  Siguiente →
                </button>
              </div>
            </div>

            <!-- Tarjeta Principal del Elemento -->
            <article class="focus-card">
              <!-- Encabezado del Recurso -->
              <div class="focus-card-header">
                <div>
                  <span class="source-tag">En: {{ item.source_title }}</span>
                  <h3 class="focus-title">{{ item.action_required }}</h3>
                </div>

                <button class="btn-deep-link" (click)="openDeepLink(item)">
                  🔗 Abrir en {{ item.source_type === 'PDF' ? 'Visor PDF' : (item.source_type === 'IMAGE' ? 'Visor de Imagen' : 'Foro') }} ↗
                </button>
              </div>

              <!-- Contexto / Fragmento citado -->
              @if (item.snippet_quoted) {
                <div class="snippet-callout">
                  <span class="snippet-label">📌 Fragmento o Detalle Citado:</span>
                  <blockquote class="snippet-text">"{{ item.snippet_quoted }}"</blockquote>
                </div>
              }

              <!-- La Duda o Mención Planteada -->
              <div class="inquiry-box">
                <div class="inquiry-author-bar">
                  <img
                    [src]="item.author_avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80'"
                    class="inquiry-avatar"
                    alt="{{ item.author_name }}"
                  />
                  <div>
                    <strong>{{ item.author_name }}</strong>
                    <span class="author-inst">{{ item.author_institution }} • {{ item.created_at | date:'d MMM yyyy, h:mm a' }}</span>
                  </div>
                  @if (item.mentions.length > 0) {
                    <div class="mentions-tag-list">
                      @for (m of item.mentions; track m) {
                        <span class="mention-tag">{{ m }}</span>
                      }
                    </div>
                  }
                </div>

                <div class="inquiry-content">
                  <p>{{ item.note_content }}</p>
                </div>
              </div>

              <!-- Hilo de Discusión Previa si existe -->
              @if (item.comments && item.comments.length > 0) {
                <div class="prior-discussion-box">
                  <span class="prior-title">Aportes y Respuestas en el Hilo ({{ item.comments.length }}):</span>
                  <div class="prior-comments-list">
                    @for (c of item.comments; track c.id) {
                      <div class="prior-comment-item">
                        <div class="c-header">
                          <strong>{{ c.author_name }}</strong>
                          <small>{{ c.created_at | date:'short' }}</small>
                        </div>
                        <p>{{ c.content }}</p>
                      </div>
                    }
                  </div>
                </div>
              }

              <!-- Estado de Resolución si ya está resuelto -->
              @if (item.is_resolved) {
                <div class="resolution-notice">
                  <div class="res-icon">✓</div>
                  <div>
                    <strong>Duda Marcada como Resuelta y Consensuada</strong>
                    <p>Resuelta por <em>{{ item.resolved_by }}</em> el {{ item.resolved_at | date:'longDate' }}.</p>
                  </div>
                  <button class="btn-reopen" (click)="reopenItem(item)">Reabrir para Discusión</button>
                </div>
              }

              <!-- Caja de Acción Inmediata: Responder o Resolver -->
              @if (!item.is_resolved) {
                <div class="action-resolution-box">
                  <div class="action-header">
                    <h4>💬 Tu Aclaración o Respuesta Técnica</h4>
                    <app-voice-input-btn
                      [tooltip]="'Dictar respuesta o acuerdo con Whisper'"
                      (textTranscribed)="onVoiceReply($event)"
                    />
                  </div>

                  <textarea
                    [(ngModel)]="replyText"
                    rows="4"
                    placeholder="Escribe o dicta tu respuesta técnica para aclarar esta duda o formalizar el acuerdo..."
                  ></textarea>

                  <div class="action-buttons-bar">
                    <button
                      class="btn-reply-only"
                      (click)="sendReplyOnly(item)"
                      [disabled]="!replyText.trim() || isProcessing"
                    >
                      💬 Responder sin Cerrar
                    </button>

                    <button
                      class="btn-resolve-next"
                      (click)="resolveAndGoNext(item)"
                      [disabled]="isProcessing"
                    >
                      ✓ Marcar como Resuelto y Pasar al Siguiente →
                    </button>
                  </div>
                </div>
              }
            </article>
          </div>
        } @else {
          <!-- Estado Inbox Zero (Todo Resuelto) -->
          <div class="inbox-zero-card">
            <div class="zero-icon">🎉</div>
            <h3>¡Todo al Día en tu Buzón Científico!</h3>
            <p>No tienes menciones ni dudas pendientes por resolver en tus artículos o líneas temáticas.</p>
            <button class="btn-view-resolved" (click)="setFilterStatus('resolved')">
              Ver Historial de Dudas Resueltas ({{ summary().total_resolved }})
            </button>
          </div>
        }
      }

      <!-- ===================================================================== -->
      <!-- CASO B: MODO LISTA DE BANDEJA (Visión global de todas las menciones)  -->
      <!-- ===================================================================== -->
      @if (viewMode() === 'list') {
        <div class="items-list-container">
          @for (item of items(); track item.id; let idx = $index) {
            <div
              class="triage-list-card"
              [class.is-resolved]="item.is_resolved"
              (click)="openInFocus(idx)"
            >
              <div class="list-card-left">
                <span class="source-icon">
                  {{ item.source_type === 'PDF' ? '📑' : (item.source_type === 'IMAGE' ? '🔬' : '💬') }}
                </span>
                <div class="list-card-details">
                  <div class="list-badges">
                    <span class="item-priority-badge mini" [ngClass]="item.priority">
                      {{ item.priority }}
                    </span>
                    <span class="source-title-mini">{{ item.source_title }}</span>
                  </div>
                  <strong class="list-note">{{ item.note_content }}</strong>
                  <div class="list-meta">
                    <span>De: <strong>{{ item.author_name }}</strong></span>
                    <span>{{ item.created_at | date:'shortDate' }}</span>
                    <span>💬 {{ item.comments.length }} comentarios</span>
                    @if (item.is_resolved) {
                      <span class="badge-resolved-pill">✓ Resuelto</span>
                    }
                  </div>
                </div>
              </div>

              <div class="list-card-actions">
                <button class="btn-select-item" (click)="openInFocus(idx); $event.stopPropagation()">
                  Revisar 1 a 1 →
                </button>
              </div>
            </div>
          } @empty {
            <div class="empty-list-notice">
              <span>No se encontraron elementos en esta categoría.</span>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .triage-container {
      max-width: 1100px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 18px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #0f172a;
    }

    /* Cabecera Principal */
    .triage-header {
      background: linear-gradient(135deg, #091224 0%, #0f172a 100%);
      color: #ffffff;
      border-radius: 14px;
      padding: 24px 28px;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
      border: 1px solid #1e3a8a;
    }
    .header-main {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .header-icon-badge {
      font-size: 34px;
      background: rgba(255, 255, 255, 0.1);
      width: 56px;
      height: 56px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid rgba(251, 191, 36, 0.3);
    }
    .header-main h2 {
      margin: 0 0 6px 0;
      font-size: 20px;
      font-weight: 700;
      color: #f8fafc;
    }
    .header-main p {
      margin: 0;
      font-size: 13px;
      color: #94a3b8;
      max-width: 520px;
      line-height: 1.4;
    }

    .triage-stats-row {
      display: flex;
      gap: 10px;
    }
    .stat-pill {
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 10px;
      padding: 8px 14px;
      text-align: center;
      min-width: 80px;
    }
    .stat-pill.pending {
      border-color: #f59e0b;
      background: rgba(245, 158, 11, 0.12);
    }
    .stat-pill.mentions {
      border-color: #38bdf8;
      background: rgba(56, 189, 248, 0.12);
    }
    .stat-pill.resolved {
      border-color: #10b981;
      background: rgba(16, 185, 129, 0.12);
    }
    .stat-num {
      display: block;
      font-size: 18px;
      font-weight: 800;
      color: #f8fafc;
    }
    .stat-pill.pending .stat-num { color: #fbbf24; }
    .stat-pill.mentions .stat-num { color: #38bdf8; }
    .stat-pill.resolved .stat-num { color: #34d399; }
    .stat-label {
      font-size: 11px;
      color: #cbd5e1;
    }

    /* Barra de Controles y Filtros */
    .triage-controls-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 10px 16px;
    }
    .view-mode-toggle, .filter-pills {
      display: flex;
      gap: 8px;
    }
    .btn-mode, .btn-filter {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      color: #475569;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-mode.active {
      background: #0f172a;
      border-color: #0f172a;
      color: #ffffff;
    }
    .btn-filter.active {
      background: #1e3a8a;
      border-color: #1e3a8a;
      color: #ffffff;
    }

    /* Modo Enfoque 1 a 1 */
    .focus-card-wrapper {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .step-progress-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 10px 18px;
    }
    .step-indicator {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .step-badge {
      background: #0f172a;
      color: #ffffff;
      padding: 3px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
    }
    .item-priority-badge {
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 4px;
    }
    .item-priority-badge.urgent {
      background: #fee2e2;
      color: #b91c1c;
    }
    .item-priority-badge.high {
      background: #ffedd5;
      color: #c2410c;
    }
    .item-priority-badge.normal {
      background: #e0f2fe;
      color: #0369a1;
    }
    .item-source-badge {
      background: #f1f5f9;
      color: #334155;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
    }
    .nav-buttons {
      display: flex;
      gap: 8px;
    }
    .btn-nav {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #334155;
      padding: 5px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-nav:hover:not(:disabled) {
      background: #f1f5f9;
    }
    .btn-nav:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    /* Tarjeta de Focus */
    .focus-card {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06);
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .focus-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 14px;
    }
    .source-tag {
      font-size: 12px;
      color: #64748b;
      font-weight: 500;
    }
    .focus-title {
      margin: 4px 0 0 0;
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
    }
    .btn-deep-link {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      color: #1e40af;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s;
    }
    .btn-deep-link:hover {
      background: #e0f2fe;
      border-color: #93c5fd;
    }

    /* Cita / Snippet */
    .snippet-callout {
      background: #f8fafc;
      border-left: 4px solid #3b82f6;
      border-radius: 0 8px 8px 0;
      padding: 12px 16px;
    }
    .snippet-label {
      display: block;
      font-size: 11px;
      color: #1e40af;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .snippet-text {
      margin: 0;
      font-size: 13px;
      color: #334155;
      font-style: italic;
      line-height: 1.5;
    }

    /* Inquiry Box */
    .inquiry-box {
      background: #fdfdfd;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .inquiry-author-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .inquiry-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      object-fit: cover;
    }
    .author-inst {
      display: block;
      font-size: 11px;
      color: #64748b;
    }
    .mentions-tag-list {
      margin-left: auto;
      display: flex;
      gap: 6px;
    }
    .mention-tag {
      background: #e0f2fe;
      color: #0369a1;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
    }
    .inquiry-content p {
      margin: 0;
      font-size: 14px;
      line-height: 1.5;
      color: #0f172a;
    }

    /* Discusión Previa */
    .prior-discussion-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 16px;
    }
    .prior-title {
      display: block;
      font-size: 12px;
      font-weight: 700;
      color: #475569;
      margin-bottom: 8px;
    }
    .prior-comments-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .prior-comment-item {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px 12px;
    }
    .c-header {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #64748b;
      margin-bottom: 2px;
    }
    .prior-comment-item p {
      margin: 0;
      font-size: 13px;
      color: #334155;
    }

    /* Resolución */
    .resolution-notice {
      display: flex;
      align-items: center;
      gap: 14px;
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      border-radius: 8px;
      padding: 14px 18px;
    }
    .res-icon {
      font-size: 22px;
      color: #059669;
    }
    .resolution-notice strong {
      display: block;
      color: #065f46;
      font-size: 14px;
    }
    .resolution-notice p {
      margin: 2px 0 0 0;
      font-size: 12px;
      color: #047857;
    }
    .btn-reopen {
      margin-left: auto;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
    }

    /* Caja de Acción y Resolución */
    .action-resolution-box {
      background: #f8fafc;
      border: 2px solid #e2e8f0;
      border-radius: 10px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .action-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .action-header h4 {
      margin: 0;
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
    }
    .action-resolution-box textarea {
      width: 100%;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 13px;
      font-family: inherit;
      resize: vertical;
      box-sizing: border-box;
      outline: none;
    }
    .action-resolution-box textarea:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
    }
    .action-buttons-bar {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      flex-wrap: wrap;
    }
    .btn-reply-only {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      color: #334155;
      padding: 9px 16px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn-reply-only:hover:not(:disabled) {
      background: #e2e8f0;
    }
    .btn-resolve-next {
      background: #10b981;
      color: #ffffff;
      border: none;
      padding: 9px 20px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(16, 185, 129, 0.3);
      transition: background 0.2s;
    }
    .btn-resolve-next:hover:not(:disabled) {
      background: #059669;
    }
    .btn-resolve-next:disabled, .btn-reply-only:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Inbox Zero */
    .inbox-zero-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 48px 24px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    }
    .zero-icon {
      font-size: 48px;
    }
    .inbox-zero-card h3 {
      margin: 0;
      font-size: 20px;
      color: #0f172a;
    }
    .inbox-zero-card p {
      margin: 0;
      font-size: 14px;
      color: #64748b;
      max-width: 440px;
    }
    .btn-view-resolved {
      margin-top: 10px;
      background: #0f172a;
      color: #ffffff;
      border: none;
      padding: 9px 18px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }

    /* Modo Lista */
    .items-list-container {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .triage-list-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      transition: all 0.2s;
    }
    .triage-list-card:hover {
      border-color: #3b82f6;
      box-shadow: 0 2px 8px rgba(59, 130, 246, 0.12);
    }
    .triage-list-card.is-resolved {
      opacity: 0.75;
      background: #f8fafc;
    }
    .list-card-left {
      display: flex;
      align-items: flex-start;
      gap: 14px;
    }
    .source-icon {
      font-size: 22px;
      margin-top: 2px;
    }
    .list-card-details {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .list-badges {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .source-title-mini {
      font-size: 11px;
      color: #64748b;
      font-weight: 600;
    }
    .list-note {
      font-size: 14px;
      color: #0f172a;
    }
    .list-meta {
      display: flex;
      gap: 12px;
      font-size: 11px;
      color: #64748b;
      margin-top: 4px;
    }
    .badge-resolved-pill {
      background: #dcfce7;
      color: #15803d;
      padding: 1px 6px;
      border-radius: 4px;
      font-weight: 700;
    }
    .btn-select-item {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      color: #1e3a8a;
      padding: 7px 14px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-select-item:hover {
      background: #e0f2fe;
    }
    .empty-list-notice {
      text-align: center;
      padding: 40px;
      color: #64748b;
      background: #ffffff;
      border: 1px dashed #cbd5e1;
      border-radius: 10px;
    }
  `]
})
export class TriageInboxComponent implements OnInit {
  private triageService = inject(TriageService);

  viewMode = signal<'focus' | 'list'>('focus');
  filterStatus = signal<'pending' | 'resolved' | 'all'>('pending');

  items = signal<TriageItem[]>([]);
  currentIndex = signal<number>(0);
  summary = signal<TriageSummary>({
    total_pending: 0,
    total_resolved: 0,
    direct_mentions_pending: 0,
    urgent_count: 0,
    status: 'action_required'
  });

  currentItem = computed(() => {
    const list = this.items();
    const idx = this.currentIndex();
    return list.length > 0 && idx >= 0 && idx < list.length ? list[idx] : null;
  });

  replyText = '';
  isProcessing = false;

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.triageService.getItems(this.filterStatus()).subscribe({
      next: (list) => {
        this.items.set(list);
        this.currentIndex.set(0);
        this.replyText = '';
      }
    });

    this.triageService.getSummary().subscribe({
      next: (sum) => this.summary.set(sum)
    });
  }

  setFilterStatus(status: 'pending' | 'resolved' | 'all'): void {
    this.filterStatus.set(status);
    this.loadData();
  }

  onVoiceReply(text: string): void {
    if (this.replyText.trim()) {
      this.replyText += ' ' + text;
    } else {
      this.replyText = text;
    }
  }

  prevItem(): void {
    if (this.currentIndex() > 0) {
      this.currentIndex.update(i => i - 1);
      this.replyText = '';
    }
  }

  nextItem(): void {
    if (this.currentIndex() < this.items().length - 1) {
      this.currentIndex.update(i => i + 1);
      this.replyText = '';
    }
  }

  openInFocus(index: number): void {
    this.currentIndex.set(index);
    this.viewMode.set('focus');
    this.replyText = '';
  }

  sendReplyOnly(item: TriageItem): void {
    if (!this.replyText.trim()) return;
    this.isProcessing = true;

    this.triageService.replyItem(item.id, this.replyText.trim(), false).subscribe({
      next: (updated) => {
        this.isProcessing = false;
        this.replyText = '';
        this.items.update(list => list.map(i => i.id === updated.id ? updated : i));
      },
      error: () => {
        this.isProcessing = false;
      }
    });
  }

  resolveAndGoNext(item: TriageItem): void {
    this.isProcessing = true;
    const note = this.replyText.trim() || undefined;

    this.triageService.resolveItem(item.id, note).subscribe({
      next: (resolved) => {
        this.isProcessing = false;
        this.replyText = '';

        // Actualizar métricas
        this.summary.update(s => ({
          ...s,
          total_pending: Math.max(0, s.total_pending - 1),
          total_resolved: s.total_resolved + 1
        }));

        if (this.filterStatus() === 'pending') {
          // Remover el elemento resuelto de la lista pendiente
          const remaining = this.items().filter(i => i.id !== item.id);
          this.items.set(remaining);
          if (this.currentIndex() >= remaining.length) {
            this.currentIndex.set(Math.max(0, remaining.length - 1));
          }
        } else {
          // Marcar resuelto en la lista completa
          this.items.update(list => list.map(i => i.id === resolved.id ? resolved : i));
          this.nextItem();
        }
      },
      error: () => {
        this.isProcessing = false;
      }
    });
  }

  reopenItem(item: TriageItem): void {
    this.triageService.reopenItem(item.id).subscribe({
      next: (reopened) => {
        this.items.update(list => list.map(i => i.id === reopened.id ? reopened : i));
        this.summary.update(s => ({
          ...s,
          total_pending: s.total_pending + 1,
          total_resolved: Math.max(0, s.total_resolved - 1)
        }));
      }
    });
  }

  openDeepLink(item: TriageItem): void {
    // Disparar evento global de navegación hacia la pestaña correspondiente
    window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: item.target_tab }));
  }
}
