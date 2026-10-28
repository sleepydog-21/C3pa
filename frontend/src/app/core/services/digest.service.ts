import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  WeeklyDigestDTO,
  GenerateDigestRequest,
  UpdateDigestRequest
} from '../models/scientific.models';

@Injectable({
  providedIn: 'root'
})
export class DigestService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:8000/api/v1/digests';

  private mockDigests: WeeklyDigestDTO[] = [
    {
      id: 'digest-1',
      space_id: 'space-biomed',
      space_name: 'Biomedicina y Oncología Molecular',
      week_start_date: '2026-10-13',
      week_end_date: '2026-10-19',
      status: 'PUBLISHED',
      metrics: {
        posts_count: 8,
        comments_count: 24,
        resources_count: 3,
        active_users_count: 14,
        decisions_count: 2
      },
      summary_markdown: `# Boletín Semanal C3: Biomedicina y Oncología
**Período:** 13 de Octubre al 19 de Octubre de 2026  
**Línea Temática:** Biomedicina y Oncología Molecular  

---

### 1. Resumen Ejecutivo
Durante la semana se consolidaron los protocolos de extracción celular para nanopartículas de oro dirigidas. Se integraron dos nuevos grupos de trabajo del CINVESTAV y la UNAM, permitiendo acelerar los ensayos de citotoxicidad in vitro con una reducción de ruido estadístico del 35%.

### 2. Avances por Línea
- **Nanovehículos de entrega dirigida:** Concluyó la caracterización fisicoquímica de los lotes BN-04 y BN-05 con índice de polidispersión < 0.12.
- **Microscopía Confocal:** Se cargaron 12 micrografías en alta resolución con anotaciones colaborativas del grupo del Dr. Méndez.

### 3. Acuerdos y Decisiones Clave Formalizadas
- **DEC-2026-08:** Estandarización de concentración de Doxorrubicina a 50 nM para todos los lotes de ensayo conjunto. Responsable: Dra. Elena Ramos.
- **DEC-2026-09:** Fecha de congelamiento de datos experimentales para el manuscrito preliminar: 15 de Noviembre de 2026.

### 4. Nuevos Recursos Indexados en la Biblioteca
1. *Méndez et al.* — "Targeted Gold Nanoparticles in Triple-Negative Breast Cancer: In Vitro Evaluation".
2. Protocolo de Transfección Celular v2.4 (PDF con 8 anotaciones activas).

### 5. Próximos Pasos (Semana en Curso)
- Replicación cruzada de ensayos en laboratorios asociados.
- Revisión de comentarios no resueltos en el manuscrito preliminar.`,
      published_by: 'Dra. Sofía Hernández (Coordinación C3)',
      published_at: '2026-10-19T18:00:00Z',
      created_at: '2026-10-19T10:00:00Z'
    }
  ];

  listDigests(spaceId?: string): Observable<WeeklyDigestDTO[]> {
    const url = spaceId ? `${this.baseUrl}/?space_id=${spaceId}` : `${this.baseUrl}/`;
    return this.http.get<WeeklyDigestDTO[]>(url).pipe(
      catchError(() => {
        if (spaceId && spaceId !== 'all') {
          return of(this.mockDigests.filter(d => d.space_id === spaceId));
        }
        return of(this.mockDigests);
      })
    );
  }

  getDigest(id: string): Observable<WeeklyDigestDTO> {
    return this.http.get<WeeklyDigestDTO>(`${this.baseUrl}/${id}`).pipe(
      catchError(() => {
        const found = this.mockDigests.find(d => d.id === id);
        if (found) return of(found);
        return of(this.mockDigests[0]);
      })
    );
  }

  generateDigest(req: GenerateDigestRequest): Observable<WeeklyDigestDTO> {
    return this.http.post<WeeklyDigestDTO>(`${this.baseUrl}/generate`, req).pipe(
      catchError(() => {
        const today = new Date();
        const start = new Date(Date.now() - 7 * 86400000);
        const newDigest: WeeklyDigestDTO = {
          id: 'digest-' + Date.now(),
          space_id: req.space_id,
          space_name: req.space_name || 'Línea de Investigación',
          week_start_date: start.toISOString().split('T')[0],
          week_end_date: today.toISOString().split('T')[0],
          status: 'DRAFT',
          metrics: {
            posts_count: 6,
            comments_count: 19,
            resources_count: 2,
            active_users_count: 11,
            decisions_count: 1
          },
          summary_markdown: `# Boletín Semanal C3: ${req.space_name || 'Consorcio C3'}
**Período:** ${start.toLocaleDateString()} al ${today.toLocaleDateString()}  
**Estado:** Borrador preliminar generado por GPT-4o-mini  

---

### 1. Resumen Ejecutivo
Durante la última semana el consorcio mantuvo un ritmo acelerado con 6 publicaciones técnicas y 19 comentarios especializados, involucrando a 11 investigadores de diversas instituciones aliadas.

### 2. Avances por Tema / Línea
- Intercambio continuo sobre optimización de formulaciones y calibración de instrumental analítico.
- Validación de datos experimentales preliminares en los foros asíncronos.

### 3. Acuerdos y Decisiones Clave
- **DEC-2026-11:** Aprobación de reactivos de grado analítico para la fase 2. Responsable: Dr. Alejandro Morales.

### 4. Nuevos Recursos en Biblioteca
- *Síntesis de Nanocelulosa Bacteriana Modificada (2026)* aportado por Dra. Sofía Hernández.

### 5. Próximos Pasos
- Completar las revisiones pendientes en la biblioteca de papers.
- Consolidar los resultados del ensayo piloto antes de la sesión mensual.`,
          created_at: new Date().toISOString()
        };
        this.mockDigests.unshift(newDigest);
        return of(newDigest);
      })
    );
  }

  updateDigest(id: string, markdown: string): Observable<WeeklyDigestDTO> {
    const payload: UpdateDigestRequest = { summary_markdown: markdown };
    return this.http.put<WeeklyDigestDTO>(`${this.baseUrl}/${id}`, payload).pipe(
      catchError(() => {
        const found = this.mockDigests.find(d => d.id === id);
        if (found) {
          found.summary_markdown = markdown;
          return of(found);
        }
        throw new Error('Digest not found');
      })
    );
  }

  publishDigest(id: string): Observable<WeeklyDigestDTO> {
    return this.http.post<WeeklyDigestDTO>(`${this.baseUrl}/${id}/publish`, {}).pipe(
      catchError(() => {
        const found = this.mockDigests.find(d => d.id === id);
        if (found) {
          found.status = 'PUBLISHED';
          found.published_by = 'Dra. Sofía Hernández (Coordinación C3)';
          found.published_at = new Date().toISOString();
          return of(found);
        }
        throw new Error('Digest not found');
      })
    );
  }
}
