import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface ScientificEvent {
  id: string;
  title: string;
  description?: string;
  event_type: 'MEETING' | 'SAMPLE_DELIVERY' | 'DEADLINE' | 'CONVOCATORIA';
  space_id?: string;
  space_name?: string;
  start_time: string;
  end_time: string;
  is_all_day?: boolean;
  location_or_url?: string;
  creator_name: string;
  responsible_name?: string;
  created_at: string;
}

export interface CreateEventPayload {
  title: string;
  description?: string;
  event_type: string;
  space_id: string;
  start_time: string;
  end_time: string;
  is_all_day?: boolean;
  location_or_url?: string;
  responsible_name?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CalendarService {
  private http = inject(HttpClient);
  private apiUrl = '/api/v1/events';

  getEvents(spaceId?: string, eventType?: string): Observable<ScientificEvent[]> {
    let url = this.apiUrl;
    const params: string[] = [];
    if (spaceId && spaceId !== 'all') params.push(`space_id=${spaceId}`);
    if (eventType && eventType !== 'ALL') params.push(`event_type=${eventType}`);
    if (params.length > 0) url += `?${params.join('&')}`;

    return this.http.get<ScientificEvent[]>(url).pipe(
      catchError(() => of([]))
    );
  }

  createEvent(payload: CreateEventPayload): Observable<ScientificEvent> {
    return this.http.post<ScientificEvent>(this.apiUrl, payload);
  }

  deleteEvent(eventId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${eventId}`);
  }
}
