import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DigestService } from '../../core/services/digest.service';
import { WeeklyDigestDTO } from '../../core/models/scientific.models';
import { VoiceInputBtnComponent } from '../../shared/components/voice-input-btn.component';

@Component({
  selector: 'app-weekly-digest',
  standalone: true,
  imports: [CommonModule, FormsModule, VoiceInputBtnComponent],
  template: `
    <div class="digest-container">
      <!-- Encabezado de la Sección -->
      <div class="digest-header">
        <div class="header-left">
          <div class="header-icon">📰</div>
          <div>
            <h2>Boletín Semanal Asistido por IA</h2>
            <p>Síntesis automatizada con GPT-4o-mini de publicaciones, acuerdos formales y nuevos materiales bibliográficos.</p>
          </div>
        </div>

        <div class="header-actions">
          <select [(ngModel)]="selectedSpaceId" (change)="onSpaceChange()" class="dark-select">
            <option value="all">🌐 Todas las Líneas (Consorcio Completo)</option>
            <option value="space-biomed">🧬 Biomedicina y Oncología Molecular</option>
            <option value="space-nanotech">🔬 Nanotecnología y Nuevos Materiales</option>
            <option value="space-genomics">💻 Genómica Computacional y Bioinformática</option>
          </select>

          <button (click)="generateNewDigest()" [disabled]="isGenerating" class="btn-generate">
            <span *ngIf="!isGenerating">⚡ Redactar Borrador con GPT</span>
            <span *ngIf="isGenerating" class="generating-text">
              <span class="spinner-sm"></span> Sintetizando actividad...
            </span>
          </button>
        </div>
      </div>

      <!-- Layout Principal: Lateral (Historial) + Central (Visor/Editor) -->
      <div class="digest-layout">
        <!-- Sidebar: Historial de Boletines -->
        <aside class="history-sidebar">
          <div class="sidebar-title">
            <span>📅 Archivo de Boletines</span>
            <span class="badge-count">{{ digests().length }}</span>
          </div>

          <div class="digests-list">
            <div
              *ngFor="let item of digests()"
              (click)="selectDigest(item)"
              [class.active]="currentDigest()?.id === item.id"
              class="digest-thumb"
            >
              <div class="thumb-header">
                <span class="thumb-space">{{ item.space_name }}</span>
                <span class="thumb-status" [ngClass]="item.status.toLowerCase()">
                  {{ item.status === 'DRAFT' ? '🟡 Borrador' : '🟢 Publicado' }}
                </span>
              </div>
              <div class="thumb-dates">
                {{ item.week_start_date | date:'dd MMM' }} — {{ item.week_end_date | date:'dd MMM, yyyy' }}
              </div>
              <div class="thumb-metrics">
                <span>💬 {{ item.metrics.comments_count }} coms</span>
                <span>📑 {{ item.metrics.resources_count }} docs</span>
                <span>📌 {{ item.metrics.decisions_count || 1 }} acuerdos</span>
              </div>
            </div>
          </div>
        </aside>

        <!-- Área Principal de Visualización y Edición -->
        <main class="digest-main" *ngIf="currentDigest(); else noDigestSelected">
          <!-- Barra Superior del Boletín Actual -->
          <div class="digest-top-bar">
            <div class="status-meta">
              <span class="status-pill" [ngClass]="currentDigest()!.status.toLowerCase()">
                {{ currentDigest()!.status === 'DRAFT' ? '🟡 Borrador preliminar' : '🟢 Publicado formalmente' }}
              </span>
              <span class="space-title-tag">{{ currentDigest()!.space_name }}</span>
              <span class="date-range">
                Período: <strong>{{ currentDigest()!.week_start_date | date:'mediumDate' }}</strong> al <strong>{{ currentDigest()!.week_end_date | date:'mediumDate' }}</strong>
              </span>
            </div>

            <div class="bar-buttons">
              <!-- Switch de modo Edición / Vista Previa -->
              <div class="mode-toggle">
                <button
                  [class.active]="!isEditMode"
                  (click)="isEditMode = false"
                  class="btn-toggle"
                >
                  👁️ Vista Previa
                </button>
                <button
                  [class.active]="isEditMode"
                  (click)="isEditMode = true"
                  class="btn-toggle"
                >
                  ✏️ Editar Markdown
                </button>
              </div>

              <!-- Botón Guardar en modo edición -->
              <button
                *ngIf="isEditMode"
                (click)="saveChanges()"
                [disabled]="isSaving"
                class="btn-save"
              >
                💾 Guardar Cambios
              </button>

              <!-- Botón Publicar si está en borrador -->
              <button
                *ngIf="currentDigest()!.status === 'DRAFT'"
                (click)="publishCurrent()"
                [disabled]="isPublishing"
                class="btn-publish"
              >
                🚀 Publicar al Consorcio
              </button>
            </div>
          </div>

          <!-- Métricas Resumen de la Semana -->
          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-icon">📋</div>
              <div class="metric-info">
                <span class="metric-val">{{ currentDigest()!.metrics.posts_count }}</span>
                <span class="metric-lbl">Publicaciones Técnicas</span>
              </div>
            </div>

            <div class="metric-card">
              <div class="metric-icon">💬</div>
              <div class="metric-info">
                <span class="metric-val">{{ currentDigest()!.metrics.comments_count }}</span>
                <span class="metric-lbl">Comentarios & Debates</span>
              </div>
            </div>

            <div class="metric-card">
              <div class="metric-icon">📚</div>
              <div class="metric-info">
                <span class="metric-val">{{ currentDigest()!.metrics.resources_count }}</span>
                <span class="metric-lbl">Papers y Recursos</span>
              </div>
            </div>

            <div class="metric-card">
              <div class="metric-icon">👥</div>
              <div class="metric-info">
                <span class="metric-val">{{ currentDigest()!.metrics.active_users_count }}</span>
                <span class="metric-lbl">Investigadores Activos</span>
              </div>
            </div>

            <div class="metric-card">
              <div class="metric-icon">📌</div>
              <div class="metric-info">
                <span class="metric-val">{{ currentDigest()!.metrics.decisions_count || 1 }}</span>
                <span class="metric-lbl">Acuerdos Formalizados</span>
              </div>
            </div>
          </div>

          <!-- Metadatos de Publicación si ya fue difundido -->
          <div *ngIf="currentDigest()!.status === 'PUBLISHED'" class="published-notice">
            <span class="icon">✓</span>
            <div>
              <strong>Publicado y difundido:</strong> {{ currentDigest()!.published_at | date:'medium' }}
              por {{ currentDigest()!.published_by }}
            </div>
          </div>

          <!-- Editor en Vivo -->
          <div *ngIf="isEditMode" class="editor-pane">
            <div class="editor-header">
              <span>Edición en Markdown (ajusta el texto generado por IA antes de publicar)</span>
              <app-voice-input-btn
                [tooltip]="'Dictar contenido al boletín con Whisper'"
                (textTranscribed)="onVoiceMarkdown($event)"
              />
            </div>
            <textarea
              [(ngModel)]="editableMarkdown"
              class="markdown-textarea"
              rows="18"
            ></textarea>
          </div>

          <!-- Vista Previa Estilizada de Documento Científico -->
          <article *ngIf="!isEditMode" class="markdown-preview-pane">
            <div class="paper-page">
              <div class="doc-header">
                <div class="c3-watermark">CONSORCIO C3 • REPORTE SEMANAL DE ACTIVIDAD</div>
                <div class="doc-title-row">
                  <h1>{{ getDocumentTitle(currentDigest()!.summary_markdown) }}</h1>
                </div>
              </div>

              <div class="doc-body" [innerHTML]="formatMarkdown(currentDigest()!.summary_markdown)">
              </div>
            </div>
          </article>
        </main>

        <ng-template #noDigestSelected>
          <div class="no-selection-box">
            <p>Selecciona un boletín del historial o genera uno nuevo con IA.</p>
          </div>
        </ng-template>
      </div>
    </div>
  `,
  styles: [`
    .digest-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
      color: #0f172a;
    }

    .digest-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      padding: 20px 24px;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .header-icon {
      font-size: 28px;
      background: #eff6ff;
      width: 52px;
      height: 52px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #bfdbfe;
    }

    .digest-header h2 {
      margin: 0;
      font-size: 1.35rem;
      font-weight: 700;
      color: #0f172a;
    }

    .digest-header p {
      margin: 4px 0 0;
      font-size: 0.88rem;
      color: #64748b;
    }

    .header-actions {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .dark-select {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      color: #0f172a;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 0.88rem;
    }

    .dark-select:focus {
      outline: none;
      border-color: #1e40af;
    }

    .btn-generate {
      background: #1e40af;
      color: #ffffff;
      border: none;
      padding: 10px 18px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.88rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.1);
      transition: background 0.15s;
    }

    .btn-generate:hover:not(:disabled) {
      background: #1d4ed8;
    }

    .btn-generate:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .spinner-sm {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: #fff;
      border-radius: 50%;
      display: inline-block;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .digest-layout {
      display: grid;
      grid-template-columns: 320px 1fr;
      gap: 20px;
    }

    @media (max-width: 1024px) {
      .digest-layout {
        grid-template-columns: 1fr;
      }
    }

    .history-sidebar {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px;
      height: fit-content;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
    }

    .sidebar-title {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 700;
      font-size: 0.92rem;
      color: #0f172a;
      padding-bottom: 12px;
      border-bottom: 1px solid #e2e8f0;
      margin-bottom: 12px;
    }

    .badge-count {
      background: #eff6ff;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 0.75rem;
      color: #1e40af;
      font-weight: 600;
    }

    .digests-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .digest-thumb {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px;
      cursor: pointer;
      transition: all 0.15s ease-in-out;
    }

    .digest-thumb:hover {
      border-color: #cbd5e1;
      background: #f1f5f9;
    }

    .digest-thumb.active {
      border-color: #1e40af;
      background: #eff6ff;
      box-shadow: 0 0 0 1px #1e40af;
    }

    .thumb-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.8rem;
      margin-bottom: 4px;
    }

    .thumb-space {
      font-weight: 600;
      color: #0f172a;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 170px;
    }

    .thumb-status {
      font-size: 0.7rem;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .thumb-status.draft {
      background: #fef3c7;
      color: #92400e;
    }

    .thumb-status.published {
      background: #d1fae5;
      color: #065f46;
    }

    .thumb-dates {
      font-size: 0.78rem;
      color: #64748b;
      margin-bottom: 8px;
    }

    .thumb-metrics {
      display: flex;
      gap: 10px;
      font-size: 0.72rem;
      color: #64748b;
    }

    .digest-main {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .digest-top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px 18px;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
    }

    .status-meta {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .status-pill {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 6px;
    }

    .status-pill.draft {
      background: #fef3c7;
      color: #92400e;
      border: 1px solid #fcd34d;
    }

    .status-pill.published {
      background: #d1fae5;
      color: #065f46;
      border: 1px solid #a7f3d0;
    }

    .space-title-tag {
      font-size: 0.84rem;
      font-weight: 600;
      color: #0f172a;
    }

    .date-range {
      font-size: 0.8rem;
      color: #64748b;
    }

    .bar-buttons {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .mode-toggle {
      display: flex;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      overflow: hidden;
    }

    .btn-toggle {
      background: transparent;
      border: none;
      color: #64748b;
      padding: 6px 12px;
      font-size: 0.8rem;
      cursor: pointer;
      font-weight: 500;
    }

    .btn-toggle.active {
      background: #ffffff;
      color: #0f172a;
      font-weight: 600;
      box-shadow: 0 1px 2px rgba(0,0,0,0.06);
    }

    .btn-save {
      background: #1e40af;
      color: #fff;
      border: none;
      padding: 8px 14px;
      border-radius: 6px;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-save:hover {
      background: #1d4ed8;
    }

    .btn-publish {
      background: #059669;
      color: #fff;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-publish:hover {
      background: #047857;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 12px;
    }

    .metric-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 14px;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
    }

    .metric-icon {
      font-size: 22px;
      background: #eff6ff;
      width: 40px;
      height: 40px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .metric-val {
      display: block;
      font-size: 1.25rem;
      font-weight: 700;
      color: #1e40af;
      line-height: 1.1;
    }

    .metric-lbl {
      display: block;
      font-size: 0.74rem;
      color: #64748b;
      margin-top: 2px;
    }

    .published-notice {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      border-radius: 8px;
      padding: 10px 14px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.84rem;
      color: #065f46;
    }

    .editor-pane {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
    }

    .editor-header {
      font-size: 0.82rem;
      color: #64748b;
    }

    .markdown-textarea {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      color: #0f172a;
      padding: 14px;
      border-radius: 8px;
      font-family: 'SFMono-Regular', Menlo, Monaco, Consolas, monospace;
      font-size: 0.88rem;
      line-height: 1.6;
      resize: vertical;
    }

    .markdown-textarea:focus {
      outline: none;
      border-color: #1e40af;
      background: #ffffff;
    }

    .markdown-preview-pane {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 30px;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
    }

    .paper-page {
      max-width: 800px;
      margin: 0 auto;
    }

    .c3-watermark {
      font-size: 0.72rem;
      letter-spacing: 0.12em;
      color: #1e40af;
      font-weight: 700;
      margin-bottom: 6px;
    }

    .doc-title-row h1 {
      margin: 0 0 16px;
      font-size: 1.55rem;
      color: #0f172a;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 12px;
    }

    .doc-body {
      font-size: 0.94rem;
      line-height: 1.7;
      color: #334155;
    }

    .no-selection-box {
      background: #ffffff;
      border: 1px dashed #cbd5e1;
      padding: 40px;
      text-align: center;
      border-radius: 12px;
      color: #64748b;
    }
  `]
})
export class WeeklyDigestComponent implements OnInit {
  private digestService = inject(DigestService);

  digests = signal<WeeklyDigestDTO[]>([]);
  currentDigest = signal<WeeklyDigestDTO | null>(null);

  selectedSpaceId = 'all';
  isGenerating = false;
  isSaving = false;
  isPublishing = false;
  isEditMode = false;
  editableMarkdown = '';

  ngOnInit(): void {
    this.loadDigests();
  }

  loadDigests(): void {
    this.digestService.listDigests(this.selectedSpaceId).subscribe(list => {
      this.digests.set(list);
      if (list.length > 0 && !this.currentDigest()) {
        this.selectDigest(list[0]);
      }
    });
  }

  onSpaceChange(): void {
    this.loadDigests();
  }

  selectDigest(item: WeeklyDigestDTO): void {
    this.currentDigest.set(item);
    this.editableMarkdown = item.summary_markdown;
    this.isEditMode = false;
  }

  onVoiceMarkdown(text: string): void {
    if (this.editableMarkdown.trim()) {
      this.editableMarkdown += '\n\n' + text;
    } else {
      this.editableMarkdown = text;
    }
  }

  generateNewDigest(): void {
    this.isGenerating = true;
    const spaceId = this.selectedSpaceId === 'all' ? 'space-biomed' : this.selectedSpaceId;
    const spaceName = spaceId === 'space-biomed' ? 'Biomedicina y Oncología Molecular' :
                      spaceId === 'space-nanotech' ? 'Nanotecnología y Nuevos Materiales' :
                      spaceId === 'space-genomics' ? 'Genómica Computacional' : 'Consorcio Científico C3';

    this.digestService.generateDigest({
      space_id: spaceId,
      space_name: spaceName,
      days_back: 7
    }).subscribe({
      next: (newD) => {
        this.isGenerating = false;
        this.selectDigest(newD);
        this.loadDigests();
      },
      error: () => {
        this.isGenerating = false;
      }
    });
  }

  saveChanges(): void {
    if (!this.currentDigest()) return;
    this.isSaving = true;

    this.digestService.updateDigest(this.currentDigest()!.id, this.editableMarkdown).subscribe({
      next: (updated) => {
        this.isSaving = false;
        this.currentDigest.set(updated);
        this.isEditMode = false;
        this.loadDigests();
      },
      error: () => {
        this.isSaving = false;
      }
    });
  }

  publishCurrent(): void {
    if (!this.currentDigest()) return;
    this.isPublishing = true;

    this.digestService.publishDigest(this.currentDigest()!.id).subscribe({
      next: (pub) => {
        this.isPublishing = false;
        this.currentDigest.set(pub);
        this.loadDigests();
      },
      error: () => {
        this.isPublishing = false;
      }
    });
  }

  getDocumentTitle(md: string): string {
    const lines = md.split('\n');
    for (const l of lines) {
      if (l.startsWith('# ')) {
        return l.replace('# ', '').trim();
      }
    }
    return 'Boletín Semanal del Consorcio';
  }

  formatMarkdown(md: string): string {
    if (!md) return '';
    // Conversor sencillo y seguro para visualización enriquecida en template
    let html = md
      // Evitar título repetido si ya se renderiza en encabezado
      .replace(/^#\s+.+$/m, '')
      .replace(/^###\s+(.+)$/gm, '<h3 style="color:#f1f5f9;margin:18px 0 8px;font-size:1.15rem;border-left:3px solid #6366f1;padding-left:10px;">$1</h3>')
      .replace(/^##\s+(.+)$/gm, '<h2 style="color:#e2e8f0;margin:22px 0 10px;font-size:1.25rem;">$1</h2>')
      .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#f8fafc;">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em style="color:#cbd5e1;">$1</em>')
      .replace(/^-\s+(.+)$/gm, '<li style="margin-left:20px;color:#cbd5e1;line-height:1.6;">$1</li>')
      .replace(/^\d+\.\s+(.+)$/gm, '<li style="margin-left:20px;color:#cbd5e1;line-height:1.6;">$1</li>')
      .replace(/---\s*$/gm, '<hr style="border:none;border-top:1px solid #334155;margin:16px 0;" />')
      .replace(/\n\n/g, '<p style="margin:10px 0;"></p>');

    return html;
  }
}
