import {
  Component,
  ElementRef,
  ViewChild,
  input,
  signal,
  computed,
  effect,
  OnDestroy,
  AfterViewInit,
  HostListener,
  Output,
  EventEmitter
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
              title="Página anterior (← Flecha Izquierda)"
            >
              ◀
            </button>
            <div class="page-count-badge">
              <span>Pág.</span>
              <select
                class="page-dropdown-select"
                [value]="currentPage()"
                (change)="onPageSelect($event)"
                title="Seleccionar cualquier página directamente"
              >
                @for (p of pageNumbersList(); track p) {
                  <option [value]="p" [selected]="p === currentPage()">{{ p }}</option>
                }
              </select>
              <span>de <strong>{{ totalPages() || '...' }}</strong></span>
            </div>
            <button
              class="tb-btn"
              (click)="nextPage()"
              [disabled]="currentPage() >= totalPages()"
              title="Página siguiente (→ Flecha Derecha)"
            >
              ▶
            </button>
          </div>

          <div class="mode-toggles">
            <button
              class="tb-btn mode"
              [class.active]="displayMode() === 'CONTINUOUS'"
              (click)="setDisplayMode('CONTINUOUS')"
              title="Vista en cascada continua (scroll vertical)"
            >
              📜 Continuo
            </button>
            <button
              class="tb-btn mode"
              [class.active]="displayMode() === 'SINGLE'"
              (click)="setDisplayMode('SINGLE')"
              title="Página a página (lectura individual)"
            >
              📄 1 Página
            </button>
          </div>
        </div>

        <div class="toolbar-right">
          <button
            class="tb-btn btn-toolbar-annotate"
            (click)="triggerAnnotation()"
            title="Crear o dictar anotación científica sobre esta página"
          >
            💬 Anotar
          </button>

          <div class="zoom-stepper">
            <button class="tb-btn" (click)="changeZoom(-0.15)" title="Reducir zoom">🔍 -</button>
            <span class="zoom-pct">{{ (zoomScale() * 100) | number:'1.0-0' }}%</span>
            <button class="tb-btn" (click)="changeZoom(0.15)" title="Aumentar zoom">🔍 +</button>
            <button class="tb-btn" (click)="fitToWidth()" title="Ajustar al ancho de la pantalla">↔ Ajustar Ancho</button>
            <button class="tb-btn" (click)="resetZoom()" title="Tamaño óptimo 100%">100%</button>
          </div>

          <a [href]="pdfUrl()" target="_blank" class="tb-btn external" title="Abrir en pestaña nueva">
            ↗ Nueva Pestaña
          </a>
        </div>
      </div>

      <!-- Botón flotante al seleccionar texto en el PDF -->
      @if (floatingAnnotateVisible()) {
        <button
          class="btn-floating-canvas-annotate"
          [style.left.px]="floatingAnnotateX()"
          [style.top.px]="floatingAnnotateY()"
          (click)="triggerAnnotationFromSelection()"
        >
          💬 Anotar fragmento seleccionado
        </button>
      }

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
        (mouseup)="onCanvasViewportMouseUp($event)"
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
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      width: 100%;
      height: 100%;
      min-height: 0;
      position: relative;
      overflow: hidden;
    }
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
    .btn-toolbar-annotate {
      background: #2563eb;
      color: #ffffff;
      font-weight: 700;
      border: 1px solid #3b82f6;
    }
    .btn-toolbar-annotate:hover {
      background: #1d4ed8;
    }
    .btn-floating-canvas-annotate {
      position: fixed;
      z-index: 10001;
      background: #1e40af;
      color: #ffffff;
      border: 1px solid #60a5fa;
      border-radius: 20px;
      padding: 7px 16px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
      transform: translate(-50%, -100%);
      white-space: nowrap;
      transition: transform 0.1s, background 0.15s;
    }
    .btn-floating-canvas-annotate:hover {
      background: #1d4ed8;
      transform: translate(-50%, -105%) scale(1.03);
    }
    .page-count-badge {
      font-size: 12px;
      color: #94a3b8;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .page-count-badge strong {
      color: #ffffff;
    }
    .page-dropdown-select {
      background: #0f172a;
      color: #38bdf8;
      border: 1px solid #334155;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 700;
      padding: 1px 4px;
      cursor: pointer;
      outline: none;
    }
    .page-dropdown-select:hover, .page-dropdown-select:focus {
      border-color: #38bdf8;
      background: #1e293b;
    }
    .zoom-pct {
      font-size: 11px;
      font-weight: 700;
      color: #38bdf8;
      min-width: 40px;
      text-align: center;
    }

    /* VIEWPORT CON SCROLLBAR PERMANENTE, ANCHA Y VISIBLE */
    .pdf-scroll-viewport {
      flex: 1;
      min-height: 0;
      height: 100%;
      overflow-y: scroll !important;
      overflow-x: auto !important;
      background: #1e293b;
      padding: 20px 24px;
      position: relative;
      scrollbar-width: thin;
      scrollbar-color: #38bdf8 #0f172a;
    }
    .pdf-scroll-viewport::-webkit-scrollbar {
      width: 16px;
      height: 16px;
      display: block !important;
    }
    .pdf-scroll-viewport::-webkit-scrollbar-track {
      background: #0f172a;
      border-left: 2px solid #334155;
    }
    .pdf-scroll-viewport::-webkit-scrollbar-thumb {
      background: #38bdf8;
      border-radius: 8px;
      border: 3px solid #0f172a;
    }
    .pdf-scroll-viewport::-webkit-scrollbar-thumb:hover {
      background: #7dd3fc;
    }
    .pdf-pages-canvas-list {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
      min-width: max-content;
      margin: 0 auto;
      padding-bottom: 60px;
    }
    .continuous-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
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
    :host ::ng-deep .textLayer {
      position: absolute;
      left: 0;
      top: 0;
      right: 0;
      bottom: 0;
      overflow: hidden;
      opacity: 0.25;
      line-height: 1.0;
      text-align: initial;
      user-select: text;
      -webkit-user-select: text;
      pointer-events: auto;
    }
    :host ::ng-deep .textLayer span {
      color: transparent;
      position: absolute;
      white-space: pre;
      cursor: text;
      transform-origin: 0% 0%;
    }
    :host ::ng-deep .textLayer ::selection {
      background: rgba(56, 189, 248, 0.45);
      color: transparent;
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

  @Output() annotateRequest = new EventEmitter<{ text: string; page: number }>();
  @Output() pageChange = new EventEmitter<number>();

  floatingAnnotateVisible = signal<boolean>(false);
  floatingAnnotateX = signal<number>(0);
  floatingAnnotateY = signal<number>(0);
  selectedText = signal<string>('');

  pageNumbersList = computed(() => {
    const count = this.totalPages();
    return Array.from({ length: count }, (_, i) => i + 1);
  });

  private pdfDoc: any = null;
  private isDestroyed = false;
  private renderedPages = new Set<number>();
  private activeRenderTasks = new Map<HTMLCanvasElement, any>();

  constructor() {
    effect(() => {
      const url = this.pdfUrl();
      if (url) {
        this.loadPdfDocument(url);
      }
    });
  }

  onCanvasViewportMouseUp(event: MouseEvent) {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (text && text.length > 3) {
      this.selectedText.set(text);
      this.floatingAnnotateX.set(event.clientX);
      this.floatingAnnotateY.set(event.clientY - 20);
      this.floatingAnnotateVisible.set(true);
    } else {
      this.floatingAnnotateVisible.set(false);
    }
  }

  triggerAnnotation() {
    this.floatingAnnotateVisible.set(false);
    this.annotateRequest.emit({
      text: this.selectedText() || `Página ${this.currentPage()}`,
      page: this.currentPage()
    });
  }

  triggerAnnotationFromSelection() {
    const text = this.selectedText() || window.getSelection()?.toString().trim() || `Página ${this.currentPage()}`;
    this.floatingAnnotateVisible.set(false);
    this.annotateRequest.emit({
      text: text,
      page: this.currentPage()
    });
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')) {
      return;
    }
    if (event.key === 'ArrowRight' || event.key === 'PageDown') {
      event.preventDefault();
      this.nextPage();
    } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
      event.preventDefault();
      this.prevPage();
    }
  }

  ngAfterViewInit() {
    // Si la URL ya estaba disponible
    if (this.pdfUrl() && !this.pdfDoc) {
      this.loadPdfDocument(this.pdfUrl());
    }
  }

  ngOnDestroy() {
    this.isDestroyed = true;
    this.activeRenderTasks.forEach(task => {
      try {
        task.cancel();
      } catch (_) {}
    });
    this.activeRenderTasks.clear();
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

      // Auto-ajustar al ancho de pantalla disponible o renderizar documento
      setTimeout(async () => {
        if (this.viewportRef?.nativeElement && this.viewportRef.nativeElement.clientWidth > 400) {
          await this.fitToWidth();
        } else {
          await this.renderDocument();
        }
      }, 50);
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
    setTimeout(async () => {
      await this.renderDocument();
      if (mode === 'CONTINUOUS') {
        this.scrollToPage(this.currentPage());
      }
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

  async fitToWidth() {
    if (!this.pdfDoc || !this.viewportRef?.nativeElement) return;
    try {
      const page = await this.pdfDoc.getPage(this.currentPage());
      const baseViewport = page.getViewport({ scale: 1.0 });
      const containerWidth = this.viewportRef.nativeElement.clientWidth - 80;
      if (baseViewport.width > 0 && containerWidth > 320) {
        const optimalScale = Math.max(0.8, Math.min(2.5, containerWidth / baseViewport.width));
        this.zoomScale.set(optimalScale);
        await this.renderDocument();
      }
    } catch (e) {
      console.warn('Error al ajustar ancho en visor PDF:', e);
    }
  }

  goToPage(pageNum: number) {
    const target = Math.max(1, Math.min(this.totalPages(), pageNum));
    this.currentPage.set(target);
    this.pageChange.emit(target);
    if (this.displayMode() === 'SINGLE') {
      this.renderSinglePage(target);
    } else {
      this.scrollToPage(target);
    }
  }

  onPageSelect(event: Event) {
    const val = parseInt((event.target as HTMLSelectElement).value, 10);
    if (!isNaN(val)) {
      this.goToPage(val);
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.goToPage(this.currentPage() - 1);
    }
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.goToPage(this.currentPage() + 1);
    }
  }

  private scrollToPage(pageNum: number) {
    const viewport = this.viewportRef?.nativeElement;
    const el = document.getElementById(`pdf-page-wrapper-${pageNum}`);
    if (viewport && el) {
      const viewportRect = viewport.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const targetScrollTop = viewport.scrollTop + (elRect.top - viewportRect.top) - 16;
      viewport.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: 'smooth'
      });
    }
  }

  onViewportScroll() {
    if (this.displayMode() !== 'CONTINUOUS' || !this.pdfDoc) return;
    const viewport = this.viewportRef?.nativeElement;
    if (!viewport) return;

    const viewportRect = viewport.getBoundingClientRect();
    const probeY = viewportRect.top + 140;

    const total = this.totalPages();
    for (let i = 1; i <= total; i++) {
      const el = document.getElementById(`pdf-page-wrapper-${i}`);
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.top <= probeY && rect.bottom >= probeY) {
          if (this.currentPage() !== i) {
            this.currentPage.set(i);
            this.pageChange.emit(i);
          }
          break;
        }
      }
    }
  }

  private async renderSinglePage(pageNum: number) {
    if (!this.pdfDoc || !this.singleCanvasRef) return;
    const canvas = this.singleCanvasRef.nativeElement;
    if (this.viewportRef?.nativeElement) {
      this.viewportRef.nativeElement.scrollTop = 0;
    }
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
    if (!this.pdfDoc) return;

    // Si ya había un render activo en este mismo canvas, cancelarlo de forma controlada
    const prevTask = this.activeRenderTasks.get(canvas);
    if (prevTask) {
      try {
        prevTask.cancel();
      } catch (_) {}
      this.activeRenderTasks.delete(canvas);
    }

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

      const renderTask = page.render(renderContext);
      this.activeRenderTasks.set(canvas, renderTask);

      await renderTask.promise;
      this.renderedPages.add(pageNum);

      // Renderizar capa de texto seleccionable sobre el canvas
      try {
        const textContent = await page.getTextContent();
        const wrapper = canvas.parentElement;
        if (wrapper) {
          let textLayerDiv = wrapper.querySelector('.textLayer') as HTMLDivElement;
          if (!textLayerDiv) {
            textLayerDiv = document.createElement('div');
            textLayerDiv.className = 'textLayer';
            wrapper.appendChild(textLayerDiv);
          }
          textLayerDiv.innerHTML = '';
          textLayerDiv.style.width = `${Math.floor(viewport.width)}px`;
          textLayerDiv.style.height = `${Math.floor(viewport.height)}px`;

          if (window.pdfjsLib?.renderTextLayer) {
            window.pdfjsLib.renderTextLayer({
              textContentSource: textContent,
              container: textLayerDiv,
              viewport: viewport,
              textDivs: []
            });
          }
        }
      } catch (textErr) {
        // En caso de páginas solo gráficas o fallo no crítico del textLayer
      }
    } catch (err: any) {
      if (err?.name === 'RenderingCancelledException') {
        // Cancelación esperada al cambiar de página rápidamente
        return;
      }
      console.warn(`Error renderizando página ${pageNum}:`, err);
    } finally {
      if (this.activeRenderTasks.get(canvas)) {
        this.activeRenderTasks.delete(canvas);
      }
    }
  }
}
