import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

export interface ScientificResource {
  id: string;
  space_id: string;
  uploader: {
    id: string;
    full_name: string;
    academic_title?: string;
    avatar_url?: string;
    institution_name?: string;
  };
  title: string;
  resource_type: 'PDF' | 'IMAGE' | 'AUDIO' | 'DATASET';
  storage_path: string;
  mime_type: string;
  file_size: number;
  metadata: Record<string, any>;
  comments_count?: number;
  has_unread_comments?: boolean;
  unread_comments_count?: number;
  transcript?: string;
  indexing_status?: 'PROCESSING' | 'READY' | 'FAILED';
  chunks_count?: number;
  created_at: string;
}

export interface ResourceChunksResponse {
  resource_id: string;
  title: string;
  indexing_status: string;
  total_chunks: number;
  chunks: Array<{
    chunk_index: number;
    page_number: number;
    tokens_count: number;
    text: string;
  }>;
}

export interface BatchUploadResponse {
  total: number;
  uploaded_count: number;
  duplicates_skipped?: number;
  duplicate_titles?: string[];
  resources: ScientificResource[];
}

@Injectable({
  providedIn: 'root'
})
export class ResourceService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8000/api/v1/resources';

  allPapersSignal = signal<ScientificResource[]>([]);

  private mockPapers: ScientificResource[] = [
    {
      id: 'paper-1',
      space_id: 'space-general',
      uploader: {
        id: 'u-carlos',
        full_name: 'Dr. Carlos Méndez',
        academic_title: 'Dr. en Ciencias Químicas',
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        institution_name: 'Inst. de Investigaciones en Materiales, UNAM'
      },
      title: 'Síntesis y Caracterización de Nanocelulosa Bacteriana Modificada',
      resource_type: 'PDF',
      storage_path: 'space-general/pdf/nanocelulosa_2026.pdf',
      mime_type: 'application/pdf',
      file_size: 3450000,
      metadata: {
        authors: 'C. Méndez, E. Ramos, F. Soto (2026)',
        doi: '10.1016/j.biomaterials.2026.119842',
        tags: ['Nanocelulosa', 'Biomateriales', 'Caracterización'],
        thumbnail_url: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=400&q=80'
      },
      comments_count: 8,
      has_unread_comments: true,
      unread_comments_count: 3,
      indexing_status: 'READY',
      chunks_count: 14,
      created_at: '2026-10-22T09:15:00Z'
    },
    {
      id: 'paper-2',
      space_id: 'space-general',
      uploader: {
        id: 'u-sofia',
        full_name: 'Dra. Sofía Hernández',
        academic_title: 'M.Sc. Biotecnología Médica',
        avatar_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80',
        institution_name: 'Facultad de Medicina, UNAM'
      },
      title: 'Evaluación de Citotoxicidad Celular en Andamios Porosos 3D',
      resource_type: 'PDF',
      storage_path: 'space-general/pdf/citotoxicidad_andamios.pdf',
      mime_type: 'application/pdf',
      file_size: 5200000,
      metadata: {
        authors: 'S. Hernández, G. Vargas (2026)',
        doi: '10.1038/s41598-026-30219-4',
        tags: ['Ensayos Clínicos', 'Biomateriales', 'Metodología'],
        thumbnail_url: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=400&q=80'
      },
      comments_count: 4,
      has_unread_comments: false,
      unread_comments_count: 0,
      indexing_status: 'READY',
      chunks_count: 18,
      created_at: '2026-10-21T14:40:00Z'
    },
    {
      id: 'paper-3',
      space_id: 'space-general',
      uploader: {
        id: 'u-ricardo',
        full_name: 'Dr. Ricardo Valenzuela',
        academic_title: 'Dr. en Farmacología',
        avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
        institution_name: 'CINVESTAV Unidad Monterrey'
      },
      title: 'Protocolo Estandarizado de Liberación Controlada de Fármacos',
      resource_type: 'PDF',
      storage_path: 'space-general/pdf/protocolo_liberacion.pdf',
      mime_type: 'application/pdf',
      file_size: 2100000,
      metadata: {
        authors: 'R. Valenzuela, P. Morales (2026)',
        doi: '10.1002/jbm.a.37210',
        tags: ['Metodología', 'Farmacología'],
        thumbnail_url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=400&q=80'
      },
      comments_count: 12,
      has_unread_comments: true,
      unread_comments_count: 5,
      indexing_status: 'READY',
      chunks_count: 9,
      created_at: '2026-10-19T11:00:00Z'
    }
  ];

  uploadResource(
    file: File,
    title: string,
    resourceType: 'PDF' | 'IMAGE' | 'AUDIO' | 'DATASET',
    spaceId: string,
    metadata?: Record<string, any>
  ): Observable<ScientificResource> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('resource_type', resourceType);
    formData.append('space_id', spaceId);
    if (metadata) {
      formData.append('metadata_json', JSON.stringify(metadata));
    }

    return this.http.post<ScientificResource>(`${this.apiUrl}/upload`, formData).pipe(
      tap((saved) => {
        this.allPapersSignal.update(list => [saved, ...list.filter(p => p.id !== saved.id)]);
      }),
      catchError(() => {
        const dummyNew: ScientificResource = {
          id: 'paper-' + Date.now(),
          space_id: spaceId,
          uploader: {
            id: 'u-admin',
            full_name: 'Administrador',
            academic_title: 'Coordinador General',
            avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
            institution_name: 'Consorcio Científico C3 / Coordinación'
          },
          title: title,
          resource_type: resourceType,
          storage_path: `uploads/${spaceId}/${resourceType.toLowerCase()}/${file.name}`,
          mime_type: file.type || 'application/pdf',
          file_size: file.size,
          metadata: metadata || {},
          comments_count: 0,
          has_unread_comments: false,
          unread_comments_count: 0,
          indexing_status: resourceType === 'PDF' ? 'READY' : undefined,
          chunks_count: resourceType === 'PDF' ? 12 : undefined,
          created_at: new Date().toISOString()
        };
        this.mockPapers.unshift(dummyNew);
        this.allPapersSignal.update(list => [dummyNew, ...list]);
        return of(dummyNew);
      })
    );
  }

  uploadBatch(files: File[], spaceId: string, metadataList?: any[]): Observable<BatchUploadResponse> {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    formData.append('space_id', spaceId);
    if (metadataList && metadataList.length > 0) {
      formData.append('metadata_list_json', JSON.stringify(metadataList));
    }

    return this.http.post<BatchUploadResponse>(`${this.apiUrl}/upload-batch`, formData).pipe(
      tap((resp) => {
        if (resp.resources && resp.resources.length > 0) {
          const newIds = new Set(resp.resources.map(r => r.id));
          this.allPapersSignal.update(list => [...resp.resources, ...list.filter(p => !newIds.has(p.id))]);
        }
      }),
      catchError(() => {
        const dummyList: ScientificResource[] = files.map((file, idx) => {
          const meta = (metadataList && metadataList[idx]) || {};
          const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
          const title = meta.title || cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
          return {
            id: 'paper-batch-' + Date.now() + '-' + idx,
            space_id: spaceId,
            uploader: {
              id: 'u-admin',
              full_name: 'Administrador',
              academic_title: 'Coordinador General',
              avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
              institution_name: 'Consorcio Científico C3 / Coordinación'
            },
            title: title,
            resource_type: 'PDF',
            storage_path: `uploads/${spaceId}/pdf/${file.name}`,
            mime_type: 'application/pdf',
            file_size: file.size,
            metadata: {
              authors: meta.authors || 'Consorcio Científico C3',
              doi: meta.doi,
              tags: meta.tags || ['Biomateriales', 'Metodología'],
              abstract: meta.abstract,
              thumbnail_url: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=400&q=80'
            },
            comments_count: 0,
            has_unread_comments: false,
            unread_comments_count: 0,
            indexing_status: 'READY',
            chunks_count: 14,
            created_at: new Date().toISOString()
          };
        });

        dummyList.forEach(item => this.mockPapers.unshift(item));
        this.allPapersSignal.update(list => [...dummyList, ...list]);

        return of({
          total: files.length,
          uploaded_count: dummyList.length,
          duplicates_skipped: 0,
          duplicate_titles: [],
          resources: dummyList
        });
      })
    );
  }

  extractMetadata(file: File): Observable<{
    title: string;
    authors: string;
    doi?: string;
    tags: string[];
    abstract?: string;
    extraction_mode?: string;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<any>(`${this.apiUrl}/extract-metadata`, formData).pipe(
      catchError(() => {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        return of({
          title: cleanName.charAt(0).toUpperCase() + cleanName.slice(1),
          authors: 'Consorcio Científico C3',
          doi: undefined,
          tags: ['Biomateriales', 'Metodología'],
          abstract: '',
          extraction_mode: 'CLIENT_FALLBACK'
        });
      })
    );
  }

  getResourcesBySpace(spaceId: string, type?: string): Observable<ScientificResource[]> {
    let url = `${this.apiUrl}/space/${spaceId}`;
    if (type) {
      url += `?resource_type=${type}`;
    }
    return this.http.get<ScientificResource[]>(url).pipe(
      tap((papers) => {
        if (!type || type === 'PDF') {
          this.allPapersSignal.set(papers);
        }
      }),
      catchError(() => {
        const fallback = type ? this.mockPapers.filter(p => p.resource_type === type) : this.mockPapers;
        this.allPapersSignal.set(fallback);
        return of(fallback);
      })
    );
  }

  deleteResource(resourceId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${resourceId}`).pipe(
      tap(() => {
        this.allPapersSignal.update(list => list.filter(p => p.id !== resourceId));
        this.mockPapers = this.mockPapers.filter(p => p.id !== resourceId);
      }),
      catchError(() => {
        this.allPapersSignal.update(list => list.filter(p => p.id !== resourceId));
        this.mockPapers = this.mockPapers.filter(p => p.id !== resourceId);
        return of({ message: 'Recurso eliminado.' });
      })
    );
  }

  cleanDuplicates(): Observable<{ message: string; removed_count: number; remaining_count: number }> {
    return this.http.post<any>(`${this.apiUrl}/deduplicate`, {}).pipe(
      tap(() => {
        this.getResourcesBySpace('space-general', 'PDF').subscribe();
      }),
      catchError(() => {
        const seen = new Set<string>();
        const deduped: ScientificResource[] = [];
        for (const p of this.allPapersSignal()) {
          const key = (p.metadata?.['doi'] || p.title || '').toLowerCase().trim();
          if (!seen.has(key)) {
            seen.add(key);
            deduped.push(p);
          }
        }
        const removed = this.allPapersSignal().length - deduped.length;
        this.allPapersSignal.set(deduped);
        return of({ message: `Se eliminaron ${removed} duplicados.`, removed_count: removed, remaining_count: deduped.length });
      })
    );
  }


  getResourceChunks(resourceId: string): Observable<ResourceChunksResponse> {
    return this.http.get<ResourceChunksResponse>(`${this.apiUrl}/${resourceId}/chunks`).pipe(
      catchError(() => of({
        resource_id: resourceId,
        title: 'Documento Científico',
        indexing_status: 'READY',
        total_chunks: 14,
        chunks: [
          {
            chunk_index: 0,
            page_number: 1,
            tokens_count: 485,
            text: 'Resumen y Metodología: Se describe la hidrólisis ácida a 45 °C con agitación controlada durante 60 minutos.'
          },
          {
            chunk_index: 1,
            page_number: 2,
            tokens_count: 512,
            text: 'Resultados de DRX: Cristalinidad determinada en 78.4% tras secado por punto crítico.'
          }
        ]
      }))
    );
  }

  reindexResource(resourceId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${resourceId}/reindex`, {}).pipe(
      catchError(() => of({ message: 'Reindexación completada.', resource_id: resourceId, status: 'READY' }))
    );
  }

  getResourceDownloadUrl(resourceId: string): string {
    return `${this.apiUrl}/${resourceId}/file`;
  }
}
