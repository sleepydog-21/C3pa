import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface NotificationItem {
  id: string;
  recipient_email: string;
  actor_name: string;
  actor_avatar: string;
  action_type: 'mention' | 'comment' | 'agreement' | 'paper_upload' | 'deadline' | string;
  title: string;
  summary: string;
  target_tab: string;
  target_id?: string;
  created_at: string;
  is_read: boolean;
  priority: 'low' | 'normal' | 'high' | string;
  source_location?: string;
  snippet_quoted?: string;
  comment_text?: string;
  is_mention?: boolean;
  is_resolved?: boolean;
  action_required?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private apiUrl = '/api/v1/notifications';

  notifications = signal<NotificationItem[]>([]);
  unreadCount = computed(() => this.notifications().filter(n => !n.is_read).length);
  mentions = computed(() => this.notifications().filter(n => n.is_mention));
  mentionsPendingCount = computed(() => this.mentions().filter(n => !n.is_resolved).length);
  isOpen = signal<boolean>(false);

  constructor() {
    this.fetchNotifications();
  }

  fetchNotifications(): void {
    const headers = this.authService.getAuthHeaders();
    this.http.get<NotificationItem[]>(this.apiUrl, { headers }).subscribe({
      next: (data) => {
        this.notifications.set(data);
      },
      error: (err) => {
        console.warn('Aviso al cargar notificaciones:', err);
      }
    });
  }

  fetchMentions(): Observable<NotificationItem[]> {
    const headers = this.authService.getAuthHeaders();
    return this.http.get<NotificationItem[]>(`${this.apiUrl}/mentions`, { headers }).pipe(
      tap(data => {
        // Combinar o actualizar en la señal global
        const current = this.notifications();
        const merged = [...data];
        for (const item of current) {
          if (!merged.find(m => m.id === item.id)) {
            merged.push(item);
          }
        }
        this.notifications.set(merged);
      })
    );
  }

  toggleOpen(): void {
    this.isOpen.update(v => !v);
    if (this.isOpen()) {
      this.fetchNotifications();
    }
  }

  close(): void {
    this.isOpen.set(false);
  }

  markAsRead(id: string): void {
    const headers = this.authService.getAuthHeaders();
    this.http.post(`${this.apiUrl}/${id}/read`, {}, { headers }).subscribe({
      next: () => {
        this.notifications.update(list =>
          list.map(n => n.id === id ? { ...n, is_read: true } : n)
        );
      },
      error: () => {
        this.notifications.update(list =>
          list.map(n => n.id === id ? { ...n, is_read: true } : n)
        );
      }
    });
  }

  toggleResolve(id: string): Observable<any> {
    const headers = this.authService.getAuthHeaders();
    return this.http.post<any>(`${this.apiUrl}/${id}/resolve`, {}, { headers }).pipe(
      tap(res => {
        this.notifications.update(list =>
          list.map(n => n.id === id ? { ...n, is_resolved: res.is_resolved, is_read: true } : n)
        );
      })
    );
  }

  replyToMention(id: string, content: string, resolveAfter: boolean = false): Observable<any> {
    const headers = this.authService.getAuthHeaders();
    return this.http.post<any>(`${this.apiUrl}/${id}/reply`, {
      content,
      resolve_after_reply: resolveAfter
    }, { headers }).pipe(
      tap(() => {
        this.notifications.update(list =>
          list.map(n => n.id === id ? {
            ...n,
            is_read: true,
            is_resolved: resolveAfter ? true : n.is_resolved
          } : n)
        );
      })
    );
  }

  markAllAsRead(): void {
    const headers = this.authService.getAuthHeaders();
    this.http.post(`${this.apiUrl}/mark-all-read`, {}, { headers }).subscribe({
      next: () => {
        this.notifications.update(list =>
          list.map(n => ({ ...n, is_read: true }))
        );
      },
      error: () => {
        this.notifications.update(list =>
          list.map(n => ({ ...n, is_read: true }))
        );
      }
    });
  }
}
