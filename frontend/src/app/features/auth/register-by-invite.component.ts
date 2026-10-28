import { Component, OnInit, inject, signal, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InvitationService } from '../../core/services/invitation.service';
import { VerifyTokenResponse, RegisterByInviteRequest, UserRegisteredResponse } from '../../core/models/scientific.models';

@Component({
  selector: 'app-register-by-invite',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="register-backdrop">
      <div class="register-modal">
        <!-- Close button if dismissible -->
        <button class="btn-close" (click)="onCancel.emit()">✕</button>

        <div class="logo-header">
          <div class="c3-badge">CONECT</div>
          <h2>Registro e Incorporación por Invitación</h2>
          <p class="subtitle">Plataforma Científica Asíncrona del Consorcio C3</p>
        </div>

        <!-- Estado de Verificación -->
        <div *ngIf="isVerifying" class="verifying-box">
          <div class="spinner"></div>
          <p>Validando token criptográfico de invitación...</p>
        </div>

        <!-- Token Inválido o Expirado -->
        <div *ngIf="!isVerifying && inviteData && !inviteData.valid" class="error-box">
          <div class="error-icon">⚠️</div>
          <h3>Enlace No Válido o Expirado</h3>
          <p>
            Este token de invitación ya fue utilizado previamente o ha superado su fecha de vigencia institucional.
          </p>
          <div class="error-actions">
            <button (click)="onCancel.emit()" class="btn-secondary">Volver a la Plataforma</button>
          </div>
        </div>

        <!-- Token Válido: Formulario de Registro -->
        <div *ngIf="!isVerifying && inviteData && inviteData.valid && !registeredUser" class="invite-valid-content">
          <div class="info-prefilled-card">
            <div class="badge-row">
              <span class="secure-badge">🛡️ Invitación Verificada</span>
              <span class="role-badge">{{ inviteData.role }}</span>
            </div>
            <div class="details-grid">
              <div class="detail-item">
                <span class="lbl">Correo Electrónico:</span>
                <span class="val email">{{ inviteData.email }}</span>
              </div>
              <div class="detail-item">
                <span class="lbl">Institución:</span>
                <span class="val">{{ inviteData.institution_name }}</span>
              </div>
              <div class="detail-item full-width">
                <span class="lbl">Línea de Investigación Asignada:</span>
                <span class="val highlight">{{ inviteData.target_space_name }}</span>
              </div>
            </div>
          </div>

          <form (ngSubmit)="submitRegistration()" class="register-form">
            <div class="form-group">
              <label>Nombre y Apellidos</label>
              <input
                type="text"
                [(ngModel)]="regForm.full_name"
                name="full_name"
                placeholder="ej. Dra. Claudia Morales Sánchez"
                required
                class="dark-input"
              />
            </div>

            <div class="form-group">
              <label>Grado / Cargo Académico</label>
              <input
                type="text"
                [(ngModel)]="regForm.academic_title"
                name="academic_title"
                placeholder="ej. Investigadora Titular B - SNII II"
                required
                class="dark-input"
              />
            </div>

            <div class="form-row">
              <div class="form-group flex-1">
                <label>Contraseña</label>
                <input
                  type="password"
                  [(ngModel)]="regForm.password"
                  name="password"
                  placeholder="Mínimo 8 caracteres"
                  required
                  class="dark-input"
                />
              </div>

              <div class="form-group flex-1">
                <label>Confirmar Contraseña</label>
                <input
                  type="password"
                  [(ngModel)]="confirmPassword"
                  name="confirmPassword"
                  placeholder="Repite la contraseña"
                  required
                  class="dark-input"
                />
              </div>
            </div>

            <!-- Selector de Avatar -->
            <div class="form-group">
              <label>Selecciona tu Avatar Científico</label>
              <div class="avatar-selector">
                <img
                  *ngFor="let av of avatarOptions"
                  [src]="av"
                  [class.selected]="regForm.avatar_url === av"
                  (click)="regForm.avatar_url = av"
                  alt="avatar"
                  class="avatar-thumb"
                />
              </div>
            </div>

            <div *ngIf="errorMessage" class="inline-error">
              {{ errorMessage }}
            </div>

            <div class="form-buttons">
              <button type="button" (click)="onCancel.emit()" class="btn-secondary">
                Cancelar
              </button>
              <button
                type="submit"
                [disabled]="isSubmitting || !regForm.full_name || !regForm.academic_title || !regForm.password"
                class="btn-submit"
              >
                <span *ngIf="!isSubmitting">✓ Activar Mi Cuenta e Ingresar</span>
                <span *ngIf="isSubmitting">Activando membresía...</span>
              </button>
            </div>
          </form>
        </div>

        <!-- Registro Exitoso -->
        <div *ngIf="registeredUser" class="success-box">
          <div class="success-icon">🎉</div>
          <h3>¡Bienvenida(o) al Consorcio!</h3>
          <p class="welcome-name">{{ registeredUser.full_name }}</p>
          <p class="welcome-meta">
            {{ registeredUser.academic_title }} — {{ registeredUser.institution_name }}
          </p>
          <p class="success-msg">{{ registeredUser.message }}</p>

          <button (click)="onSuccess.emit(registeredUser)" class="btn-start">
            🚀 Entrar al Espacio de Trabajo
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .register-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(3, 7, 18, 0.85);
      backdrop-filter: blur(8px);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .register-modal {
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 16px;
      width: 100%;
      max-width: 580px;
      padding: 32px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
      position: relative;
      color: #f1f5f9;
      animation: modalFadeIn 0.25s ease-out;
    }

    @keyframes modalFadeIn {
      from { opacity: 0; transform: scale(0.96); }
      to { opacity: 1; transform: scale(1); }
    }

    .btn-close {
      position: absolute;
      top: 18px;
      right: 18px;
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 1.2rem;
      cursor: pointer;
    }

    .btn-close:hover {
      color: #fff;
    }

    .logo-header {
      text-align: center;
      margin-bottom: 24px;
    }

    .c3-badge {
      display: inline-block;
      background: linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%);
      color: #fff;
      font-weight: 800;
      font-size: 0.75rem;
      padding: 3px 10px;
      border-radius: 12px;
      letter-spacing: 0.1em;
      margin-bottom: 8px;
    }

    .logo-header h2 {
      margin: 0;
      font-size: 1.45rem;
      font-weight: 700;
      color: #f8fafc;
    }

    .subtitle {
      margin: 4px 0 0;
      color: #94a3b8;
      font-size: 0.85rem;
    }

    .verifying-box {
      text-align: center;
      padding: 40px 20px;
      color: #94a3b8;
    }

    .spinner {
      width: 36px;
      height: 36px;
      border: 3px solid rgba(99, 102, 241, 0.2);
      border-top-color: #6366f1;
      border-radius: 50%;
      margin: 0 auto 16px;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .error-box {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      padding: 24px;
      border-radius: 12px;
      text-align: center;
    }

    .error-icon {
      font-size: 40px;
      margin-bottom: 8px;
    }

    .error-box h3 {
      color: #f87171;
      margin: 0 0 8px;
    }

    .error-box p {
      color: #cbd5e1;
      font-size: 0.88rem;
    }

    .info-prefilled-card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 10px;
      padding: 16px;
      margin-bottom: 20px;
    }

    .badge-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .secure-badge {
      font-size: 0.76rem;
      color: #10b981;
      font-weight: 600;
    }

    .role-badge {
      font-size: 0.72rem;
      background: #312e81;
      color: #c7d2fe;
      padding: 2px 8px;
      border-radius: 6px;
      font-weight: 600;
    }

    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      font-size: 0.82rem;
    }

    .detail-item.full-width {
      grid-column: span 2;
    }

    .lbl {
      color: #94a3b8;
      display: block;
      font-size: 0.72rem;
      margin-bottom: 2px;
    }

    .val {
      color: #e2e8f0;
      font-weight: 500;
    }

    .val.email {
      color: #38bdf8;
      font-family: monospace;
    }

    .val.highlight {
      color: #a78bfa;
      font-weight: 600;
    }

    .register-form {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .form-group label {
      font-size: 0.82rem;
      font-weight: 600;
      color: #cbd5e1;
    }

    .form-row {
      display: flex;
      gap: 12px;
    }

    .flex-1 {
      flex: 1;
    }

    .dark-input {
      background: #090d16;
      border: 1px solid #334155;
      color: #f8fafc;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 0.88rem;
    }

    .dark-input:focus {
      outline: none;
      border-color: #6366f1;
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.25);
    }

    .avatar-selector {
      display: flex;
      gap: 10px;
      align-items: center;
    }

    .avatar-thumb {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: 2px solid transparent;
      cursor: pointer;
      transition: transform 0.15s, border-color 0.15s;
    }

    .avatar-thumb:hover {
      transform: scale(1.1);
    }

    .avatar-thumb.selected {
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.4);
      transform: scale(1.08);
    }

    .inline-error {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #f87171;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 0.82rem;
    }

    .form-buttons {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 10px;
    }

    .btn-secondary {
      background: #1e293b;
      border: 1px solid #475569;
      color: #cbd5e1;
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 0.88rem;
      cursor: pointer;
    }

    .btn-submit {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: #fff;
      font-weight: 700;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 0.88rem;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);
    }

    .btn-submit:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .success-box {
      text-align: center;
      padding: 24px 10px;
    }

    .success-icon {
      font-size: 48px;
      margin-bottom: 8px;
    }

    .success-box h3 {
      color: #10b981;
      margin: 0 0 8px;
      font-size: 1.4rem;
    }

    .welcome-name {
      font-size: 1.15rem;
      font-weight: 700;
      color: #f8fafc;
      margin: 0;
    }

    .welcome-meta {
      font-size: 0.85rem;
      color: #94a3b8;
      margin: 4px 0 16px;
    }

    .success-msg {
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #34d399;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 0.85rem;
      margin-bottom: 24px;
    }

    .btn-start {
      background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
      color: #fff;
      border: none;
      font-weight: 700;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 0.95rem;
      cursor: pointer;
      box-shadow: 0 4px 18px rgba(99, 102, 241, 0.4);
    }
  `]
})
export class RegisterByInviteComponent implements OnInit {
  private inviteService = inject(InvitationService);

  @Input() token = '';
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSuccess = new EventEmitter<UserRegisteredResponse>();

  isVerifying = true;
  isSubmitting = false;
  inviteData: VerifyTokenResponse | null = null;
  registeredUser: UserRegisteredResponse | null = null;
  errorMessage = '';
  confirmPassword = '';

  avatarOptions = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face'
  ];

  regForm: RegisterByInviteRequest = {
    token: '',
    full_name: '',
    academic_title: '',
    password: '',
    avatar_url: this.avatarOptions[0]
  };

  ngOnInit(): void {
    if (this.token) {
      this.regForm.token = this.token;
      this.verifyToken();
    } else {
      this.isVerifying = false;
    }
  }

  verifyToken(): void {
    this.isVerifying = true;
    this.inviteService.verifyToken(this.token).subscribe({
      next: (resp) => {
        this.inviteData = resp;
        this.isVerifying = false;
      },
      error: () => {
        this.isVerifying = false;
        this.inviteData = {
          valid: false,
          email: '',
          role: '',
          institution_name: '',
          target_space_id: '',
          target_space_name: '',
          expires_at: ''
        };
      }
    });
  }

  submitRegistration(): void {
    this.errorMessage = '';
    if (this.regForm.password !== this.confirmPassword) {
      this.errorMessage = 'Las contraseñas no coinciden.';
      return;
    }
    if (this.regForm.password.length < 8) {
      this.errorMessage = 'La contraseña debe tener al menos 8 caracteres.';
      return;
    }

    this.isSubmitting = true;
    this.inviteService.registerByInvite(this.regForm).subscribe({
      next: (resp) => {
        this.isSubmitting = false;
        this.registeredUser = resp;
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err?.error?.detail || 'Error al procesar el registro institucional.';
      }
    });
  }
}
