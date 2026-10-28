import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FeedService, SpaceItem, PostItem } from '../../core/services/feed.service';
import { ChatDockService } from '../../core/services/chat-dock.service';
import { AuthService } from '../../core/services/auth.service';
import { VoiceInputBtnComponent } from '../../shared/components/voice-input-btn.component';

export type DiscussionFilter = 'ALL' | 'ADVANCE' | 'QUESTION' | 'ANNOUNCEMENT';

@Component({
  selector: 'app-stream-feed',
  standalone: true,
  imports: [CommonModule, FormsModule, VoiceInputBtnComponent],
  template: `
    <div class="discussions-container">
      <!-- 1. VISTA DE LISTA DE DISCUSIONES (Estilo GitHub Discussions / Foro Académico) -->
      @if (!selectedThread()) {
        <!-- Cabecera del Foro -->
        <header class="forum-header">
          <div class="header-titles">
            <h2>📋 Foro de Discusión y Avances Científicos</h2>
            <p>Hilos técnicos estructurados por línea de investigación, consultas metodológicas y acuerdos asíncronos del consorcio.</p>
          </div>
          <button class="btn-new-thread" (click)="isNewThreadOpen.set(!isNewThreadOpen())">
            {{ isNewThreadOpen() ? '✕ Cancelar' : '+ Nueva Discusión Técnica' }}
          </button>
        </header>

        <!-- Formulario Desplegable para Nueva Discusión Técnica -->
        @if (isNewThreadOpen()) {
          <div class="new-thread-panel">
            <div class="panel-header">
              <h4>📝 Iniciar Nuevo Hilo de Discusión Técnica</h4>
              <p>Plantea un avance experimental, una duda metodológica o un reporte para revisión del consorcio.</p>
            </div>

            <div class="form-grid">
              <div class="form-group title-field">
                <div class="field-label-row">
                  <label>Título de la Discusión / Reporte:</label>
                  <app-voice-input-btn
                    [compact]="true"
                    [tooltip]="'Dictar título por voz'"
                    (textTranscribed)="onVoiceNewPostTitle($event)"
                  />
                </div>
                <input
                  type="text"
                  [(ngModel)]="newPostTitle"
                  placeholder="Ej: Evaluación de la dispersión de nanofibras mediante reología rotacional a 25°C..."
                />
              </div>

              <div class="form-row-selectors">
                <div class="form-group flex-1">
                  <label>Línea de Investigación:</label>
                  <select [(ngModel)]="targetSpaceId">
                    <option value="space-general">🌐 Consorcio General</option>
                    <option value="space-nanocelulosa">🧪 Línea 1: Nanocelulosa y Polímeros</option>
                    <option value="space-biomateriales">🔬 Línea 2: Biomateriales y Cultivos</option>
                    <option value="space-farmacologia">💊 Línea 3: Farmacología y Formulaciones</option>
                  </select>
                </div>

                <div class="form-group flex-1">
                  <label>Categoría del Hilo:</label>
                  <select [(ngModel)]="selectedPostType">
                    <option value="ADVANCE">📌 Avance Experimental / Resultados</option>
                    <option value="QUESTION">❓ Consulta Metodológica / Técnica</option>
                    <option value="ANNOUNCEMENT">📢 Convocatoria / Anuncio</option>
                  </select>
                </div>
              </div>

              <div class="form-group full-width">
                <div class="field-label-row">
                  <label>Desarrollo Técnico o Planteamiento:</label>
                  <app-voice-input-btn
                    [tooltip]="'Dictar desarrollo técnico por voz con Whisper'"
                    (textTranscribed)="onVoiceNewPostContent($event)"
                  />
                </div>
                <textarea
                  [(ngModel)]="newPostContent"
                  rows="5"
                  placeholder="Describe detalladamente los resultados, parámetros experimentales, equipos utilizados o la duda a resolver con el equipo..."
                ></textarea>
              </div>

              <div class="form-actions-row">
                <button class="btn-secondary" (click)="isNewThreadOpen.set(false)">Descartar</button>
                <button
                  class="btn-primary"
                  (click)="publishPost()"
                  [disabled]="isPublishing() || !newPostTitle.trim() || !newPostContent.trim()"
                >
                  {{ isPublishing() ? 'Publicando...' : 'Publicar Hilo Técnico' }}
                </button>
              </div>
            </div>
          </div>
        }

        <!-- Barra de Filtros y Búsqueda Estilo GitHub Discussions -->
        <div class="forum-toolbar">
          <!-- Búsqueda -->
          <div class="search-field">
            <span class="search-icon">🔍</span>
            <input
              type="text"
              [(ngModel)]="searchKeyword"
              placeholder="Buscar en títulos, metodología o autores..."
            />
            <app-voice-input-btn
              [compact]="true"
              [tooltip]="'Buscar por voz'"
              (textTranscribed)="onVoiceSearch($event)"
            />
          </div>

          <!-- Selector de Línea de Investigación -->
          <div class="toolbar-control">
            <label>Línea:</label>
            <select [ngModel]="selectedSpaceId()" (ngModelChange)="changeSpace($event)">
              <option value="all">🌐 Todas las Líneas</option>
              @for (space of spaces(); track space.id) {
                <option [value]="space.id">{{ space.name }}</option>
              }
            </select>
          </div>

          <!-- Filtro por Categoría -->
          <div class="toolbar-tabs">
            <button
              class="toolbar-tab"
              [class.active]="selectedCategoryFilter === 'ALL'"
              (click)="selectedCategoryFilter = 'ALL'"
            >
              Todas ({{ posts().length }})
            </button>
            <button
              class="toolbar-tab"
              [class.active]="selectedCategoryFilter === 'ADVANCE'"
              (click)="selectedCategoryFilter = 'ADVANCE'"
            >
              📌 Avances
            </button>
            <button
              class="toolbar-tab"
              [class.active]="selectedCategoryFilter === 'QUESTION'"
              (click)="selectedCategoryFilter = 'QUESTION'"
            >
              ❓ Consultas
            </button>
            <button
              class="toolbar-tab"
              [class.active]="selectedCategoryFilter === 'ANNOUNCEMENT'"
              (click)="selectedCategoryFilter = 'ANNOUNCEMENT'"
            >
              📢 Anuncios
            </button>
          </div>
        </div>

        <!-- Tabla / Lista de Hilos Técnicos -->
        <div class="threads-list-card">
          <div class="threads-list-header">
            <span class="col-main">Discusión / Hilo Científico</span>
            <span class="col-space">Línea Temática</span>
            <span class="col-replies">Réplicas</span>
            <span class="col-date">Última Actividad</span>
          </div>

          <div class="threads-rows">
            @for (thread of filteredThreads(); track thread.id) {
              <div class="thread-row" (click)="openThread(thread)">
                <div class="col-main">
                  <div class="thread-title-line">
                    <span class="category-tag" [ngClass]="thread.post_type.toLowerCase()">
                      {{ getCategoryBadge(thread.post_type) }}
                    </span>
                    <h4 class="thread-title">{{ thread.title }}</h4>
                  </div>
                  <p class="thread-preview">{{ getPreviewText(thread.content_markdown) }}</p>
                  <div class="thread-meta-row">
                    <span class="meta-author">
                      <strong>{{ thread.author.full_name }}</strong>
                      <span class="meta-inst">({{ thread.author.institution_name }})</span>
                    </span>
                    <span class="meta-dot">•</span>
                    <span class="meta-role">{{ thread.author.academic_title }}</span>
                  </div>
                </div>

                <div class="col-space">
                  <span class="space-badge">{{ thread.space_name }}</span>
                </div>

                <div class="col-replies">
                  <span class="replies-counter" [class.has-replies]="thread.comments_count > 0">
                    💬 {{ thread.comments_count }}
                  </span>
                </div>

                <div class="col-date">
                  <span class="date-text">{{ thread.created_at | date:'d MMM yyyy' }}</span>
                  <small class="time-sub">{{ thread.created_at | date:'h:mm a' }}</small>
                </div>
              </div>
            } @empty {
              <div class="empty-threads-state">
                <span class="empty-icon">📁</span>
                <h4>No se encontraron discusiones con este criterio</h4>
                <p>Inicia un nuevo hilo técnico o selecciona otra línea temática arriba.</p>
              </div>
            }
          </div>
        </div>
      } @else {
        <!-- 2. VISTA DE DETALLE DEL HILO TÉCNICO (Estilo Documento / Reporte Científico) -->
        <article class="thread-detail-container">
          <div class="detail-navigation-bar">
            <button class="btn-back" (click)="closeThread()">
              ← Volver a la lista de discusiones
            </button>
            <span class="detail-space-badge">{{ selectedThread()!.space_name }}</span>
          </div>

          <div class="thread-document-card">
            <!-- Encabezado del Hilo -->
            <div class="thread-doc-header">
              <div class="doc-meta-top">
                <span class="category-tag" [ngClass]="selectedThread()!.post_type.toLowerCase()">
                  {{ getCategoryBadge(selectedThread()!.post_type) }}
                </span>
                <span class="doc-date">Publicado el {{ selectedThread()!.created_at | date:'longDate' }} a las {{ selectedThread()!.created_at | date:'shortTime' }}</span>
              </div>
              <h2 class="doc-title">{{ selectedThread()!.title }}</h2>

              <div class="author-profile-bar">
                <div class="author-details-box">
                  <strong>{{ selectedThread()!.author.full_name }}</strong>
                  <span class="author-academic">{{ selectedThread()!.author.academic_title }} • {{ selectedThread()!.author.institution_name }}</span>
                </div>
                <button
                  class="btn-direct-chat"
                  (click)="startDirectChatWithAuthor(selectedThread()!.author)"
                  title="Abrir chat directo con el autor"
                >
                  💬 Contactar al autor
                </button>
              </div>
            </div>

            <!-- Contenido Formal del Reporte -->
            <div class="thread-doc-body">
              <p class="doc-markdown-content">{{ selectedThread()!.content_markdown }}</p>
            </div>

            <!-- Sección de Validación Científica / Consenso -->
            <div class="scientific-validation-bar">
              <span class="validation-title">Aportes del Consorcio:</span>
              <div class="endorsements-pills">
                <span class="endorsement-chip">
                  🔬 Validado experimentalmente ({{ selectedThread()!.reactions['validated'] || 0 }})
                </span>
                <span class="endorsement-chip">
                  💡 Aporte clave ({{ selectedThread()!.reactions['key_idea'] || 0 }})
                </span>
                <span class="endorsement-chip">
                  👍 Respaldado por el grupo ({{ selectedThread()!.reactions['interesting'] || 0 }})
                </span>
              </div>
            </div>
          </div>

          <!-- Sección de Réplicas y Revisión por Pares -->
          <section class="replies-section">
            <div class="replies-header">
              <h3>Réplicas Técnicas y Observaciones ({{ selectedThread()!.comments.length }})</h3>
              <p>Contribuciones de los investigadores del consorcio a este hilo.</p>
            </div>

            <div class="replies-list">
              @for (comment of selectedThread()!.comments; track comment.id) {
                <div class="reply-card">
                  <div class="reply-header">
                    <div class="reply-author-info">
                      <strong>{{ comment.author.full_name }}</strong>
                      <span class="reply-inst">({{ comment.author.institution_name }})</span>
                    </div>
                    <span class="reply-time">{{ comment.created_at | date:'d MMM yyyy, h:mm a' }}</span>
                  </div>
                  <div class="reply-content">
                    <p>{{ comment.content_markdown }}</p>
                  </div>
                </div>
              } @empty {
                <div class="no-replies-notice">
                  <span>Aún no hay réplicas en este hilo. Sé el primero en aportar evidencia o retroalimentación.</span>
                </div>
              }
            </div>

            <!-- Formulario para Agregar Réplica Técnica con Opción de Voz -->
            <div class="new-reply-form">
              <div class="reply-header-row">
                <h4>Aportar Réplica o Evidencia Metodológica</h4>
                <app-voice-input-btn
                  [tooltip]="'Dictar réplica técnica con voz'"
                  (textTranscribed)="onVoiceReply($event)"
                />
              </div>
              <textarea
                [(ngModel)]="newReplyContent"
                rows="4"
                placeholder="Escribe o dicta tus observaciones técnicas, resultados complementarios o acuerdos metodológicos..."
              ></textarea>
              <div class="reply-actions">
                <button
                  class="btn-submit-reply"
                  (click)="submitReply()"
                  [disabled]="!newReplyContent.trim() || isSubmittingReply"
                >
                  {{ isSubmittingReply ? 'Publicando...' : 'Publicar Réplica Técnica' }}
                </button>
              </div>
            </div>
          </section>
        </article>
      }
    </div>
  `,
  styles: [`
    .discussions-container {
      max-width: 1200px;
      margin: 0 auto;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #0f172a;
    }

    /* 1. Cabecera del Foro */
    .forum-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 20px 24px;
      margin-bottom: 18px;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
    }

    .header-titles h2 {
      margin: 0;
      font-size: 1.35rem;
      font-weight: 700;
      color: #0f172a;
    }

    .header-titles p {
      margin: 4px 0 0;
      font-size: 0.88rem;
      color: #64748b;
    }

    .btn-new-thread {
      background: #1e3a8a;
      color: #ffffff;
      border: none;
      padding: 10px 18px;
      border-radius: 6px;
      font-size: 0.88rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
    }

    .btn-new-thread:hover {
      background: #1d4ed8;
    }

    /* Formulario Desplegable para Nueva Discusión */
    .new-thread-panel {
      background: #ffffff;
      border: 1px solid #bfdbfe;
      border-radius: 10px;
      padding: 22px;
      margin-bottom: 20px;
      box-shadow: 0 4px 12px rgba(30, 58, 138, 0.06);
    }

    .panel-header h4 {
      margin: 0;
      font-size: 1.1rem;
      color: #1e3a8a;
      font-weight: 700;
    }

    .panel-header p {
      margin: 4px 0 16px;
      font-size: 0.85rem;
      color: #64748b;
    }

    .form-grid {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .form-group label {
      display: block;
      font-size: 0.82rem;
      font-weight: 600;
      color: #334155;
      margin-bottom: 6px;
    }

    .form-group input, .form-group select, .form-group textarea {
      width: 100%;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 10px 14px;
      font-size: 0.88rem;
      color: #0f172a;
      box-sizing: border-box;
      outline: none;
    }

    .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
      border-color: #1e3a8a;
      background: #ffffff;
    }

    .form-row-selectors {
      display: flex;
      gap: 16px;
    }

    .flex-1 {
      flex: 1;
    }

    .form-actions-row {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 6px;
    }

    .btn-secondary {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      color: #475569;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 0.85rem;
      cursor: pointer;
    }

    .btn-primary {
      background: #1e3a8a;
      color: #ffffff;
      border: none;
      padding: 8px 18px;
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-primary:hover:not(:disabled) {
      background: #1d4ed8;
    }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Barra de Herramientas Estilo GitHub Discussions */
    .forum-toolbar {
      display: flex;
      align-items: center;
      gap: 14px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 16px;
      margin-bottom: 14px;
      flex-wrap: wrap;
    }

    .search-field {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 6px 12px;
      flex: 1;
      min-width: 240px;
    }

    .search-field input {
      border: none;
      background: transparent;
      font-size: 0.85rem;
      color: #0f172a;
      outline: none;
      width: 100%;
    }

    .toolbar-control {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.82rem;
      color: #475569;
    }

    .toolbar-control select {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 6px 10px;
      font-size: 0.82rem;
      color: #0f172a;
    }

    .toolbar-tabs {
      display: flex;
      gap: 4px;
      background: #f1f5f9;
      border-radius: 6px;
      padding: 3px;
    }

    .toolbar-tab {
      background: transparent;
      border: none;
      padding: 5px 12px;
      border-radius: 4px;
      font-size: 0.8rem;
      color: #64748b;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.15s;
    }

    .toolbar-tab.active {
      background: #ffffff;
      color: #0f172a;
      font-weight: 600;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
    }

    /* Tabla de Hilos de Discusión */
    .threads-list-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
    }

    .threads-list-header {
      display: grid;
      grid-template-columns: 1fr 220px 80px 130px;
      gap: 16px;
      padding: 10px 18px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      font-size: 0.78rem;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .threads-rows {
      display: flex;
      flex-direction: column;
    }

    .thread-row {
      display: grid;
      grid-template-columns: 1fr 220px 80px 130px;
      gap: 16px;
      padding: 16px 18px;
      border-bottom: 1px solid #f1f5f9;
      cursor: pointer;
      align-items: center;
      transition: background 0.15s;
    }

    .thread-row:last-child {
      border-bottom: none;
    }

    .thread-row:hover {
      background: #f8fafc;
    }

    .thread-title-line {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 4px;
    }

    .category-tag {
      font-size: 0.7rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }

    .category-tag.advance {
      background: #dbeafe;
      color: #1e40af;
    }

    .category-tag.question {
      background: #fef3c7;
      color: #92400e;
    }

    .category-tag.announcement {
      background: #ecfdf5;
      color: #065f46;
    }

    .thread-title {
      margin: 0;
      font-size: 0.95rem;
      font-weight: 600;
      color: #0f172a;
      line-height: 1.35;
    }

    .thread-row:hover .thread-title {
      color: #1e3a8a;
      text-decoration: underline;
    }

    .thread-preview {
      margin: 4px 0 6px;
      font-size: 0.82rem;
      color: #475569;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .thread-meta-row {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.76rem;
      color: #64748b;
    }

    .meta-author strong {
      color: #334155;
    }

    .meta-inst {
      color: #64748b;
      margin-left: 3px;
    }

    .meta-dot {
      color: #94a3b8;
    }

    .space-badge {
      display: inline-block;
      font-size: 0.76rem;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      color: #334155;
      padding: 3px 8px;
      border-radius: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 200px;
    }

    .replies-counter {
      font-size: 0.8rem;
      font-weight: 600;
      color: #64748b;
    }

    .replies-counter.has-replies {
      color: #1e3a8a;
    }

    .col-date {
      display: flex;
      flex-direction: column;
      font-size: 0.78rem;
      color: #334155;
    }

    .time-sub {
      color: #94a3b8;
      font-size: 0.7rem;
    }

    .empty-threads-state {
      padding: 50px 20px;
      text-align: center;
      color: #64748b;
    }

    .empty-icon {
      font-size: 40px;
      display: block;
      margin-bottom: 8px;
    }

    /* 2. VISTA DE DETALLE DEL HILO CIENTÍFICO */
    .thread-detail-container {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .detail-navigation-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .btn-back {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #1e3a8a;
      padding: 8px 14px;
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }

    .btn-back:hover {
      background: #eff6ff;
      border-color: #93c5fd;
    }

    .detail-space-badge {
      font-size: 0.8rem;
      background: #eff6ff;
      color: #1e3a8a;
      border: 1px solid #bfdbfe;
      padding: 4px 10px;
      border-radius: 4px;
      font-weight: 600;
    }

    .thread-document-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 28px 32px;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
    }

    .thread-doc-header {
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 18px;
      margin-bottom: 20px;
    }

    .doc-meta-top {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }

    .doc-date {
      font-size: 0.78rem;
      color: #64748b;
    }

    .doc-title {
      margin: 6px 0 16px;
      font-size: 1.45rem;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.3;
    }

    .author-profile-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 16px;
    }

    .author-details-box strong {
      display: block;
      font-size: 0.9rem;
      color: #0f172a;
    }

    .author-academic {
      font-size: 0.76rem;
      color: #64748b;
    }

    .btn-direct-chat {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #1e3a8a;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-direct-chat:hover {
      background: #eff6ff;
      border-color: #93c5fd;
    }

    .thread-doc-body {
      font-size: 0.95rem;
      line-height: 1.7;
      color: #1e293b;
      margin-bottom: 24px;
    }

    .doc-markdown-content {
      white-space: pre-wrap;
      word-break: break-word;
    }

    .scientific-validation-bar {
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      padding-top: 14px;
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .validation-title {
      font-size: 0.8rem;
      font-weight: 700;
      color: #475569;
    }

    .endorsements-pills {
      display: flex;
      gap: 8px;
    }

    .endorsement-chip {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 0.76rem;
      color: #334155;
      font-weight: 500;
    }

    /* Réplicas y Revisión por Pares */
    .replies-section {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 24px;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
    }

    .replies-header h3 {
      margin: 0;
      font-size: 1.1rem;
      color: #0f172a;
    }

    .replies-header p {
      margin: 4px 0 16px;
      font-size: 0.82rem;
      color: #64748b;
    }

    .replies-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 24px;
    }

    .reply-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px 18px;
    }

    .reply-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .reply-author-info strong {
      font-size: 0.85rem;
      color: #0f172a;
    }

    .reply-inst {
      font-size: 0.78rem;
      color: #64748b;
      margin-left: 4px;
    }

    .reply-time {
      font-size: 0.74rem;
      color: #94a3b8;
    }

    .reply-content p {
      margin: 0;
      font-size: 0.88rem;
      color: #334155;
      line-height: 1.5;
    }

    .no-replies-notice {
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: 6px;
      padding: 18px;
      text-align: center;
      color: #64748b;
      font-size: 0.85rem;
    }

    .new-reply-form {
      border-top: 1px solid #e2e8f0;
      padding-top: 18px;
    }

    .new-reply-form h4 {
      margin: 0 0 10px;
      font-size: 0.95rem;
      color: #0f172a;
    }

    .new-reply-form textarea {
      width: 100%;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 10px 14px;
      font-size: 0.88rem;
      color: #0f172a;
      box-sizing: border-box;
      outline: none;
    }

    .new-reply-form textarea:focus {
      border-color: #1e3a8a;
      background: #ffffff;
    }

    .field-label-row,
    .reply-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 6px;
    }

    .reply-header-row h4 {
      margin: 0;
    }

    .reply-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 10px;
    }

    .btn-submit-reply {
      background: #1e3a8a;
      color: #ffffff;
      border: none;
      padding: 8px 18px;
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-submit-reply:hover:not(:disabled) {
      background: #1d4ed8;
    }

    .btn-submit-reply:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `]
})
export class StreamFeedComponent implements OnInit {
  feedService = inject(FeedService);
  chatDockService = inject(ChatDockService);
  authService = inject(AuthService);

  spaces = signal<SpaceItem[]>([]);
  posts = signal<PostItem[]>([]);
  selectedSpaceId = signal<string>('all');
  selectedCategoryFilter: DiscussionFilter = 'ALL';
  searchKeyword = '';

  // Vista de detalle de hilo
  selectedThread = signal<PostItem | null>(null);

  // Formulario nuevo hilo técnico
  isNewThreadOpen = signal<boolean>(false);
  newPostTitle = '';
  newPostContent = '';
  selectedPostType: 'ADVANCE' | 'QUESTION' | 'ANNOUNCEMENT' = 'ADVANCE';
  targetSpaceId = 'space-general';
  isPublishing = signal<boolean>(false);

  // Formulario de réplica en hilo
  newReplyContent = '';
  isSubmittingReply = false;

  onVoiceNewPostTitle(text: string): void {
    if (this.newPostTitle.trim()) {
      this.newPostTitle += ' ' + text;
    } else {
      this.newPostTitle = text;
    }
  }

  onVoiceNewPostContent(text: string): void {
    if (this.newPostContent.trim()) {
      this.newPostContent += ' ' + text;
    } else {
      this.newPostContent = text;
    }
  }

  onVoiceSearch(text: string): void {
    this.searchKeyword = text;
  }

  onVoiceReply(text: string): void {
    if (this.newReplyContent.trim()) {
      this.newReplyContent += ' ' + text;
    } else {
      this.newReplyContent = text;
    }
  }

  ngOnInit() {
    this.loadSpaces();
    this.loadFeed();
  }

  loadSpaces() {
    this.feedService.getSpaces().subscribe({
      next: (data) => this.spaces.set(data),
      error: () => {}
    });
  }

  loadFeed() {
    this.feedService.getFeed(this.selectedSpaceId()).subscribe({
      next: (data) => this.posts.set(data),
      error: () => {}
    });
  }

  changeSpace(spaceId: string) {
    this.selectedSpaceId.set(spaceId);
    this.targetSpaceId = spaceId === 'all' ? 'space-general' : spaceId;
    this.loadFeed();
  }

  filteredThreads(): PostItem[] {
    let list = this.posts();

    // Filtro por categoría
    if (this.selectedCategoryFilter !== 'ALL') {
      list = list.filter(p => p.post_type === this.selectedCategoryFilter);
    }

    // Filtro por búsqueda
    if (this.searchKeyword.trim()) {
      const q = this.searchKeyword.toLowerCase();
      list = list.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.content_markdown.toLowerCase().includes(q) ||
        p.author.full_name.toLowerCase().includes(q) ||
        (p.author.institution_name || '').toLowerCase().includes(q)
      );
    }

    return list;
  }

  openThread(thread: PostItem): void {
    this.selectedThread.set(thread);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  closeThread(): void {
    this.selectedThread.set(null);
  }

  getPreviewText(markdown: string): string {
    return markdown ? markdown.replace(/[#*`_]/g, '').trim() : '';
  }

  getCategoryBadge(type: string): string {
    const map: Record<string, string> = {
      ADVANCE: '📌 Avance Experimental',
      QUESTION: '❓ Consulta Técnica',
      ANNOUNCEMENT: '📢 Convocatoria'
    };
    return map[type] || 'Discusión';
  }

  publishPost() {
    if (!this.newPostTitle.trim() || !this.newPostContent.trim()) return;

    this.isPublishing.set(true);
    this.feedService.createPost({
      space_id: this.targetSpaceId,
      title: this.newPostTitle,
      content_markdown: this.newPostContent,
      post_type: this.selectedPostType
    }).subscribe({
      next: (createdPost) => {
        this.posts.update(list => [createdPost, ...list]);
        this.newPostTitle = '';
        this.newPostContent = '';
        this.isPublishing.set(false);
        this.isNewThreadOpen.set(false);
      },
      error: () => {
        this.isPublishing.set(false);
      }
    });
  }

  submitReply(): void {
    const thread = this.selectedThread();
    if (!thread || !this.newReplyContent.trim()) return;

    this.isSubmittingReply = true;
    const contentToSend = this.newReplyContent.trim();

    this.feedService.addComment(thread.id, contentToSend).subscribe({
      next: (newComment) => {
        this.isSubmittingReply = false;
        const updatedComments = [...(thread.comments || []), newComment];
        const updatedCount = updatedComments.length;

        // Actualización inmutable del hilo activo para reactividad instantánea
        this.selectedThread.set({
          ...thread,
          comments: updatedComments,
          comments_count: updatedCount
        });

        // Actualización en la lista general de posts
        this.posts.update(list => list.map(p => p.id === thread.id ? {
          ...p,
          comments: updatedComments,
          comments_count: updatedCount
        } : p));

        this.newReplyContent = '';
      },
      error: () => {
        this.isSubmittingReply = false;
        // Fallback local con usuario autenticado
        const user = this.authService.currentUser();
        const fallbackComment = {
          id: 'pc-' + Date.now(),
          post_id: thread.id,
          author: {
            id: user?.id || 'u-user',
            full_name: user?.full_name || 'Investigador C3',
            academic_title: user?.academic_title || 'Investigador',
            avatar_url: user?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
            institution_name: user?.institution_name || 'Consorcio C3'
          },
          content_markdown: contentToSend,
          created_at: new Date().toISOString()
        };
        const updatedComments = [...(thread.comments || []), fallbackComment];
        const updatedCount = updatedComments.length;

        this.selectedThread.set({
          ...thread,
          comments: updatedComments,
          comments_count: updatedCount
        });

        this.posts.update(list => list.map(p => p.id === thread.id ? {
          ...p,
          comments: updatedComments,
          comments_count: updatedCount
        } : p));

        this.newReplyContent = '';
      }
    });
  }

  startDirectChatWithAuthor(author: any): void {
    this.chatDockService.openDirectChat({
      id: 'author-' + (author.full_name || 'anon').toLowerCase().replace(/\s+/g, '-'),
      name: author.full_name,
      role: author.academic_title || 'Investigador',
      institution: author.institution_name || 'Consorcio',
      avatarUrl: author.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      isOnline: true
    });
  }
}
