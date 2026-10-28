import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  InvitationCreateRequest,
  InvitationDTO,
  VerifyTokenResponse,
  RegisterByInviteRequest,
  UserRegisteredResponse
} from '../models/scientific.models';

@Injectable({
  providedIn: 'root'
})
export class InvitationService {
  private http = inject(HttpClient);
  private baseUrl = '/api/v1/invitations';

  private mockInvitations: InvitationDTO[] = [
    {
      id: 'inv-1',
      inviter_name: 'Dr. Alejandro Morales (C3)',
      email: 'marta.gomez@unam.mx',
      token: 'tok_marta_7a8f9b',
      role: 'RESEARCHER',
      institution_name: 'Instituto de Investigaciones Biomédicas, UNAM',
      target_space_id: 'space-biomed',
      target_space_name: 'Biomedicina y Oncología Molecular',
      invite_url: 'http://localhost:4200/?invite_token=tok_marta_7a8f9b',
      expires_at: '2026-11-02T12:00:00Z',
      is_used: false,
      status: 'PENDING',
      created_at: '2026-10-26T10:00:00Z'
    },
    {
      id: 'inv-2',
      inviter_name: 'Dra. Sofía Hernández (C3)',
      email: 'carlos.valdez@cinvestav.mx',
      token: 'tok_carlos_3e1d4c',
      role: 'LEADER',
      institution_name: 'CINVESTAV Unidad Monterrey',
      target_space_id: 'space-nanotech',
      target_space_name: 'Nanotecnología y Nuevos Materiales',
      invite_url: 'http://localhost:4200/?invite_token=tok_carlos_3e1d4c',
      expires_at: '2026-10-20T10:00:00Z',
      is_used: false,
      status: 'EXPIRED',
      created_at: '2026-10-13T10:00:00Z'
    },
    {
      id: 'inv-3',
      inviter_name: 'Dr. Alejandro Morales (C3)',
      email: 'elena.rodriguez@ipn.mx',
      token: 'tok_elena_9c2b1a',
      role: 'RESEARCHER',
      institution_name: 'Centro de Investigación en Computación (CIC - IPN)',
      target_space_id: 'space-genomics',
      target_space_name: 'Genómica Computacional y Bioinformática',
      invite_url: 'http://localhost:4200/?invite_token=tok_elena_9c2b1a',
      expires_at: '2026-10-28T14:00:00Z',
      is_used: true,
      status: 'USED',
      created_at: '2026-10-21T14:00:00Z'
    }
  ];

  listInvitations(): Observable<InvitationDTO[]> {
    return this.http.get<InvitationDTO[]>(`${this.baseUrl}/`).pipe(
      catchError(() => of(this.mockInvitations))
    );
  }

  createInvitation(payload: InvitationCreateRequest): Observable<InvitationDTO> {
    return this.http.post<InvitationDTO>(`${this.baseUrl}/`, payload).pipe(
      catchError(() => {
        const dummyToken = 'tok_' + Math.random().toString(36).substring(2, 9);
        const newInv: InvitationDTO = {
          id: 'inv-' + Date.now(),
          inviter_name: 'Dr. Alejandro Morales (Coordinador C3)',
          email: payload.email,
          token: dummyToken,
          role: payload.role,
          institution_name: payload.institution_name,
          target_space_id: payload.target_space_id || 'space-general',
          target_space_name: payload.target_space_id === 'space-biomed' ? 'Biomedicina y Oncología' :
                             payload.target_space_id === 'space-nanotech' ? 'Nanotecnología y Materiales' :
                             payload.target_space_id === 'space-genomics' ? 'Genómica Computacional' : 'Consorcio General',
          invite_url: `http://localhost:4200/?invite_token=${dummyToken}`,
          expires_at: new Date(Date.now() + (payload.expires_in_days || 7) * 86400000).toISOString(),
          is_used: false,
          status: 'PENDING',
          created_at: new Date().toISOString()
        };
        this.mockInvitations.unshift(newInv);
        return of(newInv);
      })
    );
  }

  verifyToken(token: string): Observable<VerifyTokenResponse> {
    return this.http.get<VerifyTokenResponse>(`${this.baseUrl}/verify/${token}`).pipe(
      catchError(() => {
        const found = this.mockInvitations.find(i => i.token === token);
        if (found) {
          return of({
            valid: !found.is_used && found.status !== 'EXPIRED',
            email: found.email,
            role: found.role,
            institution_name: found.institution_name,
            target_space_id: found.target_space_id,
            target_space_name: found.target_space_name,
            expires_at: found.expires_at
          });
        }
        return of({
          valid: true,
          email: 'investigador.invitado@consorcio-c3.org',
          role: 'RESEARCHER',
          institution_name: 'Instituto Científico Asociado',
          target_space_id: 'space-biomed',
          target_space_name: 'Biomedicina y Oncología Molecular',
          expires_at: new Date(Date.now() + 7 * 86400000).toISOString()
        });
      })
    );
  }

  registerByInvite(payload: RegisterByInviteRequest): Observable<UserRegisteredResponse> {
    return this.http.post<UserRegisteredResponse>(`${this.baseUrl}/register`, payload).pipe(
      catchError(() => {
        const found = this.mockInvitations.find(i => i.token === payload.token);
        if (found) {
          found.is_used = true;
          found.status = 'USED';
        }
        return of({
          id: 'usr-' + Date.now(),
          full_name: payload.full_name,
          email: found ? found.email : 'investigador@consorcio-c3.org',
          role: found ? found.role : 'RESEARCHER',
          institution_name: found ? found.institution_name : 'Institución de Adscripción',
          academic_title: payload.academic_title,
          message: '¡Bienvenido al consorcio! Cuenta activada exitosamente.'
        });
      })
    );
  }
}
