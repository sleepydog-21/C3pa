import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InvitationService } from '../../core/services/invitation.service';
import { InvitationDTO, InvitationCreateRequest } from '../../core/models/scientific.models';

@Component({
  selector: 'app-invitations-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="invitations-container">
      <!-- Header de Gestión -->
      <div class="header-banner">
        <div class="header-left">
          <div class="header-icon">✉️</div>
          <div>
            <h2>Acceso Restringido & Gestión de Invitaciones</h2>
            <p>Control de incorporación para los 30–80 investigadores e instituciones del consorcio C3.</p>
          </div>
        </div>
        <div class="stats-badge-row">
          <div class="stat-pill">
            <span class="label">Total Emitidas:</span>
            <span class="val">{{ invitations().length }}</span>
          </div>
          <div class="stat-pill active">
            <span class="label">Pendientes:</span>
            <span class="val">{{ pendingCount() }}</span>
          </div>
          <div class="stat-pill used">
            <span class="label">Registrados:</span>
            <span class="val">{{ usedCount() }}</span>
          </div>
        </div>
      </div>

      <div class="grid-layout">
        <!-- Panel Izquierdo: Formulario de Creación -->
        <div class="glass-card create-card">
          <div class="card-title-row">
            <span class="step-num">1</span>
            <h3>Emitir Nueva Invitación</h3>
          </div>
          <p class="card-desc">
            Cada invitación genera un token criptográfico único (<code>tok_...</code>) asociado a un correo y espacio temático específico.
          </p>

          <form (ngSubmit)="generateInvitation()" class="invite-form">
            <div class="form-group">
              <label>Correo Electrónico Institucional</label>
              <input
                type="email"
                [(ngModel)]="newInvite.email"
                name="email"
                placeholder="ej. investigadora@unam.mx"
                required
                class="dark-input"
              />
            </div>

            <div class="form-row">
              <div class="form-group flex-1">
                <label>Rol en el Consorcio</label>
                <select [(ngModel)]="newInvite.role" name="role" class="dark-input">
                  <option value="RESEARCHER">🔬 Investigador / Fellow</option>
                  <option value="LEADER">👑 Líder de Línea / PI</option>
                  <option value="GUEST">🎓 Asesor Externo / Huésped</option>
                  <option value="ADMIN">🛡️ Coordinación General</option>
                </select>
              </div>

              <div class="form-group flex-1">
                <label>Vigencia</label>
                <select [(ngModel)]="newInvite.expires_in_days" name="expires_in_days" class="dark-input">
                  <option [ngValue]="3">3 días</option>
                  <option [ngValue]="7">7 días (Recomendado)</option>
                  <option [ngValue]="14">14 días</option>
                  <option [ngValue]="30">30 días</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label>Institución de Adscripción</label>
              <input
                type="text"
                [(ngModel)]="newInvite.institution_name"
                name="institution_name"
                placeholder="ej. Inst. de Investigaciones Biomédicas, UNAM"
                required
                class="dark-input"
              />
            </div>

            <div class="form-group">
              <label>Línea Temática / Espacio Inicial</label>
              <select [(ngModel)]="newInvite.target_space_id" name="target_space_id" class="dark-input">
                <option value="space-biomed">🧬 Biomedicina y Oncología Molecular</option>
                <option value="space-nanotech">🔬 Nanotecnología y Nuevos Materiales</option>
                <option value="space-genomics">💻 Genómica Computacional y Bioinformática</option>
                <option value="space-general">🏛️ Consorcio General (Transversal)</option>
              </select>
            </div>

            <button type="submit" [disabled]="isSubmitting || !newInvite.email || !newInvite.institution_name" class="btn-create">
              <span *ngIf="!isSubmitting">⚡ Generar Enlace Único de Invitación</span>
              <span *ngIf="isSubmitting">Generando token seguro...</span>
            </button>
          </form>

          <!-- Banner de Última Invitación Generada -->
          <div *ngIf="lastGeneratedInvite" class="token-alert-box">
            <div class="alert-header">
              <span class="icon">✨</span>
              <strong>¡Invitación Creada con Éxito!</strong>
            </div>
            <p class="token-text">
              Comparte este enlace confidencial con <strong>{{ lastGeneratedInvite.email }}</strong>:
            </p>
            <div class="token-input-copy">
              <input readonly [value]="lastGeneratedInvite.invite_url" class="copy-field" />
              <button (click)="copyToClipboard(lastGeneratedInvite.invite_url)" class="btn-copy">
                {{ copied ? '✓ Copiado' : '📋 Copiar' }}
              </button>
            </div>
            <div class="token-actions">
              <button (click)="simulateRegistration(lastGeneratedInvite.token)" class="btn-simulate">
                🚀 Abrir Pantalla de Registro con este Token
              </button>
            </div>
          </div>
        </div>

        <!-- Panel Derecho: Lista de Invitaciones Existentes -->
        <div class="glass-card list-card">
          <div class="card-title-row">
            <span class="step-num">2</span>
            <h3>Historial de Invitaciones & Estado de Activación</h3>
          </div>

          <div class="table-filters">
            <button
              [class.active]="filterStatus === 'ALL'"
              (click)="filterStatus = 'ALL'"
              class="filter-tag"
            >
              Todas ({{ invitations().length }})
            </button>
            <button
              [class.active]="filterStatus === 'PENDING'"
              (click)="filterStatus = 'PENDING'"
              class="filter-tag pending"
            >
              🟢 Activas ({{ pendingCount() }})
            </button>
            <button
              [class.active]="filterStatus === 'USED'"
              (click)="filterStatus = 'USED'"
              class="filter-tag used"
            >
              ✓ Registrados ({{ usedCount() }})
            </button>
            <button
              [class.active]="filterStatus === 'EXPIRED'"
              (click)="filterStatus = 'EXPIRED'"
              class="filter-tag expired"
            >
              🔴 Expiradas ({{ expiredCount() }})
            </button>
          </div>

          <div class="invitations-table-wrapper">
            <table class="invitations-table">
              <thead>
                <tr>
                  <th>Investigador / Correo</th>
                  <th>Institución & Espacio</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Vigencia</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let inv of filteredInvitations()">
                  <td class="user-cell">
                    <div class="email-text">{{ inv.email }}</div>
                    <div class="token-sub">Clave: <code>{{ inv.token }}</code></div>
                  </td>
                  <td>
                    <div class="inst-text">{{ inv.institution_name }}</div>
                    <div class="space-badge">{{ inv.target_space_name }}</div>
                  </td>
                  <td>
                    <span class="role-badge" [ngClass]="inv.role.toLowerCase()">
                      {{ getRoleLabel(inv.role) }}
                    </span>
                  </td>
                  <td>
                    <span class="status-badge" [ngClass]="inv.status.toLowerCase()">
                      <span *ngIf="inv.status === 'PENDING'">🟢 Pendiente</span>
                      <span *ngIf="inv.status === 'USED'">✓ Registrado</span>
                      <span *ngIf="inv.status === 'EXPIRED'">🔴 Expirada</span>
                    </span>
                  </td>
                  <td class="date-cell">
                    <div>{{ inv.expires_at | date:'shortDate' }}</div>
                    <small class="muted-text">Emitida por: {{ inv.inviter_name }}</small>
                  </td>
                  <td>
                    <div class="action-buttons">
                      <button
                        *ngIf="inv.status === 'PENDING'"
                        (click)="copyToClipboard(inv.invite_url)"
                        class="btn-icon"
                        title="Copiar enlace de invitación"
                      >
                        📋
                      </button>
                      <button
                        *ngIf="inv.status === 'PENDING'"
                        (click)="simulateRegistration(inv.token)"
                        class="btn-icon register-icon"
                        title="Completar registro con esta clave"
                      >
                        ✍️
                      </button>
                      <span *ngIf="inv.status === 'USED'" class="check-done">Cuenta Activa</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .invitations-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
      color: #0f172a;
    }

    .header-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      padding: 18px 24px;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .header-icon {
      font-size: 28px;
      background: #eff6ff;
      width: 52px;
      height: 52px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #bfdbfe;
    }

    .header-banner h2 {
      margin: 0;
      font-size: 1.35rem;
      font-weight: 700;
      color: #0f172a;
    }

    .header-banner p {
      margin: 4px 0 0;
      font-size: 0.88rem;
      color: #64748b;
    }

    .stats-badge-row {
      display: flex;
      gap: 12px;
    }

    .stat-pill {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      padding: 8px 14px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.85rem;
    }

    .stat-pill .label {
      color: #64748b;
    }

    .stat-pill .val {
      font-weight: 700;
      color: #0f172a;
    }

    .stat-pill.active .val {
      color: #059669;
    }

    .stat-pill.used .val {
      color: #1e40af;
    }

    .grid-layout {
      display: grid;
      grid-template-columns: 420px 1fr;
      gap: 20px;
    }

    @media (max-width: 1024px) {
      .grid-layout {
        grid-template-columns: 1fr;
      }
    }

    .glass-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 22px;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
    }

    .card-title-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 6px;
    }

    .step-num {
      background: #1e40af;
      color: #fff;
      font-size: 0.8rem;
      font-weight: 700;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .card-title-row h3 {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 600;
      color: #0f172a;
    }

    .card-desc {
      color: #64748b;
      font-size: 0.84rem;
      line-height: 1.4;
      margin-top: 4px;
      margin-bottom: 18px;
    }

    .card-desc code {
      background: #f1f5f9;
      padding: 2px 6px;
      border-radius: 4px;
      color: #1e40af;
      font-size: 0.8rem;
    }

    .invite-form {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-group label {
      font-size: 0.82rem;
      font-weight: 600;
      color: #334155;
    }

    .form-row {
      display: flex;
      gap: 12px;
    }

    .flex-1 {
      flex: 1;
    }

    .dark-input {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      color: #0f172a;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 0.88rem;
      transition: border-color 0.2s;
    }

    .dark-input:focus {
      outline: none;
      border-color: #1e40af;
      background: #ffffff;
    }

    .btn-create {
      background: #1e40af;
      color: #ffffff;
      border: none;
      padding: 12px 18px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.9rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-top: 6px;
      transition: background 0.15s;
    }

    .btn-create:hover:not(:disabled) {
      background: #1d4ed8;
    }

    .btn-create:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .token-alert-box {
      margin-top: 20px;
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      border-radius: 8px;
      padding: 14px;
    }

    .alert-header {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #065f46;
      font-size: 0.92rem;
      margin-bottom: 6px;
    }

    .token-text {
      font-size: 0.82rem;
      color: #334155;
      margin: 0 0 10px;
    }

    .token-input-copy {
      display: flex;
      gap: 8px;
    }

    .copy-field {
      flex: 1;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #1e40af;
      font-family: monospace;
      font-size: 0.8rem;
      padding: 8px 10px;
      border-radius: 6px;
    }

    .btn-copy {
      background: #059669;
      color: #ffffff;
      font-weight: 600;
      border: none;
      border-radius: 6px;
      padding: 0 14px;
      font-size: 0.82rem;
      cursor: pointer;
    }

    .btn-copy:hover {
      background: #047857;
    }

    .token-actions {
      margin-top: 10px;
    }

    .btn-simulate {
      width: 100%;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      color: #334155;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 0.82rem;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.15s;
    }

    .btn-simulate:hover {
      background: #eff6ff;
      color: #1e40af;
      border-color: #93c5fd;
    }

    .table-filters {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
    }

    .filter-tag {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      color: #64748b;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 0.8rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .filter-tag:hover {
      border-color: #1e40af;
      color: #1e40af;
      background: #eff6ff;
    }

    .filter-tag.active {
      background: #1e40af;
      border-color: #1e40af;
      color: #ffffff;
      font-weight: 600;
    }

    .invitations-table-wrapper {
      overflow-x: auto;
    }

    .invitations-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
    }

    .invitations-table th {
      text-align: left;
      padding: 10px 12px;
      color: #64748b;
      font-weight: 600;
      border-bottom: 1px solid #e2e8f0;
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .invitations-table td {
      padding: 12px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: middle;
      color: #334155;
    }

    .user-cell .email-text {
      font-weight: 600;
      color: #0f172a;
    }

    .user-cell .token-sub {
      font-size: 0.75rem;
      color: #64748b;
      margin-top: 2px;
    }

    .user-cell .token-sub code {
      color: #1e40af;
    }

    .inst-text {
      color: #334155;
      font-weight: 500;
    }

    .space-badge {
      display: inline-block;
      font-size: 0.74rem;
      background: #eff6ff;
      color: #1e40af;
      padding: 2px 6px;
      border-radius: 4px;
      margin-top: 4px;
    }

    .role-badge {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 4px 8px;
      border-radius: 6px;
      display: inline-block;
    }

    .role-badge.researcher {
      background: #ecfdf5;
      color: #065f46;
    }

    .role-badge.leader {
      background: #fef3c7;
      color: #92400e;
    }

    .role-badge.guest {
      background: #f1f5f9;
      color: #475569;
    }

    .role-badge.admin {
      background: #fee2e2;
      color: #b91c1c;
    }

    .status-badge {
      font-size: 0.78rem;
      font-weight: 600;
      padding: 4px 8px;
      border-radius: 6px;
    }

    .status-badge.pending {
      background: #ecfdf5;
      color: #065f46;
    }

    .status-badge.used {
      background: #eff6ff;
      color: #1e40af;
    }

    .status-badge.expired {
      background: #fee2e2;
      color: #b91c1c;
    }

    .date-cell {
      color: #334155;
      font-size: 0.8rem;
    }

    .muted-text {
      color: #64748b;
      display: block;
      font-size: 0.72rem;
    }

    .action-buttons {
      display: flex;
      gap: 6px;
      align-items: center;
    }

    .btn-icon {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      color: #334155;
      border-radius: 6px;
      padding: 6px 10px;
      cursor: pointer;
      font-size: 0.85rem;
      transition: all 0.15s;
    }

    .btn-icon:hover {
      background: #eff6ff;
      color: #1e40af;
      border-color: #93c5fd;
    }

    .register-icon:hover {
      background: #1e40af;
      color: #ffffff;
      border-color: #1e40af;
    }

    .check-done {
      color: #64748b;
      font-size: 0.76rem;
    }
  `]
})
export class InvitationsManagerComponent implements OnInit {
  private inviteService = inject(InvitationService);

  invitations = signal<InvitationDTO[]>([]);
  filterStatus = 'ALL';
  isSubmitting = false;
  copied = false;
  lastGeneratedInvite: InvitationDTO | null = null;

  newInvite: InvitationCreateRequest = {
    email: '',
    role: 'RESEARCHER',
    institution_name: '',
    target_space_id: 'space-biomed',
    expires_in_days: 7
  };

  pendingCount = computed(() => this.invitations().filter(i => i.status === 'PENDING').length);
  usedCount = computed(() => this.invitations().filter(i => i.status === 'USED').length);
  expiredCount = computed(() => this.invitations().filter(i => i.status === 'EXPIRED').length);

  filteredInvitations = computed(() => {
    const list = this.invitations();
    if (this.filterStatus === 'ALL') return list;
    return list.filter(i => i.status === this.filterStatus);
  });

  ngOnInit(): void {
    this.loadInvitations();
  }

  loadInvitations(): void {
    this.inviteService.listInvitations().subscribe(list => {
      this.invitations.set(list);
    });
  }

  generateInvitation(): void {
    if (!this.newInvite.email || !this.newInvite.institution_name) return;
    this.isSubmitting = true;

    this.inviteService.createInvitation(this.newInvite).subscribe({
      next: (created) => {
        this.isSubmitting = false;
        this.lastGeneratedInvite = created;
        this.loadInvitations();
        // Reset form
        this.newInvite = {
          email: '',
          role: 'RESEARCHER',
          institution_name: '',
          target_space_id: 'space-biomed',
          expires_in_days: 7
        };
      },
      error: () => {
        this.isSubmitting = false;
      }
    });
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.copied = true;
      setTimeout(() => this.copied = false, 2500);
    });
  }

  simulateRegistration(token: string): void {
    // Dispara un evento o emite token hacia la aplicación principal
    const event = new CustomEvent('open-invite-registration', { detail: { token } });
    window.dispatchEvent(event);
  }

  getRoleLabel(role: string): string {
    const map: Record<string, string> = {
      RESEARCHER: 'Investigador',
      LEADER: 'Líder de Línea',
      GUEST: 'Asesor Externo',
      ADMIN: 'Coordinación'
    };
    return map[role] || role;
  }
}
