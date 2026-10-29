import { Component, OnInit, inject, signal, computed, HostListener, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificationService, NotificationItem } from '../../core/services/notification.service';
import { AuthService } from '../../core/services/auth.service';
import { VoiceInputBtnComponent } from '../../shared/components/voice-input-btn.component';

@Component({
  selector: 'app-personal-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule, VoiceInputBtnComponent],
  template: `
    <div class="notifications-container">
      <!-- 1. HERO INSTITUCIONAL PERSONAL -->
      <header class="personal-hero">
        <div class="hero-left">
          <div class="hero-icon-badge">🔔</div>
          <div>
            <div class="hero-tag">Bandeja Personal de Colaboración</div>
            <h2>Notificaciones y Menciones Colegiadas</h2>
            <p>
              Hola <strong>{{ currentUserName() }}</strong>. Revisa las consultas donde tus colegas te etiquetaron (&#64;{{ userShortName() }})
              y solicitudes sobre tus publicaciones en el consorcio.
            </p>
          </div>
        </div>

        <!-- Métricas Rápidas -->
        <div class="hero-stats">
          <div class="stat-box mentions">
            <span class="stat-num">&#64;{{ pendingMentionsCount() }}</span>
            <span class="stat-label">Menciones a ti</span>
          </div>
          <div class="stat-box pending">
            <span class="stat-num">{{ unreadTotal() }}</span>
            <span class="stat-label">Sin leer</span>
          </div>
          <div class="stat-box resolved">
            <span class="stat-num">{{ resolvedCount() }}</span>
            <span class="stat-label">Atendidas</span>
          </div>
        </div>
      </header>

      <!-- 2. BARRA DE CONTROL Y SELECTOR DE VISTA -->
      <div class="view-controls-bar">
        <div class="mode-toggles">
          <button
            class="toggle-btn"
            [class.active]="viewMode() === 'carousel'"
            (click)="viewMode.set('carousel')"
          >
            ↔️ Navegador Lateral de Lugares (1 a 1)
          </button>
          <button
            class="toggle-btn"
            [class.active]="viewMode() === 'list'"
            (click)="viewMode.set('list')"
          >
            📋 Lista Completa ({{ displayedList().length }})
          </button>
        </div>

        <div class="filter-chips">
          <button
            class="filter-chip"
            [class.active]="currentFilter() === 'mentions'"
            (click)="currentFilter.set('mentions')"
          >
            🎯 Solo Menciones (&#64;)
          </button>
          <button
            class="filter-chip"
            [class.active]="currentFilter() === 'unread'"
            (click)="currentFilter.set('unread')"
          >
            ⏳ Por Atender
          </button>
          <button
            class="filter-chip"
            [class.active]="currentFilter() === 'resolved'"
            (click)="currentFilter.set('resolved')"
          >
            ✓ Ya Atendidas
          </button>
          <button
            class="filter-chip"
            [class.active]="currentFilter() === 'all'"
            (click)="currentFilter.set('all')"
          >
            Todas
          </button>
        </div>
      </div>

      <!-- ============================================================== -->
      <!-- VISTA A: NAVEGADOR LATERAL DE LUGARES (CLIC HACIA LOS LADOS) -->
      <!-- ============================================================== -->
      @if (viewMode() === 'carousel') {
        @if (activeItems().length === 0) {
          <div class="empty-inbox-card">
            <div class="empty-icon">🎉</div>
            <h3>¡Todo al día en tus menciones!</h3>
            <p>No tienes dudas ni comentarios pendientes con tu etiqueta en este filtro.</p>
            <button class="btn-refresh" (click)="currentFilter.set('all')">Ver todas las notificaciones</button>
          </div>
        } @else {
          <!-- Barra Superior de Navegación Lateral -->
          <div class="lateral-nav-header">
            <div class="nav-arrows-group">
              <button
                class="btn-side-nav prev"
                (click)="prevLocation()"
                [disabled]="currentIndex() === 0"
                title="Lugar anterior (Flecha Izquierda ←)"
              >
                ◀ Anterior Lugar
              </button>
              
              <div class="location-counter">
                <span class="count-badge">Lugar {{ currentIndex() + 1 }} de {{ activeItems().length }}</span>
                <span class="keyboard-tip">(Usa ← → del teclado)</span>
              </div>

              <button
                class="btn-side-nav next"
                (click)="nextLocation()"
                [disabled]="currentIndex() === activeItems().length - 1"
                title="Siguiente lugar (Flecha Derecha →)"
              >
                Siguiente Lugar ▶
              </button>
            </div>

            <!-- Carrusel de Mini-Lugares (Chips para saltar directo) -->
            <div class="location-tabs-scroll">
              @for (item of activeItems(); track item.id; let idx = $index) {
                <button
                  class="location-chip"
                  [class.active]="currentIndex() === idx"
                  [class.resolved]="item.is_resolved"
                  (click)="currentIndex.set(idx)"
                >
                  <span class="chip-dot"></span>
                  <span class="chip-title">{{ getLocationShortTitle(item) }}</span>
                  @if (item.is_resolved) {
                    <span class="chip-check">✓</span>
                  }
                </button>
              }
            </div>
          </div>

          <!-- TARJETA PRINCIPAL DEL LUGAR ACTUAL -->
          @if (currentItem(); as cur) {
            <div class="location-focus-card" [class.is-resolved]="cur.is_resolved">
              <!-- Encabezado del Lugar -->
              <div class="location-meta-bar">
                <div class="location-badge">
                  <span class="icon">{{ getLocationIcon(cur) }}</span>
                  <span class="type-name">{{ cur.source_location || 'Lugar de Investigación' }}</span>
                </div>

                <div class="location-right-actions">
                  @if (cur.is_resolved) {
                    <span class="status-badge resolved-badge">✓ Duda Resuelta y Acordada</span>
                  } @else {
                    <span class="status-badge pending-badge">⏳ Requiere tu aclaración</span>
                  }

                  <button
                    class="btn-open-source"
                    (click)="openInOriginalViewer(cur)"
                    title="Navegar al visor con esta anotación seleccionada"
                  >
                    ↗ Abrir en Visor Original
                  </button>
                </div>
              </div>

              <!-- Fragmento citado o ubicación exacta -->
              @if (cur.snippet_quoted) {
                <div class="snippet-quote-box">
                  <div class="snippet-label">📌 Fragmento o cuadrante citado:</div>
                  <blockquote class="quote-text">"{{ cur.snippet_quoted }}"</blockquote>
                </div>
              }

              <!-- Bloque del Autor y Comentario donde te etiquetó -->
              <div class="comment-author-card">
                <div class="author-header">
                  <img
                    [src]="cur.actor_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'"
                    class="author-avatar"
                    alt="{{ cur.actor_name }}"
                  />
                  <div class="author-details">
                    <div class="author-name-row">
                      <span class="name">{{ cur.actor_name }}</span>
                      <span class="time">{{ cur.created_at }}</span>
                    </div>
                    <div class="action-title">{{ cur.title }}</div>
                  </div>
                </div>

                <!-- Contenido del comentario con resaltado de mención -->
                <div class="comment-body-text">
                  <p [innerHTML]="formatMentions(cur.comment_text || cur.summary)"></p>
                </div>

                @if (cur.action_required) {
                  <div class="action-required-banner">
                    <span class="action-tag">🎯 Tarea o consulta solicitada:</span>
                    <span class="action-text">{{ cur.action_required }}</span>
                  </div>
                }
              </div>

              <!-- Zona de Respuesta Inmediata y Resolución -->
              <div class="reply-resolution-zone">
                <label class="reply-label">
                  ✍️ Tu respuesta técnica o aclaración para este lugar:
                </label>
                <div class="textarea-wrapper">
                  <textarea
                    [(ngModel)]="replyTexts[cur.id]"
                    placeholder="Escribe o dicta tu respuesta técnica para aclarar esta duda en el consorcio..."
                    rows="3"
                  ></textarea>
                </div>

                <div class="action-buttons-row">
                  <div class="left-audio-btn">
                    <app-voice-input-btn
                      [compact]="false"
                      [tooltip]="'Dictar respuesta técnica por voz con Whisper'"
                      (textTranscribed)="onVoiceTranscribed(cur.id, $event)"
                    />
                  </div>

                  <div class="right-action-buttons">
                    <button
                      class="btn-toggle-resolve"
                      [class.reopen]="cur.is_resolved"
                      (click)="toggleResolveStatus(cur)"
                    >
                      {{ cur.is_resolved ? '↩ Reabrir Duda' : '✓ Marcar como Atendida' }}
                    </button>

                    <button
                      class="btn-reply-and-next"
                      (click)="submitReplyAndNext(cur)"
                      [disabled]="isSubmitting() || !replyTexts[cur.id]?.trim()"
                    >
                      {{ isSubmitting() ? 'Enviando...' : 'Enviar y Pasar al Siguiente Lugar ▶' }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          }
        }
      }

      <!-- ============================================================== -->
      <!-- VISTA B: LISTA COMPLETA DE NOTIFICACIONES Y MENCIONES -->
      <!-- ============================================================== -->
      @if (viewMode() === 'list') {
        <div class="notifications-list-wrapper">
          @for (item of displayedList(); track item.id) {
            <div
              class="list-notification-card"
              [class.is-unread]="!item.is_read"
              [class.is-resolved]="item.is_resolved"
              (click)="openInCarouselAt(item)"
            >
              <div class="card-left-indicator">
                <span class="type-icon">{{ getLocationIcon(item) }}</span>
              </div>

              <div class="card-main-content">
                <div class="card-top-line">
                  <span class="source-tag">{{ item.source_location || item.title }}</span>
                  <span class="date-tag">{{ item.created_at }}</span>
                </div>

                <div class="author-comment-line">
                  <strong>{{ item.actor_name }}:</strong>
                  <span [innerHTML]="formatMentions(item.comment_text || item.summary)"></span>
                </div>

                @if (item.snippet_quoted) {
                  <blockquote class="mini-quote">"{{ item.snippet_quoted }}"</blockquote>
                }
              </div>

              <div class="card-action-side">
                @if (item.is_resolved) {
                  <span class="badge-resolved">✓ Atendida</span>
                } @else {
                  <span class="badge-pending">⏳ Pendiente</span>
                }
                <button
                  class="btn-focus-arrow"
                  title="Examinar en Navegador Lateral 1 a 1"
                  (click)="openInCarouselAt(item); $event.stopPropagation()"
                >
                  Navegar 1 a 1 ↔️
                </button>
              </div>
            </div>
          } @empty {
            <div class="empty-inbox-card">
              <div class="empty-icon">📭</div>
              <h3>Sin notificaciones en esta categoría</h3>
              <p>Cambia el filtro para revisar otras alertas o menciones.</p>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .notifications-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px 20px 80px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    /* 1. HERO */
    .personal-hero {
      background: linear-gradient(135deg, #0b192c 0%, #1e3e62 100%);
      color: #ffffff;
      border-radius: 16px;
      padding: 24px 28px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 24px;
      box-shadow: 0 10px 25px rgba(11, 25, 44, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .hero-left {
      display: flex;
      align-items: center;
      gap: 18px;
    }

    .hero-icon-badge {
      width: 54px;
      height: 54px;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 26px;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .hero-tag {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #93c5fd;
      margin-bottom: 4px;
    }

    .personal-hero h2 {
      margin: 0 0 6px 0;
      font-size: 22px;
      font-weight: 800;
    }

    .personal-hero p {
      margin: 0;
      font-size: 14px;
      color: #cbd5e1;
      max-width: 580px;
      line-height: 1.4;
    }

    .hero-stats {
      display: flex;
      gap: 12px;
    }

    .stat-box {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 12px;
      padding: 10px 18px;
      min-width: 100px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .stat-box.mentions .stat-num {
      color: #38bdf8;
    }

    .stat-box.pending .stat-num {
      color: #f59e0b;
    }

    .stat-box.resolved .stat-num {
      color: #34d399;
    }

    .stat-num {
      font-size: 22px;
      font-weight: 800;
      line-height: 1.2;
    }

    .stat-label {
      font-size: 11px;
      color: #94a3b8;
      font-weight: 600;
      text-transform: uppercase;
      margin-top: 2px;
    }

    /* 2. CONTROLES Y FILTROS */
    .view-controls-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }

    .mode-toggles {
      display: flex;
      background: #e2e8f0;
      padding: 3px;
      border-radius: 10px;
      gap: 3px;
    }

    .toggle-btn {
      padding: 8px 16px;
      border: none;
      background: transparent;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      color: #475569;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .toggle-btn.active {
      background: #ffffff;
      color: #0f172a;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
    }

    .filter-chips {
      display: flex;
      gap: 8px;
    }

    .filter-chip {
      padding: 6px 14px;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      color: #475569;
      cursor: pointer;
      transition: all 0.2s;
    }

    .filter-chip.active {
      background: #1e3e62;
      border-color: #1e3e62;
      color: #ffffff;
    }

    /* 3. NAVEGADOR LATERAL */
    .lateral-nav-header {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 14px 18px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
    }

    .nav-arrows-group {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .btn-side-nav {
      padding: 8px 18px;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 700;
      color: #1e293b;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .btn-side-nav:hover:not(:disabled) {
      background: #0284c7;
      color: #ffffff;
      border-color: #0284c7;
      transform: translateY(-1px);
    }

    .btn-side-nav:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .location-counter {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
    }

    .count-badge {
      font-size: 14px;
      font-weight: 800;
      color: #0f172a;
      background: #f8fafc;
      padding: 4px 14px;
      border-radius: 20px;
      border: 1px solid #e2e8f0;
    }

    .keyboard-tip {
      font-size: 11px;
      color: #94a3b8;
    }

    .location-tabs-scroll {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding-bottom: 4px;
    }

    .location-chip {
      padding: 6px 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      color: #475569;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
      transition: all 0.2s;
    }

    .location-chip .chip-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #94a3b8;
    }

    .location-chip.active {
      background: #0284c7;
      border-color: #0284c7;
      color: #ffffff;
    }

    .location-chip.active .chip-dot {
      background: #ffffff;
    }

    .location-chip.resolved {
      border-color: #86efac;
      background: #f0fdf4;
    }

    .location-chip.resolved.active {
      background: #16a34a;
      border-color: #16a34a;
    }

    .location-chip .chip-check {
      color: #16a34a;
      font-weight: 800;
    }

    .location-chip.active .chip-check {
      color: #ffffff;
    }

    /* 4. TARJETA PRINCIPAL DEL LUGAR */
    .location-focus-card {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 16px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 18px;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.05);
      border-left: 6px solid #0284c7;
      transition: border-color 0.2s;
    }

    .location-focus-card.is-resolved {
      border-left-color: #16a34a;
    }

    .location-meta-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      padding-bottom: 14px;
      border-bottom: 1px solid #f1f5f9;
    }

    .location-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
    }

    .location-badge .icon {
      font-size: 20px;
    }

    .location-right-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .status-badge {
      font-size: 12px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 12px;
    }

    .status-badge.pending-badge {
      background: #fef3c7;
      color: #b45309;
    }

    .status-badge.resolved-badge {
      background: #dcfce7;
      color: #15803d;
    }

    .btn-open-source {
      padding: 6px 14px;
      background: #0284c7;
      border: none;
      border-radius: 8px;
      color: #ffffff;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }

    .btn-open-source:hover {
      background: #0369a1;
    }

    /* Fragmento Citado */
    .snippet-quote-box {
      background: #f8fafc;
      border-left: 4px solid #3b82f6;
      border-radius: 6px;
      padding: 12px 16px;
    }

    .snippet-label {
      font-size: 12px;
      font-weight: 700;
      color: #3b82f6;
      margin-bottom: 4px;
    }

    .quote-text {
      margin: 0;
      font-size: 14px;
      font-style: italic;
      color: #334155;
      line-height: 1.5;
    }

    /* Comentario de Autor */
    .comment-author-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .author-header {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .author-avatar {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid #ffffff;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
    }

    .author-details {
      display: flex;
      flex-direction: column;
    }

    .author-name-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .author-name-row .name {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
    }

    .author-name-row .time {
      font-size: 12px;
      color: #94a3b8;
    }

    .action-title {
      font-size: 13px;
      font-weight: 600;
      color: #64748b;
    }

    .comment-body-text {
      font-size: 15px;
      color: #1e293b;
      line-height: 1.5;
    }

    .comment-body-text p {
      margin: 0;
    }

    ::ng-deep .mention-tag {
      background: #e0f2fe;
      color: #0369a1;
      padding: 2px 6px;
      border-radius: 6px;
      font-weight: 700;
    }

    .action-required-banner {
      background: #fffbeb;
      border: 1px solid #fef3c7;
      border-radius: 8px;
      padding: 8px 12px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
    }

    .action-required-banner .action-tag {
      font-weight: 700;
      color: #b45309;
    }

    .action-required-banner .action-text {
      color: #78350f;
    }

    /* Zona de Respuesta */
    .reply-resolution-zone {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .reply-label {
      font-size: 13px;
      font-weight: 700;
      color: #334155;
    }

    .textarea-wrapper textarea {
      width: 100%;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 12px;
      font-size: 14px;
      font-family: inherit;
      resize: vertical;
      outline: none;
      box-sizing: border-box;
      transition: border-color 0.2s;
    }

    .textarea-wrapper textarea:focus {
      border-color: #0284c7;
      box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
    }

    .action-buttons-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }

    .right-action-buttons {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .btn-toggle-resolve {
      padding: 10px 16px;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      color: #334155;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-toggle-resolve:hover {
      background: #dcfce7;
      color: #166534;
      border-color: #86efac;
    }

    .btn-toggle-resolve.reopen {
      background: #fef2f2;
      color: #991b1b;
      border-color: #fca5a5;
    }

    .btn-reply-and-next {
      padding: 10px 20px;
      background: #16a34a;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 700;
      color: #ffffff;
      cursor: pointer;
      transition: background 0.2s;
    }

    .btn-reply-and-next:hover:not(:disabled) {
      background: #15803d;
    }

    .btn-reply-and-next:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* 5. VISTA DE LISTA COMPLETA */
    .notifications-list-wrapper {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .list-notification-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 16px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .list-notification-card:hover {
      border-color: #0284c7;
      box-shadow: 0 4px 12px rgba(2, 132, 199, 0.08);
      transform: translateY(-1px);
    }

    .list-notification-card.is-unread {
      background: #f0f9ff;
      border-color: #bae6fd;
    }

    .card-left-indicator .type-icon {
      font-size: 26px;
    }

    .card-main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .card-top-line {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: #64748b;
    }

    .source-tag {
      font-weight: 700;
      color: #0284c7;
    }

    .author-comment-line {
      font-size: 14px;
      color: #1e293b;
      line-height: 1.4;
    }

    .mini-quote {
      margin: 4px 0 0 0;
      font-size: 12px;
      color: #64748b;
      font-style: italic;
      border-left: 2px solid #cbd5e1;
      padding-left: 8px;
    }

    .card-action-side {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 8px;
    }

    .badge-resolved {
      font-size: 11px;
      font-weight: 700;
      color: #16a34a;
      background: #dcfce7;
      padding: 3px 8px;
      border-radius: 10px;
    }

    .badge-pending {
      font-size: 11px;
      font-weight: 700;
      color: #b45309;
      background: #fef3c7;
      padding: 3px 8px;
      border-radius: 10px;
    }

    .btn-focus-arrow {
      padding: 5px 12px;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      color: #334155;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-focus-arrow:hover {
      background: #0284c7;
      color: #ffffff;
      border-color: #0284c7;
    }

    /* Vacío */
    .empty-inbox-card {
      background: #ffffff;
      border: 2px dashed #cbd5e1;
      border-radius: 16px;
      padding: 50px 20px;
      text-align: center;
    }

    .empty-icon {
      font-size: 48px;
      margin-bottom: 12px;
    }

    .empty-inbox-card h3 {
      margin: 0 0 6px 0;
      font-size: 18px;
      color: #0f172a;
    }

    .empty-inbox-card p {
      margin: 0 0 16px 0;
      color: #64748b;
      font-size: 14px;
    }

    .btn-refresh {
      padding: 8px 18px;
      background: #1e3e62;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
  `]
})
export class PersonalNotificationsComponent implements OnInit {
  private notifService = inject(NotificationService);
  private authService = inject(AuthService);

  navigateTab = output<string>();

  viewMode = signal<'carousel' | 'list'>('carousel');
  currentFilter = signal<'mentions' | 'unread' | 'resolved' | 'all'>('mentions');
  currentIndex = signal<number>(0);
  isSubmitting = signal<boolean>(false);

  replyTexts: Record<string, string> = {};

  user = this.authService.currentUser;
  currentUserName = computed(() => this.user()?.full_name || 'Dra. Elena Ramos');
  userShortName = computed(() => {
    const full = this.currentUserName();
    return full.split(' ')[0] || 'Elena';
  });

  allNotifications = this.notifService.notifications;
  unreadTotal = this.notifService.unreadCount;
  pendingMentionsCount = this.notifService.mentionsPendingCount;

  resolvedCount = computed(() =>
    this.allNotifications().filter(n => n.is_resolved).length
  );

  activeItems = computed(() => {
    const list = this.allNotifications();
    const filter = this.currentFilter();

    switch (filter) {
      case 'mentions':
        return list.filter(n => n.is_mention);
      case 'unread':
        return list.filter(n => !n.is_read || !n.is_resolved);
      case 'resolved':
        return list.filter(n => n.is_resolved);
      case 'all':
      default:
        return list;
    }
  });

  displayedList = computed(() => this.activeItems());

  currentItem = computed<NotificationItem | null>(() => {
    const items = this.activeItems();
    const idx = this.currentIndex();
    if (items.length === 0) return null;
    if (idx >= items.length) {
      return items[items.length - 1];
    }
    return items[idx];
  });

  ngOnInit(): void {
    this.notifService.fetchMentions().subscribe();
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if (this.viewMode() !== 'carousel') return;
    const target = event.target as HTMLElement;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
      return; // No interferir mientras se escribe
    }

    if (event.key === 'ArrowLeft') {
      this.prevLocation();
    } else if (event.key === 'ArrowRight') {
      this.nextLocation();
    }
  }

  prevLocation(): void {
    if (this.currentIndex() > 0) {
      this.currentIndex.update(i => i - 1);
    }
  }

  nextLocation(): void {
    if (this.currentIndex() < this.activeItems().length - 1) {
      this.currentIndex.update(i => i + 1);
    }
  }

  openInCarouselAt(item: NotificationItem): void {
    this.viewMode.set('carousel');
    const idx = this.activeItems().findIndex(n => n.id === item.id);
    if (idx !== -1) {
      this.currentIndex.set(idx);
    }
  }

  getLocationShortTitle(item: NotificationItem): string {
    if (item.source_location) {
      const parts = item.source_location.split(':');
      return parts.length > 1 ? parts[1].trim() : item.source_location;
    }
    return item.title;
  }

  getLocationIcon(item: NotificationItem): string {
    const loc = (item.source_location || item.title || '').toLowerCase();
    if (loc.includes('sem') || loc.includes('imagen') || loc.includes('micrograf')) return '🔬';
    if (loc.includes('pdf') || loc.includes('paper') || loc.includes('artículo')) return '📄';
    if (loc.includes('foro') || loc.includes('debate') || loc.includes('biorreactor')) return '💬';
    if (loc.includes('acuerdo') || loc.includes('norma')) return '⚖️';
    return '📌';
  }

  formatMentions(text: string): string {
    if (!text) return '';
    // Resaltar arrobas con tag HTML
    return text.replace(/(@[A-Za-zÁÉÍÓÚáéíóúñÑ0-9_]+(?:\s+[A-Za-zÁÉÍÓÚáéíóúñÑ0-9_]+)?)/g, '<span class="mention-tag">$1</span>');
  }

  onVoiceTranscribed(id: string, text: string): void {
    if (this.replyTexts[id]?.trim()) {
      this.replyTexts[id] += ' ' + text;
    } else {
      this.replyTexts[id] = text;
    }
  }

  toggleResolveStatus(item: NotificationItem): void {
    this.notifService.toggleResolve(item.id).subscribe();
  }

  submitReplyAndNext(item: NotificationItem): void {
    const text = this.replyTexts[item.id]?.trim();
    if (!text) return;

    this.isSubmitting.set(true);
    this.notifService.replyToMention(item.id, text, true).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.replyTexts[item.id] = '';
        // Si hay un siguiente lugar, avanzar automáticamente
        if (this.currentIndex() < this.activeItems().length - 1) {
          this.nextLocation();
        }
      },
      error: () => {
        this.isSubmitting.set(false);
      }
    });
  }

  openInOriginalViewer(item: NotificationItem): void {
    this.notifService.markAsRead(item.id);
    const targetTab = item.target_tab || 'pdf-viewer';
    this.navigateTab.emit(targetTab);
  }
}
