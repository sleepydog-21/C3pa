import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RAGService, ChatMessage } from './rag.service';

export interface DirectMessage {
  id: string;
  sender: 'me' | 'them';
  senderName: string;
  content: string;
  timestamp: Date;
}

export interface DirectChatSession {
  id: string;
  type: 'direct';
  researcherId: string;
  researcherName: string;
  researcherRole: string;
  researcherInstitution: string;
  avatarUrl: string;
  isOnline: boolean;
  isMinimized: boolean;
  unreadCount: number;
  messages: DirectMessage[];
}

export interface RagChatSession {
  id: 'rag';
  type: 'rag';
  title: string;
  isMinimized: boolean;
  messages: ChatMessage[];
  isLoading: boolean;
}

export type DockChatWindow = RagChatSession | DirectChatSession;

export interface ResearcherContact {
  id: string;
  name: string;
  role: string;
  institution: string;
  avatarUrl: string;
  isOnline: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ChatDockService {
  private http = inject(HttpClient);
  private ragService = inject(RAGService);
  private apiUrl = 'http://localhost:8000/api/v1/chat';

  // Lista de contactos frecuentes del consorcio
  contacts = signal<ResearcherContact[]>([]);

  constructor() {
    this.loadContacts();
  }

  loadContacts(): void {
    this.http.get<any[]>(`${this.apiUrl}/contacts`).subscribe({
      next: (list) => {
        if (list && list.length > 0) {
          this.contacts.set(list.map(c => ({
            id: c.id,
            name: c.name,
            role: c.role,
            institution: c.institution,
            avatarUrl: c.avatar_url,
            isOnline: c.is_online
          })));
        } else {
          this.setDefaultContacts();
        }
      },
      error: () => this.setDefaultContacts()
    });
  }

  private setDefaultContacts(): void {
    this.contacts.set([
      {
        id: '22222222-2222-2222-2222-222222222222',
        name: 'Dra. Elena Ramos',
        role: 'Investigadora Titular',
        institution: 'CINVESTAV',
        avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80',
        isOnline: true
      },
      {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Dr. Carlos Méndez',
        role: 'Líder Nanocelulosa',
        institution: 'UNAM',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        isOnline: true
      },
      {
        id: '33333333-3333-3333-3333-333333333333',
        name: 'Dra. Sofía Hernández',
        role: 'Líder Biomateriales',
        institution: 'UNAM',
        avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80',
        isOnline: true
      }
    ]);
  }

  // Ventanas actualmente activas en el dock inferior (estilo Facebook)
  activeWindows = signal<DockChatWindow[]>([
    {
      id: 'rag',
      type: 'rag',
      title: 'Asistente C3pa (RAG)',
      isMinimized: false,
      isLoading: false,
      messages: [
        {
          sender: 'assistant',
          content: '¡Hola! Soy la memoria viva de C3pa. Puedes preguntarme en cualquier momento sobre modelos metabólicos a escala genómica, bibliografía del consorcio, qué ha publicado el equipo o acuerdos tomados.',
          timestamp: new Date()
        }
      ]
    }
  ]);

  // Indicador de si el menú desplegable de contactos está abierto
  isContactsMenuOpen = signal<boolean>(false);

  toggleContactsMenu(): void {
    this.isContactsMenuOpen.update(v => !v);
  }

  openRagChat(expandIfOpen = true): void {
    const list = this.activeWindows();
    const existing = list.find(w => w.id === 'rag') as RagChatSession | undefined;

    if (existing) {
      if (expandIfOpen && existing.isMinimized) {
        existing.isMinimized = false;
        this.activeWindows.set([...list]);
      }
    } else {
      const ragWindow: RagChatSession = {
        id: 'rag',
        type: 'rag',
        title: 'Asistente Conect (RAG)',
        isMinimized: false,
        isLoading: false,
        messages: [
          {
            sender: 'assistant',
            content: '¡Hola! Soy la memoria viva de Conect. ¿En qué puedo asistirte hoy?',
            timestamp: new Date()
          }
        ]
      };
      this.activeWindows.set([ragWindow, ...list.slice(0, 2)]);
    }
  }

  openDirectChat(contact: ResearcherContact): void {
    const list = this.activeWindows();
    const existing = list.find(w => w.id === contact.id) as DirectChatSession | undefined;

    if (existing) {
      existing.isMinimized = false;
      existing.unreadCount = 0;
      this.activeWindows.set([...list]);
    } else {
      const newSession: DirectChatSession = {
        id: contact.id,
        type: 'direct',
        researcherId: contact.id,
        researcherName: contact.name,
        researcherRole: contact.role,
        researcherInstitution: contact.institution,
        avatarUrl: contact.avatarUrl,
        isOnline: contact.isOnline,
        isMinimized: false,
        unreadCount: 0,
        messages: [
          {
            id: 'm1',
            sender: 'them',
            senderName: contact.name,
            content: `Hola colega. Acabo de revisar los avances de la línea. ¿En qué podemos colaborar o discutir hoy?`,
            timestamp: new Date(Date.now() - 1000 * 60 * 15)
          }
        ]
      };
      // Máximo 3 ventanas abiertas para no saturar la pantalla
      const filtered = list.length >= 3 ? list.slice(1) : list;
      this.activeWindows.set([...filtered, newSession]);

      // Cargar historial persistente desde el backend
      this.http.get<any[]>(`${this.apiUrl}/conversations/${contact.id}/messages`).subscribe({
        next: (msgs) => {
          if (msgs && msgs.length > 0) {
            newSession.messages = msgs.map(m => ({
              id: m.id,
              sender: m.is_mine ? 'me' : 'them',
              senderName: m.sender_name,
              content: m.content,
              timestamp: new Date(m.created_at)
            }));
            this.activeWindows.set([...this.activeWindows()]);
          }
        },
        error: () => {}
      });
    }
    this.isContactsMenuOpen.set(false);
  }

  toggleMinimize(chatId: string): void {
    this.activeWindows.update(list =>
      list.map(w => w.id === chatId ? { ...w, isMinimized: !w.isMinimized } : w)
    );
  }

  closeWindow(chatId: string): void {
    this.activeWindows.update(list => list.filter(w => w.id !== chatId));
  }

  sendDirectMessage(chatId: string, text: string): void {
    const list = this.activeWindows();
    const target = list.find(w => w.id === chatId);
    if (!target || target.type !== 'direct' || !text.trim()) return;

    const myMsg: DirectMessage = {
      id: 'm-' + Date.now(),
      sender: 'me',
      senderName: 'Administrador (Tú)',
      content: text.trim(),
      timestamp: new Date()
    };

    target.messages.push(myMsg);
    this.activeWindows.set([...list]);

    // Persistir mensaje en el backend
    this.http.post<any>(`${this.apiUrl}/conversations/${target.researcherId}/messages`, { content: text.trim() }).subscribe({
      next: () => {},
      error: () => {}
    });

    // Respuesta colaborativa inteligente del colega a los 1.5s
    setTimeout(() => {
      const replyMsg: DirectMessage = {
        id: 'reply-' + Date.now(),
        sender: 'them',
        senderName: target.researcherName,
        content: `Enterado Administrador. Lo incorporo de inmediato a los reportes de la línea y lo comparto con el equipo.`,
        timestamp: new Date()
      };
      target.messages.push(replyMsg);
      if (target.isMinimized) {
        target.unreadCount = (target.unreadCount || 0) + 1;
      }
      this.activeWindows.set([...this.activeWindows()]);
    }, 1500);
  }

  sendRagMessage(query: string): void {
    const list = this.activeWindows();
    const rag = list.find(w => w.id === 'rag') as RagChatSession | undefined;
    if (!rag || !query.trim() || rag.isLoading) return;

    rag.messages.push({
      sender: 'user',
      content: query.trim(),
      timestamp: new Date()
    });

    rag.isLoading = true;
    this.activeWindows.set([...list]);

    this.ragService.askAssistant(query).subscribe({
      next: (resp) => {
        rag.isLoading = false;
        rag.messages.push({
          sender: 'assistant',
          content: resp.answer,
          sources: resp.sources,
          timestamp: new Date()
        });
        this.activeWindows.set([...this.activeWindows()]);
      },
      error: () => {
        rag.isLoading = false;
        rag.messages.push({
          sender: 'assistant',
          content: 'No pude conectar con el servidor RAG. Por favor intenta de nuevo.',
          timestamp: new Date()
        });
        this.activeWindows.set([...this.activeWindows()]);
      }
    });
  }
}
