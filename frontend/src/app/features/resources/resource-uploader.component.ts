import { Component, inject, signal, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ResourceService, ScientificResource } from '../../core/services/resource.service';

export interface BatchQueueItem {
  id: string;
  file: File;
  title: string;
  authors: string;
  doi: string;
  tags: string[];
  status: 'DETECTING' | 'READY' | 'UPLOADING' | 'DONE' | 'ERROR';
  errorMessage?: string;
  extractionMode?: string;
  isDuplicate?: boolean;
}

@Component({
  selector: 'app-resource-uploader',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="uploader-container">
      <!-- Encabezado Institucional -->
      <div class="uploader-header">
        <div>
          <h3>📥 Repositorio y Carga de Materiales Científicos</h3>
          <p>Sube artículos individuales o en lote (PDFs), fotografías/micrografías o notas de voz para discusión asíncrona.</p>
        </div>
      </div>

      <!-- Selector de Tipo de Recurso -->
      <div class="type-selector">
        <button
          [class.active]="selectedType() === 'PDF'"
          (click)="setType('PDF')"
        >
          📄 Artículos Científicos (PDF / Carga Múltiple)
        </button>
        <button
          [class.active]="selectedType() === 'IMAGE'"
          (click)="setType('IMAGE')"
        >
          🖼️ Fotografía / Micrografía
        </button>
        <button
          [class.active]="selectedType() === 'AUDIO'"
          (click)="setType('AUDIO')"
        >
          🎙️ Nota de Voz Científica
        </button>
      </div>

      <!-- Formulario Dinámico según el Tipo -->
      <div class="upload-form-card">
        <!-- ============================================== -->
        <!-- 1. CASO PDF: CARGA MÚLTIPLE / EN LOTE          -->
        <!-- ============================================== -->
        @if (selectedType() === 'PDF') {
          <!-- Dropzone para arrastrar o seleccionar 1 o varios PDFs -->
          <div
            class="file-dropzone"
            [class.drag-over]="isDragOver()"
            [class.has-queue]="batchQueue().length > 0"
            (dragover)="onDragOver($event)"
            (dragleave)="onDragLeave($event)"
            (drop)="onFilesDropped($event)"
          >
            <input
              type="file"
              accept="application/pdf"
              multiple
              (change)="onFilesSelected($event)"
              id="pdfMultiInput"
            />
            <label for="pdfMultiInput" class="dropzone-label">
              <span class="icon">📚</span>
              <span class="file-name-text">
                Haz clic o arrastra uno o varios artículos PDF aquí
              </span>
              <small>
                ✨ Soporta selección múltiple simultánea con extracción automática de título, autores y DOI mediante IA para el RAG
              </small>
            </label>
          </div>

          <!-- Cola de Artículos Seleccionados para Carga Múltiple -->
          @if (batchQueue().length > 0) {
            <div class="batch-queue-section">
              <div class="queue-toolbar">
                <div class="queue-stats">
                  <strong>📋 Artículos en cola de carga:</strong>
                  <span class="stat-pill">{{ batchQueue().length }} archivo(s)</span>
                  <span class="stat-pill-sub">{{ getBatchTotalSize() }}</span>
                </div>
                <div class="queue-actions">
                  <label for="pdfMultiInput" class="btn-add-more">
                    + Agregar más PDFs
                  </label>
                  <button
                    class="btn-clear-queue"
                    (click)="clearQueue()"
                    [disabled]="isUploading()"
                  >
                    Limpiar cola
                  </button>
                </div>
              </div>

              <!-- Tabla de Items en Cola -->
              <div class="queue-table-wrapper">
                <table class="queue-table">
                  <thead>
                    <tr>
                      <th style="width: 25%;">Archivo</th>
                      <th style="width: 32%;">Título Detectado (Editable)</th>
                      <th style="width: 23%;">Autores & DOI</th>
                      <th style="width: 15%;">Estado IA</th>
                      <th style="width: 5%; text-align: center;">Quitar</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (item of batchQueue(); track item.id; let i = $index) {
                      <tr [class.done]="item.status === 'DONE'">
                        <!-- Columna Archivo -->
                        <td>
                          <div class="file-col">
                            <span class="pdf-icon">📄</span>
                            <div class="file-meta">
                              <span class="file-name" [title]="item.file.name">{{ item.file.name }}</span>
                              <span class="file-size">{{ formatBytes(item.file.size) }}</span>
                            </div>
                          </div>
                        </td>

                        <!-- Columna Título Editable -->
                        <td>
                          <input
                            type="text"
                            class="input-table-title"
                            [(ngModel)]="item.title"
                            placeholder="Título del artículo..."
                            [disabled]="isUploading() || item.status === 'DONE'"
                          />
                        </td>

                        <!-- Columna Autores & DOI -->
                        <td>
                          <input
                            type="text"
                            class="input-table-authors"
                            [(ngModel)]="item.authors"
                            placeholder="Autores / Laboratorio..."
                            [disabled]="isUploading() || item.status === 'DONE'"
                          />
                          <input
                            type="text"
                            class="input-table-doi"
                            [(ngModel)]="item.doi"
                            placeholder="DOI (ej: 10.1016/...)"
                            [disabled]="isUploading() || item.status === 'DONE'"
                          />
                        </td>

                        <!-- Columna Estado -->
                        <td>
                          @if (item.isDuplicate) {
                            <span class="badge-status duplicate" title="Ya existe en la biblioteca. Si se sube, el backend lo omitirá automáticamente para no duplicar datos ni vectores RAG.">
                              ⚠️ Ya en biblioteca
                            </span>
                          }
                          @if (item.status === 'DETECTING') {
                            <span class="badge-status detecting">
                              <span class="spinner-xs"></span> Detectando IA...
                            </span>
                          } @else if (item.status === 'READY') {
                            <span class="badge-status ready">
                              ✓ Listo para indexar
                            </span>
                          } @else if (item.status === 'UPLOADING') {
                            <span class="badge-status uploading">
                              <span class="spinner-xs"></span> Subiendo...
                            </span>
                          } @else if (item.status === 'DONE') {
                            <span class="badge-status done">
                              🎉 Indexado en RAG
                            </span>
                          } @else if (item.status === 'ERROR') {
                            <span class="badge-status error">
                              ⚠️ Error
                            </span>
                          }
                        </td>

                        <!-- Columna Quitar -->
                        <td style="text-align: center;">
                          <button
                            class="btn-remove-row"
                            (click)="removeFromQueue(item.id)"
                            [disabled]="isUploading() || item.status === 'DONE'"
                            title="Quitar este archivo de la cola"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              <!-- Barra de Progreso General -->
              @if (isUploading()) {
                <div class="upload-progress-box">
                  <div class="progress-bar-bg">
                    <div class="progress-bar-fill" [style.width.%]="uploadProgress()"></div>
                  </div>
                  <span class="progress-text">
                    Subiendo e indexando en el consorcio... ({{ uploadProgress() }}%)
                  </span>
                </div>
              }

              <!-- Botón Principal de Subida por Lote -->
              <div class="batch-footer-actions">
                <button
                  class="btn-submit-batch"
                  (click)="submitBatchUpload()"
                  [disabled]="isUploading() || batchQueue().length === 0 || hasAnalyzingItems()"
                >
                  @if (isUploading()) {
                    <span class="spinner-inline"></span> Subiendo e Indexando {{ batchQueue().length }} Artículos...
                  } @else {
                    🚀 Subir e Indexar {{ batchQueue().length }} Artículo(s) al Consorcio
                  }
                </button>
              </div>
            </div>
          }

          <!-- Mensaje de Éxito de Carga -->
          @if (uploadSuccessMessage()) {
            <div class="alert-success">
              <div class="alert-content">
                <span class="alert-icon">✅</span>
                <span>{{ uploadSuccessMessage() }}</span>
              </div>
              <button class="btn-goto-library" (click)="navigateToLibrary.emit()">
                📚 Ir a la Biblioteca de Artículos &rarr;
              </button>
            </div>
          }
        }

        <!-- ============================================== -->
        <!-- 2. CASO NO PDF: IMAGEN O NOTA DE VOZ           -->
        <!-- ============================================== -->
        @if (selectedType() !== 'PDF') {
          <div class="form-group">
            <label>Título del Recurso:</label>
            <input
              type="text"
              [(ngModel)]="resourceTitle"
              placeholder="Ej: Ensayo de caracterización reológica muestra B-12"
            />
          </div>

          <!-- CASO IMAGEN -->
          @if (selectedType() === 'IMAGE') {
            <div class="file-dropzone">
              <input type="file" accept="image/*" (change)="onSingleFileSelected($event)" id="imgInput" />
              <label for="imgInput" class="dropzone-label">
                <span class="icon">🖼️</span>
                <span>{{ selectedSingleFile ? selectedSingleFile.name : 'Seleccionar fotografía o micrografía' }}</span>
                <small>Formatos: JPEG, PNG, WebP, TIFF</small>
              </label>
            </div>
            @if (imagePreviewUrl()) {
              <div class="preview-box">
                <img [src]="imagePreviewUrl()" alt="Previsualización" />
              </div>
            }
          }

          <!-- CASO AUDIO / NOTA DE VOZ -->
          @if (selectedType() === 'AUDIO') {
            <div class="voice-recorder-box">
              <div class="recorder-actions">
                @if (!isRecording()) {
                  <button class="btn-record" (click)="startAudioRecording()">
                    🔴 Grabar con Micrófono
                  </button>
                } @else {
                  <button class="btn-stop" (click)="stopAudioRecording()">
                    ⏹️ Finalizar Grabación ({{ recordingDuration() }}s)
                  </button>
                }

                <span class="separator">ó bien</span>

                <input type="file" accept="audio/*" (change)="onSingleFileSelected($event)" id="audioFileInput" />
                <label for="audioFileInput" class="btn-file-audio">
                  📁 Subir archivo de audio
                </label>
              </div>

              @if (audioBlobUrl()) {
                <div class="audio-playback-preview">
                  <span>Escuchar audio antes de subir:</span>
                  <audio [src]="audioBlobUrl()" controls></audio>
                </div>
              }

              <p class="whisper-hint">
                ✨ <em>OpenAI Whisper transcribirá automáticamente este audio para que pueda ser citado y buscado en el RAG.</em>
              </p>
            </div>
          }

          <!-- Botón de Envío Individual -->
          <div class="form-footer">
            <button
              class="btn-submit"
              (click)="submitSingleUpload()"
              [disabled]="isUploading() || !resourceTitle.trim() || (!selectedSingleFile && !recordedAudioBlob)"
            >
              @if (isUploading()) {
                <span class="spinner-inline"></span> Procesando y almacenando...
              } @else {
                Subir y Compartir con el Consorcio
              }
            </button>
          </div>

          @if (uploadSuccessMessage()) {
            <div class="alert-success">
              <div class="alert-content">
                <span class="alert-icon">✅</span>
                <span>{{ uploadSuccessMessage() }}</span>
              </div>
              <button class="btn-goto-library" (click)="navigateToLibrary.emit()">
                📚 Ir a la Biblioteca de Artículos &rarr;
              </button>
            </div>
          }
        }
      </div>

      <!-- Lista de Recursos Subidos Recientemente -->
      <div class="resources-list-section">
        <h4>📚 Materiales Compartidos Recientemente en el Consorcio</h4>
        <div class="resources-grid">
          @for (res of recentResources(); track res.id) {
            <div class="resource-card">
              <div class="card-top">
                <span class="badge" [ngClass]="res.resource_type.toLowerCase()">
                  {{ res.resource_type }}
                </span>
                <span class="size-text">{{ formatBytes(res.file_size) }}</span>
              </div>
              <h5>{{ res.title }}</h5>
              <div class="card-meta">
                <span>Subido: {{ res.created_at | date:'shortDate' }}</span>
              </div>
              @if (res.transcript) {
                <div class="transcript-preview">
                  <strong>Transcripción:</strong>
                  <p>"{{ res.transcript | slice:0:100 }}..."</p>
                </div>
              }
              <div class="card-actions">
                <a [href]="resourceService.getResourceDownloadUrl(res.id)" target="_blank" class="btn-download">
                  ⬇️ Descargar
                </a>
              </div>
            </div>
          } @empty {
            <div class="empty-state">Aún no se han subido materiales en este espacio. ¡Sé el primero en compartir!</div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .uploader-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
      max-width: 1040px;
      margin: 0 auto;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #0f172a;
    }
    .uploader-header h3 {
      margin: 0 0 6px 0;
      font-size: 20px;
      color: #1e3a8a;
      font-weight: 700;
    }
    .uploader-header p {
      margin: 0;
      font-size: 14px;
      color: #64748b;
    }
    .type-selector {
      display: flex;
      gap: 12px;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 12px;
    }
    .type-selector button {
      background: transparent;
      border: 1px solid #cbd5e1;
      padding: 9px 18px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      color: #475569;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .type-selector button:hover {
      background: #f1f5f9;
      color: #1e293b;
    }
    .type-selector button.active {
      background: #1e3a8a;
      border-color: #1e3a8a;
      color: #ffffff;
    }

    .upload-form-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }

    /* Dropzone Estilizado */
    .file-dropzone {
      border: 2px dashed #94a3b8;
      border-radius: 10px;
      padding: 26px 20px;
      text-align: center;
      background: #f8fafc;
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
    }
    .file-dropzone:hover, .file-dropzone.drag-over {
      border-color: #1e3a8a;
      background: #eff6ff;
    }
    .file-dropzone.has-queue {
      padding: 16px 20px;
      border-style: dashed;
      background: #fafaf9;
    }
    .file-dropzone input[type="file"] {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      cursor: pointer;
    }
    .dropzone-label {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      pointer-events: none;
    }
    .dropzone-label .icon {
      font-size: 32px;
    }
    .file-name-text {
      font-weight: 600;
      font-size: 15px;
      color: #1e293b;
    }
    .dropzone-label small {
      color: #64748b;
      font-size: 12px;
    }

    /* Sección de Cola por Lote */
    .batch-queue-section {
      display: flex;
      flex-direction: column;
      gap: 14px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 18px;
    }
    .queue-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }
    .queue-stats {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #1e293b;
    }
    .stat-pill {
      background: #e0e7ff;
      color: #3730a3;
      padding: 2px 8px;
      border-radius: 9999px;
      font-weight: 600;
      font-size: 12px;
    }
    .stat-pill-sub {
      color: #64748b;
      font-size: 12px;
    }
    .queue-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .btn-add-more {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #1e3a8a;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
    }
    .btn-add-more:hover {
      background: #f1f5f9;
    }
    .btn-clear-queue {
      background: transparent;
      border: 1px solid #fca5a5;
      color: #dc2626;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
      transition: background 0.15s;
    }
    .btn-clear-queue:hover:not(:disabled) {
      background: #fee2e2;
    }

    /* Tabla de Cola */
    .queue-table-wrapper {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      overflow-x: auto;
      max-height: 380px;
      overflow-y: auto;
    }
    .queue-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      text-align: left;
    }
    .queue-table th {
      background: #f1f5f9;
      color: #475569;
      font-weight: 600;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 10px 12px;
      border-bottom: 1px solid #cbd5e1;
      position: sticky;
      top: 0;
      z-index: 2;
    }
    .queue-table td {
      padding: 10px 12px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: middle;
    }
    .queue-table tr:last-child td {
      border-bottom: none;
    }
    .queue-table tr.done {
      background: #f0fdf4;
    }

    .file-col {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .pdf-icon {
      font-size: 20px;
    }
    .file-meta {
      display: flex;
      flex-direction: column;
      max-width: 180px;
    }
    .file-name {
      font-weight: 600;
      color: #0f172a;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-size: 12px;
    }
    .file-size {
      font-size: 11px;
      color: #64748b;
    }

    .input-table-title {
      width: 100%;
      box-sizing: border-box;
      padding: 6px 8px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 12px;
      color: #0f172a;
      font-weight: 500;
    }
    .input-table-authors {
      width: 100%;
      box-sizing: border-box;
      padding: 5px 8px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 11px;
      color: #334155;
      margin-bottom: 4px;
    }
    .input-table-doi {
      width: 100%;
      box-sizing: border-box;
      padding: 3px 8px;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      font-size: 10px;
      color: #64748b;
      font-family: monospace;
    }

    .badge-status {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 4px;
      font-weight: 600;
      white-space: nowrap;
    }
    .badge-status.detecting {
      background: #eff6ff;
      color: #1e40af;
      border: 1px solid #bfdbfe;
    }
    .badge-status.ready {
      background: #f1f5f9;
      color: #334155;
      border: 1px solid #cbd5e1;
    }
    .badge-status.uploading {
      background: #fef3c7;
      color: #92400e;
      border: 1px solid #fde68a;
    }
    .badge-status.done {
      background: #dcfce7;
      color: #166534;
      border: 1px solid #bbf7d0;
    }
    .badge-status.error {
      background: #fee2e2;
      color: #991b1b;
      border: 1px solid #fca5a5;
    }
    .badge-status.duplicate {
      background: #fef9c3;
      color: #854d0e;
      border: 1px solid #fde047;
      margin-bottom: 4px;
    }

    .btn-remove-row {
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 14px;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
    }
    .btn-remove-row:hover:not(:disabled) {
      color: #dc2626;
      background: #fee2e2;
    }

    /* Barra de progreso de carga en lote */
    .upload-progress-box {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 8px 0;
    }
    .progress-bar-bg {
      width: 100%;
      height: 8px;
      background: #e2e8f0;
      border-radius: 4px;
      overflow: hidden;
    }
    .progress-bar-fill {
      height: 100%;
      background: #1e3a8a;
      transition: width 0.3s ease;
    }
    .progress-text {
      font-size: 12px;
      color: #1e3a8a;
      font-weight: 600;
      text-align: right;
    }

    .batch-footer-actions {
      display: flex;
      justify-content: flex-end;
    }
    .btn-submit-batch {
      background: #1e3a8a;
      color: #ffffff;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: background 0.15s;
    }
    .btn-submit-batch:hover:not(:disabled) {
      background: #1d4ed8;
    }
    .btn-submit-batch:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }

    /* Alerta de éxito */
    .alert-success {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      color: #065f46;
      padding: 14px 18px;
      border-radius: 8px;
      font-size: 13px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
    }
    .alert-content {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;
    }
    .alert-icon {
      font-size: 16px;
    }
    .btn-goto-library {
      background: #1e3a8a;
      color: #fff;
      border: none;
      padding: 7px 14px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
    }
    .btn-goto-library:hover {
      background: #1d4ed8;
    }

    /* Formulario no-pdf */
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .form-group label {
      font-size: 13px;
      font-weight: 600;
      color: #334155;
    }
    .form-group input[type="text"] {
      padding: 10px 14px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 14px;
      color: #0f172a;
    }
    .preview-box img {
      max-width: 100%;
      max-height: 240px;
      border-radius: 8px;
      object-fit: cover;
      display: block;
    }
    .voice-recorder-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      align-items: center;
    }
    .recorder-actions {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .btn-record {
      background: #dc2626;
      color: #fff;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-stop {
      background: #d97706;
      color: #fff;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-file-audio {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      color: #334155;
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
    }
    .whisper-hint {
      font-size: 12px;
      color: #64748b;
      margin: 0;
      text-align: center;
    }
    .form-footer {
      display: flex;
      justify-content: flex-end;
    }
    .btn-submit {
      background: #1e3a8a;
      color: #fff;
      border: none;
      padding: 11px 22px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-submit:hover:not(:disabled) {
      background: #1d4ed8;
    }
    .btn-submit:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }

    /* Recursos Recientes Grid */
    .resources-list-section h4 {
      margin: 0 0 16px 0;
      color: #0f172a;
      font-size: 17px;
      font-weight: 700;
    }
    .resources-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
    }
    .resource-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }
    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .card-top .badge {
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .card-top .badge.pdf {
      background: #eff6ff;
      color: #1e40af;
    }
    .card-top .badge.image {
      background: #ecfdf5;
      color: #065f46;
    }
    .card-top .badge.audio {
      background: #fdf2f8;
      color: #9d174d;
    }
    .size-text {
      font-size: 11px;
      color: #64748b;
    }
    .resource-card h5 {
      margin: 0;
      font-size: 14px;
      color: #0f172a;
      font-weight: 600;
      line-height: 1.35;
    }
    .card-meta {
      font-size: 12px;
      color: #64748b;
    }
    .transcript-preview {
      background: #f8fafc;
      padding: 8px 10px;
      border-radius: 6px;
      font-size: 11px;
      color: #334155;
    }
    .transcript-preview p {
      margin: 4px 0 0 0;
      font-style: italic;
    }
    .card-actions {
      margin-top: auto;
      display: flex;
      justify-content: flex-end;
    }
    .btn-download {
      font-size: 12px;
      color: #1e3a8a;
      text-decoration: none;
      font-weight: 600;
      padding: 4px 8px;
      border-radius: 4px;
      border: 1px solid #cbd5e1;
      background: #f8fafc;
    }
    .btn-download:hover {
      background: #e2e8f0;
    }
    .empty-state {
      grid-column: 1 / -1;
      padding: 30px;
      text-align: center;
      background: #ffffff;
      border-radius: 8px;
      color: #64748b;
      font-size: 14px;
      border: 1px dashed #cbd5e1;
    }

    /* Spinners */
    .spinner-xs {
      display: inline-block;
      width: 10px;
      height: 10px;
      border: 2px solid #1e40af;
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    .spinner-inline {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid #ffffff;
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class ResourceUploaderComponent implements OnDestroy {
  resourceService = inject(ResourceService);

  @Output() navigateToLibrary = new EventEmitter<void>();

  selectedType = signal<'PDF' | 'IMAGE' | 'AUDIO'>('PDF');

  // Cola de carga en lote para PDFs
  batchQueue = signal<BatchQueueItem[]>([]);
  isDragOver = signal<boolean>(false);
  uploadProgress = signal<number>(0);

  // Estados para caso de subida individual (imagen o audio)
  resourceTitle = '';
  selectedSingleFile: File | null = null;
  imagePreviewUrl = signal<string | null>(null);

  // Grabador de voz
  isRecording = signal<boolean>(false);
  recordingDuration = signal<number>(0);
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private durationInterval: any;
  recordedAudioBlob: Blob | null = null;
  audioBlobUrl = signal<string | null>(null);

  // Estados generales
  isUploading = signal<boolean>(false);
  uploadSuccessMessage = signal<string | null>(null);

  // Lista de recursos recientes
  recentResources = signal<ScientificResource[]>([
    {
      id: 'res-seed-1',
      space_id: 'space-general',
      uploader: {
        id: 'u1',
        full_name: 'Dr. Carlos Méndez',
        institution_name: 'UNAM'
      },
      title: 'Protocolo de Ensayo Térmico y Degradación.pdf',
      resource_type: 'PDF',
      storage_path: 'space-general/pdf/protocolo.pdf',
      mime_type: 'application/pdf',
      file_size: 2450000,
      metadata: { authors: 'Dr. Méndez, Dra. Ramos' },
      created_at: '2026-10-22T10:00:00Z'
    },
    {
      id: 'res-seed-2',
      space_id: 'space-general',
      uploader: {
        id: 'u2',
        full_name: 'Dra. Sofía Hernández',
        institution_name: 'UNAM'
      },
      title: 'Micrografía Electrónica Muestra 4B.png',
      resource_type: 'IMAGE',
      storage_path: 'space-general/image/micrografia.png',
      mime_type: 'image/png',
      file_size: 4800000,
      metadata: { resolution: '2048x1536' },
      created_at: '2026-10-21T18:30:00Z'
    }
  ]);

  setType(type: 'PDF' | 'IMAGE' | 'AUDIO') {
    this.selectedType.set(type);
    this.uploadSuccessMessage.set(null);
    this.selectedSingleFile = null;
    this.imagePreviewUrl.set(null);
  }

  // Manejo de drag and drop
  onDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.isDragOver.set(true);
  }

  onDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.isDragOver.set(false);
  }

  onFilesDropped(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.isDragOver.set(false);
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      this.handleIncomingFiles(Array.from(e.dataTransfer.files));
    }
  }

  onFilesSelected(event: any) {
    const files: FileList = event.target.files;
    if (!files || files.length === 0) return;
    this.handleIncomingFiles(Array.from(files));
    event.target.value = ''; // Limpiar para permitir re-seleccionar
  }

  handleIncomingFiles(files: File[]) {
    const pdfFiles = files.filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    if (pdfFiles.length === 0) {
      alert('Por favor selecciona archivos en formato PDF.');
      return;
    }

    this.uploadSuccessMessage.set(null);
    const existingPapers = this.resourceService.allPapersSignal();
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

    const newItems: BatchQueueItem[] = pdfFiles.map(file => {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      const rawTitle = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
      const isDup = existingPapers.some(p => 
        (p.title && normalize(p.title) === normalize(rawTitle)) ||
        (p.storage_path && p.storage_path.endsWith(file.name))
      );
      return {
        id: 'queue-' + Math.random().toString(36).substring(2, 9),
        file,
        title: rawTitle,
        authors: 'Extrayendo con IA...',
        doi: '',
        tags: ['Biomateriales', 'Metodología'],
        status: 'DETECTING',
        isDuplicate: isDup
      };
    });

    this.batchQueue.update(prev => [...prev, ...newItems]);

    // Disparar extracción automática individual para cada archivo
    newItems.forEach(item => {
      this.resourceService.extractMetadata(item.file).subscribe({
        next: (detected: any) => {
          this.batchQueue.update(list => list.map(it => {
            if (it.id === item.id) {
              const currentTitle = detected.title || it.title;
              const currentDoi = detected.doi || '';
              const isDup = existingPapers.some(p => 
                (p.metadata?.['doi'] && currentDoi && (p.metadata['doi'] as string).toLowerCase().trim() === currentDoi.toLowerCase().trim()) ||
                (p.title && normalize(p.title) === normalize(currentTitle)) ||
                (p.storage_path && p.storage_path.endsWith(item.file.name))
              );
              return {
                ...it,
                title: currentTitle,
                authors: detected.authors || 'Consorcio Científico C3',
                doi: currentDoi,
                tags: detected.tags && detected.tags.length > 0 ? detected.tags : it.tags,
                extractionMode: detected.extraction_mode || 'AI_LLM',
                status: 'READY',
                isDuplicate: isDup
              };
            }
            return it;
          }));
        },
        error: () => {
          this.batchQueue.update(list => list.map(it => {
            if (it.id === item.id) {
              return {
                ...it,
                authors: 'Consorcio Científico C3',
                status: 'READY'
              };
            }
            return it;
          }));
        }
      });
    });
  }

  removeFromQueue(id: string) {
    this.batchQueue.update(list => list.filter(it => it.id !== id));
  }

  clearQueue() {
    this.batchQueue.set([]);
    this.uploadSuccessMessage.set(null);
  }

  hasAnalyzingItems(): boolean {
    return this.batchQueue().some(it => it.status === 'DETECTING');
  }

  getBatchTotalSize(): string {
    const totalBytes = this.batchQueue().reduce((sum, item) => sum + item.file.size, 0);
    return this.formatBytes(totalBytes);
  }

  // Envío por lote
  submitBatchUpload() {
    const queue = this.batchQueue();
    if (queue.length === 0) return;

    this.isUploading.set(true);
    this.uploadSuccessMessage.set(null);
    this.uploadProgress.set(10);

    // Marcar items como subiendo
    this.batchQueue.update(list => list.map(it => ({ ...it, status: 'UPLOADING' })));

    const files = queue.map(it => it.file);
    const metadataList = queue.map(it => ({
      title: it.title,
      authors: it.authors,
      doi: it.doi,
      tags: it.tags,
      thumbnail_url: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=400&q=80'
    }));

    // Simulación de avance en progreso
    const progressTimer = setInterval(() => {
      this.uploadProgress.update(p => (p < 85 ? p + 15 : p));
    }, 400);

    this.resourceService.uploadBatch(files, 'space-general', metadataList).subscribe({
      next: (resp: any) => {
        clearInterval(progressTimer);
        this.uploadProgress.set(100);
        this.isUploading.set(false);

        // Actualizar estado de items
        this.batchQueue.update(list => list.map(it => ({ ...it, status: 'DONE' })));

        let msg = `¡Éxito! Se han procesado e indexado ${resp.uploaded_count} artículo(s) científico(s).`;
        if (resp.duplicates_skipped && resp.duplicates_skipped > 0) {
          msg += ` Se omitieron ${resp.duplicates_skipped} artículo(s) duplicado(s) automáticamente para proteger la biblioteca.`;
        }
        msg += ` Redirigiendo a la Biblioteca...`;
        this.uploadSuccessMessage.set(msg);

        if (resp.resources && resp.resources.length > 0) {
          this.recentResources.update(prev => [...resp.resources, ...prev]);
        }

        // Redirigir automáticamente a la Biblioteca de Artículos para que el usuario los vea de inmediato
        setTimeout(() => {
          this.navigateToLibrary.emit();
        }, 1200);
      },
      error: (err: any) => {
        clearInterval(progressTimer);
        this.isUploading.set(false);
        alert(`Error al subir artículos: ${err?.error?.detail || err.message}`);
      }
    });
  }

  // ============================================
  // Manejo de recursos únicos (Imagen / Audio)
  // ============================================
  onSingleFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;
    this.selectedSingleFile = file;

    if (!this.resourceTitle.trim()) {
      this.resourceTitle = file.name.replace(/\.[^/.]+$/, '');
    }

    if (this.selectedType() === 'IMAGE') {
      const reader = new FileReader();
      reader.onload = () => this.imagePreviewUrl.set(reader.result as string);
      reader.readAsDataURL(file);
    } else if (this.selectedType() === 'AUDIO') {
      this.audioBlobUrl.set(URL.createObjectURL(file));
      this.recordedAudioBlob = file;
    }
  }

  async startAudioRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) this.audioChunks.push(event.data);
      };

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.recordedAudioBlob = audioBlob;
        this.audioBlobUrl.set(URL.createObjectURL(audioBlob));
        if (!this.resourceTitle.trim()) {
          this.resourceTitle = `Nota de voz ${new Date().toLocaleDateString()}`;
        }
      };

      this.mediaRecorder.start();
      this.isRecording.set(true);
      this.recordingDuration.set(0);

      this.durationInterval = setInterval(() => {
        this.recordingDuration.update(d => d + 1);
      }, 1000);
    } catch (err) {
      alert('No se pudo acceder al micrófono del dispositivo.');
    }
  }

  stopAudioRecording() {
    if (this.mediaRecorder && this.isRecording()) {
      this.mediaRecorder.stop();
      this.isRecording.set(false);
      clearInterval(this.durationInterval);
    }
  }

  submitSingleUpload() {
    const title = this.resourceTitle.trim();
    if (!title) return;

    let fileToUpload: File | null = this.selectedSingleFile;

    if (this.selectedType() === 'AUDIO' && this.recordedAudioBlob && !fileToUpload) {
      fileToUpload = new File([this.recordedAudioBlob], `${title}.webm`, { type: 'audio/webm' });
    }

    if (!fileToUpload) return;

    this.isUploading.set(true);
    this.uploadSuccessMessage.set(null);

    this.resourceService.uploadResource(
      fileToUpload,
      title,
      this.selectedType(),
      'space-general',
      {}
    ).subscribe({
      next: (savedResource: any) => {
        this.recentResources.update(prev => [savedResource, ...prev]);
        this.isUploading.set(false);
        this.uploadSuccessMessage.set(`"${title}" se ha subido correctamente.`);
        this.resourceTitle = '';
        this.selectedSingleFile = null;
        this.imagePreviewUrl.set(null);
        this.audioBlobUrl.set(null);
        this.recordedAudioBlob = null;
      },
      error: (err: any) => {
        this.isUploading.set(false);
        alert(`Error al subir el archivo: ${err?.error?.detail || err.message}`);
      }
    });
  }

  formatBytes(bytes: number): string {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  ngOnDestroy() {
    if (this.durationInterval) clearInterval(this.durationInterval);
  }
}
