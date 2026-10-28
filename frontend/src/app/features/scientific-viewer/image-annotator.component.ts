import { Component, OnInit, inject, signal, computed, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ScientificAnnotation, ImageCoordinates, ThreadComment } from '../../core/models/scientific.models';
import { AnnotationService } from '../../core/services/annotation.service';
import { AuthService } from '../../core/services/auth.service';
import { VoiceInputBtnComponent } from '../../shared/components/voice-input-btn.component';

interface ScientificSampleImage {
  id: string;
  resourceId: string;
  title: string;
  description: string;
  url: string;
}

@Component({
  selector: 'app-image-annotator',
  standalone: true,
  imports: [CommonModule, FormsModule, VoiceInputBtnComponent],
  template: `
    <div class="annotator-container">
      <!-- Selector de Muestras Científicas e Imagen Personalizada -->
      <div class="samples-selector-bar">
        <div class="selector-title">
          <span class="selector-icon">🔬</span>
          <div>
            <strong>Muestra Científica:</strong>
            <span class="sample-desc">{{ currentSample().title }}</span>
          </div>
        </div>

        <div class="sample-chips">
          @for (sample of sampleImages; track sample.id) {
            <button
              type="button"
              class="btn-sample-chip"
              [class.active]="currentSample().id === sample.id"
              (click)="selectSample(sample)"
            >
              {{ sample.title }}
            </button>
          }
        </div>

        <div class="custom-upload-action">
          <label class="btn-upload-label" title="Cargar micrografía o fotografía experimental propia">
            📁 Cargar Imagen Propia
            <input type="file" accept="image/*" (change)="onCustomImageUpload($event)" style="display: none;" />
          </label>
        </div>
      </div>

      <!-- Layout Principal: Lienzo Interactivo a la Izquierda y Panel de Discusión a la Derecha -->
      <div class="annotator-layout">
        <!-- Lienzo de Imagen con Capa de Anotación y Puntero Interactivo -->
        <div class="image-viewer-column">
          <div class="toolbar-hint">
            <span class="hint-badge">💡 Modo Selector Activo</span>
            <span class="hint-text">Haz clic y arrastra con el cursor sobre cualquier región para seleccionarla y discutirla.</span>
          </div>

          <div class="image-viewport-wrapper" #viewportWrapper>
            <!-- Imagen base científica -->
            <img
              #imageElement
              [src]="currentSample().url"
              alt="Recurso Científico"
              class="scientific-image"
              draggable="false"
              (load)="onImageLoaded()"
            />

            <!-- Capa interactiva de eventos (cubre exactamente la imagen) -->
            <div
              #drawingSurface
              class="drawing-surface"
              (pointerdown)="onPointerDown($event)"
              (pointermove)="onPointerMove($event)"
              (pointerup)="onPointerUp($event)"
              (pointercancel)="onPointerCancel($event)"
            >
              <!-- Cajas de anotaciones guardadas -->
              @for (ann of currentImageAnnotations(); track ann.id) {
                @let coords = getBoxCoords(ann);
                @if (coords) {
                  <div
                    class="annotation-box"
                    [class.selected]="selectedAnnotation()?.id === ann.id"
                    [style.left.%]="coords.x * 100"
                    [style.top.%]="coords.y * 100"
                    [style.width.%]="coords.width * 100"
                    [style.height.%]="coords.height * 100"
                    (click)="selectAnnotation(ann, $event)"
                  >
                    <div class="box-badge">
                      <span class="badge-author">{{ ann.author.fullName.split(' ')[0] }}</span>
                      @if (ann.comments && ann.comments.length > 0) {
                        <span class="badge-count">💬 {{ ann.comments.length }}</span>
                      }
                    </div>
                  </div>
                }
              }

              <!-- Recuadro temporal mientras el usuario arrastra el cursor -->
              @if (currentBox()) {
                <div
                  class="annotation-box drawing"
                  [style.left.%]="currentBox()!.x * 100"
                  [style.top.%]="currentBox()!.y * 100"
                  [style.width.%]="currentBox()!.width * 100"
                  [style.height.%]="currentBox()!.height * 100"
                >
                  <span class="box-dimensions-label">
                    {{ (currentBox()!.width * 100) | number:'1.0-0' }}% × {{ (currentBox()!.height * 100) | number:'1.0-0' }}%
                  </span>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Panel Lateral de Discusión y Comentarios Contextuales -->
        <div class="discussion-panel">
          <!-- CASO 1: Hay una región seleccionada y se visualiza su discusión completa -->
          @if (selectedAnnotation(); as ann) {
            <div class="annotation-discussion-card">
              <div class="discussion-header">
                <div class="author-info-group">
                  <div class="author-avatar-badge">🔬</div>
                  <div>
                    <strong>{{ ann.author.fullName }}</strong>
                    <small class="meta-date">{{ ann.createdAt | date:'d MMM yyyy, h:mm a' }}</small>
                  </div>
                </div>
                <button
                  class="btn-delete-ann"
                  (click)="deleteAnnotation(ann)"
                  title="Eliminar esta anotación"
                >
                  🗑️
                </button>
              </div>

              <!-- Observación Principal -->
              <div class="observation-box">
                <span class="observation-title">Observación en Región:</span>
                <p class="observation-content">{{ ann.noteContent }}</p>
              </div>

              <!-- Lista de Comentarios y Respuestas Reales -->
              <div class="comments-section">
                <div class="comments-header">
                  <h6>Discusión Científica ({{ (ann.comments?.length || 0) }})</h6>
                </div>

                <div class="comments-list">
                  @for (c of ann.comments || []; track c.id) {
                    <div class="comment-bubble">
                      <div class="comment-bubble-header">
                        <strong>{{ c.author.fullName }}</strong>
                        <small>{{ c.createdAt | date:'shortTime' }}</small>
                      </div>
                      <p class="comment-text">{{ c.content }}</p>
                    </div>
                  } @empty {
                    <div class="empty-comments-notice">
                      <span>No hay respuestas aún en esta región. Aporta una hipótesis o análisis a continuación.</span>
                    </div>
                  }
                </div>

                <!-- Input para agregar Comentario con Dictado por Voz Whisper -->
                <div class="add-comment-row">
                  <div class="input-with-voice">
                    <input
                      type="text"
                      [(ngModel)]="newCommentText"
                      (keyup.enter)="submitComment()"
                      placeholder="Escribe o dicta tu respuesta o análisis..."
                    />
                    <app-voice-input-btn
                      [compact]="true"
                      [tooltip]="'Dictar respuesta por voz con Whisper'"
                      (textTranscribed)="onVoiceComment($event)"
                    />
                  </div>
                  <button
                    class="btn-send-comment"
                    (click)="submitComment()"
                    [disabled]="!newCommentText.trim() || isSubmittingComment"
                  >
                    {{ isSubmittingComment ? 'Guardando...' : 'Comentar' }}
                  </button>
                </div>
              </div>
            </div>
          } @else if (pendingBox()) {
            <!-- CASO 2: Se acaba de dibujar una nueva región y se pide la observación inicial -->
            <div class="new-region-card">
              <div class="new-region-header">
                <h5>✨ Nueva Región Seleccionada</h5>
                <app-voice-input-btn
                  [tooltip]="'Dictar observación inicial por voz con Whisper'"
                  (textTranscribed)="onVoiceNewNote($event)"
                />
              </div>

              <p class="new-region-hint">
                Has delimitado una región de interés ({{ (pendingBox()!.width * 100) | number:'1.0-0' }}% × {{ (pendingBox()!.height * 100) | number:'1.0-0' }}%).
                ¿Qué observas o deseas discutir con los investigadores del consorcio?
              </p>

              <textarea
                [(ngModel)]="newNoteContent"
                rows="4"
                placeholder="Ejemplo: 'Se observa una aglomeración fibrilar anómala en este cuadrante. ¿Corresponde a precipitación de sales o a una densidad localizada de nanocelulosa?'"
              ></textarea>

              <div class="new-region-actions">
                <button class="btn-cancel" (click)="cancelNewBox()">Descartar Región</button>
                <button
                  class="btn-save"
                  (click)="saveAnnotation()"
                  [disabled]="!newNoteContent.trim() || isSavingAnnotation"
                >
                  {{ isSavingAnnotation ? 'Guardando...' : 'Guardar y Abrir Discusión' }}
                </button>
              </div>
            </div>
          } @else {
            <!-- CASO 3: Estado de Espera (Instrucciones Claras) -->
            <div class="empty-state-card">
              <div class="empty-state-icon">🎯</div>
              <h4>Seleccionador de Imagen Listo</h4>
              <p>Arrastra con el puntero sobre cualquier detalle de la micrografía para crear un recuadro de interés.</p>
              <div class="existing-regions-summary">
                <strong>Regiones marcadas en esta muestra ({{ currentImageAnnotations().length }}):</strong>
                <div class="regions-pill-list">
                  @for (ann of currentImageAnnotations(); track ann.id) {
                    <button class="btn-region-pill" (click)="selectedAnnotation.set(ann)">
                      📍 {{ ann.noteContent | slice:0:38 }}... ({{ ann.comments?.length || 0 }} comentarios)
                    </button>
                  } @empty {
                    <small class="no-regions">Aún no hay regiones marcadas en esta imagen.</small>
                  }
                </div>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .annotator-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #0f172a;
    }

    /* Barra Superior de Muestras */
    .samples-selector-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 12px 18px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }
    .selector-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .selector-icon {
      font-size: 22px;
    }
    .sample-desc {
      display: block;
      font-size: 12px;
      color: #64748b;
    }
    .sample-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .btn-sample-chip {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      color: #334155;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-sample-chip:hover {
      background: #e2e8f0;
      border-color: #94a3b8;
    }
    .btn-sample-chip.active {
      background: #0f172a;
      border-color: #0f172a;
      color: #ffffff;
      font-weight: 600;
    }
    .btn-upload-label {
      background: #f8fafc;
      border: 1px dashed #0284c7;
      color: #0284c7;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-upload-label:hover {
      background: #e0f2fe;
    }

    /* Layout Principal */
    .annotator-layout {
      display: flex;
      gap: 20px;
      align-items: flex-start;
    }
    @media (max-width: 960px) {
      .annotator-layout {
        flex-direction: column;
      }
    }

    /* Columna del Visor */
    .image-viewer-column {
      flex: 1.4;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .toolbar-hint {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 12px;
      color: #475569;
    }
    .hint-badge {
      background: #dbeafe;
      color: #1e40af;
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: 600;
      font-size: 11px;
    }

    .image-viewport-wrapper {
      position: relative;
      background: #091224;
      border: 2px solid #cbd5e1;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
      user-select: none;
      -webkit-user-select: none;
      display: inline-block;
      width: 100%;
    }
    .scientific-image {
      display: block;
      width: 100%;
      height: auto;
      max-height: 580px;
      object-fit: contain;
      user-select: none;
      -webkit-user-drag: none;
      pointer-events: none;
    }

    /* Capa de Dibujo Interactivo */
    .drawing-surface {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      cursor: crosshair;
      touch-action: none;
      z-index: 10;
    }

    /* Cajas de Anotación */
    .annotation-box {
      position: absolute;
      border: 2px solid #fbbf24;
      background: rgba(251, 191, 36, 0.22);
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.15s ease-in-out;
      pointer-events: auto;
      z-index: 20;
    }
    .annotation-box:hover {
      background: rgba(251, 191, 36, 0.35);
      border-color: #f59e0b;
      box-shadow: 0 0 8px rgba(245, 158, 11, 0.6);
    }
    .annotation-box.selected {
      border: 2px solid #2563eb;
      background: rgba(37, 99, 235, 0.3);
      box-shadow: 0 0 12px rgba(37, 99, 235, 0.7);
      z-index: 30;
    }
    .annotation-box.drawing {
      border: 2px dashed #10b981;
      background: rgba(16, 185, 129, 0.25);
      pointer-events: none;
      z-index: 40;
    }
    .box-badge {
      position: absolute;
      bottom: -1px;
      left: -1px;
      background: #0f172a;
      color: #ffffff;
      font-size: 10px;
      padding: 1px 6px;
      border-radius: 0 4px 0 3px;
      display: flex;
      gap: 4px;
      font-weight: 600;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    }
    .badge-count {
      color: #f59e0b;
    }
    .box-dimensions-label {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(15, 23, 42, 0.85);
      color: #ffffff;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
    }

    /* Panel de Discusión */
    .discussion-panel {
      flex: 1;
      min-width: 340px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .annotation-discussion-card, .new-region-card, .empty-state-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 18px;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.05);
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    /* Discusión de Anotación Activa */
    .discussion-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 10px;
    }
    .author-info-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .author-avatar-badge {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: #e0f2fe;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    }
    .meta-date {
      display: block;
      font-size: 11px;
      color: #64748b;
    }
    .btn-delete-ann {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 15px;
      padding: 4px 8px;
      border-radius: 6px;
      transition: background 0.2s;
    }
    .btn-delete-ann:hover {
      background: #fee2e2;
    }

    .observation-box {
      background: #f8fafc;
      border-left: 4px solid #2563eb;
      padding: 10px 14px;
      border-radius: 0 8px 8px 0;
    }
    .observation-title {
      display: block;
      font-size: 11px;
      color: #1e40af;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .observation-content {
      margin: 0;
      font-size: 13px;
      line-height: 1.5;
      color: #1e293b;
    }

    /* Hilo de Comentarios */
    .comments-section {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .comments-header h6 {
      margin: 0;
      font-size: 13px;
      color: #0f172a;
      font-weight: 700;
    }
    .comments-list {
      max-height: 220px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding-right: 4px;
    }
    .comment-bubble {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 8px 12px;
    }
    .comment-bubble-header {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #64748b;
      margin-bottom: 4px;
    }
    .comment-bubble-header strong {
      color: #0f172a;
    }
    .comment-text {
      margin: 0;
      font-size: 13px;
      color: #334155;
      line-height: 1.4;
    }
    .empty-comments-notice {
      padding: 16px;
      text-align: center;
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: 8px;
      font-size: 12px;
      color: #64748b;
    }

    .add-comment-row {
      display: flex;
      gap: 8px;
      margin-top: 4px;
    }
    .input-with-voice {
      flex: 1;
      position: relative;
      display: flex;
      align-items: center;
    }
    .input-with-voice input {
      width: 100%;
      padding: 8px 36px 8px 12px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 13px;
      outline: none;
      box-sizing: border-box;
    }
    .input-with-voice input:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
    }
    .input-with-voice app-voice-input-btn {
      position: absolute;
      right: 6px;
    }
    .btn-send-comment {
      background: #1e3a8a;
      color: #ffffff;
      border: none;
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.2s;
    }
    .btn-send-comment:hover:not(:disabled) {
      background: #1d4ed8;
    }
    .btn-send-comment:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Formulario Nueva Región */
    .new-region-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .new-region-header h5 {
      margin: 0;
      color: #0f172a;
      font-size: 15px;
    }
    .new-region-hint {
      font-size: 12px;
      color: #64748b;
      margin: 0;
      line-height: 1.4;
    }
    .new-region-card textarea {
      width: 100%;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 10px;
      font-size: 13px;
      font-family: inherit;
      resize: vertical;
      box-sizing: border-box;
      outline: none;
    }
    .new-region-card textarea:focus {
      border-color: #10b981;
      box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.15);
    }
    .new-region-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }
    .btn-cancel {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      color: #475569;
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
    }
    .btn-cancel:hover {
      background: #e2e8f0;
    }
    .btn-save {
      background: #10b981;
      color: #ffffff;
      border: none;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn-save:hover:not(:disabled) {
      background: #059669;
    }
    .btn-save:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Estado Vacío */
    .empty-state-card {
      text-align: center;
      padding: 30px 20px;
      align-items: center;
    }
    .empty-state-icon {
      font-size: 36px;
    }
    .empty-state-card h4 {
      margin: 0;
      color: #0f172a;
      font-size: 16px;
    }
    .empty-state-card p {
      margin: 0;
      font-size: 13px;
      color: #64748b;
      line-height: 1.4;
      max-width: 280px;
    }
    .existing-regions-summary {
      width: 100%;
      text-align: left;
      border-top: 1px solid #f1f5f9;
      padding-top: 12px;
      margin-top: 6px;
    }
    .existing-regions-summary strong {
      font-size: 12px;
      color: #334155;
    }
    .regions-pill-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 8px;
    }
    .btn-region-pill {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      color: #1e293b;
      padding: 7px 10px;
      border-radius: 6px;
      font-size: 12px;
      text-align: left;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-region-pill:hover {
      background: #e0f2fe;
      border-color: #7dd3fc;
      color: #0369a1;
    }
    .no-regions {
      font-size: 11px;
      color: #94a3b8;
    }
  `]
})
export class ImageAnnotatorComponent implements OnInit {
  private annotationService = inject(AnnotationService);
  private authService = inject(AuthService);

  @ViewChild('drawingSurface') drawingSurfaceRef!: ElementRef<HTMLDivElement>;
  @ViewChild('imageElement') imageElementRef!: ElementRef<HTMLImageElement>;

  // Galería de Muestras Experimentales del Consorcio C3
  sampleImages: ScientificSampleImage[] = [
    {
      id: 'sample-sem-nanocelulosa',
      resourceId: 'res-img-1',
      title: 'Micrografía SEM: Red Fibrilar de Nanocelulosa',
      description: 'Microscopía electrónica de barrido de membrana celulósica sintetizada por Komagataeibacter xylinus.',
      url: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=1200&q=80'
    },
    {
      id: 'sample-fluorescencia-mtt',
      resourceId: 'res-img-2',
      title: 'Ensayo Citotoxicidad: Fluorescencia 48h',
      description: 'Tinción con Live/Dead en fibroblastos sembrados sobre matriz de biomaterial.',
      url: 'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?auto=format&fit=crop&w=1200&q=80'
    },
    {
      id: 'sample-gel-electroforesis',
      resourceId: 'res-img-3',
      title: 'Electroforesis en Gel: Digestión Enzimática',
      description: 'Gel de agarosa con bandas de corte para confirmación de plásmidos.',
      url: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?auto=format&fit=crop&w=1200&q=80'
    }
  ];

  currentSample = signal<ScientificSampleImage>(this.sampleImages[0]);
  annotations = signal<ScientificAnnotation[]>([]);
  selectedAnnotation = signal<ScientificAnnotation | null>(null);

  // Anotaciones filtradas para la muestra actual
  currentImageAnnotations = computed(() => {
    return this.annotations().filter(a => a.resourceId === this.currentSample().resourceId);
  });

  // Estado del puntero y selección
  isDrawing = false;
  pointerId: number | null = null;
  startNormalizedX = 0;
  startNormalizedY = 0;

  currentBox = signal<ImageCoordinates | null>(null);
  pendingBox = signal<ImageCoordinates | null>(null);

  newNoteContent = '';
  newCommentText = '';
  isSavingAnnotation = false;
  isSubmittingComment = false;

  ngOnInit(): void {
    this.loadAnnotations();
  }

  loadAnnotations(): void {
    this.annotationService.getAnnotationsByResource(this.currentSample().resourceId).subscribe({
      next: (list) => {
        this.annotations.set(list);
        if (list.length > 0 && !this.selectedAnnotation()) {
          this.selectedAnnotation.set(list[0]);
        }
      },
      error: () => {}
    });
  }

  selectSample(sample: ScientificSampleImage): void {
    this.currentSample.set(sample);
    this.selectedAnnotation.set(null);
    this.pendingBox.set(null);
    this.currentBox.set(null);
    this.loadAnnotations();
  }

  onCustomImageUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        const customSample: ScientificSampleImage = {
          id: 'custom-' + Date.now(),
          resourceId: 'custom-res-' + Date.now(),
          title: 'Imagen Subida: ' + file.name,
          description: 'Muestra personalizada cargada localmente para análisis de regiones.',
          url: e.target?.result as string
        };
        this.sampleImages.unshift(customSample);
        this.selectSample(customSample);
      };
      reader.readAsDataURL(file);
    }
  }

  onImageLoaded(): void {
    // Si hay anotaciones previas, asegurarse de que las cajas calcen
  }

  getBoxCoords(ann: ScientificAnnotation): ImageCoordinates | null {
    if (ann.targetType === 'IMAGE_REGION' && ann.coordinates) {
      return ann.coordinates as ImageCoordinates;
    }
    return null;
  }

  selectAnnotation(ann: ScientificAnnotation, event: MouseEvent): void {
    event.stopPropagation();
    this.selectedAnnotation.set(ann);
    this.pendingBox.set(null);
  }

  // ==============================================================================
  // GESTIÓN ROBUSTA DE PUNTERO / DIBUJO DE RECUADRO CON POINTER EVENTS
  // ==============================================================================

  onPointerDown(event: PointerEvent): void {
    // Deseleccionar anotación previa para permitir nuevo dibujo
    this.selectedAnnotation.set(null);
    this.pendingBox.set(null);

    const surface = this.drawingSurfaceRef?.nativeElement;
    if (!surface) return;

    this.isDrawing = true;
    this.pointerId = event.pointerId;
    surface.setPointerCapture(event.pointerId);

    const rect = surface.getBoundingClientRect();
    const clientX = Math.max(rect.left, Math.min(event.clientX, rect.right));
    const clientY = Math.max(rect.top, Math.min(event.clientY, rect.bottom));

    this.startNormalizedX = (clientX - rect.left) / rect.width;
    this.startNormalizedY = (clientY - rect.top) / rect.height;

    this.currentBox.set({
      x: this.startNormalizedX,
      y: this.startNormalizedY,
      width: 0,
      height: 0
    });
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.isDrawing) return;

    const surface = this.drawingSurfaceRef?.nativeElement;
    if (!surface) return;

    const rect = surface.getBoundingClientRect();
    const clientX = Math.max(rect.left, Math.min(event.clientX, rect.right));
    const clientY = Math.max(rect.top, Math.min(event.clientY, rect.bottom));

    const currentNormX = (clientX - rect.left) / rect.width;
    const currentNormY = (clientY - rect.top) / rect.height;

    const x = Math.min(this.startNormalizedX, currentNormX);
    const y = Math.min(this.startNormalizedY, currentNormY);
    const width = Math.abs(currentNormX - this.startNormalizedX);
    const height = Math.abs(currentNormY - this.startNormalizedY);

    this.currentBox.set({ x, y, width, height });
  }

  onPointerUp(event: PointerEvent): void {
    if (!this.isDrawing) return;
    this.isDrawing = false;

    const surface = this.drawingSurfaceRef?.nativeElement;
    if (surface && this.pointerId !== null) {
      try {
        surface.releasePointerCapture(this.pointerId);
      } catch {}
      this.pointerId = null;
    }

    const box = this.currentBox();
    // Umbral mínimo: debe medir al menos 2% de ancho y alto para no tomar clics accidentales
    if (box && box.width > 0.02 && box.height > 0.02) {
      this.pendingBox.set(box);
    }
    this.currentBox.set(null);
  }

  onPointerCancel(event: PointerEvent): void {
    this.isDrawing = false;
    this.currentBox.set(null);
    this.pointerId = null;
  }

  // ==============================================================================
  // CREACIÓN Y GUARDADO DE ANOTACIONES Y COMENTARIOS
  // ==============================================================================

  onVoiceNewNote(text: string): void {
    if (this.newNoteContent.trim()) {
      this.newNoteContent += ' ' + text;
    } else {
      this.newNoteContent = text;
    }
  }

  onVoiceComment(text: string): void {
    if (this.newCommentText.trim()) {
      this.newCommentText += ' ' + text;
    } else {
      this.newCommentText = text;
    }
  }

  cancelNewBox(): void {
    this.pendingBox.set(null);
    this.newNoteContent = '';
  }

  saveAnnotation(): void {
    const box = this.pendingBox();
    if (!box || !this.newNoteContent.trim()) return;

    this.isSavingAnnotation = true;

    this.annotationService.createAnnotation({
      resource_id: this.currentSample().resourceId,
      target_type: 'IMAGE_REGION',
      coordinates: box,
      note_content: this.newNoteContent.trim()
    }).subscribe({
      next: (created) => {
        this.isSavingAnnotation = false;
        this.annotations.update(prev => [...prev, created]);
        this.selectedAnnotation.set(created);
        this.pendingBox.set(null);
        this.newNoteContent = '';
      },
      error: () => {
        // En caso de error de red, crear copia en memoria local para no perder la sesión
        this.isSavingAnnotation = false;
        const user = this.authService.currentUser();
        const fallbackAnn: ScientificAnnotation = {
          id: `ann-${Date.now()}`,
          resourceId: this.currentSample().resourceId,
          author: {
            id: user?.id || 'u-user',
            fullName: user?.full_name || 'Investigador C3',
            email: user?.email || '',
            role: (user?.role as any) || 'RESEARCHER'
          },
          targetType: 'IMAGE_REGION',
          coordinates: box,
          noteContent: this.newNoteContent.trim(),
          commentsCount: 0,
          comments: [],
          createdAt: new Date().toISOString()
        };
        this.annotations.update(prev => [...prev, fallbackAnn]);
        this.selectedAnnotation.set(fallbackAnn);
        this.pendingBox.set(null);
        this.newNoteContent = '';
      }
    });
  }

  deleteAnnotation(ann: ScientificAnnotation): void {
    if (!confirm('¿Deseas eliminar esta anotación y sus comentarios?')) return;
    this.annotationService.deleteAnnotation(ann.id).subscribe({
      next: () => {
        this.annotations.update(list => list.filter(a => a.id !== ann.id));
        this.selectedAnnotation.set(null);
      },
      error: () => {
        this.annotations.update(list => list.filter(a => a.id !== ann.id));
        this.selectedAnnotation.set(null);
      }
    });
  }

  submitComment(): void {
    const content = this.newCommentText.trim();
    const current = this.selectedAnnotation();
    if (!content || !current) return;

    this.isSubmittingComment = true;

    this.annotationService.addComment(current.id, content).subscribe({
      next: (newComment) => {
        this.isSubmittingComment = false;
        this.newCommentText = '';

        // Actualizar el hilo de la anotación seleccionada
        if (!current.comments) {
          current.comments = [];
        }
        current.comments.push(newComment);
        current.commentsCount = current.comments.length;

        // Forzar actualización de la señal inmutablemente
        this.selectedAnnotation.set({ ...current });
        this.annotations.update(list => list.map(a => a.id === current.id ? { ...current } : a));
      },
      error: () => {
        this.isSubmittingComment = false;
        // Fallback local garantizado
        const user = this.authService.currentUser();
        const fallbackComment: ThreadComment = {
          id: `c-${Date.now()}`,
          author: {
            id: user?.id || 'u-user',
            fullName: user?.full_name || 'Investigador Titular',
            email: user?.email || 'investigador@c3.unam.mx',
            role: (user?.role as any) || 'RESEARCHER'
          },
          content: content,
          createdAt: new Date().toISOString(),
          replies: []
        };
        if (!current.comments) current.comments = [];
        current.comments.push(fallbackComment);
        current.commentsCount = current.comments.length;

        this.selectedAnnotation.set({ ...current });
        this.annotations.update(list => list.map(a => a.id === current.id ? { ...current } : a));
        this.newCommentText = '';
      }
    });
  }
}
