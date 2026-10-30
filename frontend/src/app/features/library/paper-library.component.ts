import { Component, inject, signal, computed, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ResourceService } from '../../core/services/resource.service';
import { ScientificResource } from '../../core/models/scientific.models';

export type SortOption = 'NEWEST' | 'MOST_COMMENTED' | 'UNREAD_FIRST';

@Component({
  selector: 'app-paper-library',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="library-container">
      <!-- Encabezado de la Biblioteca -->
      <div class="library-header">
        <div class="header-titles">
          <h2>📚 Biblioteca de Artículos y Publicaciones</h2>
          <p>Repositorio científico asíncrono con trazabilidad de discusiones y anotaciones del consorcio.</p>
        </div>
        <div class="header-actions">
          <button class="btn-clean-duplicates" (click)="cleanDuplicates()" [disabled]="isCleaningDuplicates" title="Elimina artículos idénticos o repetidos automáticamente">
            {{ isCleaningDuplicates ? '⏳ Limpiando...' : '🧹 Eliminar Duplicados' }}
          </button>
          <button class="btn-upload-batch-shortcut" (click)="uploadArticles.emit()">
            📥 + Subir Artículos (Individual o Lote)
          </button>
        </div>
      </div>

      <!-- Barra de Filtros y Búsqueda -->
      <div class="filter-toolbar">
        <!-- Buscador por texto -->
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input
            type="text"
            [(ngModel)]="searchQuery"
            placeholder="Buscar por título, autor, DOI o tema..."
          />
        </div>

        <!-- Selector de ordenamiento -->
        <div class="sort-selector">
          <label>Ordenar por:</label>
          <select [(ngModel)]="activeSort">
            <option value="NEWEST">⏱️ Más nuevos primero</option>
            <option value="MOST_COMMENTED">💬 Más comentados / debatidos</option>
            <option value="UNREAD_FIRST">🔴 Con comentarios sin leer</option>
          </select>
        </div>
      </div>

      <!-- Barra de Chips de Tags Temáticos -->
      <div class="tags-filter-bar">
        <span class="tags-label">Filtrar por Tema:</span>
        <button
          class="tag-chip"
          [class.active]="selectedTag() === null"
          (click)="selectedTag.set(null)"
        >
          Todos ({{ allPapers().length }})
        </button>
        @for (tag of availableTags(); track tag) {
          <button
            class="tag-chip"
            [class.active]="selectedTag() === tag"
            (click)="toggleTag(tag)"
          >
            #{{ tag }} ({{ countPapersByTag(tag) }})
          </button>
        }
      </div>

      <!-- Grid de Papers Científicos -->
      <div class="papers-grid">
        @for (paper of filteredPapers(); track paper.id) {
          <div class="paper-card" [class.has-unread]="paper.has_unread_comments">
            <!-- Portada / Primera Página del Paper -->
            <div class="paper-cover-wrapper">
              <img
                [src]="paper.metadata?.['thumbnail_url'] || 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=400&q=80'"
                alt="Primera página de {{ paper.title }}"
                class="cover-image"
              />
              <div class="cover-overlay">
                <button (click)="openPdfDirectModal(paper, $event)" class="btn-overlay-action primary">
                  📑 Desplegar PDF
                </button>
                <a [href]="resourceService.getResourceDownloadUrl(paper.id)" target="_blank" class="btn-overlay-action">
                  ⬇️ Descargar
                </a>
                <button (click)="deletePaper(paper, $event)" class="btn-overlay-action danger" title="Eliminar este artículo del repositorio">
                  🗑️ Eliminar
                </button>
              </div>

              <!-- Badge con los 3 puntitos brillantes de comentarios sin leer -->
              @if (paper.has_unread_comments) {
                <div
                  class="unread-dots-badge"
                  title="{{ paper.unread_comments_count || 0 }} comentarios nuevos sin leer por ti"
                >
                  <span class="dot"></span>
                  <span class="dot"></span>
                  <span class="dot"></span>
                  <span class="unread-count">{{ paper.unread_comments_count || 0 }}</span>
                </div>
              }
            </div>

            <!-- Información Inferior del Paper -->
            <div class="paper-details">
              <!-- Fila con Burbuja del Uploader e Indicadores -->
              <div class="uploader-row">
                <div class="uploader-chip" [title]="'Subido por ' + (paper.uploader?.full_name || 'Investigador') + ' (' + (paper.uploader?.institution_name || 'Consorcio') + ')'">
                  <img
                    [src]="paper.uploader?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'"
                    [alt]="paper.uploader?.full_name || 'Investigador'"
                    class="uploader-avatar"
                  />
                  <div class="uploader-info-mini">
                    <span class="uploader-name">{{ paper.uploader?.full_name ? (paper.uploader.full_name.split(' ')[0] + ' ' + (paper.uploader.full_name.split(' ')[1] || '')) : 'Investigador' }}</span>
                    <small class="upload-date">{{ paper.created_at | date:'d MMM yyyy' }}</small>
                  </div>
                </div>

                <div class="indicators-group">
                  <!-- Badge de estado de indexación RAG con chunks -->
                  <div
                    class="rag-pill"
                    [class.ready]="paper.indexing_status !== 'PROCESSING'"
                    [class.processing]="paper.indexing_status === 'PROCESSING'"
                    (click)="inspectChunks(paper, $event)"
                    title="Click para ver los fragmentos indexados por el Asistente RAG"
                  >
                    <span *ngIf="paper.indexing_status === 'PROCESSING'">⏳ Indexando...</span>
                    <span *ngIf="paper.indexing_status !== 'PROCESSING'">🤖 RAG ({{ paper.chunks_count || 14 }})</span>
                  </div>

                  <!-- Burbuja de comentarios totales -->
                  <div class="comments-badge" [class.highlight]="(paper.comments_count || 0) > 0">
                    💬 {{ paper.comments_count || 0 }}
                  </div>
                </div>
              </div>

              <!-- Título del Artículo (Clickeable para ver PDF) -->
              <h4 class="paper-title" (click)="openPdfDirectModal(paper, $event)" title="Haz clic para desplegar el documento PDF original">{{ paper.title }}</h4>

              <!-- Autores y DOI -->
              @if (paper.metadata?.['authors']) {
                <p class="paper-authors">{{ paper.metadata['authors'] }}</p>
              }
              @if (paper.metadata?.['doi']) {
                <p class="paper-doi">DOI: {{ paper.metadata['doi'] }}</p>
              }

              <!-- Tags del Paper -->
              @if (paper.metadata?.['tags'] && paper.metadata['tags'].length > 0) {
                <div class="paper-tags-list">
                  @for (t of paper.metadata['tags']; track t) {
                    <span class="mini-tag" (click)="selectedTag.set(t); $event.stopPropagation()">#{{ t }}</span>
                  }
                </div>
              }

              <!-- Botones directos de lectura de artículo y despliegue de PDF -->
              <div class="card-bottom-actions">
                <button class="btn-deploy-pdf-direct" (click)="openPdfDirectModal(paper, $event)" title="Despliega el documento PDF original en pantalla">
                  📑 Desplegar PDF
                </button>
                <button class="btn-read-full-paper" (click)="onOpenPaper(paper)" title="Abre el visor completo con herramientas de discusión colegiada">
                  💬 Visor con Discusión
                </button>
              </div>
            </div>
          </div>
        } @empty {
          <div class="empty-library">
            <span class="empty-icon">📂</span>
            <h3>No se encontraron artículos con los filtros aplicados</h3>
            <p>Intenta cambiar el término de búsqueda o selecciona otro tag temático.</p>
          </div>
        }
      </div>

      <!-- Modal de Auditoría e Inspección de Chunks RAG -->
      <div *ngIf="inspectingPaper" class="modal-backdrop" (click)="closeInspectModal()">
        <div class="chunks-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div>
              <h3>Fragmentos Vectorizados para el Asistente RAG</h3>
              <p class="modal-sub">{{ inspectingPaper.title }}</p>
            </div>
            <button class="btn-close-modal" (click)="closeInspectModal()">✕</button>
          </div>

          <div class="modal-stats-bar">
            <span>Estado: <strong class="badge-status-ready">✓ {{ inspectingPaper.indexing_status || 'READY' }}</strong></span>
            <span>Total Fragmentos: <strong>{{ inspectedChunks.length }}</strong></span>
            <span>Modelo: <strong>text-embedding-3-small (1536d)</strong></span>
            <button (click)="triggerReindex(inspectingPaper.id)" [disabled]="isReindexing" class="btn-reindex">
              {{ isReindexing ? 'Reindexando...' : '🔄 Reindexar PDF' }}
            </button>
          </div>

          <div class="chunks-scroll-area">
            <div *ngFor="let c of inspectedChunks" class="chunk-item-card">
              <div class="chunk-item-header">
                <span class="chunk-number">Chunk #{{ c.chunk_index + 1 }}</span>
                <span class="chunk-page-badge">📄 Pág. {{ c.page_number }}</span>
                <span class="chunk-token-count">🔤 {{ c.tokens_count }} tokens</span>
              </div>
              <p class="chunk-text-content">{{ c.text }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal para Desplegar el Documento PDF Completo Original Directamente en la Biblioteca -->
      @if (viewingPdfPaper(); as paper) {
        <div class="modal-backdrop pdf-modal-backdrop" (click)="closePdfModal()">
          <div class="pdf-viewer-modal" (click)="$event.stopPropagation()">
            <div class="pdf-modal-header">
              <div class="pdf-modal-titles">
                <span class="badge-pdf-tag">PDF ORIGINAL COMPLETO</span>
                <h3>{{ paper.title }}</h3>
                <p class="pdf-modal-authors">{{ paper.metadata?.['authors'] || paper.uploader?.full_name }}</p>
              </div>
              <div class="pdf-modal-actions">
                <a [href]="resourceService.getResourceDownloadUrl(paper.id)" target="_blank" class="btn-modal-download" title="Abrir el documento original en pestaña nueva del navegador">
                  ↗ Pestaña Completa
                </a>
                <a [href]="resourceService.getResourceDownloadUrl(paper.id, true)" class="btn-modal-download" title="Descargar copia del PDF">
                  ⬇️ Descargar
                </a>
                <button class="btn-modal-open-annotator" (click)="onOpenPaper(paper); closePdfModal()">
                  💬 Abrir con Anotaciones ↗
                </button>
                <button class="btn-close-pdf-modal" (click)="closePdfModal()" title="Cerrar ventana">✕</button>
              </div>
            </div>

            <div class="pdf-modal-body">
              @if (safePdfModalUrl()) {
                <object
                  [data]="safePdfModalUrl()"
                  type="application/pdf"
                  class="pdf-iframe-full"
                >
                  <iframe
                    [src]="safePdfModalUrl()"
                    class="pdf-iframe-full"
                    title="Documento PDF original de {{ paper.title }}"
                  >
                    <p>Si tu navegador no muestra el PDF directamente, puedes <a [href]="resourceService.getResourceDownloadUrl(paper.id)" target="_blank">abrirlo en una pestaña nueva</a>.</p>
                  </iframe>
                </object>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .library-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
      max-width: 1300px;
      margin: 0 auto;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #0f172a;
    }
    .library-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 14px;
    }
    .library-header h2 {
      margin: 0 0 4px 0;
      font-size: 24px;
      color: #1e3a8a;
      font-weight: 700;
    }
    .library-header p {
      margin: 0;
      color: #64748b;
      font-size: 14px;
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .btn-clean-duplicates {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      color: #334155;
      padding: 9px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s;
    }
    .btn-clean-duplicates:hover {
      background: #fee2e2;
      border-color: #fca5a5;
      color: #dc2626;
    }
    .btn-upload-batch-shortcut {
      background: #1e3a8a;
      color: #ffffff;
      border: none;
      padding: 9px 18px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: background 0.15s;
    }
    .btn-upload-batch-shortcut:hover {
      background: #1d4ed8;
    }
    .filter-toolbar {
      display: flex;
      gap: 16px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      padding: 14px 18px;
      border-radius: 10px;
      align-items: center;
      flex-wrap: wrap;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
    }
    .search-box {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 8px 12px;
    }
    .search-box input {
      background: transparent;
      border: none;
      color: #0f172a;
      font-size: 14px;
      outline: none;
      width: 100%;
    }
    .sort-selector {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #475569;
    }
    .sort-selector select {
      background: #f8fafc;
      color: #0f172a;
      border: 1px solid #cbd5e1;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 13px;
      outline: none;
      cursor: pointer;
    }
    .tags-filter-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      overflow-x: auto;
      padding: 2px 0;
    }
    .tags-label {
      font-size: 12px;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      white-space: nowrap;
    }
    .tag-chip {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #475569;
      padding: 5px 13px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s ease;
    }
    .tag-chip:hover {
      background: #f1f5f9;
      color: #0f172a;
    }
    .tag-chip.active {
      background: #1e40af;
      border-color: #1e40af;
      color: #ffffff;
      font-weight: 600;
    }
    .papers-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
      gap: 22px;
      margin-top: 8px;
    }
    .paper-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      transition: transform 180ms cubic-bezier(0.23, 1, 0.32, 1), border-color 160ms ease, box-shadow 180ms cubic-bezier(0.23, 1, 0.32, 1);
    }
    .paper-card:hover {
      transform: translateY(-3px);
      border-color: #93c5fd;
      box-shadow: 0 10px 20px -3px rgba(15, 23, 42, 0.1);
    }
    .paper-card:active {
      transform: translateY(-1px) scale(0.99);
      transition-duration: 90ms;
    }
    .paper-card.has-unread {
      border-left: 3px solid #d97706;
    }
    .paper-cover-wrapper {
      position: relative;
      height: 210px;
      background: #f1f5f9;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      border-bottom: 1px solid #e2e8f0;
    }
    .cover-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: top center;
      transition: transform 0.3s;
    }
    .paper-card:hover .cover-image {
      transform: scale(1.03);
    }
    .cover-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(15, 23, 42, 0.65);
      opacity: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      transition: opacity 0.2s;
    }
    .paper-card:hover .cover-overlay {
      opacity: 1;
    }
    .btn-overlay-action {
      background: #ffffff;
      color: #1e293b;
      text-decoration: none;
      padding: 7px 13px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
      border: 1px solid #cbd5e1;
      cursor: pointer;
    }
    .btn-overlay-action.primary {
      background: #1e40af;
      color: #ffffff;
      border-color: #1e40af;
    }
    .btn-overlay-action.danger {
      background: #fee2e2;
      color: #991b1b;
      border-color: #fca5a5;
    }
    .btn-overlay-action:hover {
      background: #f8fafc;
    }
    .btn-overlay-action.primary:hover {
      background: #1d4ed8;
    }
    .btn-overlay-action.danger:hover {
      background: #fecaca;
      color: #7f1d1d;
    }
    .unread-dots-badge {
      position: absolute;
      top: 10px;
      right: 10px;
      background: #d97706;
      color: #ffffff;
      display: flex;
      align-items: center;
      gap: 3px;
      padding: 3px 8px;
      border-radius: 20px;
      font-weight: 700;
      font-size: 11px;
      box-shadow: 0 2px 6px rgba(217, 119, 6, 0.4);
    }
    .unread-dots-badge .dot {
      width: 5px;
      height: 5px;
      background: #ffffff;
      border-radius: 50%;
      display: inline-block;
    }
    .unread-dots-badge .unread-count {
      margin-left: 2px;
      font-size: 10px;
    }
    .paper-details {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      flex: 1;
    }
    .uploader-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .uploader-chip {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .uploader-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      object-fit: cover;
      border: 1.5px solid #cbd5e1;
    }
    .uploader-info-mini {
      display: flex;
      flex-direction: column;
    }
    .uploader-name {
      font-size: 12px;
      font-weight: 600;
      color: #0f172a;
      line-height: 1.2;
    }
    .upload-date {
      font-size: 10px;
      color: #64748b;
    }
    .comments-badge {
      background: #f1f5f9;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      color: #475569;
      border: 1px solid #e2e8f0;
    }
    .comments-badge.highlight {
      background: #eff6ff;
      color: #1d4ed8;
      border-color: #bfdbfe;
      font-weight: 600;
    }
    .paper-title {
      margin: 0;
      font-size: 15px;
      font-weight: 700;
      line-height: 1.35;
      color: #0f172a;
      cursor: pointer;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      transition: color 0.15s;
    }
    .paper-title:hover {
      color: #1d4ed8;
      text-decoration: underline;
    }
    .card-bottom-actions {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid #f1f5f9;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .btn-read-full-paper {
      width: 100%;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #1e40af;
      padding: 7px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.15s;
    }
    .btn-read-full-paper:hover {
      background: #1e40af;
      color: #ffffff;
      border-color: #1e40af;
    }
    .btn-deploy-pdf-direct {
      width: 100%;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      color: #0f172a;
      padding: 7px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.15s;
    }
    .btn-deploy-pdf-direct:hover {
      background: #0f172a;
      color: #ffffff;
      border-color: #0f172a;
    }

    /* Modal Visor de PDF Original */
    .pdf-modal-backdrop {
      z-index: 10000;
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(4px);
    }
    .pdf-viewer-modal {
      width: 92vw;
      max-width: 1250px;
      height: 90vh;
      background: #ffffff;
      border-radius: 14px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
      animation: popover-slide 180ms cubic-bezier(0.23, 1, 0.32, 1);
    }
    .pdf-modal-header {
      background: #0f172a;
      color: #ffffff;
      padding: 14px 22px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #334155;
      gap: 16px;
    }
    .pdf-modal-titles {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .badge-pdf-tag {
      background: #dc2626;
      color: #ffffff;
      font-size: 10px;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 4px;
      align-self: flex-start;
      letter-spacing: 0.5px;
    }
    .pdf-modal-titles h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 700;
      color: #ffffff;
    }
    .pdf-modal-authors {
      margin: 0;
      font-size: 12px;
      color: #94a3b8;
    }
    .pdf-modal-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .btn-modal-download {
      background: #1e293b;
      color: #cbd5e1;
      border: 1px solid #475569;
      padding: 7px 13px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.15s;
    }
    .btn-modal-download:hover {
      background: #334155;
      color: #ffffff;
    }
    .btn-modal-open-annotator {
      background: #0284c7;
      color: #ffffff;
      border: none;
      padding: 7px 14px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.15s;
    }
    .btn-modal-open-annotator:hover {
      background: #0369a1;
    }
    .btn-close-pdf-modal {
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 20px;
      cursor: pointer;
      padding: 4px;
      line-height: 1;
    }
    .btn-close-pdf-modal:hover {
      color: #ffffff;
    }
    .pdf-modal-body {
      flex: 1;
      background: #1e293b;
      position: relative;
    }
    .pdf-iframe-full {
      width: 100%;
      height: 100%;
      border: none;
    }
    .paper-authors {
      margin: 0;
      font-size: 12px;
      color: #64748b;
      font-style: italic;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .paper-doi {
      margin: 0;
      font-size: 11px;
      color: #94a3b8;
      font-family: monospace;
    }
    .paper-tags-list {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-top: auto;
      padding-top: 6px;
    }
    .mini-tag {
      background: #f1f5f9;
      color: #1e40af;
      border: 1px solid #e2e8f0;
      font-size: 11px;
      padding: 2px 7px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
      transition: background 0.15s;
    }
    .mini-tag:hover {
      background: #e0e7ff;
    }
    .empty-library {
      grid-column: 1 / -1;
      padding: 60px 20px;
      text-align: center;
      background: #ffffff;
      border-radius: 12px;
      border: 1px dashed #cbd5e1;
      color: #64748b;
    }
    .empty-icon {
      font-size: 40px;
      display: block;
      margin-bottom: 12px;
    }
    .empty-library h3 {
      margin: 0 0 6px 0;
      color: #0f172a;
    }
    .indicators-group {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .rag-pill {
      font-size: 10px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .rag-pill.ready {
      background: #ecfdf5;
      color: #059669;
      border: 1px solid #a7f3d0;
    }
    .rag-pill.ready:hover {
      background: #d1fae5;
    }
    .rag-pill.processing {
      background: #fffbeb;
      color: #d97706;
      border: 1px solid #fde68a;
    }
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .chunks-modal {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 14px;
      width: 100%;
      max-width: 820px;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15);
      overflow: hidden;
      animation: modalFadeIn 0.2s ease-out;
    }
    @keyframes modalFadeIn {
      from { opacity: 0; transform: scale(0.98); }
      to { opacity: 1; transform: scale(1); }
    }
    .modal-header {
      padding: 18px 22px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .modal-header h3 {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 700;
      color: #1e3a8a;
    }
    .modal-sub {
      margin: 4px 0 0;
      font-size: 0.82rem;
      color: #475569;
    }
    .btn-close-modal {
      background: transparent;
      border: none;
      color: #64748b;
      font-size: 1.3rem;
      cursor: pointer;
    }
    .btn-close-modal:hover {
      color: #0f172a;
    }
    .modal-stats-bar {
      padding: 12px 22px;
      background: #ffffff;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.8rem;
      color: #475569;
      flex-wrap: wrap;
      gap: 10px;
    }
    .badge-status-ready {
      color: #059669;
    }
    .btn-reindex {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      color: #334155;
      padding: 5px 12px;
      border-radius: 6px;
      font-size: 0.78rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s;
    }
    .btn-reindex:hover:not(:disabled) {
      background: #e2e8f0;
      color: #0f172a;
    }
    .chunks-scroll-area {
      padding: 20px 22px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-height: 55vh;
    }
    .chunk-item-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px;
    }
    .chunk-item-header {
      display: flex;
      justify-content: space-between;
      font-size: 0.76rem;
      color: #64748b;
      margin-bottom: 8px;
    }
    .chunk-number {
      font-weight: 700;
      color: #1e40af;
    }
    .chunk-page-badge {
      background: #e2e8f0;
      padding: 2px 6px;
      border-radius: 4px;
      color: #1e293b;
      font-weight: 500;
    }
    .chunk-token-count {
      color: #64748b;
    }
    .chunk-text-content {
      margin: 0;
      font-size: 0.84rem;
      color: #334155;
      line-height: 1.55;
      font-family: 'SFMono-Regular', Menlo, Monaco, Consolas, monospace;
    }
  `]
})
export class PaperLibraryComponent implements OnInit {
  resourceService = inject(ResourceService);
  private sanitizer = inject(DomSanitizer);

  @Output() openPaper = new EventEmitter<any>();
  @Output() uploadArticles = new EventEmitter<void>();

  searchQuery = '';
  activeSort: SortOption = 'NEWEST';
  selectedTag = signal<string | null>(null);

  // Estado para modal de inspección de chunks
  inspectingPaper: any = null;
  inspectedChunks: any[] = [];
  isReindexing = false;

  // Estado para modal de despliegue directo de PDF original
  viewingPdfPaper = signal<any | null>(null);
  safePdfModalUrl = signal<SafeResourceUrl | null>(null);

  openPdfDirectModal(paper: any, event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.viewingPdfPaper.set(paper);
    const url = this.resourceService.getResourceDownloadUrl(paper.id);
    this.safePdfModalUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
  }

  closePdfModal() {
    this.viewingPdfPaper.set(null);
    this.safePdfModalUrl.set(null);
  }

  onOpenPaper(paper: any) {
    this.openPaper.emit(paper);
  }

  // Lista de papers enlazada de forma reactiva al servicio centralizado
  allPapers = this.resourceService.allPapersSignal;
  isCleaningDuplicates = false;

  availableTags = signal<string[]>([
    'Nanocelulosa',
    'Biomateriales',
    'Ensayos Clínicos',
    'Metodología',
    'Farmacología',
    'Caracterización'
  ]);

  ngOnInit() {
    this.loadPapers();
  }

  loadPapers() {
    this.resourceService.getResourcesBySpace('space-general', 'PDF').subscribe({
      next: () => {},
      error: () => {}
    });
  }

  deletePaper(paper: any, event: Event) {
    event.stopPropagation();
    if (!confirm(`¿Deseas eliminar permanentemente el artículo "${paper.title}"? Esta acción también eliminará sus fragmentos vectoriales RAG.`)) {
      return;
    }
    this.resourceService.deleteResource(paper.id).subscribe({
      next: () => {
        // La lista se actualiza automáticamente via allPapersSignal
      },
      error: (err: any) => {
        alert('Error al eliminar el artículo: ' + (err.error?.detail || err.message));
      }
    });
  }

  cleanDuplicates() {
    if (!confirm('¿Deseas buscar y eliminar automáticamente artículos duplicados (por checksum SHA-256, DOI o título idéntico)? Se conservará siempre la versión original más antigua.')) {
      return;
    }
    this.isCleaningDuplicates = true;
    this.resourceService.cleanDuplicates().subscribe({
      next: (resp: any) => {
        this.isCleaningDuplicates = false;
        alert(`Limpieza completada:\n• Artículos duplicados eliminados: ${resp.duplicates_removed}\n• Artículos únicos conservados: ${resp.remaining_count}`);
      },
      error: (err: any) => {
        this.isCleaningDuplicates = false;
        alert('Error al limpiar duplicados: ' + (err.error?.detail || err.message));
      }
    });
  }

  inspectChunks(paper: any, event: Event) {
    event.stopPropagation();
    this.inspectingPaper = paper;
    this.inspectedChunks = [];

    this.resourceService.getResourceChunks(paper.id).subscribe((resp: any) => {
      this.inspectedChunks = resp.chunks;
    });
  }

  closeInspectModal() {
    this.inspectingPaper = null;
    this.inspectedChunks = [];
  }

  triggerReindex(resourceId: string) {
    this.isReindexing = true;
    this.resourceService.reindexResource(resourceId).subscribe({
      next: () => {
        setTimeout(() => {
          this.isReindexing = false;
          if (this.inspectingPaper) {
            this.inspectChunks(this.inspectingPaper, new Event('click'));
          }
        }, 1200);
      },
      error: () => {
        this.isReindexing = false;
      }
    });
  }

  toggleTag(tag: string) {
    if (this.selectedTag() === tag) {
      this.selectedTag.set(null);
    } else {
      this.selectedTag.set(tag);
    }
  }

  countPapersByTag(tag: string): number {
    return this.allPapers().filter(p => p.metadata?.['tags']?.includes(tag)).length;
  }

  filteredPapers = computed(() => {
    let list = [...this.allPapers()];
    const query = this.searchQuery.toLowerCase().trim();
    const tag = this.selectedTag();

    // 1. Filtro por tag
    if (tag) {
      list = list.filter(p => p.metadata?.['tags']?.includes(tag));
    }

    // 2. Filtro por búsqueda textual
    if (query) {
      list = list.filter(p =>
        p.title.toLowerCase().includes(query) ||
        p.metadata?.['authors']?.toLowerCase().includes(query) ||
        p.metadata?.['doi']?.toLowerCase().includes(query) ||
        p.uploader?.full_name?.toLowerCase().includes(query)
      );
    }

    // 3. Ordenamiento
    if (this.activeSort === 'NEWEST') {
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (this.activeSort === 'MOST_COMMENTED') {
      list.sort((a, b) => (b.comments_count || 0) - (a.comments_count || 0));
    } else if (this.activeSort === 'UNREAD_FIRST') {
      list.sort((a, b) => (b.has_unread_comments ? 1 : 0) - (a.has_unread_comments ? 1 : 0));
    }

    return list;
  });
}

