import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of, throwError } from 'rxjs';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  academic_title?: string;
  role: string;
  avatar_url?: string;
  institution_name?: string;
  is_active: boolean;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in_minutes: number;
  user: UserProfile;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = '/api/v1/auth';

  private readonly TOKEN_KEY = 'c3pa_auth_token';
  private readonly USER_KEY = 'c3pa_auth_user';

  currentUser = signal<UserProfile | null>(this.getStoredUser());
  token = signal<string | null>(this.getStoredToken());
  isAuthenticated = computed(() => !!this.currentUser() && !!this.token());

  constructor() {
    // Si hay token almacenado, verificar vigencia en backend en segundo plano
    if (this.token()) {
      this.verifySession();
    }
  }

  private getStoredToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private getStoredUser(): UserProfile | null {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(this.USER_KEY);
    if (!stored) {
      // Perfil de Administrador predeterminado inicial
      return {
        id: '00000000-0000-0000-0000-000000000000',
        email: 'admin@c3pa.org',
        full_name: 'Administrador',
        academic_title: 'Coordinador General del Consorcio',
        role: 'ADMIN',
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        institution_name: 'Consorcio Metabólico C3 / Coordinación',
        is_active: true
      };
    }
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, { email, password }).pipe(
      tap((res) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem(this.TOKEN_KEY, res.access_token);
          localStorage.setItem(this.USER_KEY, JSON.stringify(res.user));
        }
        this.token.set(res.access_token);
        this.currentUser.set(res.user);
      })
    );
  }

  logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
    }
    this.token.set(null);
    this.currentUser.set(null);
  }

  verifySession(): void {
    const t = this.token();
    if (!t) return;

    this.http.get<UserProfile>(`${this.apiUrl}/me`, {
      headers: { Authorization: `Bearer ${t}` }
    }).subscribe({
      next: (user) => {
        this.currentUser.set(user);
        if (typeof window !== 'undefined') {
          localStorage.setItem(this.USER_KEY, JSON.stringify(user));
        }
      },
      error: () => {
        // Token expirado o inválido
        this.logout();
      }
    });
  }

  getAuthHeaders(): { [header: string]: string } {
    const t = this.token();
    return t ? { Authorization: `Bearer ${t}` } : {};
  }
}
