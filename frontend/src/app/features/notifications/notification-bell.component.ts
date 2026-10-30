import { Component, inject, signal, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, NotificationItem } from '../../core/services/notification.service';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="notif-wrapper">
      <!-- Botón Campana en la Cabecera -->
      <button 
        type="button"
        class="bell-btn" 
        [class.has-unread]="unreadCount() > 0"
        (click)="toggleMenu()"
        title="Notificaciones colegiadas en tiempo real"
      >
        <span class="bell-icon">🔔</span>
        @if (unreadCount() > 0) {
          <span class="badge">{{ unreadCount() }}</span>
        }
      </button>

      <!-- Panel Desplegable (Popover) -->
      @if (isOpen()) {
        <div class="popover-backdrop" (click)="closeMenu()"></div>
        <div class="notif-dropdown">
          <div class="dropdown-header">
            <div class="header-title">
              <h4>Notificaciones Colegiadas</h4>
              @if (unreadCount() > 0) {
                <span class="counter-pill">{{ unreadCount() }} pendientes</span>
              }
            </div>
            @if (unreadCount() > 0) {
              <button type="button" class="action-link" (click)="markAllRead()">
                ✓ Marcar todas como leídas
              </button>
            }
          </div>

          <!-- Filtros de lista -->
          <div class="dropdown-tabs">
            <button 
              type="button"
              class="tab-btn" 
              [class.active]="filterMode() === 'all'"
              (click)="filterMode.set('all')"
            >
              Todas ({{ allNotifications().length }})
            </button>
            <button 
              type="button"
              class="tab-btn" 
              [class.active]="filterMode() === 'unread'"
              (click)="filterMode.set('unread')"
            >
              No leídas ({{ unreadCount() }})
            </button>
          </div>

          <!-- Lista de Notificaciones -->
          <div class="notif-list">
            @if (displayedNotifications().length === 0) {
              <div class="empty-state">
                <span class="empty-icon">📭</span>
                <p>No tienes notificaciones pendientes en este momento.</p>
              </div>
            } @else {
              @for (item of displayedNotifications(); track item.id) {
                <div 
                  class="notif-item" 
                  [class.unread]="!item.is_read"
                  (click)="handleItemClick(item)"
                >
                  <div class="item-avatar">
                    @if (item.actor_avatar && item.actor_avatar.startsWith('http')) {
                      <img [src]="item.actor_avatar" class="avatar-photo" alt="" />
                    } @else {
                      <span>{{ item.actor_avatar || '🔔' }}</span>
                    }
                  </div>
                  <div class="item-content">
                    <div class="item-top">
                      <span class="action-tag" [class]="item.action_type">
                        {{ getActionLabel(item.action_type) }}
                      </span>
                      <span class="item-time">{{ item.created_at }}</span>
                    </div>
                    <div class="item-title">{{ item.title }}</div>
                    <div class="item-summary">{{ item.summary }}</div>
                    <div class="item-footer">
                      <span class="actor-info">De: <strong>{{ item.actor_name }}</strong></span>
                      <span class="nav-hint">Ir a sección →</span>
                    </div>
                  </div>
                  @if (!item.is_read) {
                    <div class="unread-dot" title="No leída"></div>
                  }
                </div>
              }
            }
          </div>

          <div class="popover-footer-actions">
            <button type="button" class="btn-open-personal-center" (click)="openPersonalCenter()">
              ↔️ Abrir Centro Personal y Navegador Lateral →
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .notif-wrapper {
      position: relative;
      display: inline-block;
    }

    .bell-btn {
      position: relative;
      background: #1e293b;
      border: 1px solid #334155;
      color: #cbd5e1;
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 1.15rem;

      &:hover {
        background: #334155;
        border-color: #64748b;
        color: #f8fafc;
        transform: translateY(-1px);
      }

      &.has-unread {
        border-color: #3b82f6;
        color: #60a5fa;
      }
    }

    .badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background: #ef4444;
      color: white;
      font-size: 0.7rem;
      font-weight: 700;
      min-width: 18px;
      height: 18px;
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 4px;
      box-shadow: 0 2px 6px rgba(239, 68, 68, 0.4);
      animation: pulse-badge 2s infinite;
    }

    @keyframes pulse-badge {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }

    .popover-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 998;
    }

    .notif-dropdown {
      position: absolute;
      top: calc(100% + 10px);
      right: 0;
      width: 380px;
      max-height: 520px;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 14px;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.05);
      z-index: 999;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transform-origin: top right;
      animation: popover-slide 180ms cubic-bezier(0.23, 1, 0.32, 1);
    }

    @keyframes popover-slide {
      from {
        opacity: 0;
        transform: translateY(-6px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .dropdown-header {
      padding: 14px 16px;
      background: #1e293b;
      border-bottom: 1px solid #334155;
      display: flex;
      align-items: center;
      justify-content: space-between;

      .header-title {
        display: flex;
        align-items: center;
        gap: 8px;

        h4 {
          margin: 0;
          font-size: 0.95rem;
          font-weight: 700;
          color: #f8fafc;
        }

        .counter-pill {
          background: rgba(59, 130, 246, 0.2);
          color: #93c5fd;
          font-size: 0.72rem;
          font-weight: 600;
          padding: 2px 7px;
          border-radius: 10px;
          border: 1px solid rgba(59, 130, 246, 0.3);
        }
      }

      .action-link {
        background: none;
        border: none;
        color: #38bdf8;
        font-size: 0.78rem;
        cursor: pointer;
        padding: 0;
        font-weight: 600;

        &:hover {
          text-decoration: underline;
          color: #7dd3fc;
        }
      }
    }

    .dropdown-tabs {
      display: flex;
      border-bottom: 1px solid #1e293b;
      background: #0b1120;

      .tab-btn {
        flex: 1;
        background: none;
        border: none;
        border-bottom: 2px solid transparent;
        color: #94a3b8;
        font-size: 0.8rem;
        font-weight: 600;
        padding: 9px 12px;
        cursor: pointer;
        transition: all 0.15s ease;

        &:hover {
          color: #e2e8f0;
          background: rgba(255, 255, 255, 0.02);
        }

        &.active {
          color: #38bdf8;
          border-bottom-color: #38bdf8;
          background: rgba(56, 189, 248, 0.05);
        }
      }
    }

    .notif-list {
      flex: 1;
      overflow-y: auto;
      max-height: 400px;
    }

    .empty-state {
      padding: 40px 20px;
      text-align: center;
      color: #64748b;

      .empty-icon {
        font-size: 2rem;
        display: block;
        margin-bottom: 8px;
        opacity: 0.6;
      }

      p {
        margin: 0;
        font-size: 0.85rem;
      }
    }

    .notif-item {
      display: flex;
      gap: 12px;
      padding: 12px 14px;
      border-bottom: 1px solid rgba(51, 65, 85, 0.4);
      cursor: pointer;
      position: relative;
      transition: background 0.15s ease;

      &:hover {
        background: rgba(51, 65, 85, 0.35);
      }

      &.unread {
        background: rgba(30, 58, 138, 0.18);
        border-left: 3px solid #3b82f6;
      }
    }

    .item-avatar {
      font-size: 1.4rem;
      line-height: 1;
      padding-top: 2px;
      width: 36px;
      height: 36px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;

      .avatar-photo {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        object-fit: cover;
      }
    }

    .item-content {
      flex: 1;
      min-width: 0;

      .item-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 6px;
        margin-bottom: 4px;

        .action-tag {
          font-size: 0.68rem;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
          text-transform: uppercase;
          letter-spacing: 0.3px;

          &.mention {
            background: rgba(168, 85, 247, 0.2);
            color: #d8b4fe;
            border: 1px solid rgba(168, 85, 247, 0.3);
          }

          &.agreement {
            background: rgba(16, 185, 129, 0.2);
            color: #6ee7b7;
            border: 1px solid rgba(16, 185, 129, 0.3);
          }

          &.paper_upload {
            background: rgba(59, 130, 246, 0.2);
            color: #93c5fd;
            border: 1px solid rgba(59, 130, 246, 0.3);
          }

          &.deadline {
            background: rgba(239, 68, 68, 0.2);
            color: #fca5a5;
            border: 1px solid rgba(239, 68, 68, 0.3);
          }

          &.comment {
            background: rgba(234, 179, 8, 0.2);
            color: #fde047;
            border: 1px solid rgba(234, 179, 8, 0.3);
          }
        }

        .item-time {
          font-size: 0.7rem;
          color: #64748b;
        }
      }

      .item-title {
        font-size: 0.85rem;
        font-weight: 600;
        color: #f1f5f9;
        margin-bottom: 2px;
      }

      .item-summary {
        font-size: 0.78rem;
        color: #94a3b8;
        line-height: 1.35;
        margin-bottom: 6px;
      }

      .item-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 0.72rem;

        .actor-info {
          color: #64748b;

          strong {
            color: #cbd5e1;
          }
        }

        .nav-hint {
          color: #38bdf8;
          font-weight: 600;
          opacity: 0.85;
        }
      }
    }

    .unread-dot {
      width: 8px;
      height: 8px;
      background: #3b82f6;
      border-radius: 50%;
      position: absolute;
      top: 14px;
      right: 12px;
      box-shadow: 0 0 8px #3b82f6;
    }

    .popover-footer-actions {
      padding: 10px 14px;
      background: #0f172a;
      border-top: 1px solid #334155;
      text-align: center;
    }

    .btn-open-personal-center {
      width: 100%;
      padding: 8px 12px;
      background: #0284c7;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.2s;

      &:hover {
        background: #0369a1;
      }
    }
  `]
})
export class NotificationBellComponent {
  private notifService = inject(NotificationService);

  navigateTab = output<string>();

  filterMode = signal<'all' | 'unread'>('all');
  isOpen = this.notifService.isOpen;
  allNotifications = this.notifService.notifications;
  unreadCount = this.notifService.unreadCount;

  displayedNotifications = computed(() => {
    const list = this.allNotifications();
    if (this.filterMode() === 'unread') {
      return list.filter(n => !n.is_read);
    }
    return list;
  });

  toggleMenu(): void {
    this.notifService.toggleOpen();
  }

  closeMenu(): void {
    this.notifService.close();
  }

  markAllRead(): void {
    this.notifService.markAllAsRead();
  }

  handleItemClick(item: NotificationItem): void {
    this.notifService.markAsRead(item.id);
    this.notifService.close();
    if (item.target_tab) {
      this.navigateTab.emit(item.target_tab);
    }
  }

  getActionLabel(type: string): string {
    switch (type) {
      case 'mention': return '💬 Mención';
      case 'agreement': return '⚖️ Acuerdo';
      case 'paper_upload': return '📄 Paper';
      case 'deadline': return '⏰ Plazo';
      case 'comment': return '💬 Comentario';
      default: return '📢 Aviso';
    }
  }

  openPersonalCenter(): void {
    this.notifService.close();
    this.navigateTab.emit('notifications');
  }
}
