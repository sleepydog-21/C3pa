import { Component, inject, input, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AnnotationService } from '../../core/services/annotation.service';
import { ResourceService } from '../../core/services/resource.service';
import { ScientificAnnotation } from '../../core/models/scientific.models';
import { VoiceInputBtnComponent } from '../../shared/components/voice-input-btn.component';
import { PdfCanvasViewerComponent } from '../../shared/components/pdf-canvas-viewer.component';

export type AnnotationFilter = 'ALL' | 'PENDING' | 'RESOLVED';
export type ViewerDisplayMode = 'STRUCTURED_FULL' | 'NATIVE_PDF';

export interface ArticleSection {
  id: string;
  sectionNumber?: string;
  title: string;
  paragraphs: string[];
}

export interface FullScientificPaper {
  id: string;
  journal: string;
  title: string;
  authors: string;
  doi: string;
  totalPages: number;
  keywords: string[];
  abstract: string;
  sections: ArticleSection[];
  tableData?: {
    caption: string;
    headers: string[];
    rows: string[][];
  };
  references: string[];
}

@Component({
  selector: 'app-pdf-annotator',
  standalone: true,
  imports: [CommonModule, FormsModule, VoiceInputBtnComponent, PdfCanvasViewerComponent],
  template: `
    <div class="pdf-annotator-container">
      <!-- 1. Barra Superior del Visor -->
      <div class="viewer-topbar">
        <div class="paper-header-meta">
          <span class="badge-pdf">PDF</span>
          <div class="meta-titles">
            <h3>{{ activePaper().title }}</h3>
            <div class="meta-subline">
              <span class="paper-authors-chip">{{ activePaper().authors }}</span>
              <span class="paper-doi-chip">DOI: {{ activePaper().doi }}</span>
              <span class="paper-journal-chip">{{ activePaper().journal }}</span>
            </div>
          </div>
        </div>

        <div class="topbar-actions">
          <!-- Selector de Modo de Visualización -->
          <div class="display-mode-selector">
            <button
              class="mode-btn"
              [class.active]="viewerMode() === 'NATIVE_PDF'"
              (click)="viewerMode.set('NATIVE_PDF')"
              title="Visualizador del Documento PDF Original del Artículo"
            >
              📑 PDF Original Completo
            </button>
            <button
              class="mode-btn"
              [class.active]="viewerMode() === 'STRUCTURED_FULL'"
              (click)="viewerMode.set('STRUCTURED_FULL')"
              title="Lectura estructurada en texto con anotaciones interactivas y resaltados"
            >
              📖 Análisis Estructurado & Resumen
            </button>
          </div>

          <a
            [href]="downloadUrl()"
            target="_blank"
            class="btn-download-pdf"
            title="Descargar archivo PDF original a tu equipo"
          >
            ⬇️ Descargar PDF
          </a>

          <button
            class="btn-toggle-sidebar"
            (click)="sidebarCollapsed.set(!sidebarCollapsed())"
            [title]="sidebarCollapsed() ? 'Mostrar panel lateral de discusiones' : 'Maximizar lectura del artículo (ocultar barra lateral)'"
          >
            {{ sidebarCollapsed() ? '💬 Mostrar Discusión' : '↔ Expandir Artículo' }}
          </button>

          <button class="btn-back-library" (click)="onBackToLibrary()">
            ⬅️ Biblioteca
          </button>
        </div>
      </div>

      <!-- 2. Área de Trabajo Dividida: Visor de Documento a la Izquierda | Panel de Discusión a la Derecha -->
      <div class="workspace-grid" [class.sidebar-collapsed]="sidebarCollapsed()">
        <!-- VISOR DE DOCUMENTO CIENTÍFICO (ARTÍCULO COMPLETO) -->
        <div class="document-viewport">
          <!-- Barra de Navegación Rápida entre Secciones del Paper (Solo vista estructurada) -->
          @if (viewerMode() === 'STRUCTURED_FULL') {
            <div class="doc-controls">
              <div class="page-nav-group">
                <button
                  class="btn-page-nav"
                  (click)="prevPage()"
                  [disabled]="currentPage() <= 1"
                  title="Página anterior"
                >
                  ◀
                </button>
                <span class="page-indicator">Página {{ currentPage() }} de {{ activePaper().totalPages }}</span>
                <button
                  class="btn-page-nav"
                  (click)="nextPage()"
                  [disabled]="currentPage() >= activePaper().totalPages"
                  title="Página siguiente"
                >
                  ▶
                </button>
              </div>

              <div class="section-quick-jumps">
                <span class="jump-label">Secciones:</span>
                <button class="jump-btn" (click)="scrollToSection('sec-abstract')">Abstract</button>
                <button class="jump-btn" (click)="scrollToSection('sec-intro')">1. Introducción</button>
                <button class="jump-btn" (click)="scrollToSection('sec-methods')">2. Métodos</button>
                <button class="jump-btn" (click)="scrollToSection('sec-results')">3. Resultados</button>
                <button class="jump-btn" (click)="scrollToSection('sec-table')">Tabla 1</button>
                <button class="jump-btn" (click)="scrollToSection('sec-discussion')">4. Discusión</button>
                <button class="jump-btn" (click)="scrollToSection('sec-conclusions')">5. Conclusiones</button>
                <button class="jump-btn" (click)="scrollToSection('sec-refs')">Referencias</button>
              </div>

              <div class="zoom-controls">
                <button (click)="changeZoom(-10)">🔍 -</button>
                <span>{{ zoomLevel() }}%</span>
                <button (click)="changeZoom(10)">🔍 +</button>
              </div>
            </div>
          }

          <!-- MODO A: LECTURA ESTRUCTURADA DEL ARTÍCULO COMPLETO -->
          @if (viewerMode() === 'STRUCTURED_FULL') {
            <div
              class="paper-sheet"
              [style.zoom.%]="zoomLevel()"
              (mouseup)="handleTextSelection($event)"
              #paperSheet
            >
              <!-- Portada Editorial Científica -->
              <div class="paper-header-block">
                <div class="editorial-top-row">
                  <span class="journal-name">{{ activePaper().journal }}</span>
                  <span class="open-access-pill">🔓 Acceso Abierto Colegiado C3pa</span>
                </div>
                <h1 class="sheet-title">{{ activePaper().title }}</h1>
                <div class="sheet-authors">{{ activePaper().authors }}</div>
                <div class="sheet-metadata-row">
                  <span class="sheet-doi">DOI: {{ activePaper().doi }}</span>
                  <span class="keywords-list">
                    <strong>Palabras clave:</strong>
                    @for (kw of activePaper().keywords; track kw) {
                      <span class="kw-tag">{{ kw }}</span>
                    }
                  </span>
                </div>
              </div>

              <!-- SECCIÓN: ABSTRACT EXTENSO -->
              <div class="sheet-section" id="sec-abstract">
                <div class="section-title-badge">
                  <span class="sec-num">★</span>
                  <h4>Abstract / Resumen Estructurado</h4>
                </div>
                <div class="abstract-box">
                  <p>{{ activePaper().abstract }}</p>
                </div>
              </div>

              <!-- SECCIÓN 1: INTRODUCCIÓN Y ANTECEDENTES -->
              <div class="sheet-section" id="sec-intro">
                <div class="section-title-badge">
                  <span class="sec-num">1</span>
                  <h4>Introducción y Marco de Modelado Metabólico</h4>
                </div>
                @for (p of getSectionParagraphs('sec-intro'); track $index) {
                  <p class="sheet-paragraph" [innerHTML]="formatParagraphWithHighlights(p)"></p>
                }
              </div>

              <!-- SECCIÓN 2: MATERIALES Y MÉTODOS EXPERIMENTALES -->
              <div class="sheet-section" id="sec-methods">
                <div class="section-title-badge">
                  <span class="sec-num">2</span>
                  <h4>Materiales, Cepas y Métodos Experimentales</h4>
                </div>

                <div class="methodology-note-banner">
                  <span class="method-icon">🧪</span>
                  <div class="method-text">
                    <strong>Protocolo Estandarizado por Consorcio C3pa:</strong> Los ensayos se desarrollaron con biorreactores de tanque agitado y cultivos en medio estandarizado HS, garantizando trazabilidad interinstitucional.
                  </div>
                </div>

                @if (activePaper().id === 'paper-1') {
                  <!-- Párrafos con resaltados interactivos vinculados a anotaciones reales -->
                  <p class="sheet-paragraph">
                    La síntesis se llevó a cabo utilizando la cepa <em>Komagataeibacter xylinus</em> cultivada en medio HS estándar suplementado con glucosa al 2% p/v.
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
                    Las membranas cosechadas fueron sometidas a lavado con NaOH al 0.1M a 80°C durante 90 minutos para eliminar endotoxinas y restos celulares.
                  </p>

                  <p class="sheet-paragraph">
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
                    Posteriormente se determinó la concentración mediante espectrofotometría UV-Vis a 274 nm utilizando una curva de calibración lineal (R² = 0.9984).
                  </p>
                }

                @for (p of getSectionParagraphs('sec-methods'); track $index) {
                  <p class="sheet-paragraph" [innerHTML]="formatParagraphWithHighlights(p)"></p>
                }
              </div>

              <!-- SECCIÓN 3: RESULTADOS Y CARACTERIZACIÓN FISICOQUÍMICA -->
              <div class="sheet-section" id="sec-results">
                <div class="section-title-badge">
                  <span class="sec-num">3</span>
                  <h4>Resultados Experimentales y Caracterización Fisicoquímica</h4>
                </div>

                @if (activePaper().id === 'paper-1') {
                  <!-- Párrafo citado en las notificaciones con resaltado prioritario -->
                  <p class="sheet-paragraph">
                    Los análisis cristalográficos confirmaron la preservación de la estructura alomórfica de celulosa I sin conversión a celulosa II tras los ciclos de purificación alcalina.
                    <span
                      class="annotated-highlight mention-highlight"
                      [class.resolved]="isAnnotationResolved('ann-pdf-3')"
                      [class.active]="selectedAnnotation()?.id === 'ann-pdf-3'"
                      (click)="selectAnnotationById('ann-pdf-3')"
                      title="📍 Fragmento citado en la consulta colegiada de Dr. Fernando Soto"
                    >
                      La cristalinidad relativa se calculó en 78.4% mediante difracción de rayos X (XRD) utilizando la ecuación de Segal.
                      <span class="badge-inline-mention">📌 Cita en Notificación</span>
                    </span>
                    Este valor representa un incremento del 6.2% comparado con celulosa vegetal procesada convencionalmente.
                  </p>
                }

                @for (p of getSectionParagraphs('sec-results'); track $index) {
                  <p class="sheet-paragraph" [innerHTML]="formatParagraphWithHighlights(p)"></p>
                }

                <!-- TABLA 1: DATOS CUANTITATIVOS DEL ARTÍCULO -->
                @if (activePaper().tableData; as t) {
                  <div class="scientific-table-card" id="sec-table">
                    <div class="table-caption">
                      <strong>Tabla 1.</strong> {{ t.caption }}
                    </div>
                    <div class="table-scroll-wrapper">
                      <table class="academic-table">
                        <thead>
                          <tr>
                            @for (h of t.headers; track h) {
                              <th>{{ h }}</th>
                            }
                          </tr>
                        </thead>
                        <tbody>
                          @for (r of t.rows; track $index) {
                            <tr>
                              @for (c of r; track $index) {
                                <td>{{ c }}</td>
                              }
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                    <div class="table-footer-notes">
                      * Valores expresados como media ± desviación estándar para n = 3 repeticiones biológicas independientes.
                    </div>
                  </div>
                }
              </div>

              <!-- SECCIÓN 4: DISCUSIÓN COMPARATIVA Y MODELADO -->
              <div class="sheet-section" id="sec-discussion">
                <div class="section-title-badge">
                  <span class="sec-num">4</span>
                  <h4>Discusión Comparativa y Validación con Modelado C3</h4>
                </div>
                @for (p of getSectionParagraphs('sec-discussion'); track $index) {
                  <p class="sheet-paragraph" [innerHTML]="formatParagraphWithHighlights(p)"></p>
                }
              </div>

              <!-- SECCIÓN 5: CONCLUSIONES Y PERSPECTIVAS CLÍNICAS -->
              <div class="sheet-section" id="sec-conclusions">
                <div class="section-title-badge">
                  <span class="sec-num">5</span>
                  <h4>Conclusiones y Proyecciones en Medicina Regenerativa</h4>
                </div>
                @for (p of getSectionParagraphs('sec-conclusions'); track $index) {
                  <p class="sheet-paragraph" [innerHTML]="formatParagraphWithHighlights(p)"></p>
                }
              </div>

              <!-- SECCIÓN 6: REFERENCIAS BIBLIOGRÁFICAS -->
              <div class="sheet-section" id="sec-refs">
                <div class="section-title-badge">
                  <span class="sec-num">6</span>
                  <h4>Referencias Bibliográficas</h4>
                </div>
                <ol class="references-list">
                  @for (ref of activePaper().references; track ref) {
                    <li>{{ ref }}</li>
                  }
                </ol>
              </div>

              <!-- Botón flotante para anotar cuando el usuario selecciona cualquier texto -->
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
          } @else {
            <!-- MODO B: VISOR PDF NATIVO EMBEBIDO -->
            <div class="native-pdf-viewport">
              <app-pdf-canvas-viewer
                [pdfUrl]="downloadUrl()"
                [title]="activePaper().title"
                (annotateRequest)="handlePdfAnnotateRequest($event)"
                (pageChange)="onPdfPageChange($event)"
              />
            </div>
          }
        </div>

        <!-- PANEL LATERAL DE ANOTACIONES Y DISCUSIÓN ANIDADA -->
        <div class="annotations-sidebar">
          <div class="sidebar-header">
            <div class="sidebar-title-row">
              <h4>💬 Discusiones y Acuerdos</h4>
              <button
                class="btn-sidebar-add-ann"
                (click)="openSidebarNewAnnotation()"
                title="Añadir nueva observación o duda al consorcio"
              >
                ➕ Nueva Anotación
              </button>
            </div>
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

          <!-- Formulario para Crear Nueva Anotación -->
          @if (isCreatingNew()) {
            <div class="new-annotation-card">
              <div class="card-header">
                <span class="tag-new">Nueva Anotación Científica</span>
                <div class="header-right-tools">
                  <app-voice-input-btn
                    [tooltip]="'Dictar anotación por voz con Whisper'"
                    (textTranscribed)="onVoiceNewAnnotation($event)"
                  />
                  <button class="btn-close" (click)="isCreatingNew.set(false)">✕</button>
                </div>
              </div>

              @if (selectedSnippetText) {
                <blockquote class="selected-text-preview">"{{ selectedSnippetText }}"</blockquote>
              } @else {
                <div class="target-page-indicator">
                  📌 Anotación referida a la Página <strong>{{ activePdfPage() || currentPage() }}</strong> del artículo
                </div>
              }

              <textarea
                [(ngModel)]="newAnnotationContent"
                placeholder="Escribe o dicta tu observación, hipótesis o pregunta para el consorcio..."
                rows="3"
              ></textarea>

              <div class="card-actions">
                <button class="btn-cancel-ann" (click)="isCreatingNew.set(false)">Cancelar</button>
                <button
                  class="btn-save"
                  (click)="saveNewAnnotation()"
                  [disabled]="!newAnnotationContent.trim()"
                >
                  Publicar Anotación
                </button>
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

                        <button
                          class="btn-reply-to"
                          (click)="setReplyingTo(ann.id, comment.id, comment.author.fullName)"
                        >
                          ↩️ Responder
                        </button>

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
                No hay anotaciones con el filtro seleccionado. Selecciona texto en el artículo para iniciar una nueva discusión colegiada.
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      width: 100%;
      height: 100%;
      min-height: 0;
    }
    .pdf-annotator-container {
      display: flex;
      flex-direction: column;
      height: calc(100vh - 84px);
      background: #0b1120;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #f1f5f9;
      gap: 10px;
      width: 100%;
    }

    /* BARRA SUPERIOR */
    .viewer-topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #ffffff;
      padding: 10px 20px;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 2px 6px rgba(15, 23, 42, 0.05);
      flex-wrap: wrap;
      gap: 12px;
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
      padding: 4px 8px;
      border-radius: 4px;
      font-weight: 800;
      letter-spacing: 0.5px;
    }
    .meta-titles h3 {
      margin: 0 0 2px 0;
      font-size: 16px;
      color: #0f172a;
      font-weight: 700;
    }
    .meta-subline {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 12px;
      color: #64748b;
    }
    .paper-authors-chip {
      font-weight: 600;
      color: #1e3a8a;
    }
    .paper-doi-chip {
      font-family: monospace;
      color: #64748b;
    }
    .paper-journal-chip {
      font-style: italic;
      color: #059669;
    }

    .topbar-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .display-mode-selector {
      display: flex;
      background: #f1f5f9;
      padding: 3px;
      border-radius: 8px;
      border: 1px solid #cbd5e1;
    }
    .mode-btn {
      padding: 6px 12px;
      border: none;
      background: transparent;
      color: #475569;
      font-size: 12px;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .mode-btn.active {
      background: #1e3a8a;
      color: #ffffff;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    .btn-download-pdf, .btn-back-library {
      padding: 7px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s;
    }
    .btn-download-pdf {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #1e40af;
    }
    .btn-download-pdf:hover {
      background: #dbeafe;
    }
    .btn-toggle-sidebar {
      background: #0284c7;
      color: #ffffff;
      border: 1px solid #0369a1;
      padding: 7px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s;
    }
    .btn-toggle-sidebar:hover {
      background: #0369a1;
      transform: translateY(-1px);
    }
    .btn-back-library {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      color: #334155;
    }
    .btn-back-library:hover {
      background: #e2e8f0;
      color: #0f172a;
    }

    /* GRID PRINCIPAL */
    .workspace-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 16px;
      flex: 1;
      min-height: 0;
      width: 100%;
      transition: grid-template-columns 0.25s cubic-bezier(0.23, 1, 0.32, 1);
    }
    .workspace-grid.sidebar-collapsed {
      grid-template-columns: 1fr;
    }
    .workspace-grid.sidebar-collapsed .annotations-sidebar {
      display: none;
    }

    /* VISOR DE DOCUMENTO */
    .document-viewport {
      background: #e2e8f0;
      border-radius: 10px;
      border: 1px solid #cbd5e1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
    .doc-controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 16px;
      background: #ffffff;
      border-bottom: 1px solid #cbd5e1;
      font-size: 12px;
      color: #475569;
      flex-wrap: wrap;
      gap: 8px;
    }
    .page-nav-group {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .btn-page-nav {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 3px 8px;
      cursor: pointer;
      font-size: 11px;
    }
    .page-indicator {
      font-weight: 700;
      color: #0f172a;
    }
    .section-quick-jumps {
      display: flex;
      align-items: center;
      gap: 5px;
      overflow-x: auto;
    }
    .jump-label {
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
    }
    .jump-btn {
      padding: 3px 8px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      color: #334155;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s;
    }
    .jump-btn:hover {
      background: #1e3a8a;
      color: #ffffff;
      border-color: #1e3a8a;
    }
    .zoom-controls {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .zoom-controls button {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 2px 7px;
      cursor: pointer;
      font-size: 11px;
    }

    /* HOJA CIENTÍFICA DEL ARTÍCULO COMPLETO */
    .paper-sheet {
      position: relative;
      flex: 1;
      overflow-y: scroll !important;
      padding: 44px 56px 90px;
      background: #ffffff;
      color: #1e293b;
      line-height: 1.75;
      font-size: 14.5px;
      box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.05);
      scrollbar-width: thin;
      scrollbar-color: #0284c7 #f1f5f9;
    }
    .paper-sheet::-webkit-scrollbar {
      width: 14px;
      display: block !important;
    }
    .paper-sheet::-webkit-scrollbar-track {
      background: #f1f5f9;
      border-left: 1px solid #cbd5e1;
    }
    .paper-sheet::-webkit-scrollbar-thumb {
      background: #0284c7;
      border-radius: 8px;
      border: 3px solid #f1f5f9;
    }
    .paper-sheet::-webkit-scrollbar-thumb:hover {
      background: #0369a1;
    }
    .paper-header-block {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 18px;
      margin-bottom: 24px;
    }
    .editorial-top-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .journal-name {
      font-size: 12px;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.6px;
    }
    .open-access-pill {
      background: #dcfce7;
      color: #15803d;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 12px;
    }
    .sheet-title {
      font-size: 22px;
      font-weight: 800;
      margin: 8px 0;
      color: #0f172a;
      line-height: 1.35;
    }
    .sheet-authors {
      font-size: 14px;
      color: #334155;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .sheet-metadata-row {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      font-size: 12px;
      color: #64748b;
      align-items: center;
    }
    .keywords-list {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }
    .kw-tag {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 11px;
      color: #334155;
    }

    /* SECCIONES DEL PAPER */
    .sheet-section {
      margin-bottom: 28px;
    }
    .section-title-badge {
      display: flex;
      align-items: center;
      gap: 10px;
      border-bottom: 1.5px solid #cbd5e1;
      padding-bottom: 6px;
      margin-bottom: 12px;
    }
    .sec-num {
      background: #1e3a8a;
      color: #ffffff;
      font-size: 12px;
      font-weight: 800;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .section-title-badge h4 {
      margin: 0;
      font-size: 16px;
      color: #0f172a;
      font-weight: 700;
    }
    .sheet-paragraph {
      margin: 0 0 14px 0;
      text-align: justify;
      color: #334155;
      line-height: 1.7;
    }
    .abstract-box {
      background: #f8fafc;
      border-left: 4px solid #1e3a8a;
      padding: 16px 20px;
      border-radius: 0 8px 8px 0;
      font-style: italic;
      color: #1e293b;
    }
    .methodology-note-banner {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      padding: 10px 14px;
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 14px;
      font-size: 13px;
      color: #1e40af;
    }

    /* RESALTADOS INTERACTIVOS */
    .annotated-highlight {
      background: rgba(254, 240, 138, 0.7);
      border-bottom: 2px solid #eab308;
      padding: 2px 4px;
      border-radius: 3px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .annotated-highlight:hover, .annotated-highlight.active {
      background: rgba(253, 224, 71, 0.95);
      box-shadow: 0 2px 6px rgba(234, 179, 8, 0.3);
    }
    .annotated-highlight.resolved {
      background: rgba(187, 247, 208, 0.7);
      border-bottom-color: #22c55e;
    }
    .mention-highlight {
      background: rgba(191, 219, 254, 0.85);
      border-bottom: 2px solid #2563eb;
    }
    .badge-inline-resolved {
      font-size: 10px;
      background: #059669;
      color: #fff;
      padding: 1px 5px;
      border-radius: 3px;
      font-weight: 700;
      margin-left: 4px;
    }
    .badge-inline-mention {
      font-size: 10px;
      background: #1e40af;
      color: #fff;
      padding: 2px 6px;
      border-radius: 3px;
      font-weight: 700;
      margin-left: 4px;
    }

    /* TABLA CIENTÍFICA */
    .scientific-table-card {
      margin: 20px 0;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      overflow: hidden;
    }
    .table-caption {
      padding: 10px 16px;
      background: #f1f5f9;
      border-bottom: 1px solid #cbd5e1;
      font-size: 13px;
      color: #0f172a;
    }
    .table-scroll-wrapper {
      overflow-x: auto;
    }
    .academic-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12.5px;
      text-align: left;
    }
    .academic-table th {
      background: #ffffff;
      padding: 8px 14px;
      font-weight: 700;
      color: #0f172a;
      border-bottom: 2px solid #cbd5e1;
    }
    .academic-table td {
      padding: 8px 14px;
      border-bottom: 1px solid #e2e8f0;
      color: #334155;
    }
    .academic-table tr:hover {
      background: #f1f5f9;
    }
    .table-footer-notes {
      padding: 8px 14px;
      font-size: 11px;
      color: #64748b;
      font-style: italic;
    }

    /* REFERENCIAS */
    .references-list {
      margin: 0;
      padding-left: 20px;
      font-size: 12.5px;
      color: #475569;
      line-height: 1.6;
    }
    .references-list li {
      margin-bottom: 6px;
    }

    /* MODO PDF EMBEBIDO */
    .native-pdf-viewport {
      display: flex;
      flex-direction: column;
      flex: 1;
      background: #1e293b;
      min-height: 0;
      height: 100%;
      width: 100%;
      position: relative;
      overflow: hidden;
    }
    .native-pdf-viewport app-pdf-canvas-viewer {
      display: flex;
      flex-direction: column;
      flex: 1;
      width: 100%;
      height: 100%;
      min-height: 0;
    }
    .pdf-iframe-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 16px;
      background: #0f172a;
      color: #cbd5e1;
      font-size: 12px;
      border-bottom: 1px solid #334155;
    }
    .btn-external-pdf {
      color: #38bdf8;
      text-decoration: none;
      font-weight: 600;
    }
    .pdf-embedded-frame {
      flex: 1;
      width: 100%;
      border: none;
      min-height: 500px;
    }

    /* BOTÓN FLOTANTE */
    .btn-floating-annotate {
      position: absolute;
      background: #1e40af;
      color: #fff;
      border: none;
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 6px 18px rgba(30, 64, 175, 0.35);
      z-index: 50;
      transform-origin: center bottom;
      animation: float-pop-in 160ms cubic-bezier(0.34, 1.56, 0.64, 1);
      transition: transform 120ms cubic-bezier(0.23, 1, 0.32, 1), background-color 150ms ease;
    }
    .btn-floating-annotate:hover {
      background: #1d4ed8;
      transform: translateY(-2px);
    }
    .btn-floating-annotate:active {
      transform: scale(0.95);
    }

    @keyframes float-pop-in {
      from {
        opacity: 0;
        transform: translateY(6px) scale(0.92);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    /* PANEL LATERAL DE DISCUSIÓN */
    .annotations-sidebar {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
    }
    .sidebar-header {
      padding: 12px 18px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .sidebar-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }
    .sidebar-title-row h4 {
      margin: 0;
      color: #1e40af;
      font-size: 14px;
      font-weight: 700;
    }
    .btn-sidebar-add-ann {
      background: #0284c7;
      color: #ffffff;
      border: none;
      padding: 5px 12px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      transition: all 0.15s;
    }
    .btn-sidebar-add-ann:hover {
      background: #0369a1;
      transform: translateY(-1px);
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
      font-size: 11px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .filter-pills button.active {
      background: #1e40af;
      color: #ffffff;
      border-color: #1e40af;
      font-weight: 700;
    }
    .annotations-scroll-list {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      background: #f8fafc;
    }
    .annotation-thread-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      border-left: 4px solid #1e40af;
      transition: all 0.15s;
    }
    .annotation-thread-card.selected {
      border-color: #2563eb;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.15);
    }
    .annotation-thread-card.is-resolved {
      border-left-color: #16a34a;
      background: #f0fdf4;
    }
    .thread-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .author-block {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .author-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      object-fit: cover;
    }
    .author-name {
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
      display: block;
    }
    .ann-date {
      font-size: 10px;
      color: #64748b;
    }
    .btn-resolved-status {
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 6px;
      border: 1px solid #cbd5e1;
      cursor: pointer;
      font-weight: 600;
    }
    .btn-resolved-status.resolved {
      background: #dcfce7;
      color: #15803d;
      border-color: #86efac;
    }
    .btn-resolved-status.pending {
      background: #f1f5f9;
      color: #475569;
    }
    .quoted-highlight {
      margin: 6px 0;
      padding: 6px 10px;
      background: #fef9c3;
      border-left: 3px solid #eab308;
      font-size: 12px;
      color: #854d0e;
      border-radius: 0 4px 4px 0;
      font-style: italic;
    }
    .thread-note-content {
      margin: 6px 0;
      font-size: 13px;
      color: #1e293b;
      line-height: 1.5;
    }
    .resolved-by-notice {
      font-size: 11px;
      color: #15803d;
      margin: 4px 0 8px 0;
    }
    .nested-comments-list {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid #f1f5f9;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .comment-item {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px;
      font-size: 12px;
    }
    .comment-header {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 4px;
    }
    .mini-avatar {
      width: 20px;
      height: 20px;
      border-radius: 50%;
    }
    .comment-author {
      font-weight: 700;
      color: #0f172a;
    }
    .comment-time {
      font-size: 10px;
      color: #64748b;
      margin-left: auto;
    }
    .comment-body {
      margin: 0;
      color: #334155;
      line-height: 1.4;
    }
    .btn-reply-to {
      background: transparent;
      border: none;
      color: #1e40af;
      font-size: 11px;
      cursor: pointer;
      margin-top: 4px;
      font-weight: 600;
      padding: 0;
    }
    .second-level-replies {
      margin-top: 6px;
      padding-left: 10px;
      border-left: 2px solid #cbd5e1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .sub-comment-item {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      padding: 6px;
      border-radius: 4px;
    }
    .reply-input-box {
      margin-top: 8px;
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
      padding: 3px 8px;
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
      padding: 7px 12px;
      border-radius: 6px;
      color: #0f172a;
      font-size: 12px;
    }
    .input-action-row input:focus {
      border-color: #1e40af;
      outline: none;
      background: #ffffff;
    }
    .btn-send-reply {
      background: #1e40af;
      color: #fff;
      border: none;
      padding: 7px 14px;
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

    /* NUEVA ANOTACIÓN */
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
    .card-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      align-items: center;
    }
    .btn-cancel-ann {
      background: #f1f5f9;
      color: #64748b;
      border: 1px solid #cbd5e1;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-cancel-ann:hover {
      background: #e2e8f0;
      color: #334155;
    }
    .target-page-indicator {
      font-size: 11px;
      color: #0369a1;
      background: #e0f2fe;
      border: 1px solid #bae6fd;
      padding: 5px 10px;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-weight: 500;
    }
    .btn-save {
      background: #1e40af;
      color: #fff;
      border: none;
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-save:hover:not(:disabled) {
      background: #1d4ed8;
    }
    .btn-save:disabled {
      opacity: 0.5;
      cursor: not-allowed;
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
  resourceService = inject(ResourceService);
  private sanitizer = inject(DomSanitizer);

  paperId = input<string>('paper-1');
  paperTitle = input<string>('Síntesis y Caracterización de Nanocelulosa Bacteriana Modificada');
  paperAuthors = input<string>('C. Méndez, E. Ramos, F. Soto (2026)');

  viewerMode = signal<ViewerDisplayMode>('NATIVE_PDF');
  sidebarCollapsed = signal<boolean>(false);
  statusFilter = signal<AnnotationFilter>('ALL');
  annotations = signal<ScientificAnnotation[]>([]);
  selectedAnnotation = signal<ScientificAnnotation | null>(null);

  currentPage = signal<number>(1);
  activePdfPage = signal<number>(1);
  zoomLevel = signal<number>(100);

  // Botón flotante para selección de texto
  floatingButtonVisible = signal<boolean>(false);
  floatingButtonX = signal<number>(0);
  floatingButtonY = signal<number>(0);
  selectedSnippetText = '';

  // Formulario nueva anotación
  isCreatingNew = signal<boolean>(false);
  newAnnotationContent = '';

  // Respuestas activas por anotación
  activeReplyText: Record<string, string> = {};
  replyingToAnnId = signal<string | null>(null);
  replyingToCommentId = signal<string | null>(null);
  replyingToAuthorName = signal<string | null>(null);

  downloadUrl = computed(() => this.resourceService.getResourceDownloadUrl(this.paperId()));
  safePdfUrl = computed<SafeResourceUrl>(() =>
    this.sanitizer.bypassSecurityTrustResourceUrl(this.downloadUrl())
  );

  // BASE DE DATOS DE ARTÍCULOS COMPLETOS CON TODAS LAS SECCIONES CIENTÍFICAS
  private papersDatabase: Record<string, FullScientificPaper> = {
    'paper-1': {
      id: 'paper-1',
      journal: 'Journal of Advanced Biomaterials Research • Vol. 14, 2026',
      title: 'Síntesis y Caracterización de Nanocelulosa Bacteriana Modificada para Liberación Controlada de Antibióticos',
      authors: 'Dr. Carlos Méndez, Dra. Elena Ramos, Dr. Fernando Soto — Consorcio Interinstitucional C3pa',
      doi: '10.1016/j.biomaterials.2026.119842',
      totalPages: 8,
      keywords: ['Nanocelulosa bacteriana', 'Komagataeibacter xylinus', 'Difracción XRD', 'Ecuación de Segal', 'Elución antibiótica', 'Biomateriales dérmicos'],
      abstract: 'La nanocelulosa bacteriana (BNC) producida por Komagataeibacter xylinus ofrece una resistencia mecánica excepcional (módulo de Young > 15 GPa), ultra-alta capacidad de retención de agua (> 98%) y excelente biocompatibilidad tisular. En este estudio desarrollamos un protocolo optimizado de funcionalización superficial con secado supercrítico (CO₂ a 31.1°C y 73.8 bar), evaluando su capacidad como matriz de liberación controlada de ciprofloxacino. Los resultados demuestran una incorporación homogénea del 85.2% del principio activo sin degradación de la red microfibrilar tridimensional, exhibiendo un perfil de elución sostenido de 72 horas.',
      sections: [
        {
          id: 'sec-intro',
          sectionNumber: '1',
          title: 'Introducción y Antecedentes',
          paragraphs: [
            'Las infecciones microbianas persistentes en apósitos dérmicos representan un desafío crítico en medicina regenerativa. Los apósitos tradicionales de gasa o matrices sintéticas sufren de rápida desecación y liberación en bolo del antimicrobiano, induciendo citotoxicidad local y reduciendo la eficacia terapéutica.',
            'La nanocelulosa bacteriana sintetizada mediante fermentación estática o asistida en biorreactor presenta una nanoarquitectura reticular ultrafina con diámetros de fibra entre 20 y 80 nm. A diferencia de la celulosa vegetal, carece totalmente de lignina y hemicelulosa, lo que elimina la necesidad de procesos agresivos de delignificación.',
            'El objetivo de esta investigación colegiada en el Consorcio C3pa fue estandarizar los parámetros de bioproceso para maximizar el rendimiento de biomasa seca y funcionalizar la superficie con grupos amina primarios sin comprometer la resistencia a la tracción.'
          ]
        },
        {
          id: 'sec-methods',
          sectionNumber: '2',
          title: 'Materiales y Métodos Experimentales',
          paragraphs: [
            '2.1 Mantenimiento de la Cepa y Medio de Fermentación: La cepa bacteriana se preservó en glicerol al 20% a -80°C. Los preinóculos se activaron en matraces Erlenmeyer con medio Hestrin-Schramm (HS) conteniendo 20 g/L de D-glucosa, 5 g/L de peptona, 5 g/L de extracto de levadura y 2.7 g/L de Na₂HPO₄ a pH 5.5.',
            '2.2 Secado por Punto Crítico (CPD): Con el propósito de evitar el colapso capilar de los nanoporos durante la evaporación de disolvente, las membranas purificadas fueron deshidratadas en gradiente ascendente de etanol (30%, 50%, 70%, 90% y 100% v/v) y transferidas a una cámara de secado supercrítico con CO₂ líquido a 10°C, alcanzando el punto supercrítico a 31.1°C y 73.8 bar.',
            '2.3 Ensayos de Capacidad de Carga y Difusión Espectrofotométrica: Se incubaron discos de 15 mm de diámetro en alícuotas de ciprofloxacino en solución amortiguadora de fosfatos (PBS 0.01M, pH 7.4). Las lecturas de absorbancia se obtuvieron a 274 nm a intervalos predeterminados de 1, 2, 4, 8, 12, 24, 48 y 72 horas.'
          ]
        },
        {
          id: 'sec-results',
          sectionNumber: '3',
          title: 'Resultados Experimentales y Caracterización Fisicoquímica',
          paragraphs: [
            '3.1 Análisis de Espectroscopía Infrarroja por Transformada de Fourier (FTIR): Los espectros confirmaron las bandas características de celulosa: la banda ancha entre 3340 y 3350 cm⁻¹ correspondiente a la vibración de estiramiento intermolecular O-H, la señal a 2890 cm⁻¹ debida a enlaces C-H alifáticos, y la banda a 1055 cm⁻¹ asignable al enlace glicosídico C-O-C del esqueleto polisacárido.',
            '3.2 Termogravimetría y Estabilidad Térmica (TGA/DTG): La curva de pérdida de masa demostró una primera etapa de desorción de humedad residual (2.4%) entre 50 y 110°C, mientras que la degradación pirolítica principal comenzó a los 318°C con pico máximo a 352°C. Esto asegura que el biomaterial tolera esterilización en autoclave (121°C, 20 min) sin alteración de su red fibrilar.',
            '3.3 Perfil Cinético de Difusión del Fármaco: La liberación inicial (fase de ráfaga o "burst release") alcanzó únicamente el 18.2% durante las primeras 4 horas, seguido de un régimen de difusión casi lineal gobernado por la cinética de Korsmeyer-Peppas (n = 0.47), indicativo de difusión anómala Fickiana controlada por relajación polimérica.'
          ]
        },
        {
          id: 'sec-discussion',
          sectionNumber: '4',
          title: 'Discusión Comparativa y Validación con Modelado C3',
          paragraphs: [
            'Los valores cristalográficos del 78.4% obtenidos en este lote concuerdan plenamente con las predicciones del modelo cinético del consorcio para tasas de agitación de 250 rpm. Velocidades superiores a 350 rpm inducen agregados esferoidales densos con menor porosidad accesible, mientras que regímenes estáticos generan películas estratificadas heterogéneas.',
            'Al comparar la capacidad de carga frente a apósitos comerciales de alginato de calcio y carboximetilcelulosa, la matriz de nanocelulosa modificada demostró retener 2.8 veces más fármaco por gramo de biomasa seca, minimizando la pérdida por lixiviación temprana.',
            'La coincidencia entre los datos experimentales y la simulación matemática desarrollada por el grupo de bioinformática del C3 permite extrapolar este protocolo a otros fármacos bioactivos como dexametasona y factores de crecimiento epitelial.'
          ]
        },
        {
          id: 'sec-conclusions',
          sectionNumber: '5',
          title: 'Conclusiones y Proyecciones en Medicina Regenerativa',
          paragraphs: [
            'Se consolidó un protocolo robusto y reproducible para la síntesis, purificación alcalina y secado supercrítico de nanocelulosa bacteriana, conservando una cristalinidad del 78.4% y una nanoarquitectura porosa tridimensional intacta.',
            'El sistema demostró una liberación sostenida y controlada de ciprofloxacino a lo largo de 72 horas, superando las limitaciones de los apósitos comerciales actuales.',
            'Los acuerdos de transferencia entre laboratorios del Consorcio C3pa permitirán avanzar a la fase de validación in vivo en modelos murinos de quemaduras de segundo grado en el siguiente trimestre.'
          ]
        }
      ],
      tableData: {
        caption: 'Propiedades Mecánicas, Cristalinidad y Rendimiento de Liberación de Membranas de Nanocelulosa Bacteriana.',
        headers: ['Muestra / Tratamiento', 'Espesor Hidratado (mm)', 'Módulo de Young (GPa)', 'Cristalinidad Segal (%)', 'Carga Fármaco (mg/g)', 'Elución a 72h (%)'],
        rows: [
          ['BNC-Nativa (Control estático)', '1.45 ± 0.06', '12.8 ± 0.9', '74.2 ± 1.1', '14.2 ± 0.8', '62.4 ± 2.1'],
          ['BNC-250 rpm (Lavado NaOH 0.1M)', '1.38 ± 0.04', '15.4 ± 1.2', '78.4 ± 0.8', '28.6 ± 1.2', '85.2 ± 1.8'],
          ['BNC-350 rpm (Alta agitación)', '1.12 ± 0.08', '9.6 ± 0.7', '71.0 ± 1.5', '19.4 ± 1.0', '74.5 ± 2.4'],
          ['BNC-Liofilizada convencional', '1.62 ± 0.11', '8.2 ± 0.6', '72.3 ± 1.2', '21.0 ± 1.1', '89.1 ± 3.0']
        ]
      },
      references: [
        'Méndez, C., Ramos, E., Soto, F. (2026). Nanocellulose matrices for localized pharmacotherapy: a structural approach. Journal of Advanced Biomaterials Research, 14(2), 119842.',
        'Klemm, D., Kramer, F., Moritz, S., et al. (2021). Bacterial synthesized cellulose: artificial blood vessels and other medical applications. Progress in Polymer Science, 36(6), 723-748.',
        'Segal, L., Creely, J. J., Martin, A. E., Conrad, C. M. (1959). An empirical method for estimating the degree of crystallinity of native cellulose using the X-ray diffractometer. Textile Research Journal, 29(10), 786-794.',
        'Alarcón, S., Vargas, G. (2026). Cytocompatibility assessment of bacterial biomaterials in wound healing models. Scientific Reports, 16, 30219.',
        'Valenzuela, R., Morales, P. (2026). Controlled drug delivery models in polymeric porous networks. Journal of Biomedical Materials Research, 114(5), 210-225.'
      ]
    },
    'paper-2': {
      id: 'paper-2',
      journal: 'Scientific Reports • Nature Publishing • Vol. 16, 2026',
      title: 'Evaluación de Citotoxicidad Celular y Proliferación en Andamios Porosos 3D',
      authors: 'Dra. Sofía Alarcón, Dr. Gabriel Vargas, Dra. Claudia Morales — Instituto de Biotecnología Médica',
      doi: '10.1038/s41598-026-30219-4',
      totalPages: 6,
      keywords: ['Citotoxicidad celular', 'Andamios 3D', 'Viabilidad MTT', 'Microscopía confocal', 'Líneas celulares'],
      abstract: 'Los andamios porosos tridimensionales proporcionan el soporte estructural idóneo para guiar la adhesión y migración celular. En este trabajo evaluamos la biocompatibilidad y toxicidad dosis-respuesta en fibroblastos L929 y hepatocitos HepG2 cultivados sobre matrices porosas sintetizadas en el consorcio. Los ensayos de calceína-AM y homodímero de etidio demuestran una viabilidad celular superior al 92% tras 72 horas de incubación, confirmando la inocuidad celular.',
      sections: [
        {
          id: 'sec-intro',
          sectionNumber: '1',
          title: 'Introducción',
          paragraphs: [
            'La interacción entre células eucariotas y la topografía tridimensional de andamios poliméricos condiciona la respuesta inmunológica y la velocidad de cicatrización.',
            'Evaluar la citotoxicidad estandarizada conforme a la norma ISO 10993-5 resulta imprescindible antes de proceder con pruebas preclínicas en el consorcio.'
          ]
        },
        {
          id: 'sec-methods',
          sectionNumber: '2',
          title: 'Metodología de Cultivo y Siembra en Andamios',
          paragraphs: [
            'Los andamios fueron esterilizados mediante radiación UV-C (254 nm) durante 45 minutos por cara y preacondicionados en medio DMEM suplementado con suero fetal bovino al 10%.',
            'Se sembraron 5 × 10⁴ células por pocillo en placas de 24 pozos conteniendo discos del biomaterial, monitorizando la proliferación a 24, 48 y 72 horas.'
          ]
        },
        {
          id: 'sec-results',
          sectionNumber: '3',
          title: 'Resultados de Viabilidad Celular y Curvas Dosis-Respuesta',
          paragraphs: [
            'Los ensayos espectrofotométricos de formazán indicaron que la tasa de proliferación en los andamios porosos superó a la de los controles plásticos bidimensionales a partir de las 48 horas.',
            'La curva de supervivencia celular tras 48h con dosis de 25 a 100 nM demostró una reducción de viabilidad selectiva en células anómalas sin alterar la viabilidad de los fibroblastos sanos (> 90%).'
          ]
        },
        {
          id: 'sec-discussion',
          sectionNumber: '4',
          title: 'Discusión',
          paragraphs: [
            'La interconectividad de los macroporos (150-250 µm) facilitó el intercambio de nutrientes y oxígeno, previniendo la formación de centros necróticos.',
            'Los resultados confirman que el protocolo de descelularización y lavado alcalino elimina con éxito los componentes pirogénicos.'
          ]
        },
        {
          id: 'sec-conclusions',
          sectionNumber: '5',
          title: 'Conclusiones',
          paragraphs: [
            'Los andamios tridimensionales sintetizados demuestran excelente biocompatibilidad y fomentan la adhesión tisular.',
            'Se recomienda su aprobación para la siguiente fase de ensayos colegiados en el consorcio.'
          ]
        }
      ],
      tableData: {
        caption: 'Porcentaje de Viabilidad Celular (MTT) en Línea Celular L929 y HepG2 a las 24, 48 y 72 Horas.',
        headers: ['Condición Experimental', 'Viabilidad 24h (%)', 'Viabilidad 48h (%)', 'Viabilidad 72h (%)', 'Morfología Celular'],
        rows: [
          ['Control Negativo (Medio solo)', '100.0 ± 2.1', '100.0 ± 3.2', '100.0 ± 2.8', 'Confluente y extendida'],
          ['Andamio Poroso 3D C3pa', '96.4 ± 3.1', '94.8 ± 2.9', '92.3 ± 3.4', 'Adherida y tridimensional'],
          ['Control Positivo (DMSO 10%)', '18.2 ± 1.5', '6.4 ± 0.9', '2.1 ± 0.4', 'Redondeada y lisada']
        ]
      },
      references: [
        'Alarcón, S., Vargas, G. (2026). In vitro cytotoxicity evaluation of 3D scaffolds. Scientific Reports, 16, 30219.',
        'ISO 10993-5 (2020). Biological evaluation of medical devices - Tests for in vitro cytotoxicity.'
      ]
    },
    'paper-3': {
      id: 'paper-3',
      journal: 'Journal of Biomedical Materials Research • 2026',
      title: 'Protocolo Estandarizado de Liberación Controlada de Fármacos en Redes Poliméricas',
      authors: 'Dr. Ricardo Valenzuela, Dra. Patricia Morales — Instituto Nacional de Salud Pública',
      doi: '10.1002/jbm.a.37210',
      totalPages: 7,
      keywords: ['Farmacocinética', 'Cinética de Higuchi', 'Liberación controlada', 'Difusión Fickiana', 'Tampón fisiológico'],
      abstract: 'La predicción cuantitativa de los perfiles de disolución y elución de principios activos en membranas biocompatibles es un pilar central del modelado biofísico. En este protocolo describimos la formulación y validación matemática de la cinética de transporte de masa bajo condiciones que simulan fluidos corporales.',
      sections: [
        {
          id: 'sec-intro',
          sectionNumber: '1',
          title: 'Introducción',
          paragraphs: [
            'El modelado matemático de liberación controlada permite optimizar las dosis terapéuticas evitando concentraciones plasmáticas tóxicas.',
            'Este documento establece el procedimiento normalizado de trabajo (PNT) para todas las mediciones de fármacos en el consorcio C3pa.'
          ]
        },
        {
          id: 'sec-methods',
          sectionNumber: '2',
          title: 'Procedimiento Normalizado de Trabajo (PNT)',
          paragraphs: [
            'Se emplearon celdas de difusión vertical Franz de 15 mL acopladas a chaquetas de recirculación térmica a 37.0 ± 0.5°C.',
            'El medio receptor consistió en solución amortiguadora salina PBS a pH 7.4 bajo agitación magnética constante a 300 rpm.'
          ]
        },
        {
          id: 'sec-results',
          sectionNumber: '3',
          title: 'Perfiles de Disolución y Ajuste a Modelos',
          paragraphs: [
            'El ajuste a la ecuación de Higuchi demostró coeficientes de determinación R² superiores a 0.992 en todos los lotes analizados.',
            'La constante de liberación calculada permitió predecir con exactitud la ventana terapéutica requerida de 48 a 72 horas.'
          ]
        },
        {
          id: 'sec-discussion',
          sectionNumber: '4',
          title: 'Discusión',
          paragraphs: [
            'La estandarización metodológica asegura reproducibilidad entre los diferentes nodos de investigación del consorcio.'
          ]
        },
        {
          id: 'sec-conclusions',
          sectionNumber: '5',
          title: 'Conclusiones',
          paragraphs: [
            'El protocolo queda homologado y disponible para la evaluación de nuevos compuestos bioactivos en C3pa.'
          ]
        }
      ],
      references: [
        'Valenzuela, R., Morales, P. (2026). Standardized drug release protocols. J Biomed Mater Res, 114, 210.',
        'Higuchi, T. (1963). Mechanism of sustained-action medication. J Pharm Sci, 52(12), 1145-1149.'
      ]
    },
    'paper-ec97477e9591': {
      id: 'paper-ec97477e9591',
      journal: 'mSystems (ASM Journals) • Vol. 5, Issue 1, e00606-19',
      title: 'MICOM: Metagenome-Scale Modeling To Infer Metabolic Interactions in the Gut Microbiota',
      authors: 'Christian Diener, Sean M. Gibbons, Osbaldo Resendis-Antonio',
      doi: '10.1128/mSystems.00606-19',
      totalPages: 16,
      keywords: ['MICOM', 'Metagenome-Scale Modeling', 'Gut Microbiota', 'Flux Balance Analysis', 'Cooperative Tradeoff', 'Short-Chain Fatty Acids'],
      abstract: 'The gut microbiota is an intricate metabolic ecosystem that shapes host physiology and health. Modeling community-scale metabolic interactions from metagenomic data remains a major computational challenge. Here, we present MICOM, a Python package for metabolic modeling of microbial communities based on metagenomic data. MICOM integrates metagenome-scale metabolic reconstructions with community-wide objective functions using cooperative trade-off, enabling the prediction of bacterial growth rates, metabolic cross-feeding, and community-level metabolite production fluxes.',
      sections: [
        {
          id: 'sec-intro',
          sectionNumber: '1',
          title: 'Introduction and Community-Scale Modeling',
          paragraphs: [
            'Microbial communities in the human gastrointestinal tract synthesize essential vitamins, short-chain fatty acids (SCFAs), and neurotransmitters, while modulating host immune response and drug metabolism.',
            'Although metagenomic sequencing allows high-resolution taxonomic profiling, translating taxonomic abundances into personalized metabolic phenotypes requires genome-scale metabolic modeling (GEMs).',
            'MICOM addresses the computational hurdle of multi-species flux balance analysis (FBA) by implementing cooperative trade-off (L2 regularization and biomass constraints), avoiding unnatural monoculture dominance while predicting realistic community cross-feeding.'
          ]
        },
        {
          id: 'sec-methods',
          sectionNumber: '2',
          title: 'Computational Methods and Cooperative Trade-off Formulation',
          paragraphs: [
            '2.1 Community Objective Function: Classical multi-species FBA often predicts that only a single fast-growing organism will dominate community biomass. MICOM introduces cooperative trade-off, balancing maximal community-wide growth rate with individual taxa-specific growth optimization.',
            '2.2 Mapping Metagenomic Abundances to Metabolic Models: Taxon relative abundances obtained from 16S rRNA or shotgun metagenomics (MetaPhlAn / Kraken) are matched to curated reconstructions from the AGORA or CarveMe databases.',
            '2.3 Simulation of Dietary Regimes and Metabolite Fluxes: Influx boundaries are configured according to standardized Western and high-fiber diets (e.g. Western diet with restricted butyrate vs. Mediterranean high-fiber diet).'
          ]
        },
        {
          id: 'sec-results',
          sectionNumber: '3',
          title: 'Results: Prediction of In Vivo Growth Rates and Cross-Feeding',
          paragraphs: [
            'Simulations across healthy human cohort samples demonstrated that cooperative trade-off correctly maintains community diversity (Shannon entropy > 3.2), matching experimental 16S sequencing distributions.',
            'MICOM accurately predicted cross-feeding of acetate and lactate between primary degraders (e.g., Bacteroides thetaiotaomicron) and butyrate producers (e.g., Faecalibacterium prausnitzii).',
            'Validation against metabolomics datasets confirmed high Pearson correlation (r = 0.81, p < 0.001) for circulating SCFA levels.'
          ]
        },
        {
          id: 'sec-discussion',
          sectionNumber: '4',
          title: 'Discussion and Clinical Applications',
          paragraphs: [
            'The capacity to simulate patient-specific dietary interventions provides an in silico platform for precision nutrition and metabolic disease therapy.',
            'Unlike static correlation networks, MICOM yields mechanistic hypotheses about which bacterial taxa compete or cooperate for limited resources.'
          ]
        },
        {
          id: 'sec-conclusions',
          sectionNumber: '5',
          title: 'Conclusions and Code Availability',
          paragraphs: [
            'MICOM provides an open-source, scalable Python library for personalized microbiome metabolic modeling.',
            'The software is freely available on GitHub and PyPI, compatible with standard COBRApy workflows.'
          ]
        }
      ],
      references: [
        'Diener, C., Gibbons, S. M., Resendis-Antonio, O. (2020). MICOM: Metagenome-Scale Modeling To Infer Metabolic Interactions. mSystems, 5(1), e00606-19.',
        'Magnúsdóttir, S., et al. (2017). Generation of genome-scale metabolic reconstructions for 773 gut microbes (AGORA). Nature Biotechnology, 35(1), 81-89.',
        'Heinken, A., et al. (2021). Systematic evaluation of the gut microbiome metabolic modeling framework. Cell Systems, 12(4), 312-326.'
      ]
    }
  };

  activePaper = computed<FullScientificPaper>(() => {
    const id = this.paperId();
    if (this.papersDatabase[id]) {
      return this.papersDatabase[id];
    }
    // Si es un paper nuevo subido por el usuario, armamos un artículo estructurado completo dinámicamente
    return {
      id: id,
      journal: 'Repositorio Científico Colegiado C3pa • 2026',
      title: this.paperTitle(),
      authors: this.paperAuthors(),
      doi: '10.5281/zenodo.' + id.replace(/[^0-9]/g, '4892'),
      totalPages: 5,
      keywords: ['Biomateriales', 'Modelado Metabólico', 'Consorcio C3', 'Datos Abiertos'],
      abstract: `Este artículo científico titulado "${this.paperTitle()}" forma parte del repositorio institucional del Consorcio C3pa. Presenta avances experimentales y metodológicos evaluados por el equipo colegiado.`,
      sections: [
        {
          id: 'sec-intro',
          sectionNumber: '1',
          title: 'Introducción',
          paragraphs: [
            `El presente documento científico aborda la investigación relativa a ${this.paperTitle()}. Se compilan las bases teóricas, parámetros de operación y antecedentes de relevancia para los miembros del consorcio.`,
            'La investigación asíncrona colegiada permite la trazabilidad de acuerdos, anotaciones contextuales y discusión técnica continua entre las diferentes instituciones participantes.'
          ]
        },
        {
          id: 'sec-methods',
          sectionNumber: '2',
          title: 'Metodología y Condiciones Experimentales',
          paragraphs: [
            'Se implementaron protocolos estandarizados conforme a los acuerdos del consorcio C3pa.',
            'Los datos cuantitativos fueron recopilados mediante triplicados experimentales y analizados con modelos estadísticos de alta confianza.'
          ]
        },
        {
          id: 'sec-results',
          sectionNumber: '3',
          title: 'Resultados y Caracterización',
          paragraphs: [
            'Los resultados confirman las hipótesis planteadas en las fases preliminares del proyecto.',
            'Se evidencian patrones reproducibles en la caracterización fisicoquímica y en la interacción celular.'
          ]
        },
        {
          id: 'sec-discussion',
          sectionNumber: '4',
          title: 'Discusión',
          paragraphs: [
            'Los hallazgos se correlacionan con la literatura especializada y abren nuevas perspectivas de colaboración dentro de las líneas del consorcio.'
          ]
        },
        {
          id: 'sec-conclusions',
          sectionNumber: '5',
          title: 'Conclusiones',
          paragraphs: [
            'Se valida la eficacia del enfoque metodológico presentado.',
            'Este documento queda registrado con trazabilidad de versiones en el sistema.'
          ]
        }
      ],
      references: [
        'Consorcio C3pa (2026). Registro colegiado de investigación y modelado biológico.',
        'Méndez, C., Ramos, E., et al. (2026). Journal of Advanced Biomaterials Research.'
      ]
    };
  });

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

  getSectionParagraphs(secId: string): string[] {
    const sec = this.activePaper().sections.find(s => s.id === secId);
    return sec ? sec.paragraphs : [];
  }

  formatParagraphWithHighlights(text: string): string {
    return text;
  }

  scrollToSection(sectionId: string) {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
    }
  }

  nextPage() {
    if (this.currentPage() < this.activePaper().totalPages) {
      this.currentPage.update(p => p + 1);
    }
  }

  changeZoom(delta: number) {
    const next = this.zoomLevel() + delta;
    if (next >= 70 && next <= 160) {
      this.zoomLevel.set(next);
    }
  }

  onVoiceNewAnnotation(text: string): void {
    if (this.newAnnotationContent.trim()) {
      this.newAnnotationContent += ' ' + text;
    } else {
      this.newAnnotationContent = text;
    }
  }

  onVoiceReply(annId: string, text: string): void {
    const prev = this.activeReplyText[annId] || '';
    if (prev.trim()) {
      this.activeReplyText[annId] = prev + ' ' + text;
    } else {
      this.activeReplyText[annId] = text;
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

  onPdfPageChange(page: number) {
    this.activePdfPage.set(page);
    this.currentPage.set(page);
  }

  handlePdfAnnotateRequest(event: { text: string; page: number }) {
    this.selectedSnippetText = event.text;
    this.activePdfPage.set(event.page);
    this.currentPage.set(event.page);
    this.floatingButtonVisible.set(false);
    this.isCreatingNew.set(true);
  }

  openNewAnnotationPrompt() {
    this.floatingButtonVisible.set(false);
    this.isCreatingNew.set(true);
  }

  openSidebarNewAnnotation() {
    this.floatingButtonVisible.set(false);
    const selText = window.getSelection()?.toString().trim();
    if (selText && selText.length > 3) {
      this.selectedSnippetText = selText;
    } else {
      this.selectedSnippetText = '';
    }
    this.isCreatingNew.set(true);
  }

  saveNewAnnotation() {
    if (!this.newAnnotationContent.trim()) return;

    const targetPage = this.activePdfPage() || this.currentPage() || 1;
    const snippet = this.selectedSnippetText?.trim();

    this.annotationService.createAnnotation({
      resource_id: this.paperId(),
      target_type: 'PDF_SELECTION',
      coordinates: { page: targetPage },
      highlighted_text: snippet || `Página ${targetPage}`,
      note_content: this.newAnnotationContent.trim()
    }).subscribe({
      next: (created) => {
        this.annotations.update(prev => [created, ...prev]);
        this.selectedAnnotation.set(created);
        this.isCreatingNew.set(false);
        this.newAnnotationContent = '';
        this.selectedSnippetText = '';
      },
      error: (err) => {
        console.error('Error guardando anotación en PDF:', err);
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
      next: (newComment) => {
        this.activeReplyText[annId] = '';
        this.cancelReply();
        this.annotations.update(list => list.map(a => {
          if (a.id === annId) {
            const comments = [...(a.comments || []), newComment];
            const updated = { ...a, comments, commentsCount: comments.length };
            if (this.selectedAnnotation()?.id === annId) {
              this.selectedAnnotation.set(updated);
            }
            return updated;
          }
          return a;
        }));
      },
      error: (err) => {
        console.error('Error enviando comentario en PDF:', err);
      }
    });
  }

  onBackToLibrary() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: 'library' }));
    }
  }
}
