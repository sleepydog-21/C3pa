import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TriageComment {
  id: string;
  author_name: string;
  author_avatar?: string;
  content: string;
  created_at: string;
}

export interface TriageItem {
  id: string;
  item_type: 'MENTION' | 'UNRESOLVED_ANNOTATION' | 'UNRESOLVED_IMAGE' | 'THREAD_QUESTION';
  source_type: 'PDF' | 'IMAGE' | 'FORUM_POST';
  source_title: string;
  resource_id?: string;
  target_tab: string;
  snippet_quoted?: string;
  note_content: string;
  author_name: string;
  author_avatar?: string;
  author_institution?: string;
  created_at: string;
  is_resolved: boolean;
  resolved_by?: string;
  resolved_at?: string;
  mentions: string[];
  comments: TriageComment[];
  action_required: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
}

export interface TriageSummary {
  total_pending: number;
  total_resolved: number;
  direct_mentions_pending: number;
  urgent_count: number;
  status: 'inbox_zero' | 'action_required';
}

@Injectable({
  providedIn: 'root'
})
export class TriageService {
  private http = inject(HttpClient);
  private apiUrl = '/api/v1/triage';

  getItems(status: 'pending' | 'resolved' | 'all' = 'pending', itemType?: string): Observable<TriageItem[]> {
    let url = `${this.apiUrl}/items?status=${status}`;
    if (itemType && itemType !== 'all') {
      url += `&item_type=${itemType}`;
    }
    return this.http.get<TriageItem[]>(url);
  }

  getSummary(): Observable<TriageSummary> {
    return this.http.get<TriageSummary>(`${this.apiUrl}/summary`);
  }

  resolveItem(itemId: string, resolutionNote?: string): Observable<TriageItem> {
    return this.http.post<TriageItem>(`${this.apiUrl}/${itemId}/resolve`, {
      resolution_note: resolutionNote || null
    });
  }

  replyItem(itemId: string, content: string, resolveAfterReply: boolean = false): Observable<TriageItem> {
    return this.http.post<TriageItem>(`${this.apiUrl}/${itemId}/reply`, {
      content,
      resolve_after_reply: resolveAfterReply
    });
  }

  reopenItem(itemId: string): Observable<TriageItem> {
    return this.http.patch<TriageItem>(`${this.apiUrl}/${itemId}/reopen`, {});
  }
}
