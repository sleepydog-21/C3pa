import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatAssistantComponent } from './features/assistant-rag/chat-assistant.component';
import { ImageAnnotatorComponent } from './features/scientific-viewer/image-annotator.component';
import { AudioPlayerComponent } from './features/scientific-viewer/audio-player.component';
import { ResourceUploaderComponent } from './features/resources/resource-uploader.component';
import { PaperLibraryComponent } from './features/library/paper-library.component';
import { PdfAnnotatorComponent } from './features/scientific-viewer/pdf-annotator.component';
import { StreamFeedComponent } from './features/feed/stream-feed.component';
import { DecisionsTasksComponent } from './features/decisions/decisions-tasks.component';
import { InvitationsManagerComponent } from './features/invitations/invitations-manager.component';
import { RegisterByInviteComponent } from './features/auth/register-by-invite.component';
import { WeeklyDigestComponent } from './features/digest/weekly-digest.component';
import { FloatingChatDockComponent } from './features/chat-dock/floating-chat-dock.component';
import { ScientificCalendarComponent } from './features/calendar/scientific-calendar.component';
import { ConsortiumAnalyticsComponent } from './features/analytics/consortium-analytics.component';
import { LoginComponent } from './features/auth/login.component';
import { AuthService } from './core/services/auth.service';
import { NotificationBellComponent } from './features/notifications/notification-bell.component';
import { C3paEcosystemComponent } from './features/ecosystem/c3pa-ecosystem.component';
import { TriageInboxComponent } from './features/triage/triage-inbox.component';
import { PersonalNotificationsComponent } from './features/notifications/personal-notifications.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    C3paEcosystemComponent,
    PersonalNotificationsComponent,
    TriageInboxComponent,
    ChatAssistantComponent,
    ImageAnnotatorComponent,
    AudioPlayerComponent,
    ResourceUploaderComponent,
    PaperLibraryComponent,
    PdfAnnotatorComponent,
    StreamFeedComponent,
    DecisionsTasksComponent,
    InvitationsManagerComponent,
    RegisterByInviteComponent,
    WeeklyDigestComponent,
    FloatingChatDockComponent,
    ScientificCalendarComponent,
    ConsortiumAnalyticsComponent,
    LoginComponent,
    NotificationBellComponent
  ],
  template: `
    @if (!authService.isAuthenticated()) {
      <app-login />
    } @else {
      <div class="app-layout">
        <!-- Barra Superior de Navegación -->
        <header class="app-header">
          <div class="header-left">
            <div class="logo">
              <span class="logo-icon">🧬</span>
              <span class="logo-title">C3pa</span>
            </div>
            <span class="project-tag">Consorcio Metabólico C3 • Modelado y Datos</span>
          </div>

          <nav class="nav-tabs">
            <button
              [class.active]="activeTab() === 'ecosystem'"
              (click)="activeTab.set('ecosystem')"
              class="tab-ecosystem"
            >
              🏛️ Ecosistema C3pa
            </button>
            <button
              [class.active]="activeTab() === 'triage'"
              (click)="activeTab.set('triage')"
              class="tab-triage"
              title="Centro de Triage: Revisa y resuelve 1 a 1 las menciones y dudas pendientes"
            >
              🎯 Menciones & Triage
            </button>
            <button
              [class.active]="activeTab() === 'notifications'"
              (click)="activeTab.set('notifications')"
              class="tab-notifications"
              title="Bandeja Personal: Navega hacia los lados por las menciones y comentarios donde fuiste etiquetado"
            >
              🔔 Mis Notificaciones
            </button>
            <button
              [class.active]="activeTab() === 'feed'"
              (click)="activeTab.set('feed')"
            >
              📋 Foro & Discusiones
            </button>
            <button
              [class.active]="activeTab() === 'decisions'"
              (click)="activeTab.set('decisions')"
            >
              📌 Acuerdos & Tareas
            </button>
            <button
              [class.active]="activeTab() === 'calendar'"
              (click)="activeTab.set('calendar')"
            >
              📅 Calendario & Hitos
            </button>
            <button
              [class.active]="activeTab() === 'analytics'"
              (click)="activeTab.set('analytics')"
            >
              📊 Analítica & Métricas
            </button>
            <button
              [class.active]="activeTab() === 'library'"
              (click)="activeTab.set('library')"
            >
              📚 Biblioteca de Artículos
            </button>
            <button
              [class.active]="activeTab() === 'pdf-viewer'"
              (click)="activeTab.set('pdf-viewer')"
            >
              📑 Visor & Discusión
            </button>
            <button
              [class.active]="activeTab() === 'upload'"
              (click)="activeTab.set('upload')"
            >
              📥 Subir Materiales
            </button>
            <button
              [class.active]="activeTab() === 'annotator'"
              (click)="activeTab.set('annotator')"
            >
              🔬 Visor Imágenes
            </button>
            <button
              [class.active]="activeTab() === 'voice'"
              (click)="activeTab.set('voice')"
            >
              🎙️ Notas de Voz
            </button>
            <button
              [class.active]="activeTab() === 'rag'"
              (click)="activeTab.set('rag')"
              class="tab-ai"
            >
              🤖 Asistente Inteligente (RAG)
            </button>
            <button
              [class.active]="activeTab() === 'digest'"
              (click)="activeTab.set('digest')"
            >
              📰 Boletín Semanal
            </button>
            <button
              [class.active]="activeTab() === 'invitations'"
              (click)="activeTab.set('invitations')"
              class="tab-invite"
            >
              ✉️ Invitaciones
            </button>
          </nav>

          <div class="header-right">
            <app-notification-bell (navigateTab)="onNavigateTab($event)" />
            <div class="user-chip" [title]="'Sesión activa: ' + (authService.currentUser()?.email || '')">
              <img
                *ngIf="authService.currentUser()?.avatar_url"
                [src]="authService.currentUser()?.avatar_url"
                class="user-avatar-img"
                alt="Avatar"
              />
              <span class="user-avatar" *ngIf="!authService.currentUser()?.avatar_url">
                {{ authService.currentUser()?.role === 'ADMIN' ? '🛡️' : '🔬' }}
              </span>
              <div class="user-text">
                <span class="user-name">{{ authService.currentUser()?.full_name || 'Investigador' }}</span>
                <span class="user-role">{{ authService.currentUser()?.academic_title || authService.currentUser()?.role || 'Miembro' }}</span>
              </div>
            </div>
            <button class="btn-logout" (click)="authService.logout()" title="Cerrar sesión activa en C3pa">
              🚪 Salir
            </button>
          </div>
        </header>

      <!-- Banner de Notificación Global de Registro -->
      <div *ngIf="registeredUserNotification()" class="welcome-toast-bar">
        <span>✨ {{ registeredUserNotification() }}</span>
        <button (click)="registeredUserNotification.set(null)" class="btn-dismiss-toast">✕</button>
      </div>

      <!-- Contenido Principal Dinámico -->
      <main class="main-content">
        @switch (activeTab()) {
          @case ('ecosystem') {
            <section class="tab-pane">
              <app-c3pa-ecosystem (navigateTab)="onNavigateTab($event)" />
            </section>
          }
          @case ('notifications') {
            <section class="tab-pane">
              <app-personal-notifications (navigateTab)="onNavigateTab($event)" />
            </section>
          }
          @case ('triage') {
            <section class="tab-pane">
              <app-triage-inbox />
            </section>
          }
          @case ('feed') {
            <section class="tab-pane">
              <app-stream-feed />
            </section>
          }
          @case ('decisions') {
            <section class="tab-pane">
              <app-decisions-tasks />
            </section>
          }
          @case ('calendar') {
            <section class="tab-pane">
              <app-scientific-calendar />
            </section>
          }
          @case ('analytics') {
            <section class="tab-pane">
              <app-consortium-analytics />
            </section>
          }
          @case ('library') {
            <section class="tab-pane">
              <app-paper-library
                (openPaper)="handleOpenPaper($event)"
                (uploadArticles)="activeTab.set('upload')"
              />
            </section>
          }
          @case ('pdf-viewer') {
            <section class="tab-pane">
              <app-pdf-annotator
                [paperId]="selectedPaperId()"
                [paperTitle]="selectedPaperTitle()"
                [paperAuthors]="selectedPaperAuthors()"
              />
            </section>
          }
          @case ('upload') {
            <section class="tab-pane">
              <app-resource-uploader (navigateToLibrary)="activeTab.set('library')" />
            </section>
          }
          @case ('rag') {
            <section class="tab-pane">
              <div class="pane-header">
                <h2>Memoria Institucional y Consultas con IA</h2>
                <p>Formula preguntas sobre discusiones pasadas, artículos científicos indexados, notas de voz o acuerdos formales.</p>
              </div>
              <app-chat-assistant />
            </section>
          }
          @case ('annotator') {
            <section class="tab-pane">
              <div class="pane-header">
                <h2>Visor Científico con Anotaciones sobre Imágenes</h2>
                <p>Selecciona regiones de interés en fotografías experimentales o micrografías para iniciar discusiones asíncronas con el equipo.</p>
              </div>
              <app-image-annotator />
            </section>
          }
          @case ('voice') {
            <section class="tab-pane">
              <div class="pane-header">
                <h2>Notas de Voz Científicas con Transcripción Sincronizada</h2>
                <p>Escucha grabaciones breves del equipo y navega por los fragmentos transcritos por Whisper.</p>
              </div>
              <app-audio-player />
            </section>
          }
          @case ('invitations') {
            <section class="tab-pane">
              <app-invitations-manager />
            </section>
          }
          @case ('digest') {
            <section class="tab-pane">
              <app-weekly-digest />
            </section>
          }
          @default {
            <section class="tab-pane feed-placeholder">
              <div class="welcome-card">
                <h2>Bienvenido a C3pa</h2>
                <p>Plataforma colaborativa de modelado metabólico a escala genómica para el Consorcio C3.</p>
                <div class="stats-grid">
                  <div class="stat-card">
                    <span class="stat-num">5</span>
                    <span class="stat-label">Líneas de Investigación</span>
                  </div>
                  <div class="stat-card">
                    <span class="stat-num">18</span>
                    <span class="stat-label">Artículos y Recursos</span>
                  </div>
                  <div class="stat-card">
                    <span class="stat-num">12</span>
                    <span class="stat-label">Acuerdos Formalizados</span>
                  </div>
                  <div class="stat-card">
                    <span class="stat-num">47</span>
                    <span class="stat-label">Investigadores Activos</span>
                  </div>
                </div>
              </div>
            </section>
          }
        }

        <!-- Modal Flotante de Registro Asistido por Invitación -->
        <app-register-by-invite
          *ngIf="activeInviteToken()"
          [token]="activeInviteToken()!"
          (onCancel)="activeInviteToken.set(null)"
          (onSuccess)="handleRegisterSuccess($event)"
        />
      </main>

      <!-- Bandeja Flotante de Chats (Pop-up RAG y Conversaciones Estilo Facebook) -->
      <app-floating-chat-dock />
    </div>
  }
  `,
  styles: [`
    .app-layout {
      min-height: 100vh;
      background: #f8fafc;
      color: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      flex-direction: column;
    }
    .app-header {
      background: #ffffff;
      border-bottom: 1px solid #e2e8f0;
      padding: 0 24px;
      height: 64px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .logo-icon {
      font-size: 22px;
    }
    .logo-title {
      font-weight: 800;
      letter-spacing: 0.5px;
      color: #1e3a8a;
      font-size: 18px;
    }
    .project-tag {
      font-size: 12px;
      color: #64748b;
      border-left: 1px solid #cbd5e1;
      padding-left: 12px;
      font-weight: 500;
    }
    .nav-tabs {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    .nav-tabs button {
      background: transparent;
      border: 1px solid transparent;
      color: #475569;
      padding: 7px 13px;
      border-radius: 7px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .nav-tabs button:hover {
      background: #f1f5f9;
      color: #0f172a;
    }
    .nav-tabs button.active {
      background: #1e40af;
      color: #ffffff;
      font-weight: 600;
      box-shadow: 0 1px 3px rgba(30, 64, 175, 0.2);
    }
    .nav-tabs button.tab-ecosystem {
      font-weight: 700;
      border: 1px solid rgba(245, 158, 11, 0.35);
      background: rgba(245, 158, 11, 0.06);
      color: #b45309;
    }
    .nav-tabs button.tab-ecosystem:hover {
      background: rgba(245, 158, 11, 0.14);
      color: #92400e;
    }
    .nav-tabs button.tab-ecosystem.active {
      background: linear-gradient(135deg, #091224 0%, #1e3a8a 100%);
      border-color: #f59e0b;
      color: #fbbf24;
      box-shadow: 0 2px 10px rgba(245, 158, 11, 0.3);
    }
    .nav-tabs button.tab-triage {
      font-weight: 700;
      border: 1px solid rgba(16, 185, 129, 0.4);
      background: rgba(16, 185, 129, 0.08);
      color: #047857;
    }
    .nav-tabs button.tab-triage:hover {
      background: rgba(16, 185, 129, 0.16);
      color: #065f46;
    }
    .nav-tabs button.tab-triage.active {
      background: linear-gradient(135deg, #064e3b 0%, #059669 100%);
      border-color: #34d399;
      color: #ffffff;
      box-shadow: 0 2px 10px rgba(16, 185, 129, 0.3);
    }
    .nav-tabs button.tab-notifications {
      font-weight: 700;
      border: 1px solid rgba(2, 132, 199, 0.4);
      background: rgba(2, 132, 199, 0.08);
      color: #0369a1;
    }
    .nav-tabs button.tab-notifications:hover {
      background: rgba(2, 132, 199, 0.16);
      color: #075985;
    }
    .nav-tabs button.tab-notifications.active {
      background: linear-gradient(135deg, #0c4a6e 0%, #0284c7 100%);
      border-color: #38bdf8;
      color: #ffffff;
      box-shadow: 0 2px 10px rgba(2, 132, 199, 0.3);
    }
    .nav-tabs button.tab-ai.active {
      background: #4338ca;
      color: #ffffff;
    }
    .nav-tabs button.tab-invite.active {
      background: #0284c7;
      color: #ffffff;
    }
    .welcome-toast-bar {
      background: #065f46;
      color: #ecfdf5;
      padding: 10px 24px;
      font-size: 0.88rem;
      font-weight: 600;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 2px 6px rgba(6, 95, 70, 0.2);
      animation: slideDown 0.3s ease-out;
    }
    @keyframes slideDown {
      from { transform: translateY(-100%); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .btn-dismiss-toast {
      background: transparent;
      border: none;
      color: #a7f3d0;
      font-size: 1rem;
      cursor: pointer;
    }
    .header-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .user-chip {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 4px 12px;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
    }
    .user-avatar-img {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      object-fit: cover;
      border: 1px solid #cbd5e1;
    }
    .btn-logout {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #475569;
      padding: 6px 12px;
      border-radius: 7px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: all 0.15s ease;
    }
    .btn-logout:hover {
      background: #fee2e2;
      border-color: #fca5a5;
      color: #b91c1c;
    }
    .user-avatar {
      font-size: 20px;
    }
    .user-text {
      display: flex;
      flex-direction: column;
    }
    .user-name {
      font-size: 13px;
      font-weight: 600;
      color: #0f172a;
    }
    .user-role {
      font-size: 11px;
      color: #059669;
      font-weight: 600;
    }
    .main-content {
      flex: 1;
      padding: 28px 36px;
      max-width: 1400px;
      margin: 0 auto;
      width: 100%;
      box-sizing: border-box;
    }
    .tab-pane {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .pane-header h2 {
      margin: 0 0 6px 0;
      font-size: 22px;
      color: #0f172a;
      font-weight: 700;
    }
    .pane-header p {
      margin: 0;
      color: #64748b;
      font-size: 14px;
    }
    .welcome-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 36px;
      text-align: center;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }
    .welcome-card h2 {
      font-size: 26px;
      margin: 0 0 10px 0;
      color: #1e3a8a;
      font-weight: 700;
    }
    .welcome-card p {
      color: #475569;
      font-size: 15px;
      max-width: 600px;
      margin: 0 auto 28px auto;
      line-height: 1.5;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-top: 16px;
    }
    .stat-card {
      background: #f8fafc;
      padding: 20px;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
    }
    .stat-num {
      font-size: 28px;
      font-weight: 800;
      color: #1e40af;
    }
    .stat-label {
      font-size: 13px;
      color: #64748b;
      font-weight: 500;
    }
  `]
})
export class AppComponent {
  authService = inject(AuthService);
  activeTab = signal<'ecosystem' | 'notifications' | 'triage' | 'feed' | 'decisions' | 'calendar' | 'analytics' | 'library' | 'pdf-viewer' | 'upload' | 'annotator' | 'voice' | 'rag' | 'invitations' | 'digest'>('ecosystem');

  selectedPaperId = signal<string>('paper-1');
  selectedPaperTitle = signal<string>('Síntesis y Caracterización de Nanocelulosa Bacteriana Modificada');
  selectedPaperAuthors = signal<string>('C. Méndez, E. Ramos, F. Soto (2026)');

  activeInviteToken = signal<string | null>(null);
  registeredUserNotification = signal<string | null>(null);

  onNavigateTab(tab: string): void {
    const valid = ['ecosystem', 'notifications', 'triage', 'feed', 'decisions', 'calendar', 'analytics', 'library', 'pdf-viewer', 'upload', 'annotator', 'voice', 'rag', 'invitations', 'digest'];
    if (valid.includes(tab)) {
      this.activeTab.set(tab as any);
    }
  }

  constructor() {
    if (typeof window !== 'undefined') {
      // Navegación entre pestañas
      window.addEventListener('navigate-to-tab', (e: any) => {
        if (e.detail) {
          this.activeTab.set(e.detail);
        }
      });

      // Apertura de modal de registro desde invitaciones
      window.addEventListener('open-invite-registration', (e: any) => {
        if (e.detail?.token) {
          this.activeInviteToken.set(e.detail.token);
        }
      });

      // Detección de navegación profunda desde el Asistente RAG
      window.addEventListener('navigate-to-deep-link', (e: any) => {
        const source = e.detail;
        if (!source) return;

        if (source.target_tab) {
          this.activeTab.set(source.target_tab);
        }

        if (source.target_tab === 'pdf-viewer') {
          if (source.item_id === 'paper-2') {
            this.selectedPaperId.set('paper-2');
            this.selectedPaperTitle.set('Evaluación de Nanovehículos de Oro en Cáncer de Mama Triple Negativo');
            this.selectedPaperAuthors.set('Dra. Sofía Hernández, Dra. Claudia Morales (2026)');
          } else {
            this.selectedPaperId.set('paper-1');
            this.selectedPaperTitle.set('Síntesis y Caracterización de Nanocelulosa Bacteriana Modificada');
            this.selectedPaperAuthors.set('C. Méndez, E. Ramos, F. Soto (2026)');
          }
        }
      });

      // Detección de token en URL (ej. ?invite_token=tok_...)
      const urlParams = new URLSearchParams(window.location.search);
      const inviteTok = urlParams.get('invite_token');
      if (inviteTok) {
        this.activeInviteToken.set(inviteTok);
      }
    }
  }

  handleOpenPaper(paper: any) {
    if (paper) {
      this.selectedPaperId.set(paper.id);
      this.selectedPaperTitle.set(paper.title);
      this.selectedPaperAuthors.set(paper.metadata?.authors || 'Consorcio Científico');
      this.activeTab.set('pdf-viewer');
    }
  }

  handleRegisterSuccess(user: any) {
    this.activeInviteToken.set(null);
    this.registeredUserNotification.set(`¡Bienvenido(a) ${user.full_name}! Tu cuenta como ${user.role} en ${user.institution_name} está activa.`);
    this.activeTab.set('feed');
    setTimeout(() => {
      this.registeredUserNotification.set(null);
    }, 6000);
  }
}

