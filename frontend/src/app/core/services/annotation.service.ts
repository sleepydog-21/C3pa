import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ScientificAnnotation, ThreadComment } from '../models/scientific.models';

function normalizeUser(u: any): any {
  if (!u) {
    return {
      id: 'u-anon',
      fullName: 'Investigador C3',
      full_name: 'Investigador C3',
      email: 'investigador@c3.unam.mx',
      role: 'RESEARCHER',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
    };
  }
  const fullName = u.fullName || u.full_name || 'Investigador C3';
  const avatarUrl = u.avatarUrl || u.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80';
  return {
    ...u,
    id: u.id || 'u-user',
    email: u.email || '',
    fullName: fullName,
    full_name: fullName,
    academicTitle: u.academicTitle || u.academic_title,
    academic_title: u.academic_title || u.academicTitle,
    avatarUrl: avatarUrl,
    avatar_url: avatarUrl,
    role: u.role || 'RESEARCHER',
    institutionName: u.institutionName || u.institution_name,
    institution_name: u.institution_name || u.institutionName
  };
}

function normalizeComment(c: any): ThreadComment {
  if (!c) return c;
  const createdAt = c.createdAt || c.created_at || new Date().toISOString();
  const author = normalizeUser(c.author);
  const replies = (c.replies || []).map(normalizeComment);
  return {
    ...c,
    id: c.id,
    author: author,
    content: c.content || c.content_markdown || '',
    parentCommentId: c.parentCommentId || c.parent_comment_id || undefined,
    parent_comment_id: c.parent_comment_id || c.parentCommentId || undefined,
    createdAt: createdAt,
    created_at: createdAt,
    replies: replies
  } as ThreadComment;
}

function normalizeAnnotation(a: any): ScientificAnnotation {
  if (!a) return a;
  const comments = (a.comments || []).map(normalizeComment);
  const totalComments = a.commentsCount ?? a.comments_count ?? comments.length;
  const isResolved = Boolean(a.isResolved ?? a.is_resolved ?? false);
  const author = normalizeUser(a.author);
  const resolvedBy = a.resolvedBy ? normalizeUser(a.resolvedBy) : (a.resolved_by ? normalizeUser(a.resolved_by) : undefined);
  const createdAt = a.createdAt || a.created_at || new Date().toISOString();
  const noteContent = a.noteContent || a.note_content || '';
  const highlightedText = a.highlightedText || a.highlighted_text;
  const targetType = a.targetType || a.target_type || 'IMAGE_REGION';
  const resourceId = a.resourceId || a.resource_id;

  return {
    ...a,
    id: a.id,
    resourceId: resourceId,
    resource_id: resourceId,
    targetType: targetType,
    target_type: targetType,
    author: author,
    coordinates: a.coordinates || {},
    highlightedText: highlightedText,
    highlighted_text: highlightedText,
    noteContent: noteContent,
    note_content: noteContent,
    isResolved: isResolved,
    is_resolved: isResolved,
    resolvedBy: resolvedBy,
    resolved_by: resolvedBy,
    resolvedAt: a.resolvedAt || a.resolved_at,
    resolved_at: a.resolved_at || a.resolvedAt,
    commentsCount: totalComments,
    comments_count: totalComments,
    comments: comments,
    createdAt: createdAt,
    created_at: createdAt
  } as ScientificAnnotation;
}

@Injectable({
  providedIn: 'root'
})
export class AnnotationService {
  private http = inject(HttpClient);
  private apiUrl = '/api/v1/annotations';

  getAnnotationsByResource(resourceId: string): Observable<ScientificAnnotation[]> {
    return this.http.get<any[]>(`${this.apiUrl}/resource/${resourceId}`).pipe(
      map(list => (list || []).map(normalizeAnnotation))
    );
  }

  createAnnotation(payload: {
    resource_id: string;
    target_type: string;
    coordinates: any;
    highlighted_text?: string;
    note_content: string;
  }): Observable<ScientificAnnotation> {
    return this.http.post<any>(this.apiUrl, payload).pipe(
      map(normalizeAnnotation)
    );
  }

  addComment(
    annotationId: string,
    content: string,
    parentCommentId?: string
  ): Observable<ThreadComment> {
    return this.http.post<any>(`${this.apiUrl}/${annotationId}/comments`, {
      content,
      parent_comment_id: parentCommentId || null
    }).pipe(
      map(normalizeComment)
    );
  }

  toggleResolveStatus(annotationId: string): Observable<ScientificAnnotation> {
    return this.http.patch<any>(`${this.apiUrl}/${annotationId}/resolve`, {}).pipe(
      map(normalizeAnnotation)
    );
  }

  deleteAnnotation(annotationId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${annotationId}`);
  }
}

