import {
  Component,
  ElementRef,
  ViewChild,
  input,
  signal,
  effect,
  OnDestroy,
  AfterViewInit
} from '@angular/core';
import { CommonModule } from '@angular/common';

declare const window: any;

@Component({
  selector: 'app-pdf-canvas-viewer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pdf-viewer-root">
      <!-- Barra de herramientas superior -->
      <div class="pdf-toolbar">
        <div class="toolbar-left">
          <div class="page-stepper">
            <button
              class="tb-btn"
              (click)="prevPage()"
              [disabled]="currentPage() <= 1"
              title="Página anterior"
            >
              ◀
            </button>
            <span class="page-count-badge">
              Página <strong>{{ currentPage() }}</strong> de <strong>{{ totalPages() || '...' }}</strong>
            </span>
            <button
              class="tb-btn"
              (click)="nextPage()"
              [disabled]="currentPage() >= totalPages()"
              title="Página siguiente"
            >
              ▶
            </button>
          </div>

          <div class="mode-toggles">
            <button
              class="tb-btn mode"
              [class.active]="displayMode() === 'CONTINUOUS'"
              (click)="setDisplayMode('CONTINUOUS')"
              title="Vista en cascada continua"
            >
              📜 Continuo
            </button>
            <button
              class="tb-btn mode"
              [class.active]="displayMode() === 'SINGLE'"
              (click)="setDisplayMode('SINGLE')"
              title="Página a página"
            >
              📄 1 Página
            </button>
          </div>
        </div>

        <div class="toolbar-right">
          <div class="zoom-stepper">
            <button class="tb-btn" (click)="changeZoom(-0.15)" title="Reducir zoom">🔍 -</button>
            <span class="zoom-pct">{{ (zoomScale() * 100) | number:'1.0-0' }}%</span>
            <button class="tb-btn" (click)="changeZoom(0.15)" title="Aumentar zoom">🔍 +</button>
            <button class="tb-btn" (click)="resetZoom()" title="Tamaño óptimo 100%">100%</button>
          </div>

          <a [href]="pdfUrl()" target="_blank" class="tb-btn external" title="Abrir en pestaña nueva">
            ↗ Nueva Pestaña
          </a>
        </div>
      </div>

      <!-- Área de carga o error -->
      @if (loading()) {
        <div class="pdf-loading-overlay">
          <div class="spinner"></div>
          <h4>Cargando Documento Científico</h4>
          <p>{{ statusMessage() }}</p>
        </div>
      }

      @if (errorMessage()) {
        <div class="pdf-error-overlay">
          <div class="error-card">
            <span class="error-icon">⚠️</span>
            <h4>No fue posible renderizar el PDF en el visor directo</h4>
            <p>{{ errorMessage() }}</p>
            <div class="error-actions">
              <a [href]="pdfUrl()" target="_blank" class="btn-error-action primary">
                ↗ Abrir en Nueva Pestaña
              </a>
              <a [href]="pdfUrl() + '?download=true'" class="btn-error-action">
                ⬇️ Descargar Archivo
              </a>
            </div>
          </div>
        </div>
      }

      <!-- Contenedor scrollable de páginas en Canvas -->
      <div
        class="pdf-scroll-viewport"
        #viewportRef
        (scroll)="onViewportScroll()"
      >
        <div class="pdf-pages-canvas-list" [style.zoom]="1">
          <!-- Modo Página Única -->
          @if (displayMode() === 'SINGLE') {
            <div class="page-canvas-wrapper single-mode">
              <canvas #singleCanvasRef class="academic-canvas"></canvas>
            </div>
          }

          <!-- Modo Cascada Continua -->
          @if (displayMode() === 'CONTINUOUS') {
            <div #continuousContainerRef class="continuous-container"></div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .pdf-viewer-root {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      background: #334155;
      position: relative;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    /* BARRA DE HERRAMIENTAS */
    .pdf-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 16px;
      background: #0f172a;
      border-bottom: 1px solid #1e293b;
      color: #e2e8f0;
      flex-shrink: 0;
      gap: 12px;
      flex-wrap: wrap;
    }
    .toolbar-left, .toolbar-right {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .page-stepper, .zoom-stepper, .mode-toggles {
      display: flex;
      align-items: center;
      background: #1e293b;
      padding: 3px 6px;
      border-radius: 6px;
      border: 1px solid #334155;
      gap: 6px;
    }
    .tb-btn {
      background: transparent;
      border: none;
      color: #cbd5e1;
      font-size: 12px;
      padding: 4px 8px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.15s;
    }
    .tb-btn:hover:not(:disabled) {
      background: #334155;
      color: #ffffff;
    }
    .tb-btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }
    .tb-btn.mode.active {
      background: #0284c7;
      color: #ffffff;
    }
    .tb-btn.external {
      background: #0369a1;
      color: #ffffff;
      text-decoration: none;
      display: flex;
      align-items: center;
    }
    .tb-btn.external:hover {
      background: #0284c7;
    }
    .page-count-badge {
      font-size: 12px;
      color: #94a3b8;
    }
    .page-count-badge strong {
      color: #ffffff;
    }
    .zoom-pct {
      font-size: 11px;
      font-weight: 700;
      color: #38bdf8;
      min-width: 40px;
      text-align: center;
    }

    /* VIEWPORT CON SCROLL */
    .pdf-scroll-viewport {
      flex: 1;
      overflow-y: auto;
      overflow-x: auto;
      background: #475569;
      padding: 24px;
      display: flex;
      justify-content: center;
    }
    .pdf-pages-canvas-list {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
      width: 100%;
    }
    .continuous-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
      width: 100%;
    }
    :host ::ng-deep .page-canvas-wrapper {
      background: #ffffff;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(0, 0, 0, 0.2);
      border-radius: 2px;
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    :host ::ng-deep .page-canvas-wrapper .page-number-label {
      position: absolute;
      bottom: -22px;
      right: 4px;
      font-size: 11px;
      color: #cbd5e1;
      font-weight: 600;
    }
    :host ::ng-deep .academic-canvas {
      display: block;
      background: #ffffff;
    }

    /* ESTADOS DE CARGA Y ERROR */
    .pdf-loading-overlay, .pdf-error-overlay {
      position: absolute;
      top: 50px;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(4px);
      z-index: 10;
      color: #ffffff;
    }
    .spinner {
      width: 42px;
      height: 42px;
      border: 4px solid #334155;
      border-top-color: #38bdf8;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 16px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .pdf-loading-overlay h4 {
      margin: 0 0 6px 0;
      font-size: 16px;
    }
    .pdf-loading-overlay p {
      margin: 0;
      font-size: 13px;
      color: #94a3b8;
    }

    .error-card {
      background: #1e293b;
      border: 1px solid #475569;
      border-radius: 12px;
      padding: 24px;
      max-width: 480px;
      text-align: center;
    }
    .error-icon {
      font-size: 36px;
      display: block;
      margin-bottom: 12px;
    }
    .error-card h4 {
      margin: 0 0 8px 0;
      color: #f87171;
    }
    .error-card p {
      margin: 0 0 18px 0;
      color: #94a3b8;
      font-size: 13px;
    }
    .error-actions {
      display: flex;
      gap: 10px;
      justify-content: center;
    }
    .btn-error-action {
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      text-decoration: none;
      background: #334155;
      color: #ffffff;
      border: 1px solid #475569;
    }
    .btn-error-action.primary {
      background: #0284c7;
      border-color: #0369a1;
    }
  `]
})
export class PdfCanvasViewerComponent implements AfterViewInit, OnDestroy {
  pdfUrl = input.required<string>();
  title = input<string>('Documento Científico');

  @ViewChild('viewportRef') viewportRef?: ElementRef<HTMLDivElement>;
  @ViewChild('singleCanvasRef') singleCanvasRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('continuousContainerRef') continuousContainerRef?: ElementRef<HTMLDivElement>;

  loading = signal<boolean>(true);
  statusMessage = signal<string>('Iniciando lector PDF nativo...');
  errorMessage = signal<string | null>(null);

  totalPages = signal<number>(0);
  currentPage = signal<number>(1);
  zoomScale = signal<number>(1.25);
  displayMode = signal<'CONTINUOUS' | 'SINGLE'>('CONTINUOUS');

  private pdfDoc: any = null;
  private isDestroyed = false;
  private renderedPages = new Set<number>();

  constructor() {
    effect(() => {
      const url = this.pdfUrl();
      if (url) {
        this.loadPdfDocument(url);
      }
    });
  }

  ngAfterViewInit() {
    // Si la URL ya estaba disponible
    if (this.pdfUrl() && !this.pdfDoc) {
      this.loadPdfDocument(this.pdfUrl());
    }
  }

  ngOnDestroy() {
    this.isDestroyed = true;
    if (this.pdfDoc) {
      try {
        this.pdfDoc.destroy();
      } catch (_) {}
    }
  }

  async loadPdfDocument(url: string) {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.statusMessage.set('Conectando con biblioteca PDF.js...');

    // Esperar si la librería aún se está descargando
    let attempts = 0;
    while (!window.pdfjsLib && attempts < 25) {
      await new Promise(r => setTimeout(r, 120));
      attempts++;
    }

    if (!window.pdfjsLib) {
      this.errorMessage.set('La librería PDF.js no está disponible en este momento. Puedes usar los enlaces directos.');
      this.loading.set(false);
      return;
    }

    try {
      if (!window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = '/assets/pdfjs/pdf.worker.min.js';
      }
      this.statusMessage.set('Descargando páginas del PDF original...');
      const loadingTask = window.pdfjsLib.getDocument({
        url: url,
        withCredentials: false
      });

      this.pdfDoc = await loadingTask.promise;
      if (this.isDestroyed) return;

      this.totalPages.set(this.pdfDoc.numPages);
      this.currentPage.set(1);
      this.loading.set(false);

      // Renderizar páginas
      await this.renderDocument();
    } catch (err: any) {
      console.error('Error cargando PDF con PDF.js:', err);
      this.errorMessage.set(err?.message || 'Error al procesar el archivo binario del PDF.');
      this.loading.set(false);
    }
  }

  async renderDocument() {
    if (!this.pdfDoc) return;

    if (this.displayMode() === 'SINGLE') {
      await this.renderSinglePage(this.currentPage());
    } else {
      await this.renderContinuousPages();
    }
  }

  async setDisplayMode(mode: 'CONTINUOUS' | 'SINGLE') {
    this.displayMode.set(mode);
    setTimeout(() => {
      this.renderDocument();
    }, 50);
  }

  async changeZoom(delta: number) {
    const next = Math.max(0.6, Math.min(2.5, this.zoomScale() + delta));
    this.zoomScale.set(next);
    await this.renderDocument();
  }

  async resetZoom() {
    this.zoomScale.set(1.2);
    await this.renderDocument();
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      if (this.displayMode() === 'SINGLE') {
        this.renderSinglePage(this.currentPage());
      } else {
        this.scrollToPage(this.currentPage());
      }
    }
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
      if (this.displayMode() === 'SINGLE') {
        this.renderSinglePage(this.currentPage());
      } else {
        this.scrollToPage(this.currentPage());
      }
    }
  }

  private scrollToPage(pageNum: number) {
    const el = document.getElementById(`pdf-page-wrapper-${pageNum}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  onViewportScroll() {
    if (this.displayMode() !== 'CONTINUOUS' || !this.pdfDoc) return;
    const viewport = this.viewportRef?.nativeElement;
    if (!viewport) return;

    const scrollTop = viewport.scrollTop;
    const total = this.totalPages();
    for (let i = 1; i <= total; i++) {
      const el = document.getElementById(`pdf-page-wrapper-${i}`);
      if (el) {
        const top = el.offsetTop - viewport.offsetTop;
        const height = el.offsetHeight;
        if (scrollTop >= top - 100 && scrollTop < top + height - 100) {
          if (this.currentPage() !== i) {
            this.currentPage.set(i);
          }
          break;
        }
      }
    }
  }

  private async renderSinglePage(pageNum: number) {
    if (!this.pdfDoc || !this.singleCanvasRef) return;
    const canvas = this.singleCanvasRef.nativeElement;
    await this.renderPageToCanvas(pageNum, canvas);
  }

  private async renderContinuousPages() {
    if (!this.pdfDoc || !this.continuousContainerRef) return;
    const container = this.continuousContainerRef.nativeElement;
    container.innerHTML = '';
    this.renderedPages.clear();

    const total = this.totalPages();
    for (let i = 1; i <= total; i++) {
      const wrapper = document.createElement('div');
      wrapper.id = `pdf-page-wrapper-${i}`;
      wrapper.className = 'page-canvas-wrapper';
      wrapper.style.backgroundColor = '#ffffff';
      wrapper.style.minWidth = '620px';
      wrapper.style.minHeight = '840px';

      const canvas = document.createElement('canvas');
      canvas.id = `pdf-page-canvas-${i}`;
      canvas.className = 'academic-canvas';

      const label = document.createElement('span');
      label.className = 'page-number-label';
      label.innerText = `Pág. ${i} / ${total}`;

      wrapper.appendChild(canvas);
      wrapper.appendChild(label);
      container.appendChild(wrapper);

      // Renderizamos la página en el canvas
      await this.renderPageToCanvas(i, canvas);
    }
  }

  private async renderPageToCanvas(pageNum: number, canvas: HTMLCanvasElement) {
    try {
      const page = await this.pdfDoc.getPage(pageNum);
      const scale = this.zoomScale();
      const viewport = page.getViewport({ scale });

      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const renderContext = {
        canvasContext: ctx,
        transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null,
        viewport: viewport
      };

      await page.render(renderContext).promise;
      this.renderedPages.add(pageNum);
    } catch (err) {
      console.warn(`Error renderizando página ${pageNum}:`, err);
    }
  }
}
