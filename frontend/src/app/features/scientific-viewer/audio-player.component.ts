import { Component, input, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AudioSegment } from '../../core/models/scientific.models';

@Component({
  selector: 'app-audio-player',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="voice-note-card">
      <div class="note-header">
        <div class="author-badge">🎙️ Nota de Voz Científica</div>
        <div class="audio-info">
          <strong>{{ authorName() }}</strong>
          <span>{{ recordingDate() | date:'mediumDate' }}</span>
        </div>
      </div>

      <!-- Reproductor de Audio Nativo HTML5 -->
      <div class="player-controls">
        <audio
          #audioEl
          [src]="audioUrl()"
          controls
          (timeupdate)="onTimeUpdate()"
          class="html-audio"
        ></audio>
      </div>

      <!-- Transcripción Whisper con Timestamps Clicables -->
      <div class="transcript-section">
        <span class="transcript-header">Transcripción Sincronizada (Whisper):</span>
        <div class="segments-list">
          @for (segment of segments(); track segment.id) {
            <div
              class="segment-item"
              [class.active]="isSegmentActive(segment)"
              (click)="jumpToTime(segment.start)"
            >
              <span class="timestamp-tag">
                {{ formatTime(segment.start) }} - {{ formatTime(segment.end) }}
              </span>
              <p class="segment-text">{{ segment.text }}</p>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .voice-note-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 18px;
      color: #0f172a;
      max-width: 650px;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .note-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .author-badge {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      color: #1e40af;
      font-weight: 600;
    }
    .audio-info {
      text-align: right;
      font-size: 13px;
      color: #0f172a;
    }
    .audio-info span {
      display: block;
      font-size: 11px;
      color: #64748b;
    }
    .player-controls {
      margin-bottom: 16px;
    }
    .html-audio {
      width: 100%;
      outline: none;
      border-radius: 8px;
    }
    .transcript-section {
      background: #f8fafc;
      border-radius: 8px;
      padding: 14px;
      border: 1px solid #e2e8f0;
    }
    .transcript-header {
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      display: block;
      margin-bottom: 10px;
    }
    .segments-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 220px;
      overflow-y: auto;
    }
    .segment-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 8px 10px;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .segment-item:hover {
      background: #f1f5f9;
    }
    .segment-item.active {
      background: #eff6ff;
      border-left: 3px solid #1e40af;
    }
    .timestamp-tag {
      background: #ffffff;
      color: #1e40af;
      border: 1px solid #cbd5e1;
      font-family: monospace;
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 4px;
      white-space: nowrap;
    }
    .segment-text {
      margin: 0;
      font-size: 13px;
      line-height: 1.4;
      color: #334155;
    }
  `]
})
export class AudioPlayerComponent {
  @ViewChild('audioEl') audioEl!: ElementRef<HTMLAudioElement>;

  audioUrl = input<string>('https://actions.google.com/sounds/v1/science/acid_burning.ogg');
  authorName = input<string>('Dra. Mariana Vega');
  recordingDate = input<string>('2026-10-22T14:30:00Z');

  currentTime = signal<number>(0);

  segments = signal<AudioSegment[]>([
    {
      id: 1,
      start: 0.0,
      end: 4.5,
      text: 'Revisando los resultados del ensayo de viscosidad de esta mañana...'
    },
    {
      id: 2,
      start: 4.6,
      end: 9.8,
      text: 'Notamos que por encima de los 60 grados centígrados la degradación es muy acelerada.'
    },
    {
      id: 3,
      start: 10.0,
      end: 15.2,
      text: 'Recomiendo que mantengamos el rango térmico en 45 grados según lo acordado en la sesión anterior.'
    }
  ]);

  onTimeUpdate() {
    if (this.audioEl?.nativeElement) {
      this.currentTime.set(this.audioEl.nativeElement.currentTime);
    }
  }

  isSegmentActive(segment: AudioSegment): boolean {
    const cur = this.currentTime();
    return cur >= segment.start && cur <= segment.end;
  }

  jumpToTime(seconds: number) {
    if (this.audioEl?.nativeElement) {
      this.audioEl.nativeElement.currentTime = seconds;
      this.audioEl.nativeElement.play();
    }
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
}
