import { Component, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ScientificAnnotation, ImageCoordinates } from '../../core/models/scientific.models';
import { VoiceInputBtnComponent } from '../../shared/components/voice-input-btn.component';

@Component({
  selector: 'app-image-annotator',
  standalone: true,
  imports: [CommonModule, FormsModule, VoiceInputBtnComponent],
  template: `
    <div class="annotator-layout">
      <!-- Lienzo de Imagen con Superposición de Anotaciones -->
      <div class="image-viewport" #viewport>
        <img
          [src]="imageUrl()"
          alt="Recurso Científico"
          class="scientific-image"
          (mousedown)="startDrawing($event)"
          (mousemove)="draw($event)"
          (mouseup)="finishDrawing($event)"
        />

        <!-- Cajas de anotaciones guardadas -->
        @for (ann of annotations(); track ann.id) {
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
              <span class="box-tag">{{ ann.author.fullName.split(' ')[0] }}</span>
            </div>
          }
        }

        <!-- Caja temporal mientras el usuario arrastra el mouse -->
        @if (currentBox()) {
          <div
            class="annotation-box drawing"
            [style.left.%]="currentBox()!.x * 100"
            [style.top.%]="currentBox()!.y * 100"
            [style.width.%]="currentBox()!.width * 100"
            [style.height.%]="currentBox()!.height * 100"
          ></div>
        }
      </div>

      <!-- Panel Lateral de Discusión Contextual -->
      <div class="discussion-panel">
        <h4>🔬 Discusión de Observaciones</h4>
        <p class="instruction">Arrastra sobre la imagen para resaltar una región específica o haz clic en un recuadro existente.</p>

        @if (selectedAnnotation(); as ann) {
          <div class="active-annotation-card">
            <div class="card-header">
              <strong>{{ ann.author.fullName }}</strong>
              <small>{{ ann.createdAt | date:'shortDate' }}</small>
            </div>
            <p class="note-text">{{ ann.noteContent }}</p>

            <div class="comments-thread">
              <span class="thread-title">Comentarios en esta región ({{ ann.commentsCount }}):</span>
              <div class="comment-input-row">
                <input
                  type="text"
                  [(ngModel)]="newCommentText"
                  placeholder="Responder o dictar a esta observación..."
                />
                <app-voice-input-btn
                  [compact]="true"
                  [tooltip]="'Dictar respuesta por voz'"
                  (textTranscribed)="onVoiceComment($event)"
                />
                <button (click)="submitComment()">Comentar</button>
              </div>
            </div>
          </div>
        } @else if (pendingBox()) {
          <!-- Formulario para guardar la nueva anotación recién dibujada -->
          <div class="new-annotation-form">
            <div class="form-title-row">
              <h5>Nueva Anotación en la Región</h5>
              <app-voice-input-btn
                [tooltip]="'Dictar anotación en región con Whisper'"
                (textTranscribed)="onVoiceNewNote($event)"
              />
            </div>
            <textarea
              [(ngModel)]="newNoteContent"
              rows="3"
              placeholder="¿Qué observas en este detalle? Escribe o dicta (ej. 'Posible artefacto de tinción o aglomeración')..."
            ></textarea>
            <div class="form-actions">
              <button class="btn-cancel" (click)="cancelNewBox()">Descartar</button>
              <button class="btn-save" (click)="saveAnnotation()">Guardar Nota</button>
            </div>
          </div>
        } @else {
          <div class="empty-state">
            Selecciona una región marcada en la imagen para ver las discusiones del equipo.
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .annotator-layout {
      display: flex;
      gap: 20px;
      background: #ffffff;
      padding: 20px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      color: #0f172a;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .image-viewport {
      position: relative;
      flex: 2;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      overflow: hidden;
      user-select: none;
    }
    .scientific-image {
      width: 100%;
      height: auto;
      display: block;
      cursor: crosshair;
    }
    .annotation-box {
      position: absolute;
      border: 2px solid #1e40af;
      background: rgba(30, 64, 175, 0.2);
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .annotation-box:hover, .annotation-box.selected {
      border-color: #d97706;
      background: rgba(217, 119, 6, 0.35);
      z-index: 10;
    }
    .annotation-box.drawing {
      border: 2px dashed #059669;
      background: rgba(5, 150, 105, 0.25);
    }
    .box-tag {
      position: absolute;
      bottom: 2px;
      left: 2px;
      background: #1e3a8a;
      color: #ffffff;
      font-size: 10px;
      padding: 1px 5px;
      border-radius: 3px;
      font-weight: 600;
    }
    .discussion-panel {
      flex: 1;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .discussion-panel h4 {
      margin: 0;
      color: #1e40af;
      font-size: 16px;
      font-weight: 700;
    }
    .instruction {
      font-size: 12px;
      color: #64748b;
      margin: 0;
    }
    .active-annotation-card, .new-annotation-form {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 13px;
      color: #0f172a;
    }
    .note-text {
      font-size: 14px;
      margin: 0 0 12px 0;
      line-height: 1.4;
      color: #334155;
    }
    .thread-title {
      font-size: 12px;
      color: #0f172a;
      font-weight: 600;
    }
    .comment-input-row {
      display: flex;
      gap: 8px;
      margin-top: 8px;
    }
    .comment-input-row input, .new-annotation-form textarea {
      width: 100%;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #0f172a;
      padding: 8px;
      border-radius: 6px;
      font-size: 13px;
    }
    .comment-input-row input:focus, .new-annotation-form textarea:focus {
      outline: none;
      border-color: #1e40af;
    }
    .comment-input-row button, .btn-save {
      background: #1e40af;
      color: #fff;
      border: none;
      padding: 8px 14px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
    }
    .comment-input-row button:hover, .btn-save:hover {
      background: #1d4ed8;
    }
    .form-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    .form-title-row h5 {
      margin: 0;
    }
    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 10px;
    }
    .btn-cancel {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      color: #475569;
      padding: 8px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
    }
    .btn-cancel:hover {
      background: #e2e8f0;
    }
    .empty-state {
      padding: 40px 10px;
      text-align: center;
      color: #64748b;
      font-size: 13px;
    }
  `]
})
export class ImageAnnotatorComponent {
  imageUrl = input<string>('https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=1200&q=80');

  annotations = signal<ScientificAnnotation[]>([
    {
      id: 'ann-1',
      resourceId: 'res-img-1',
      author: { id: 'u1', fullName: 'Dra. Elena Ramos', email: 'elena@consorcio.org', role: 'RESEARCHER' },
      targetType: 'IMAGE_REGION',
      coordinates: { x: 0.28, y: 0.25, width: 0.22, height: 0.20 },
      noteContent: '¿Esta agregación celular se debe a la concentración del reactivo o al tiempo de incubación?',
      commentsCount: 3,
      createdAt: '2026-10-21T10:00:00Z'
    }
  ]);

  selectedAnnotation = signal<ScientificAnnotation | null>(null);
  currentBox = signal<ImageCoordinates | null>(null);
  pendingBox = signal<ImageCoordinates | null>(null);

  isDrawing = false;
  startX = 0;
  startY = 0;
  newNoteContent = '';
  newCommentText = '';

  onVoiceComment(text: string): void {
    if (this.newCommentText.trim()) {
      this.newCommentText += ' ' + text;
    } else {
      this.newCommentText = text;
    }
  }

  onVoiceNewNote(text: string): void {
    if (this.newNoteContent.trim()) {
      this.newNoteContent += ' ' + text;
    } else {
      this.newNoteContent = text;
    }
  }

  getBoxCoords(ann: ScientificAnnotation): ImageCoordinates | null {
    if (ann.targetType === 'IMAGE_REGION') {
      return ann.coordinates as ImageCoordinates;
    }
    return null;
  }

  selectAnnotation(ann: ScientificAnnotation, event: MouseEvent) {
    event.stopPropagation();
    this.selectedAnnotation.set(ann);
    this.pendingBox.set(null);
  }

  startDrawing(event: MouseEvent) {
    if (this.selectedAnnotation()) {
      this.selectedAnnotation.set(null);
    }
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();

    this.isDrawing = true;
    this.startX = (event.clientX - rect.left) / rect.width;
    this.startY = (event.clientY - rect.top) / rect.height;

    this.currentBox.set({
      x: this.startX,
      y: this.startY,
      width: 0,
      height: 0
    });
  }

  draw(event: MouseEvent) {
    if (!this.isDrawing) return;

    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const currentX = (event.clientX - rect.left) / rect.width;
    const currentY = (event.clientY - rect.top) / rect.height;

    const x = Math.min(this.startX, currentX);
    const y = Math.min(this.startY, currentY);
    const width = Math.abs(currentX - this.startX);
    const height = Math.abs(currentY - this.startY);

    this.currentBox.set({ x, y, width, height });
  }

  finishDrawing(event: MouseEvent) {
    if (!this.isDrawing) return;
    this.isDrawing = false;

    const box = this.currentBox();
    if (box && box.width > 0.03 && box.height > 0.03) {
      this.pendingBox.set(box);
    }
    this.currentBox.set(null);
  }

  saveAnnotation() {
    const box = this.pendingBox();
    if (!box || !this.newNoteContent.trim()) return;

    const newAnn: ScientificAnnotation = {
      id: `ann-${Date.now()}`,
      resourceId: 'res-img-1',
      author: { id: 'u-current', fullName: 'Dr. Investigador Principal', email: 'investigador@consorcio.org', role: 'LEADER' },
      targetType: 'IMAGE_REGION',
      coordinates: box,
      noteContent: this.newNoteContent,
      commentsCount: 0,
      createdAt: new Date().toISOString()
    };

    this.annotations.update(prev => [...prev, newAnn]);
    this.selectedAnnotation.set(newAnn);
    this.pendingBox.set(null);
    this.newNoteContent = '';
  }

  cancelNewBox() {
    this.pendingBox.set(null);
    this.newNoteContent = '';
  }

  submitComment() {
    if (!this.newCommentText.trim()) return;
    const current = this.selectedAnnotation();
    if (current) {
      current.commentsCount++;
      this.newCommentText = '';
    }
  }
}
