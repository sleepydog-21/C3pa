import { Component, inject, input, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AnnotationService } from '../../core/services/annotation.service';
import { ScientificAnnotation, ThreadComment } from '../../core/models/scientific.models';
import { VoiceInputBtnComponent } from '../../shared/components/voice-input-btn.component';

export type AnnotationFilter = 'ALL' | 'PENDING' | 'RESOLVED';

@Component({
  selector: 'app-pdf-annotator',
  standalone: true,
  imports: [CommonModule, FormsModule, VoiceInputBtnComponent],
  template: `
    <div class="pdf-annotator-container">
      <!-- Barra Superior del Visor -->
      <div class="viewer-topbar">
        <div class="paper-header-meta">
          <span class="badge-pdf">PDF</span>
          <h3>{{ paperTitle() }}</h3>
          <span class="paper-authors-chip">{{ paperAuthors() }}</span>
        </div>
        <div class="topbar-actions">
          <button class="btn-back-library" (click)="onBackToLibrary()">
            ⬅️ Volver a la Biblioteca
          </button>
        </div>
      </div>

      <!-- Área de Trabajo Dividida: Visor de Documento a la Izquierda | Panel de Discusión a la Derecha -->
      <div class="workspace-grid">
        <!-- 1. VISOR DE DOCUMENTO CIENTÍFICO -->
        <div class="document-viewport">
          <!-- Barra de Herramientas del Documento -->
          <div class="doc-controls">
            <span class="page-indicator">Página 1 de 8</span>
            <div class="zoom-controls">
              <button>🔍 -</button>
              <span>100%</span>
              <button>🔍 +</button>
            </div>
            <span class="hint-text">💡 Selecciona cualquier texto para crear una anotación</span>
          </div>

          <!-- Hoja del Artículo Científico -->
          <div class="paper-sheet" (mouseup)="handleTextSelection($event)">
            <div class="paper-header-block">
              <span class="journal-name">Journal of Advanced Biomaterials Research • Vol. 14, 2026</span>
              <h1 class="sheet-title">{{ paperTitle() }}</h1>
              <div class="sheet-authors">{{ paperAuthors() }} — Consorcio Interinstitucional</div>
              <div class="sheet-doi">DOI: 10.1016/j.biomaterials.2026.119842</div>
            </div>

            <div class="sheet-section">
              <h4>Abstract</h4>
              <p>
                Bacterial nanocellulose (BNC) presents exceptional mechanical properties and biocompatibility.
                In this work, we developed a modified surface functionalization protocol to enhance antibiotic loading
                without compromising structural integrity.
              </p>
            </div>

            <div class="sheet-section">
              <h4>1. Materiales y Métodos</h4>
              <p>
                La síntesis se llevó a cabo utilizando la cepa <em>Komagataeibacter xylinus</em> cultivada en medio HS estándar.
                <span
                  class="annotated-highlight"
                  [class.resolved]="isAnnotationResolved('ann-pdf-1')"
                  [class.active]="selectedAnnotation()?.id === 'ann-pdf-1'"
                  (click)="selectAnnotationById('ann-pdf-1')"
                  title="Haz clic para ver la discusión sobre este fragmento"
                >
                  La velocidad de agitación se mantuvo estrictamente en 250 rpm para asegurar la homogeneidad sin inducir cizallamiento celular excesivo.
                  @if (isAnnotationResolved('ann-pdf-1')) {
                    <span class="badge-inline-resolved">✓ Resuelto</span>
                  }
                </span>
                Las membranas cosechadas fueron sometidas a lavado con NaOH al 0.1M para eliminar residuos celulares.
              </p>

              <p>
                <span
                  class="annotated-highlight"
                  [class.resolved]="isAnnotationResolved('ann-pdf-2')"
                  [class.active]="selectedAnnotation()?.id === 'ann-pdf-2'"
                  (click)="selectAnnotationById('ann-pdf-2')"
                  title="Haz clic para ver la discusión sobre este fragmento"
                >
                  El tiempo de elución del antibiótico demostró una liberación bifásica durante las primeras 72 horas.
                  @if (isAnnotationResolved('ann-pdf-2')) {
                    <span class="badge-inline-resolved">✓ Resuelto</span>
                  }
                </span>
                Posteriormente se determinó la concentración mediante espectrofotometría UV-Vis a 274 nm.
              </p>
            </div>

            <!-- Botón flotante para anotar cuando el usuario selecciona texto -->
            @if (floatingButtonVisible()) {
              <button
                class="btn-floating-annotate"
                [style.left.px]="floatingButtonX()"
                [style.top.px]="floatingButtonY()"
                (click)="openNewAnnotationPrompt()"
              >
                💬 Anotar fragmento seleccionado
              </button>
            }
          </div>
        </div>

        <!-- 2. PANEL LATERAL DE ANOTACIONES Y DISCUSIÓN ANIDADA -->
        <div class="annotations-sidebar">
          <div class="sidebar-header">
            <h4>💬 Discusiones y Acuerdos</h4>
            <div class="filter-pills">
              <button
                [class.active]="statusFilter() === 'ALL'"
                (click)="statusFilter.set('ALL')"
              >
                Todas ({{ annotations().length }})
              </button>
              <button
                [class.active]="statusFilter() === 'PENDING'"
                (click)="statusFilter.set('PENDING')"
              >
                ⏳ Pendientes ({{ pendingCount() }})
              </button>
              <button
                [class.active]="statusFilter() === 'RESOLVED'"
                (click)="statusFilter.set('RESOLVED')"
              >
                ✓ Resueltas ({{ resolvedCount() }})
              </button>
            </div>
          </div>

          <!-- Formulario para Crear Nueva Anotación si hay texto seleccionado -->
          @if (isCreatingNew()) {
            <div class="new-annotation-card">
              <div class="card-header">
                <span class="tag-new">Nueva Anotación</span>
                <div class="header-right-tools">
                  <app-voice-input-btn
                    [tooltip]="'Dictar anotación por voz con Whisper'"
                    (textTranscribed)="onVoiceNewAnnotation($event)"
                  />
                  <button class="btn-close" (click)="isCreatingNew.set(false)">✕</button>
                </div>
              </div>
              <blockquote class="selected-text-preview">"{{ selectedSnippetText }}"</blockquote>
              <textarea
                [(ngModel)]="newAnnotationContent"
                placeholder="Escribe o dicta tu observación o pregunta para el consorcio..."
                rows="3"
              ></textarea>
              <div class="card-actions">
                <button class="btn-save" (click)="saveNewAnnotation()">Publicar Anotación</button>
              </div>
            </div>
          }

          <!-- Lista de Tarjetas de Anotación -->
          <div class="annotations-scroll-list">
            @for (ann of filteredAnnotations(); track ann.id) {
              <div
                class="annotation-thread-card"
                [class.selected]="selectedAnnotation()?.id === ann.id"
                [class.is-resolved]="ann.isResolved"
              >
                <!-- Encabezado de la Anotación -->
                <div class="thread-top">
                  <div class="author-block">
                    <img
                      [src]="ann.author.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'"
                      class="author-avatar"
                      alt="{{ ann.author.fullName }}"
                    />
                    <div class="author-info">
                      <span class="author-name">{{ ann.author.fullName }}</span>
                      <small class="ann-date">{{ ann.createdAt | date:'short' }}</small>
                    </div>
                  </div>

                  <!-- Botón Símbolo de Resuelto -->
                  <div class="resolve-control">
                    @if (ann.isResolved) {
                      <button
                        class="btn-resolved-status resolved"
                        (click)="toggleResolve(ann)"
                        title="Clic para reabrir esta duda"
                      >
                        ✓ Resuelto
                      </button>
                    } @else {
                      <button
                        class="btn-resolved-status pending"
                        (click)="toggleResolve(ann)"
                        title="Marcar como duda consensuada y resuelta"
                      >
                        Marcar Resuelto
                      </button>
                    }
                  </div>
                </div>

                <!-- Fragmento citado -->
                @if (ann.highlightedText) {
                  <blockquote class="quoted-highlight">
                    "{{ ann.highlightedText }}"
                  </blockquote>
                }

                <!-- Observación principal -->
                <p class="thread-note-content">{{ ann.noteContent }}</p>

                @if (ann.isResolved && ann.resolvedBy) {
                  <div class="resolved-by-notice">
                    ✓ Resuelto por <strong>{{ ann.resolvedBy.fullName }}</strong> el {{ ann.resolvedAt | date:'mediumDate' }}
                  </div>
                }

                <!-- Hilo de Respuestas Anidadas -->
                @if (ann.comments && ann.comments.length > 0) {
                  <div class="nested-comments-list">
                    @for (comment of ann.comments; track comment.id) {
                      <div class="comment-item">
                        <div class="comment-header">
                          <img [src]="comment.author.avatarUrl || 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80'" class="mini-avatar" />
                          <span class="comment-author">{{ comment.author.fullName }}</span>
                          <span class="comment-time">{{ comment.createdAt | date:'shortTime' }}</span>
                        </div>
                        <p class="comment-body">{{ comment.content }}</p>

                        <!-- Botón responder a este comentario -->
                        <button
                          class="btn-reply-to"
                          (click)="setReplyingTo(ann.id, comment.id, comment.author.fullName)"
                        >
                          ↩️ Responder
                        </button>

                        <!-- Respuestas de segundo nivel (anidadas) -->
                        @if (comment.replies && comment.replies.length > 0) {
                          <div class="second-level-replies">
                            @for (sub of comment.replies; track sub.id) {
                              <div class="sub-comment-item">
                                <div class="comment-header">
                                  <img [src]="sub.author.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'" class="mini-avatar" />
                                  <span class="comment-author">{{ sub.author.fullName }}</span>
                                  <span class="comment-time">{{ sub.createdAt | date:'shortTime' }}</span>
                                </div>
                                <p class="comment-body">{{ sub.content }}</p>
                              </div>
                            }
                          </div>
                        }
                      </div>
                    }
                  </div>
                }

                <!-- Input para responder en esta anotación -->
                <div class="reply-input-box">
                  @if (replyingToCommentId() && replyingToAnnId() === ann.id) {
                    <div class="replying-banner">
                      <span>Respondiendo a <strong>{{ replyingToAuthorName() }}</strong></span>
                      <button (click)="cancelReply()">✕</button>
                    </div>
                  }
                  <div class="input-action-row">
                    <input
                      type="text"
                      [(ngModel)]="activeReplyText[ann.id]"
                      (keyup.enter)="submitReply(ann.id)"
                      placeholder="Escribe o dicta una respuesta o acuerdo..."
                    />
                    <app-voice-input-btn
                      [compact]="true"
                      [tooltip]="'Dictar respuesta por voz con Whisper'"
                      (textTranscribed)="onVoiceReply(ann.id, $event)"
                    />
                    <button
                      class="btn-send-reply"
                      (click)="submitReply(ann.id)"
                      [disabled]="!activeReplyText[ann.id]"
                    >
                      Enviar
                    </button>
                  </div>
                </div>
              </div>
            } @empty {
              <div class="empty-threads">
                No hay anotaciones con el filtro seleccionado.
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .pdf-annotator-container {
      display: flex;
      flex-direction: column;
      height: calc(100vh - 120px);
      background: #090d16;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #f1f5f9;
      gap: 12px;
    }
    .viewer-topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #ffffff;
      padding: 12px 20px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
    }
    .paper-header-meta {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .badge-pdf {
      background: #dc2626;
      color: #fff;
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 4px;
      font-weight: 700;
    }
    .paper-header-meta h3 {
      margin: 0;
      font-size: 16px;
      color: #0f172a;
    }
    .paper-authors-chip {
      font-size: 12px;
      color: #64748b;
      border-left: 1px solid #cbd5e1;
      padding-left: 10px;
    }
    .btn-back-library {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      color: #334155;
      padding: 8px 14px;
      border-radius: 6px;
      font-size: 13px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.15s;
    }
    .btn-back-library:hover {
      background: #eff6ff;
      color: #1e40af;
      border-color: #93c5fd;
    }
    .workspace-grid {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      gap: 16px;
      flex: 1;
      min-height: 0;
    }
    /* Estilos del Documento Científico */
    .document-viewport {
      background: #f1f5f9;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .doc-controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 16px;
      background: #ffffff;
      border-bottom: 1px solid #e2e8f0;
      font-size: 12px;
      color: #64748b;
    }
    .zoom-controls button {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      color: #334155;
      padding: 2px 8px;
      border-radius: 4px;
      cursor: pointer;
    }
    .zoom-controls button:hover {
      background: #eff6ff;
      color: #1e40af;
    }
    .paper-sheet {
      position: relative;
      flex: 1;
      overflow-y: auto;
      padding: 36px 44px;
      background: #ffffff;
      color: #1e293b;
      box-shadow: 0 1px 4px rgba(15, 23, 42, 0.08);
      line-height: 1.6;
    }
    .paper-header-block {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 14px;
      margin-bottom: 20px;
    }
    .journal-name {
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .sheet-title {
      font-size: 20px;
      font-weight: 700;
      margin: 6px 0;
      color: #0f172a;
    }
    .sheet-authors {
      font-size: 13px;
      color: #475569;
      font-weight: 500;
    }
    .sheet-doi {
      font-size: 11px;
      color: #94a3b8;
      font-family: monospace;
    }
    .sheet-section h4 {
      margin: 16px 0 6px 0;
      font-size: 15px;
      color: #0f172a;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
    }
    .sheet-section p {
      margin: 0 0 12px 0;
      font-size: 14px;
      text-align: justify;
    }
    .annotated-highlight {
      background: rgba(254, 240, 138, 0.7);
      border-bottom: 2px solid #eab308;
      padding: 2px 2px;
      border-radius: 2px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .annotated-highlight:hover, .annotated-highlight.active {
      background: rgba(253, 224, 71, 0.95);
    }
    .annotated-highlight.resolved {
      background: rgba(187, 247, 208, 0.7);
      border-bottom-color: #22c55e;
    }
    .badge-inline-resolved {
      font-size: 10px;
      background: #059669;
      color: #fff;
      padding: 1px 4px;
      border-radius: 3px;
      font-weight: 600;
      margin-left: 4px;
    }
    .btn-floating-annotate {
      position: absolute;
      background: #1e40af;
      color: #fff;
      border: none;
      padding: 8px 14px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.2);
      z-index: 50;
      animation: fadeIn 0.2s;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }
    /* Estilos del Panel Lateral de Discusión */
    .annotations-sidebar {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
    }
    .sidebar-header {
      padding: 14px 18px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .sidebar-header h4 {
      margin: 0;
      color: #1e40af;
      font-size: 16px;
      font-weight: 700;
    }
    .filter-pills {
      display: flex;
      gap: 6px;
    }
    .filter-pills button {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #64748b;
      padding: 4px 10px;
      border-radius: 14px;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .filter-pills button.active {
      background: #1e40af;
      color: #ffffff;
      border-color: #1e40af;
      font-weight: 600;
    }
    .annotations-scroll-list {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      background: #f8fafc;
    }
    .annotation-thread-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
      transition: border-color 0.2s;
    }
    .annotation-thread-card.selected {
      border-color: #1e40af;
      box-shadow: 0 0 0 2px rgba(30, 64, 175, 0.15);
    }
    .annotation-thread-card.is-resolved {
      border-left: 4px solid #059669;
    }
    .thread-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .author-block {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .author-avatar {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      object-fit: cover;
    }
    .author-name {
      font-size: 13px;
      font-weight: 600;
      color: #0f172a;
      display: block;
    }
    .ann-date {
      font-size: 10px;
      color: #64748b;
    }
    .btn-resolved-status {
      border: none;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-resolved-status.resolved {
      background: #ecfdf5;
      color: #059669;
      border: 1px solid #10b981;
    }
    .btn-resolved-status.pending {
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #cbd5e1;
    }
    .btn-resolved-status.pending:hover {
      background: #ecfdf5;
      color: #059669;
      border-color: #10b981;
    }
    .quoted-highlight {
      margin: 0;
      background: #fef9c3;
      border-left: 3px solid #eab308;
      padding: 6px 10px;
      font-size: 12px;
      color: #854d0e;
      font-style: italic;
      border-radius: 0 4px 4px 0;
    }
    .thread-note-content {
      margin: 0;
      font-size: 13px;
      color: #334155;
      line-height: 1.4;
    }
    .resolved-by-notice {
      background: #ecfdf5;
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 11px;
      color: #065f46;
    }
    .nested-comments-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding-left: 12px;
      border-left: 2px solid #cbd5e1;
      margin-top: 6px;
    }
    .comment-item {
      background: #f8fafc;
      padding: 8px 10px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .comment-header {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .mini-avatar {
      width: 18px;
      height: 18px;
      border-radius: 50%;
    }
    .comment-author {
      font-size: 12px;
      font-weight: 600;
      color: #0f172a;
    }
    .comment-time {
      font-size: 10px;
      color: #64748b;
      margin-left: auto;
    }
    .comment-body {
      margin: 0;
      font-size: 12px;
      color: #475569;
      line-height: 1.35;
    }
    .btn-reply-to {
      background: transparent;
      border: none;
      color: #1e40af;
      font-size: 10px;
      cursor: pointer;
      align-self: flex-start;
      padding: 0;
      margin-top: 2px;
      font-weight: 600;
    }
    .second-level-replies {
      margin-top: 6px;
      padding-left: 10px;
      border-left: 1px dashed #cbd5e1;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .sub-comment-item {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      padding: 6px 8px;
      border-radius: 4px;
    }
    .reply-input-box {
      margin-top: 4px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .replying-banner {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #1e40af;
      background: #eff6ff;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .replying-banner button {
      background: transparent;
      border: none;
      color: #dc2626;
      cursor: pointer;
    }
    .input-action-row {
      display: flex;
      gap: 8px;
    }
    .input-action-row input {
      flex: 1;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      padding: 8px 12px;
      border-radius: 6px;
      color: #0f172a;
      font-size: 12px;
      outline: none;
    }
    .input-action-row input:focus {
      border-color: #1e40af;
      background: #ffffff;
    }
    .btn-send-reply {
      background: #1e40af;
      color: #fff;
      border: none;
      padding: 8px 14px;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
      font-weight: 600;
    }
    .btn-send-reply:hover:not(:disabled) {
      background: #1d4ed8;
    }
    .btn-send-reply:disabled {
      opacity: 0.5;
    }
    .new-annotation-card {
      background: #f8fafc;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      padding: 12px;
      margin: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .new-annotation-card .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header-right-tools {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .tag-new {
      font-size: 11px;
      color: #1e40af;
      font-weight: 700;
    }
    .btn-close {
      background: transparent;
      border: none;
      color: #64748b;
      cursor: pointer;
    }
    .selected-text-preview {
      margin: 0;
      font-size: 11px;
      color: #854d0e;
      background: #fef9c3;
      padding: 4px 6px;
      border-radius: 4px;
    }
    .new-annotation-card textarea {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #0f172a;
      padding: 8px;
      border-radius: 6px;
      font-size: 12px;
    }
    .new-annotation-card textarea:focus {
      outline: none;
      border-color: #1e40af;
    }
    .btn-save {
      background: #1e40af;
      color: #fff;
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      align-self: flex-end;
    }
    .btn-save:hover {
      background: #1d4ed8;
    }
    .empty-threads {
      padding: 30px;
      text-align: center;
      color: #64748b;
      font-size: 13px;
    }
  `]
})
export class PdfAnnotatorComponent implements OnInit {
  annotationService = inject(AnnotationService);

  paperId = input<string>('paper-1');
  paperTitle = input<string>('Síntesis y Caracterización de Nanocelulosa Bacteriana Modificada');
  paperAuthors = input<string>('C. Méndez, E. Ramos, F. Soto (2026)');

  statusFilter = signal<AnnotationFilter>('ALL');
  annotations = signal<ScientificAnnotation[]>([]);
  selectedAnnotation = signal<ScientificAnnotation | null>(null);

  // Botón flotante para selección de texto
  floatingButtonVisible = signal<boolean>(false);
  floatingButtonX = signal<number>(0);
  floatingButtonY = signal<number>(0);
  selectedSnippetText = '';

  // Formulario nueva anotación
  isCreatingNew = signal<boolean>(false);
  newAnnotationContent = '';

  onVoiceNewAnnotation(text: string): void {
    if (this.newAnnotationContent.trim()) {
      this.newAnnotationContent += ' ' + text;
    } else {
      this.newAnnotationContent = text;
    }
  }

  // Respuestas activas por anotación
  activeReplyText: Record<string, string> = {};
  replyingToAnnId = signal<string | null>(null);
  replyingToCommentId = signal<string | null>(null);
  replyingToAuthorName = signal<string | null>(null);

  onVoiceReply(annId: string, text: string): void {
    const prev = this.activeReplyText[annId] || '';
    if (prev.trim()) {
      this.activeReplyText[annId] = prev + ' ' + text;
    } else {
      this.activeReplyText[annId] = text;
    }
  }

  ngOnInit() {
    this.loadAnnotations();
  }

  loadAnnotations() {
    this.annotationService.getAnnotationsByResource(this.paperId()).subscribe({
      next: (list) => {
        this.annotations.set(list);
      },
      error: () => {}
    });
  }

  pendingCount = computed(() => this.annotations().filter(a => !a.isResolved).length);
  resolvedCount = computed(() => this.annotations().filter(a => a.isResolved).length);

  filteredAnnotations = computed(() => {
    const list = this.annotations();
    if (this.statusFilter() === 'PENDING') return list.filter(a => !a.isResolved);
    if (this.statusFilter() === 'RESOLVED') return list.filter(a => a.isResolved);
    return list;
  });

  isAnnotationResolved(id: string): boolean {
    const found = this.annotations().find(a => a.id === id);
    return !!found?.isResolved;
  }

  selectAnnotationById(id: string) {
    const found = this.annotations().find(a => a.id === id);
    if (found) {
      this.selectedAnnotation.set(found);
    }
  }

  handleTextSelection(event: MouseEvent) {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (text && text.length > 5) {
      const sheet = (event.currentTarget as HTMLElement).getBoundingClientRect();
      this.selectedSnippetText = text;
      this.floatingButtonX.set(event.clientX - sheet.left);
      this.floatingButtonY.set(event.clientY - sheet.top - 35);
      this.floatingButtonVisible.set(true);
    } else {
      this.floatingButtonVisible.set(false);
    }
  }

  openNewAnnotationPrompt() {
    this.floatingButtonVisible.set(false);
    this.isCreatingNew.set(true);
  }

  saveNewAnnotation() {
    if (!this.newAnnotationContent.trim()) return;

    this.annotationService.createAnnotation({
      resource_id: this.paperId(),
      target_type: 'PDF_SELECTION',
      coordinates: { page: 1 },
      highlighted_text: this.selectedSnippetText,
      note_content: this.newAnnotationContent
    }).subscribe({
      next: (created) => {
        this.annotations.update(prev => [created, ...prev]);
        this.selectedAnnotation.set(created);
        this.isCreatingNew.set(false);
        this.newAnnotationContent = '';
        this.selectedSnippetText = '';
      }
    });
  }

  toggleResolve(ann: ScientificAnnotation) {
    this.annotationService.toggleResolveStatus(ann.id).subscribe({
      next: (updated) => {
        this.annotations.update(list => list.map(a => a.id === updated.id ? updated : a));
        if (this.selectedAnnotation()?.id === updated.id) {
          this.selectedAnnotation.set(updated);
        }
      }
    });
  }

  setReplyingTo(annId: string, commentId: string, authorName: string) {
    this.replyingToAnnId.set(annId);
    this.replyingToCommentId.set(commentId);
    this.replyingToAuthorName.set(authorName);
  }

  cancelReply() {
    this.replyingToAnnId.set(null);
    this.replyingToCommentId.set(null);
    this.replyingToAuthorName.set(null);
  }

  submitReply(annId: string) {
    const content = this.activeReplyText[annId]?.trim();
    if (!content) return;

    const parentId = this.replyingToAnnId() === annId ? this.replyingToCommentId() || undefined : undefined;

    this.annotationService.addComment(annId, content, parentId).subscribe({
      next: () => {
        this.activeReplyText[annId] = '';
        this.cancelReply();
        this.loadAnnotations();
      }
    });
  }

  onBackToLibrary() {
    // Señal o evento para volver a la biblioteca
    const appEl = document.querySelector('app-root') as any;
    if (appEl && window) {
      window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: 'library' }));
    }
  }
}
