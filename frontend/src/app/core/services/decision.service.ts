import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TaskItem {
  id: string;
  decision_id: string;
  space_id: string;
  title: string;
  description?: string;
  assigned_to: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  due_date?: string;
  created_at: string;
}

export interface DecisionItem {
  id: string;
  space_id: string;
  space_name: string;
  title: string;
  rationale: string;
  status: 'PROPOSED' | 'APPROVED' | 'SUPERSEDED';
  recorded_by: {
    id: string;
    full_name: string;
    academic_title?: string;
    avatar_url?: string;
    institution_name?: string;
  };
  origin_discussion_title?: string;
  tasks_count: number;
  tasks_done_count: number;
  tasks: TaskItem[];
  resolved_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class DecisionService {
  private http = inject(HttpClient);
  private apiUrl = '/api/v1/decisions';

  getDecisions(spaceId?: string): Observable<DecisionItem[]> {
    let url = this.apiUrl;
    if (spaceId && spaceId !== 'all') {
      url += `?space_id=${spaceId}`;
    }
    return this.http.get<DecisionItem[]>(url);
  }

  createDecision(payload: {
    space_id: string;
    title: string;
    rationale: string;
    origin_discussion_title?: string;
    initial_tasks: {
      title: string;
      description?: string;
      assigned_to_id: string;
      assigned_to_name: string;
      due_date?: string;
    }[];
  }): Observable<DecisionItem> {
    return this.http.post<DecisionItem>(this.apiUrl, payload);
  }

  updateTaskStatus(taskId: string, status: string): Observable<TaskItem> {
    return this.http.patch<TaskItem>(`${this.apiUrl}/tasks/${taskId}/status`, { status });
  }
}
