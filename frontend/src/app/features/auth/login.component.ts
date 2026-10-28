import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-wrapper">
      <div class="login-container">
        <!-- Tarjeta Principal de Inicio de Sesión -->
        <div class="login-card">
          <!-- Logo & Encabezado Institucional -->
          <div class="login-header">
            <div class="logo-badge">
              <span class="logo-icon">🧬</span>
            </div>
            <h1 class="logo-title">C3pa</h1>
            <p class="tagline">Plataforma de Colaboración y Modelado Metabólico</p>
            <span class="consortium-tag">Consorcio de Ciencias de la Complejidad (C3)</span>
          </div>

          <!-- Mensaje de Error si aplica -->
          <div *ngIf="errorMessage()" class="alert-error">
            <span>⚠️ {{ errorMessage() }}</span>
          </div>

          <!-- Formulario de Acceso -->
          <form class="login-form" (ngSubmit)="handleLogin()">
            <div class="form-group">
              <label for="email">Correo Institucional</label>
              <div class="input-with-icon">
                <span class="input-icon">✉️</span>
                <input
                  id="email"
                  type="email"
                  [(ngModel)]="email"
                  name="email"
                  required
                  placeholder="ejemplo@c3.unam.mx"
                  autocomplete="email"
                />
              </div>
            </div>

            <div class="form-group">
              <label for="password">Contraseña</label>
              <div class="input-with-icon">
                <span class="input-icon">🔒</span>
                <input
                  id="password"
                  type="password"
                  [(ngModel)]="password"
                  name="password"
                  required
                  placeholder="Ingresa tu contraseña"
                  autocomplete="current-password"
                />
              </div>
            </div>

            <button type="submit" class="btn-submit" [disabled]="isLoading()">
              <span *ngIf="!isLoading()">Ingresar a C3pa →</span>
              <span *ngIf="isLoading()">Validando credenciales...</span>
            </button>
          </form>

          <!-- Separador -->
          <div class="divider">
            <span>o ingresa con una cuenta de prueba</span>
          </div>

          <!-- Accesos Rápidos de Demostración -->
          <div class="demo-accounts">
            <button
              type="button"
              class="btn-demo admin"
              (click)="quickLogin('admin@c3pa.org', 'admin')"
              [disabled]="isLoading()"
            >
              <div class="demo-avatar">🛡️</div>
              <div class="demo-info">
                <strong>Administrador / Coordinador</strong>
                <small>admin&#64;c3pa.org</small>
              </div>
              <span class="demo-arrow">›</span>
            </button>

            <button
              type="button"
              class="btn-demo"
              (click)="quickLogin('elena.ramos@cinvestav.mx', 'c3pa')"
              [disabled]="isLoading()"
            >
              <div class="demo-avatar">🔬</div>
              <div class="demo-info">
                <strong>Dra. Elena Ramos</strong>
                <small>CINVESTAV • Biología de Sistemas</small>
              </div>
              <span class="demo-arrow">›</span>
            </button>

            <button
              type="button"
              class="btn-demo"
              (click)="quickLogin('carlos.mendez@unam.mx', 'c3pa')"
              [disabled]="isLoading()"
            >
              <div class="demo-avatar">🧪</div>
              <div class="demo-info">
                <strong>Dr. Carlos Méndez</strong>
                <small>UNAM • Modelado Metabólico</small>
              </div>
              <span class="demo-arrow">›</span>
            </button>
          </div>

          <!-- Pie Institucional -->
          <div class="login-footer">
            <p>Acceso restringido exclusivamente a miembros acreditados del consorcio de investigación.</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-wrapper {
      min-height: 100vh;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      box-sizing: border-box;
    }
    .login-container {
      width: 100%;
      max-width: 480px;
    }
    .login-card {
      background: #ffffff;
      border-radius: 16px;
      padding: 36px 32px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.35);
      border: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .login-header {
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .logo-badge {
      width: 58px;
      height: 58px;
      background: #eff6ff;
      border: 2px solid #bfdbfe;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 12px;
    }
    .logo-icon {
      font-size: 28px;
    }
    .logo-title {
      margin: 0;
      font-size: 32px;
      font-weight: 800;
      color: #1e3a8a;
      letter-spacing: -0.5px;
    }
    .tagline {
      margin: 6px 0 0;
      font-size: 14px;
      color: #475569;
      font-weight: 500;
      text-align: center;
    }
    .consortium-tag {
      display: inline-block;
      margin-top: 8px;
      background: #f1f5f9;
      color: #0f172a;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 20px;
      border: 1px solid #cbd5e1;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .alert-error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      animation: fadeIn 0.2s ease;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .login-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .form-group label {
      font-size: 12px;
      font-weight: 700;
      color: #334155;
    }
    .input-with-icon {
      position: relative;
      display: flex;
      align-items: center;
    }
    .input-icon {
      position: absolute;
      left: 12px;
      font-size: 15px;
      color: #64748b;
      pointer-events: none;
    }
    .input-with-icon input {
      width: 100%;
      padding: 10px 12px 10px 38px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 14px;
      color: #0f172a;
      outline: none;
      transition: all 0.15s ease;
      box-sizing: border-box;
      background: #f8fafc;
    }
    .input-with-icon input:focus {
      border-color: #1e40af;
      background: #ffffff;
      box-shadow: 0 0 0 3px rgba(30, 64, 175, 0.15);
    }
    .btn-submit {
      margin-top: 4px;
      background: #1e3a8a;
      color: #ffffff;
      border: none;
      padding: 12px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.15s;
    }
    .btn-submit:hover:not(:disabled) {
      background: #1d4ed8;
    }
    .btn-submit:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .divider {
      display: flex;
      align-items: center;
      text-align: center;
      margin: 4px 0;
    }
    .divider::before, .divider::after {
      content: '';
      flex: 1;
      border-bottom: 1px solid #e2e8f0;
    }
    .divider span {
      padding: 0 10px;
      font-size: 11px;
      color: #94a3b8;
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
    .demo-accounts {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .btn-demo {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      cursor: pointer;
      text-align: left;
      transition: all 0.15s ease;
    }
    .btn-demo:hover {
      background: #eff6ff;
      border-color: #bfdbfe;
      transform: translateY(-1px);
    }
    .btn-demo.admin {
      background: #f0fdf4;
      border-color: #bbf7d0;
    }
    .btn-demo.admin:hover {
      background: #dcfce7;
      border-color: #86efac;
    }
    .demo-avatar {
      font-size: 20px;
      line-height: 1;
    }
    .demo-info {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .demo-info strong {
      font-size: 12px;
      color: #0f172a;
    }
    .demo-info small {
      font-size: 11px;
      color: #64748b;
    }
    .demo-arrow {
      font-size: 18px;
      color: #94a3b8;
      font-weight: bold;
    }
    .login-footer {
      text-align: center;
      border-top: 1px solid #f1f5f9;
      padding-top: 14px;
      margin-top: 4px;
    }
    .login-footer p {
      margin: 0;
      font-size: 11px;
      color: #94a3b8;
      line-height: 1.4;
    }
  `]
})
export class LoginComponent {
  private authService = inject(AuthService);

  email = '';
  password = '';
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  handleLogin() {
    if (!this.email.trim() || !this.password.trim()) {
      this.errorMessage.set('Por favor ingresa tu correo y contraseña.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.login(this.email.trim(), this.password.trim()).subscribe({
      next: () => {
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.detail || 'Error de acceso. Verifica tus credenciales.');
      }
    });
  }

  quickLogin(email: string, pass: string) {
    this.email = email;
    this.password = pass;
    this.handleLogin();
  }
}
