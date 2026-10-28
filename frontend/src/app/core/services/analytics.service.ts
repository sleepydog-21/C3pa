import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface ConsortiumMetrics {
  total_papers: intNumber;
  total_discussions: number;
  total_decisions: number;
  total_tasks_completed: number;
  total_tasks_in_progress: number;
  tasks_completion_rate: number;
  active_researchers: number;
  rag_indexed_chunks: number;
  resolved_annotations_percent: number;
}
type intNumber = number;

export interface LineAnalytics {
  id: string;
  name: string;
  leader: string;
  color: string;
  advances_count: number;
  papers_count: number;
  decisions_count: number;
  tasks_progress_percent: number;
}

export interface TimelineActivity {
  period: string;
  advances: number;
  discussions: number;
  papers_uploaded: number;
  decisions_agreed: number;
}

export interface AnalyticsOverview {
  kpis: ConsortiumMetrics;
  lines_progress: LineAnalytics[];
  weekly_trend: TimelineActivity[];
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8000/api/v1/analytics/overview';

  getOverview(): Observable<AnalyticsOverview> {
    return this.http.get<AnalyticsOverview>(this.apiUrl).pipe(
      catchError(() => of({
        kpis: {
          total_papers: 12,
          total_discussions: 28,
          total_decisions: 9,
          total_tasks_completed: 14,
          total_tasks_in_progress: 7,
          tasks_completion_rate: 66.7,
          active_researchers: 18,
          rag_indexed_chunks: 148,
          resolved_annotations_percent: 78.5
        },
        lines_progress: [
          {
            id: 'space-linea1',
            name: 'Línea 1: Nanocelulosa y Síntesis',
            leader: 'Dr. Carlos Méndez (UNAM)',
            color: '#1e40af',
            advances_count: 11,
            papers_count: 5,
            decisions_count: 4,
            tasks_progress_percent: 75
          },
          {
            id: 'space-linea2',
            name: 'Línea 2: Biomateriales y Citotoxicidad',
            leader: 'Dra. Sofía Hernández (UNAM)',
            color: '#059669',
            advances_count: 9,
            papers_count: 4,
            decisions_count: 3,
            tasks_progress_percent: 62
          },
          {
            id: 'space-linea3',
            name: 'Línea 3: Liberación Controlada de Fármacos',
            leader: 'Dr. Ricardo Valenzuela (UAM)',
            color: '#d97706',
            advances_count: 8,
            papers_count: 3,
            decisions_count: 2,
            tasks_progress_percent: 58
          }
        ],
        weekly_trend: [
          { period: 'Semana 1', advances: 3, discussions: 5, papers_uploaded: 2, decisions_agreed: 1 },
          { period: 'Semana 2', advances: 5, discussions: 8, papers_uploaded: 4, decisions_agreed: 2 },
          { period: 'Semana 3', advances: 7, discussions: 12, papers_uploaded: 3, decisions_agreed: 3 },
          { period: 'Semana 4 (Actual)', advances: 9, discussions: 16, papers_uploaded: 3, decisions_agreed: 3 }
        ]
      }))
    );
  }
}
