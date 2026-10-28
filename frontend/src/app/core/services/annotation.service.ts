import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ScientificAnnotation, ThreadComment } from '../models/scientific.models';

@Injectable({
  providedIn: 'root'
})
export class AnnotationService {
  private http = inject(HttpClient);
  private apiUrl = '/api/v1/annotations';

  getAnnotationsByResource(resourceId: string): Observable<ScientificAnnotation[]> {
    return this.http.get<ScientificAnnotation[]>(`${this.apiUrl}/resource/${resourceId}`);
  }

  createAnnotation(payload: {
    resource_id: string;
    target_type: string;
    coordinates: any;
    highlighted_text?: string;
    note_content: string;
  }): Observable<ScientificAnnotation> {
    return this.http.post<ScientificAnnotation>(this.apiUrl, payload);
  }

  addComment(
    annotationId: string,
    content: string,
    parentCommentId?: string
  ): Observable<ThreadComment> {
    return this.http.post<ThreadComment>(`${this.apiUrl}/${annotationId}/comments`, {
      content,
      parent_comment_id: parentCommentId || null
    });
  }

  toggleResolveStatus(annotationId: string): Observable<ScientificAnnotation> {
    return this.http.patch<ScientificAnnotation>(`${this.apiUrl}/${annotationId}/resolve`, {});
  }
}
