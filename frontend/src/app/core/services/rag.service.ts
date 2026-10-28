import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { RAGResponse, RAGSource } from '../models/scientific.models';

export interface ChatMessage {
  sender: 'user' | 'assistant';
  content: string;
  sources?: RAGSource[];
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class RAGService {
  private http = inject(HttpClient);
  private apiUrl = '/api/v1/rag';

  askAssistant(
    query: string,
    spaceId?: string,
    history?: { role: string; content: string }[]
  ): Observable<RAGResponse> {
    const payload = {
      query,
      space_id: spaceId || null,
      chat_history: history || []
    };

    return this.http.post<RAGResponse>(`${this.apiUrl}/query`, payload).pipe(
      catchError(() => {
        return of(this.getMockRAGResponse(query));
      })
    );
  }

  private getMockRAGResponse(query: string): RAGResponse {
    const q = query.toLowerCase();

    // 1. Pregunta sobre comentarios pendientes / sin resolver
    if (q.includes('falta resolver') || q.includes('sin resolver') || q.includes('no resuelto') || q.includes('pendientes')) {
      return {
        answer: 'Actualmente existen **2 comentarios y dudas metodológicas abiertas (sin resolver)** en los artículos compartidos con el consorcio:\n\n1. **Dr. Fernando Soto:** Duda sobre la medición de cristalinidad previa al secado de punto crítico en el paper de Nanocelulosa.\n2. **Dra. Elena Ramos:** Cuestionamiento sobre el lavado con buffer PBS al 1X en lugar de agua desionizada para evaluar viabilidad celular.\n\nPuedes pulsar directamente en los botones de las fuentes inferiores para abrir el Visor de PDF con el fragmento y comentario correspondiente.',
        sources: [
          {
            source_type: 'UNRESOLVED_COMMENT',
            title: "Duda Pendiente en: Síntesis y Caracterización de Nanocelulosa",
            space_name: "Nanotecnología y Nuevos Materiales",
            author: "Dr. Fernando Soto (UAM)",
            date: "2026-10-25",
            link_url: "/?tab=pdf-viewer&paper_id=paper-1&comment_id=annot-1",
            snippet: "Verificar si la cristalinidad al 78% fue medida antes o después del secado por punto crítico. Esto altera la dispersión en agua.",
            target_tab: "pdf-viewer",
            item_id: "paper-1",
            deep_link_label: "📑 Abrir Visor PDF en comentario no resuelto",
            is_unresolved: true
          },
          {
            source_type: 'UNRESOLVED_COMMENT',
            title: "Duda Pendiente en: Síntesis y Caracterización de Nanocelulosa",
            space_name: "Nanotecnología y Nuevos Materiales",
            author: "Dra. Elena Ramos (CINVESTAV)",
            date: "2026-10-24",
            link_url: "/?tab=pdf-viewer&paper_id=paper-1&comment_id=annot-2",
            snippet: "¿Por qué no se utilizó buffer PBS al 1X en lugar de agua desionizada durante el lavado? Nos preocupa la viabilidad en contacto celular.",
            target_tab: "pdf-viewer",
            item_id: "paper-1",
            deep_link_label: "📑 Abrir Visor PDF en pregunta de citotoxicidad",
            is_unresolved: true
          }
        ],
        model_used: "gpt-4o-mini-rag"
      };
    }

    // 2. Pregunta sobre menciones / etiquetas
    if (q.includes('etiquetado') || q.includes('mencionaron') || q.includes('menciones') || q.includes('etiqueta')) {
      return {
        answer: 'Has sido mencionada en **2 discusiones recientes** del consorcio:\n\n1. **Dr. Carlos Méndez (Muro):** Solicitó tu visto bueno sobre la actualización del protocolo cinético a 45 °C.\n2. **Dr. Fernando Soto (Paper de Nanocelulosa):** Pidió tu opinión técnica sobre la relación entre cristalinidad y secado de membranas.\n\nPuedes usar los enlaces de abajo para ir directamente al Muro o al Visor de PDF para contestarles.',
        sources: [
          {
            source_type: 'MENTION',
            title: "Mención en el Muro: Protocolo de Hidrólisis Ácida",
            space_name: "Nanotecnología y Nuevos Materiales",
            author: "Dr. Carlos Méndez (UNAM)",
            date: "2026-10-25",
            link_url: "/?tab=feed&post_id=post-1",
            snippet: "@Dra. Principal por favor revisa el borrador subido a la biblioteca con los ensayos cinéticos a 45 °C.",
            target_tab: "feed",
            item_id: "post-1",
            deep_link_label: "📋 Ir al Muro a responder mención",
            is_unresolved: false
          },
          {
            source_type: 'MENTION',
            title: "Mención en Paper: Síntesis de Nanocelulosa",
            space_name: "Nanotecnología y Nuevos Materiales",
            author: "Dr. Fernando Soto (UAM)",
            date: "2026-10-25",
            link_url: "/?tab=pdf-viewer&paper_id=paper-1&comment_id=annot-1",
            snippet: "@Dra. Principal solicitamos tu criterio sobre el punto crítico en difracción de rayos X.",
            target_tab: "pdf-viewer",
            item_id: "paper-1",
            deep_link_label: "📑 Ir al Paper a responder mención",
            is_unresolved: true
          }
        ],
        model_used: "gpt-4o-mini-rag"
      };
    }

    // 3. Pregunta sobre qué ha hecho un investigador / laboratorio (Dr. Carlos Méndez / Dr. X)
    if (q.includes('carlos') || q.includes('mendez') || q.includes('méndez') || q.includes('laboratorio')) {
      return {
        answer: 'El **laboratorio del Dr. Carlos Méndez (UNAM)** ha tenido la siguiente actividad reciente en el consorcio:\n\n- **Aportación Bibliográfica:** Subió a la biblioteca el paper *\'Síntesis y Caracterización de Nanocelulosa Bacteriana Modificada (2026)\'*, con rendimiento del 78.4%.\n- **Publicación Técnica en el Muro:** Reportó la optimización de hidrólisis ácida a 45 °C con menor despolimerización.\n- **Discusiones Abiertas:** Participó en el debate sobre la sonicación previa a la dispersión coloidal.\n\nPuedes consultar el paper o su publicación en los enlaces de referencia.',
        sources: [
          {
            source_type: 'PDF',
            title: "Paper: Síntesis y Caracterización de Nanocelulosa Bacteriana Modificada",
            space_name: "Nanotecnología y Nuevos Materiales",
            author: "Dr. Carlos Méndez (UNAM)",
            date: "2026-10-24",
            link_url: "/?tab=library&paper_id=paper-1",
            snippet: "Obtención de nanofibras mediante hidrólisis a 45 °C con rendimiento de 78.4% y análisis de cristalinidad por DRX.",
            target_tab: "library",
            item_id: "paper-1",
            deep_link_label: "📚 Ver artículo en la Biblioteca de Papers",
            is_unresolved: false
          },
          {
            source_type: 'RESEARCHER_ACTIVITY',
            title: "Publicación: Protocolo de Hidrólisis Ácida Optimizado a 45°C",
            space_name: "Nanotecnología y Nuevos Materiales",
            author: "Dr. Carlos Méndez (UNAM)",
            date: "2026-10-25",
            link_url: "/?tab=feed&post_id=post-1",
            snippet: "Completamos los ensayos cinéticos a 45 °C con agitación a 250 rpm. Se logró un rendimiento del 78.4%.",
            target_tab: "feed",
            item_id: "post-1",
            deep_link_label: "📋 Ver publicación en el Muro",
            is_unresolved: false
          }
        ],
        model_used: "gpt-4o-mini-rag"
      };
    }

    // Respuesta por defecto con citas científicas
    return {
      answer: `Conforme a la bibliografía y la memoria viva del consorcio para "${query}":\n\nEl consorcio cuenta con protocolos estandarizados para la formulación de biomateriales y nanovehículos de entrega dirigida. Los últimos acuerdos formales establecieron una concentración de 50 nM para ensayos comparativos. Consulta los documentos específicos a través de los enlaces inferiores.`,
      sources: [
        {
          source_type: 'PDF',
          title: "Protocolo Experimental de Síntesis de Nanocelulosa.pdf",
          space_name: "Nanotecnología y Nuevos Materiales",
          author: "Dr. Carlos Méndez",
          date: "2026-10-24",
          link_url: "/?tab=pdf-viewer&paper_id=paper-1",
          snippet: "La hidrólisis ácida se ejecutó a 45 °C con agitación constante durante 60 minutos con rendimiento del 78.4%.",
          target_tab: "pdf-viewer",
          item_id: "paper-1",
          deep_link_label: "📑 Abrir en Visor de PDF",
          is_unresolved: false
        },
        {
          source_type: 'DECISION',
          title: "DEC-2026-08: Estandarización de Doxorrubicina a 50 nM",
          space_name: "Biomedicina y Oncología Molecular",
          author: "Dra. Elena Ramos",
          date: "2026-10-18",
          link_url: "/?tab=decisions&decision_id=dec-1",
          snippet: "Se aprueba por consenso fijar 50 nM como concentración estándar para todos los experimentos comparativos.",
          target_tab: "decisions",
          item_id: "dec-1",
          deep_link_label: "📌 Ver Acuerdo en Tablero",
          is_unresolved: false
        }
      ],
      model_used: "gpt-4o-mini-rag"
    };
  }
}
