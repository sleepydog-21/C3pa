import { Component, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-voice-input-btn',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="voice-btn-container" [class.compact]="compact()">
      <button
        type="button"
        class="voice-mic-btn"
        [class.recording]="isRecording()"
        [class.processing]="isProcessing()"
        (click)="toggleRecording()"
        [title]="tooltip() || (isRecording() ? 'Detener dictado y transcribir' : 'Dictar por voz con IA (Whisper)')"
      >
        @if (isProcessing()) {
          <span class="spinner">⏳</span>
        } @else if (isRecording()) {
          <span class="mic-icon recording-pulse">🛑</span>
          <span class="recording-wave">
            <span></span><span></span><span></span>
          </span>
        } @else {
          <span class="mic-icon">🎙️</span>
        }
      </button>

      <!-- Badge flotante de estado mientras graba -->
      @if (isRecording()) {
        <div class="recording-badge" (click)="stopRecording()">
          <span class="live-dot"></span>
          <span class="rec-time">{{ recordingTime() }}s</span>
          <span class="rec-label">Escuchando... haz clic para terminar</span>
        </div>
      }

      @if (isProcessing()) {
        <div class="processing-badge">
          <span>🧠 Transcribiendo con Whisper...</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .voice-btn-container {
      position: relative;
      display: inline-flex;
      align-items: center;
    }

    .voice-mic-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      background: #1e293b;
      border: 1px solid #334155;
      color: #94a3b8;
      border-radius: 8px;
      padding: 6px 10px;
      font-size: 0.95rem;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      user-select: none;

      &:hover {
        background: #334155;
        color: #38bdf8;
        border-color: #38bdf8;
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(56, 189, 248, 0.2);
      }

      &.recording {
        background: #dc2626 !important;
        border-color: #ef4444 !important;
        color: #ffffff !important;
        box-shadow: 0 0 14px rgba(239, 68, 68, 0.5) !important;
        animation: pulse-mic 1.5s infinite;
      }

      &.processing {
        background: #4338ca;
        border-color: #6366f1;
        color: #e0e7ff;
      }
    }

    .compact .voice-mic-btn {
      padding: 4px 7px;
      font-size: 0.85rem;
      border-radius: 6px;
    }

    @keyframes pulse-mic {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }

    .recording-wave {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      height: 12px;

      span {
        width: 3px;
        background: #ffffff;
        border-radius: 2px;
        animation: wave 0.8s ease-in-out infinite;

        &:nth-child(1) { height: 6px; animation-delay: 0s; }
        &:nth-child(2) { height: 12px; animation-delay: 0.2s; }
        &:nth-child(3) { height: 8px; animation-delay: 0.4s; }
      }
    }

    @keyframes wave {
      0%, 100% { height: 4px; }
      50% { height: 14px; }
    }

    .recording-badge {
      position: absolute;
      bottom: calc(100% + 8px);
      left: 50%;
      transform: translateX(-50%);
      background: #0f172a;
      border: 1px solid #ef4444;
      color: #fecaca;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 20px;
      white-space: nowrap;
      display: flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
      z-index: 1000;
      cursor: pointer;

      .live-dot {
        width: 7px;
        height: 7px;
        background: #ef4444;
        border-radius: 50%;
        box-shadow: 0 0 6px #ef4444;
        animation: blink 1s infinite;
      }

      .rec-time {
        color: #ffffff;
        font-family: monospace;
      }

      .rec-label {
        color: #cbd5e1;
      }
    }

    .processing-badge {
      position: absolute;
      bottom: calc(100% + 8px);
      left: 50%;
      transform: translateX(-50%);
      background: #1e1b4b;
      border: 1px solid #6366f1;
      color: #c7d2fe;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 20px;
      white-space: nowrap;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    }

    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }

    .spinner {
      animation: spin 1s linear infinite;
      display: inline-block;
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }
  `]
})
export class VoiceInputBtnComponent {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  compact = input<boolean>(false);
  tooltip = input<string>('');
  
  textTranscribed = output<string>();
  audioRecorded = output<Blob>();

  isRecording = signal<boolean>(false);
  isProcessing = signal<boolean>(false);
  recordingTime = signal<number>(0);

  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private timerInterval: any = null;
  private speechRecognition: any = null;
  private recognizedSpeechText = '';

  toggleRecording(): void {
    if (this.isRecording()) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  }

  startRecording(): void {
    this.audioChunks = [];
    this.recognizedSpeechText = '';
    this.recordingTime.set(0);

    // 1. Iniciar SpeechRecognition si está soportado en el navegador para dictado instantáneo
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        this.speechRecognition = new SpeechRecognition();
        this.speechRecognition.lang = 'es-MX';
        this.speechRecognition.continuous = true;
        this.speechRecognition.interimResults = false;

        this.speechRecognition.onresult = (event: any) => {
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              this.recognizedSpeechText += event.results[i][0].transcript + ' ';
            } else {
              interim += event.results[i][0].transcript;
            }
          }
        };

        this.speechRecognition.onerror = (e: any) => {
          console.warn('SpeechRecognition aviso:', e);
        };

        this.speechRecognition.start();
      } catch (err) {
        console.warn('SpeechRecognition no pudo inicializarse:', err);
      }
    }

    // 2. Iniciar MediaRecorder para grabación de audio real (para Whisper)
    navigator.mediaDevices?.getUserMedia({ audio: true }).then(stream => {
      this.mediaRecorder = new MediaRecorder(stream);
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.audioChunks.push(e.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        this.finalizeAudioProcessing();
      };

      this.mediaRecorder.start(200);
      this.isRecording.set(true);

      this.timerInterval = setInterval(() => {
        this.recordingTime.update(t => t + 1);
        if (this.recordingTime() >= 60) {
          // Límite de 60 segundos por dictado
          this.stopRecording();
        }
      }, 1000);
    }).catch(err => {
      console.error('Error accediendo al micrófono:', err);
      alert('No se pudo acceder al micrófono. Por favor permite los permisos de audio en tu navegador.');
      this.isRecording.set(false);
    });
  }

  stopRecording(): void {
    if (!this.isRecording()) return;

    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    if (this.speechRecognition) {
      try {
        this.speechRecognition.stop();
      } catch (e) {
        // Ignorar
      }
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    this.isRecording.set(false);
  }

  private finalizeAudioProcessing(): void {
    const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
    this.audioRecorded.emit(audioBlob);

    // Si la Web Speech API reconoció texto con éxito, emitirlo inmediatamente
    const cleanSpeech = this.recognizedSpeechText.trim();
    if (cleanSpeech.length > 0) {
      this.textTranscribed.emit(cleanSpeech);
      return;
    }

    // Si no hubo SpeechRecognition o no reconoció texto, transcribir con Whisper en backend
    if (audioBlob.size > 1000) {
      this.isProcessing.set(true);
      const formData = new FormData();
      formData.append('file', audioBlob, 'dictado.webm');

      const headers = this.authService.getAuthHeaders();
      this.http.post<any>('/api/v1/resources/transcribe-quick', formData, { headers }).subscribe({
        next: (res) => {
          this.isProcessing.set(false);
          if (res && res.text && res.text.trim().length > 0) {
            this.textTranscribed.emit(res.text.trim());
          }
        },
        error: (err) => {
          this.isProcessing.set(false);
          console.warn('Error en Whisper backend:', err);
        }
      });
    }
  }
}
