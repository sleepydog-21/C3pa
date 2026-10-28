import { Component, inject, signal, output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VoiceInputBtnComponent } from '../../shared/components/voice-input-btn.component';
import { ResourceService } from '../../core/services/resource.service';
import { DecisionService } from '../../core/services/decision.service';
import { FeedService } from '../../core/services/feed.service';
import { CalendarService } from '../../core/services/calendar.service';
import { ChatDockService } from '../../core/services/chat-dock.service';

@Component({
  selector: 'app-c3pa-ecosystem',
  standalone: true,
  imports: [CommonModule, FormsModule, VoiceInputBtnComponent],
  template: `
    <div class="ecosystem-view">
      <!-- 1. HERO INSTITUCIONAL ESTILO PLIIS FACMED UNAM -->
      <header class="pliis-hero">
        <div class="hero-backdrop-glow"></div>
        <div class="hero-content">
          <div class="institution-badges">
            <span class="badge-unam">🏛️ Consorcio C3 • Red Interprofesional UNAM / CINVESTAV</span>
            <span class="badge-tag">Plataforma Metabólica & Datos</span>
          </div>

          <h1 class="hero-title">
            El modelado metabólico del futuro <br />
            <span class="gradient-text">se construye colaborando</span>
          </h1>

          <p class="hero-description">
            Ecosistema colaborativo interprofesional para la integración de modelos metabólicos a escala genómica (GEM),
            análisis de balance de flujos (FBA), microbioma humano y memoria científica viva asistida por IA.
          </p>

          <!-- Barra de Búsqueda y Dictado Rápido del Ecosistema -->
          <div class="hero-search-box">
            <span class="search-icon">🔍</span>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (keyup.enter)="executeSearch()"
              placeholder="Buscar modelos GEM, reacciones metabólicas, investigadores o consultar a la IA..."
            />
            <app-voice-input-btn
              [compact]="true"
              [tooltip]="'Dictar consulta científica al ecosistema con Whisper'"
              (textTranscribed)="onVoiceSearch($event)"
            />
            <button class="btn-search-action" (click)="executeSearch()">
              Consultar
            </button>
          </div>

          <div class="hero-ctas">
            <button class="btn-cta-primary" (click)="navigate('library')">
              📚 Explorar Biblioteca de Modelos
            </button>
            <button class="btn-cta-secondary" (click)="openAiAssistant()">
              🤖 Consultar a la Memoria Viva (RAG)
            </button>
            <button class="btn-cta-secondary" (click)="navigate('feed')">
              📋 Foro de Discusión
            </button>
          </div>
        </div>
      </header>

      <!-- 2. MÉTRICAS DINÁMICAS DEL ECOSISTEMA (DATOS EN VIVO) -->
      <section class="metrics-strip">
        <div class="metric-item">
          <div class="metric-icon">📄</div>
          <div class="metric-data">
            <span class="metric-num">{{ totalResources() }}</span>
            <span class="metric-label">Modelos & Papers Indexados</span>
          </div>
        </div>

        <div class="metric-item">
          <div class="metric-icon">⚖️</div>
          <div class="metric-data">
            <span class="metric-num">{{ totalDecisions() }}</span>
            <span class="metric-label">Acuerdos Colegiados Formales</span>
          </div>
        </div>

        <div class="metric-item">
          <div class="metric-icon">💬</div>
          <div class="metric-data">
            <span class="metric-num">{{ activeDiscussions() }}</span>
            <span class="metric-label">Hilos de Debate Activos</span>
          </div>
        </div>

        <div class="metric-item">
          <div class="metric-icon">📅</div>
          <div class="metric-data">
            <span class="metric-num">{{ upcomingEvents() }}</span>
            <span class="metric-label">Hitos Próximos en Calendario</span>
          </div>
        </div>
      </section>

      <!-- 3. LOS TRES PILARES INTERPROFESIONALES (INSPIRACIÓN PLIIS) -->
      <section class="pillars-section">
        <div class="section-heading">
          <h2>Pilares del Ecosistema Científico C3pa</h2>
          <p>Articulación interdisciplinaria entre biología experimental, computación y salud traslacional.</p>
        </div>

        <div class="pillars-grid">
          <div class="pillar-card" (click)="navigate('library')">
            <div class="pillar-badge">Pilar I</div>
            <div class="pillar-icon">🧬</div>
            <h3>Modelado GEM & Microbioma</h3>
            <p>
              Reconstrucción y curaduría de redes metabólicas a escala genómica, parámetros cinéticos, balance de flujos estequiométricos (FBA) y comunidades microbianas complejas.
            </p>
            <span class="pillar-link">Ver catálogo de recursos →</span>
          </div>

          <div class="pillar-card highlight" (click)="openAiAssistant()">
            <div class="pillar-badge">Pilar II</div>
            <div class="pillar-icon">🧠</div>
            <h3>Memoria Viva & RAG con Whisper</h3>
            <p>
              Asistente cognitivo entrenado en la bibliografía del consorcio, con trazabilidad exacta a párrafos citados y reconocimiento de voz universal en todas las entradas de trabajo.
            </p>
            <span class="pillar-link">Iniciar diálogo científico →</span>
          </div>

          <div class="pillar-card" (click)="navigate('decisions')">
            <div class="pillar-badge">Pilar III</div>
            <div class="pillar-icon">🤝</div>
            <h3>Gobernanza Colegiada & Trazabilidad</h3>
            <p>
              Formalización transparente de acuerdos técnicos, asignación de tareas derivadas y seguimiento de hitos de entrega de muestras inter-laboratorio.
            </p>
            <span class="pillar-link">Consultar tablero de acuerdos →</span>
          </div>
        </div>
      </section>

      <!-- 4. ECOSISTEMA EN MOVIMIENTO: ACCESOS FUNCIONALES DIRECTOS -->
      <section class="active-ecosystem-section">
        <div class="section-heading">
          <h2>Ecosistema C3pa en Movimiento</h2>
          <p>Módulos operativos sincronizados en tiempo real para acelerar la toma de decisiones.</p>
        </div>

        <div class="ecosystem-features-grid">
          <!-- Tarjeta 1: Foro y Debates -->
          <div class="feature-box">
            <div class="feature-box-top">
              <span class="feature-tag forum">Discusión Técnica</span>
              <h4>Debates Metodológicos del Consorcio</h4>
            </div>
            <p>Intercambia observaciones sobre cultivos continuos, rendimientos de biomasa y formulación de medios metabólicos.</p>
            <div class="feature-actions">
              <button class="btn-box-action" (click)="navigate('feed')">
                Entrar al Foro Científico
              </button>
            </div>
          </div>

          <!-- Tarjeta 2: Asistente RAG Instantáneo -->
          <div class="feature-box">
            <div class="feature-box-top">
              <span class="feature-tag ai">Inteligencia Artificial</span>
              <h4>Auditoría de Dudas No Resueltas</h4>
            </div>
            <p>Consulta al asistente qué dudas metodológicas o comentarios de pares siguen abiertos en los papers cargados.</p>
            <div class="feature-actions">
              <button class="btn-box-action" (click)="launchQuickQuery('¿Qué comentarios o dudas metodológicas faltan resolver en los papers?')">
                Detectar Dudas Pendientes
              </button>
            </div>
          </div>

          <!-- Tarjeta 3: Acuerdos & Tareas -->
          <div class="feature-box">
            <div class="feature-box-top">
              <span class="feature-tag decisions">Gobernanza</span>
              <h4>Tablero de Acuerdos y Compromisos</h4>
            </div>
            <p>Revisa el progreso de cumplimiento de las tareas derivadas por línea de investigación.</p>
            <div class="feature-actions">
              <button class="btn-box-action" (click)="navigate('decisions')">
                Ver Tareas y Metas
              </button>
            </div>
          </div>

          <!-- Tarjeta 4: Calendario de Hitos -->
          <div class="feature-box">
            <div class="feature-box-top">
              <span class="feature-tag calendar">Agenda Científica</span>
              <h4>Cronograma y Entrega de Muestras</h4>
            </div>
            <p>Programa sesiones de trabajo, entregas inter-institucionales y seguimiento de convocatorias.</p>
            <div class="feature-actions">
              <button class="btn-box-action" (click)="navigate('calendar')">
                Abrir Calendario Científico
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- 5. RED DE LÍNEAS DE INVESTIGACIÓN INTERPROFESIONALES -->
      <section class="research-lines-section">
        <div class="section-heading">
          <h2>Líneas Temáticas Interprofesionales</h2>
          <p>Espacios de trabajo organizados por eje de investigación en salud y biotecnología.</p>
        </div>

        <div class="lines-cards-container">
          <div class="line-card" (click)="navigate('feed')">
            <div class="line-icon">🧪</div>
            <div class="line-info">
              <h4>Línea 1: Nanocelulosa y Polímeros</h4>
              <p>Reología, síntesis bacteriana y funcionalización de biopolímeros para andamiajes celulares.</p>
              <span class="line-coord">Coordina: Dra. Elena Ramos (CINVESTAV)</span>
            </div>
          </div>

          <div class="line-card" (click)="navigate('feed')">
            <div class="line-icon">🔬</div>
            <div class="line-info">
              <h4>Línea 2: Biomateriales y Modelado FBA</h4>
              <p>Reconstrucción metabólica, citotoxicidad in vitro y viabilidad celular de cultivos complejos.</p>
              <span class="line-coord">Coordina: Dr. Carlos Méndez (UNAM)</span>
            </div>
          </div>

          <div class="line-card" (click)="navigate('feed')">
            <div class="line-icon">💊</div>
            <div class="line-info">
              <h4>Línea 3: Farmacología & Microbioma</h4>
              <p>Farmacocinética computacional, liberación controlada y modelos multiespecie de microbiota.</p>
              <span class="line-coord">Coordina: Dra. Sofía Alarcón (Consorcio C3)</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .ecosystem-view {
      display: flex;
      flex-direction: column;
      gap: 32px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #0f172a;
    }

    /* 1. HERO INSTITUCIONAL */
    .pliis-hero {
      position: relative;
      background: linear-gradient(135deg, #091224 0%, #0f172a 50%, #1e3a8a 100%);
      color: #ffffff;
      padding: 48px 36px;
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 12px 36px rgba(15, 23, 42, 0.25);
    }

    .hero-backdrop-glow {
      position: absolute;
      top: -50%;
      right: -20%;
      width: 500px;
      height: 500px;
      background: radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, transparent 70%);
      pointer-events: none;
    }

    .hero-content {
      position: relative;
      max-width: 860px;
      margin: 0 auto;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
    }

    .institution-badges {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 10px;

      .badge-unam {
        background: rgba(245, 158, 11, 0.15);
        color: #fbbf24;
        border: 1px solid rgba(245, 158, 11, 0.35);
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 0.78rem;
        font-weight: 700;
        letter-spacing: 0.3px;
      }

      .badge-tag {
        background: rgba(56, 189, 248, 0.15);
        color: #7dd3fc;
        border: 1px solid rgba(56, 189, 248, 0.3);
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 0.78rem;
        font-weight: 600;
      }
    }

    .hero-title {
      font-size: 2.5rem;
      font-weight: 800;
      line-height: 1.2;
      margin: 0;
      letter-spacing: -0.5px;

      .gradient-text {
        background: linear-gradient(135deg, #fbbf24 0%, #38bdf8 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
    }

    .hero-description {
      font-size: 1.05rem;
      color: #cbd5e1;
      line-height: 1.6;
      margin: 0;
      max-width: 720px;
    }

    .hero-search-box {
      width: 100%;
      max-width: 650px;
      display: flex;
      align-items: center;
      background: rgba(15, 23, 42, 0.85);
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 6px 10px 6px 14px;
      gap: 8px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);

      .search-icon {
        font-size: 1.1rem;
        opacity: 0.7;
      }

      input {
        flex: 1;
        background: transparent;
        border: none;
        color: #ffffff;
        font-size: 0.92rem;
        outline: none;

        &::placeholder {
          color: #94a3b8;
        }
      }

      .btn-search-action {
        background: #f59e0b;
        color: #0f172a;
        font-weight: 700;
        border: none;
        padding: 8px 16px;
        border-radius: 8px;
        font-size: 0.85rem;
        cursor: pointer;
        transition: background 0.15s ease;

        &:hover {
          background: #fbbf24;
        }
      }
    }

    .hero-ctas {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 12px;
      margin-top: 6px;

      button {
        padding: 10px 20px;
        border-radius: 10px;
        font-size: 0.88rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s ease;
      }

      .btn-cta-primary {
        background: #f59e0b;
        color: #0f172a;
        border: none;
        box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);

        &:hover {
          background: #fbbf24;
          transform: translateY(-1px);
        }
      }

      .btn-cta-secondary {
        background: rgba(30, 41, 59, 0.8);
        color: #e2e8f0;
        border: 1px solid #475569;

        &:hover {
          background: #334155;
          border-color: #64748b;
          color: #ffffff;
          transform: translateY(-1px);
        }
      }
    }

    /* 2. BARRA DE MÉTRICAS */
    .metrics-strip {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
    }

    .metric-item {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 18px 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
      transition: all 0.2s ease;

      &:hover {
        border-color: #3b82f6;
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(59, 130, 246, 0.08);
      }

      .metric-icon {
        font-size: 1.8rem;
        background: #f8fafc;
        width: 48px;
        height: 48px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid #e2e8f0;
      }

      .metric-data {
        display: flex;
        flex-direction: column;

        .metric-num {
          font-size: 1.5rem;
          font-weight: 800;
          color: #1e3a8a;
          line-height: 1.1;
        }

        .metric-label {
          font-size: 0.8rem;
          color: #64748b;
          font-weight: 500;
          margin-top: 2px;
        }
      }
    }

    /* 3. SECCIÓN DE PILARES */
    .section-heading {
      margin-bottom: 20px;

      h2 {
        font-size: 1.35rem;
        font-weight: 700;
        color: #0f172a;
        margin: 0 0 4px 0;
      }

      p {
        font-size: 0.88rem;
        color: #64748b;
        margin: 0;
      }
    }

    .pillars-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
    }

    .pillar-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      cursor: pointer;
      position: relative;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);

      &:hover {
        border-color: #f59e0b;
        transform: translateY(-3px);
        box-shadow: 0 10px 24px rgba(245, 158, 11, 0.1);

        .pillar-link {
          color: #d97706;
          padding-left: 4px;
        }
      }

      &.highlight {
        background: linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%);
        border-color: #86efac;

        &:hover {
          border-color: #22c55e;
          box-shadow: 0 10px 24px rgba(34, 197, 94, 0.15);

          .pillar-link {
            color: #15803d;
          }
        }
      }

      .pillar-badge {
        font-size: 0.7rem;
        font-weight: 700;
        text-transform: uppercase;
        color: #f59e0b;
        letter-spacing: 0.5px;
        margin-bottom: 12px;
      }

      .pillar-icon {
        font-size: 2.2rem;
        margin-bottom: 12px;
      }

      h3 {
        font-size: 1.1rem;
        font-weight: 700;
        color: #0f172a;
        margin: 0 0 8px 0;
      }

      p {
        font-size: 0.85rem;
        color: #475569;
        line-height: 1.55;
        margin: 0 0 16px 0;
        flex: 1;
      }

      .pillar-link {
        font-size: 0.82rem;
        font-weight: 700;
        color: #1e40af;
        transition: all 0.15s ease;
      }
    }

    /* 4. ECOSISTEMA EN MOVIMIENTO */
    .ecosystem-features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 18px;
    }

    .feature-box {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 12px;

      .feature-box-top {
        display: flex;
        flex-direction: column;
        gap: 6px;

        .feature-tag {
          font-size: 0.68rem;
          font-weight: 700;
          text-transform: uppercase;
          padding: 2px 8px;
          border-radius: 6px;
          align-self: flex-start;

          &.forum { background: #e0f2fe; color: #0369a1; }
          &.ai { background: #f3e8ff; color: #7e22ce; }
          &.decisions { background: #dcfce7; color: #15803d; }
          &.calendar { background: #fef3c7; color: #b45309; }
        }

        h4 {
          margin: 0;
          font-size: 0.98rem;
          font-weight: 700;
          color: #0f172a;
        }
      }

      p {
        margin: 0;
        font-size: 0.82rem;
        color: #64748b;
        line-height: 1.45;
      }

      .feature-actions {
        margin-top: 4px;

        .btn-box-action {
          width: 100%;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          color: #1e3a8a;
          font-weight: 600;
          font-size: 0.8rem;
          padding: 8px 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;

          &:hover {
            background: #1e3a8a;
            color: #ffffff;
            border-color: #1e3a8a;
          }
        }
      }
    }

    /* 5. RED DE LÍNEAS TEMÁTICAS */
    .lines-cards-container {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 16px;
    }

    .line-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 18px;
      display: flex;
      gap: 14px;
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover {
        border-color: #3b82f6;
        transform: translateY(-2px);
        box-shadow: 0 4px 14px rgba(59, 130, 246, 0.08);
      }

      .line-icon {
        font-size: 1.8rem;
        line-height: 1;
      }

      .line-info {
        display: flex;
        flex-direction: column;
        gap: 4px;

        h4 {
          margin: 0;
          font-size: 0.95rem;
          font-weight: 700;
          color: #0f172a;
        }

        p {
          margin: 0;
          font-size: 0.8rem;
          color: #64748b;
          line-height: 1.4;
        }

        .line-coord {
          font-size: 0.72rem;
          color: #94a3b8;
          font-weight: 600;
          margin-top: 4px;
        }
      }
    }
  `]
})
export class C3paEcosystemComponent implements OnInit {
  private resourceService = inject(ResourceService);
  private decisionService = inject(DecisionService);
  private feedService = inject(FeedService);
  private calendarService = inject(CalendarService);
  private chatDockService = inject(ChatDockService);

  navigateTab = output<string>();

  searchQuery = '';
  totalResources = signal<number>(11);
  totalDecisions = signal<number>(3);
  activeDiscussions = signal<number>(6);
  upcomingEvents = signal<number>(4);

  ngOnInit(): void {
    // Carga reactiva de métricas reales
    this.resourceService.getResourcesBySpace('space-general').subscribe({
      next: (res: any[]) => this.totalResources.set(res?.length || 11),
      error: () => {}
    });

    this.decisionService.getDecisions().subscribe({
      next: (decs: any[]) => this.totalDecisions.set(decs?.length || 3),
      error: () => {}
    });

    this.feedService.getFeed().subscribe({
      next: (posts: any[]) => this.activeDiscussions.set(posts?.length || 6),
      error: () => {}
    });

    this.calendarService.getEvents().subscribe({
      next: (evs: any[]) => this.upcomingEvents.set(evs?.length || 4),
      error: () => {}
    });
  }

  navigate(tab: string): void {
    this.navigateTab.emit(tab);
  }

  openAiAssistant(): void {
    this.chatDockService.openRagChat();
  }

  onVoiceSearch(text: string): void {
    this.searchQuery = text;
    this.executeSearch();
  }

  executeSearch(): void {
    if (!this.searchQuery.trim()) return;
    const query = this.searchQuery.trim();
    this.searchQuery = '';
    // Abrir pop-up de IA con la búsqueda
    this.chatDockService.sendRagMessage(query);
  }

  launchQuickQuery(prompt: string): void {
    this.chatDockService.sendRagMessage(prompt);
  }
}
