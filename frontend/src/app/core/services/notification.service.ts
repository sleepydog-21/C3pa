import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';

export interface NotificationItem {
  id: string;
  recipient_email: string;
  actor_name: string;
  actor_avatar: string;
  action_type: 'mention' | 'comment' | 'agreement' | 'paper_upload' | 'deadline';
  title: string;
  summary: string;
  target_tab: 'feed' | 'library' | 'decisions' | 'calendar' | 'digest' | 'analytics';
  target_id?: string;
  created_at: string;
  is_read: boolean;
  priority: 'low' | 'normal' | 'high';
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
        // Fallback optimista local
        this.notifications.update(list =>
          list.map(n => n.id === id ? { ...n, is_read: true } : n)
        );
      }
    });
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
        // Fallback optimista local
        this.notifications.update(list =>
          list.map(n => ({ ...n, is_read: true }))
        );
      }
    });
  }
}
