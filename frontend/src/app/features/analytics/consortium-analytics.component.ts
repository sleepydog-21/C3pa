import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalyticsService, AnalyticsOverview } from '../../core/services/analytics.service';

@Component({
  selector: 'app-consortium-analytics',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="analytics-container">
      <!-- Encabezado Institucional -->
      <div class="analytics-header">
        <div>
          <h2>📊 Analítica y Métricas de Rendimiento del Consorcio C3</h2>
          <p>Supervisión del avance científico colegiado, nivel de consenso y utilización del acervo de conocimiento.</p>
        </div>
        <div class="header-actions">
          <span class="badge-role">🛡️ Modo Coordinación General</span>
          <button class="btn-refresh" (click)="loadAnalytics()">🔄 Actualizar Métricas</button>
        </div>
      </div>

      <!-- Tarjetas KPI Principales -->
      <div class="kpi-grid" *ngIf="overview()">
        <div class="kpi-card blue">
          <div class="kpi-icon">📚</div>
          <div class="kpi-data">
            <span class="kpi-value">{{ overview()?.kpis?.total_papers }}</span>
            <span class="kpi-label">Artículos Indexados</span>
            <span class="kpi-sub">Biblioteca científica activa</span>
          </div>
        </div>

        <div class="kpi-card green">
          <div class="kpi-icon">⚖️</div>
          <div class="kpi-data">
            <span class="kpi-value">{{ overview()?.kpis?.total_decisions }}</span>
            <span class="kpi-label">Acuerdos Formales</span>
            <span class="kpi-sub">Consenso colegiado unánime</span>
          </div>
        </div>

        <div class="kpi-card purple">
          <div class="kpi-icon">🎯</div>
          <div class="kpi-data">
            <span class="kpi-value">{{ overview()?.kpis?.tasks_completion_rate }}%</span>
            <span class="kpi-label">Tasa de Finalización</span>
            <span class="kpi-sub">{{ overview()?.kpis?.total_tasks_completed }} de {{ (overview()?.kpis?.total_tasks_completed || 0) + (overview()?.kpis?.total_tasks_in_progress || 0) }} tareas completadas</span>
          </div>
        </div>

        <div class="kpi-card amber">
          <div class="kpi-icon">🧠</div>
          <div class="kpi-data">
            <span class="kpi-value">{{ overview()?.kpis?.rag_indexed_chunks }}</span>
            <span class="kpi-label">Fragmentos Vectorizados</span>
            <span class="kpi-sub">Base vectorial con pgvector</span>
          </div>
        </div>
      </div>

      <!-- Sección de Desglose por Línea de Investigación -->
      <div class="section-card" *ngIf="overview()">
        <div class="card-header">
          <h3>🔬 Progreso Científico por Línea Temática</h3>
          <span class="card-subtitle">Monitoreo de hitos, entregables y actividad documental de cada grupo de investigación</span>
        </div>

        <div class="lines-list">
          @for (line of overview()?.lines_progress; track line.id) {
            <div class="line-row">
              <div class="line-info">
                <div class="line-name-wrap">
                  <span class="line-indicator" [style.background-color]="line.color"></span>
                  <span class="line-name">{{ line.name }}</span>
                </div>
                <span class="line-leader">Coordinador: <strong>{{ line.leader }}</strong></span>
              </div>

              <div class="line-metrics">
                <div class="metric-pill">📄 {{ line.papers_count }} papers</div>
                <div class="metric-pill">💬 {{ line.advances_count }} discusiones</div>
                <div class="metric-pill">✅ {{ line.decisions_count }} acuerdos</div>
              </div>

              <div class="line-progress-wrap">
                <div class="progress-bar-bg">
                  <div
                    class="progress-bar-fill"
                    [style.width.%]="line.tasks_progress_percent"
                    [style.background-color]="line.color"
                  ></div>
                </div>
                <span class="progress-label">{{ line.tasks_progress_percent }}% avance</span>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Tendencia Semanal y Eficiencia del Consorcio -->
      <div class="bottom-grid" *ngIf="overview()">
        <!-- Tendencia de Actividad -->
        <div class="section-card flex-2">
          <div class="card-header">
            <h3>📈 Actividad Semanal del Consorcio</h3>
            <span class="card-subtitle">Flujo de generación de conocimiento en las últimas 4 semanas</span>
          </div>

          <div class="trend-table-container">
            <table class="trend-table">
              <thead>
                <tr>
                  <th>Periodo</th>
                  <th>Avances Publicados</th>
                  <th>Debates Abiertos</th>
                  <th>Artículos Subidos</th>
                  <th>Acuerdos Formalizados</th>
                </tr>
              </thead>
              <tbody>
                @for (week of overview()?.weekly_trend; track week.period) {
                  <tr>
                    <td class="period-cell"><strong>{{ week.period }}</strong></td>
                    <td><span class="badge blue">+{{ week.advances }}</span></td>
                    <td><span class="badge gray">{{ week.discussions }}</span></td>
                    <td><span class="badge green">{{ week.papers_uploaded }}</span></td>
                    <td><span class="badge purple">{{ week.decisions_agreed }}</span></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <!-- Métricas de Integración RAG & Discusión -->
        <div class="section-card flex-1">
          <div class="card-header">
            <h3>🤖 Salud del Motor RAG</h3>
            <span class="card-subtitle">Asistente científico y resolución de pares</span>
          </div>

          <div class="health-metrics">
            <div class="health-item">
              <div class="health-label">
                <span>Resolución de Anotaciones Críticas</span>
                <strong>{{ overview()?.kpis?.resolved_annotations_percent }}%</strong>
              </div>
              <div class="progress-bar-bg small">
                <div class="progress-bar-fill emerald" [style.width.%]="overview()?.kpis?.resolved_annotations_percent"></div>
              </div>
            </div>

            <div class="health-item">
              <div class="health-label">
                <span>Investigadores Participantes</span>
                <strong>{{ overview()?.kpis?.active_researchers }} activos</strong>
              </div>
              <p class="health-sub">Colaboración inter-institucional sinérgica (UNAM, IPN, UAM, Cinvestav).</p>
            </div>

            <div class="health-summary-box">
              <span class="summary-check">✓</span>
              <div>
                <strong>Aislamiento de Datos por Línea</strong>
                <p>Cumplimiento del 100% en las políticas de seguridad y aislamiento temático entre laboratorios.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .analytics-container {
      max-width: 1200px;
      margin: 0 auto;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #0f172a;
      display: flex;
      flex-direction: column;
      gap: 22px;
    }
    .analytics-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 14px;
    }
    .analytics-header h2 {
      margin: 0 0 4px 0;
      color: #1e3a8a;
      font-size: 24px;
      font-weight: 700;
    }
    .analytics-header p {
      margin: 0;
      color: #64748b;
      font-size: 14px;
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .badge-role {
      background: #eff6ff;
      color: #1e40af;
      border: 1px solid #bfdbfe;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
    }
    .btn-refresh {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      padding: 7px 14px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      color: #334155;
      cursor: pointer;
      transition: background 0.15s;
    }
    .btn-refresh:hover {
      background: #f1f5f9;
    }

    /* KPI Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
    }
    .kpi-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 18px 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }
    .kpi-icon {
      font-size: 32px;
      line-height: 1;
    }
    .kpi-data {
      display: flex;
      flex-direction: column;
    }
    .kpi-value {
      font-size: 26px;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.1;
    }
    .kpi-label {
      font-size: 13px;
      font-weight: 600;
      color: #334155;
      margin-top: 2px;
    }
    .kpi-sub {
      font-size: 11px;
      color: #64748b;
      margin-top: 2px;
    }

    /* Section Cards */
    .section-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }
    .card-header {
      margin-bottom: 18px;
    }
    .card-header h3 {
      margin: 0 0 4px 0;
      font-size: 18px;
      color: #1e3a8a;
      font-weight: 700;
    }
    .card-subtitle {
      font-size: 13px;
      color: #64748b;
    }

    /* Lines Progress List */
    .lines-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .line-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      gap: 16px;
      flex-wrap: wrap;
    }
    .line-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 280px;
    }
    .line-name-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .line-indicator {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }
    .line-name {
      font-weight: 700;
      font-size: 14px;
      color: #0f172a;
    }
    .line-leader {
      font-size: 12px;
      color: #64748b;
    }
    .line-metrics {
      display: flex;
      gap: 8px;
    }
    .metric-pill {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      color: #334155;
    }
    .line-progress-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 200px;
    }
    .progress-bar-bg {
      flex: 1;
      height: 8px;
      background: #e2e8f0;
      border-radius: 4px;
      overflow: hidden;
    }
    .progress-bar-bg.small { height: 6px; }
    .progress-bar-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.3s ease;
    }
    .progress-bar-fill.emerald { background: #059669; }
    .progress-label {
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
      min-width: 60px;
      text-align: right;
    }

    /* Bottom Grid */
    .bottom-grid {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
    }
    .flex-2 { flex: 2; min-width: 450px; }
    .flex-1 { flex: 1; min-width: 300px; }

    /* Trend Table */
    .trend-table-container {
      overflow-x: auto;
    }
    .trend-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .trend-table th {
      text-align: left;
      padding: 10px 12px;
      background: #f8fafc;
      border-bottom: 2px solid #e2e8f0;
      color: #475569;
      font-weight: 600;
    }
    .trend-table td {
      padding: 12px;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
    }
    .period-cell { color: #0f172a; }
    .badge {
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: 700;
      font-size: 11px;
    }
    .badge.blue { background: #dbeafe; color: #1e40af; }
    .badge.gray { background: #f1f5f9; color: #475569; }
    .badge.green { background: #d1fae5; color: #065f46; }
    .badge.purple { background: #f3e8ff; color: #6b21a8; }

    /* Health Metrics */
    .health-metrics {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .health-item {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .health-label {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      color: #334155;
      font-weight: 600;
    }
    .health-sub {
      margin: 0;
      font-size: 12px;
      color: #64748b;
      line-height: 1.4;
    }
    .health-summary-box {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      padding: 12px 14px;
      display: flex;
      gap: 10px;
      align-items: flex-start;
      margin-top: 8px;
    }
    .summary-check {
      color: #16a34a;
      font-weight: 800;
      font-size: 16px;
    }
    .health-summary-box strong {
      font-size: 12px;
      color: #166534;
      display: block;
      margin-bottom: 2px;
    }
    .health-summary-box p {
      margin: 0;
      font-size: 11px;
      color: #15803d;
      line-height: 1.3;
    }
  `]
})
export class ConsortiumAnalyticsComponent implements OnInit {
  private analyticsService = inject(AnalyticsService);
  overview = signal<AnalyticsOverview | null>(null);

  ngOnInit() {
    this.loadAnalytics();
  }

  loadAnalytics() {
    this.analyticsService.getOverview().subscribe({
      next: (data) => this.overview.set(data),
      error: () => {}
    });
  }
}
