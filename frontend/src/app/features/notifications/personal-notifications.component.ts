import { Component, OnInit, inject, signal, computed, HostListener, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificationService, NotificationItem } from '../../core/services/notification.service';
import { AuthService } from '../../core/services/auth.service';
import { VoiceInputBtnComponent } from '../../shared/components/voice-input-btn.component';

@Component({
  selector: 'app-personal-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule, VoiceInputBtnComponent],
  template: `
    <div class="notifications-container" [class.fullscreen-mode]="isFullscreen()">
      <!-- 1. HERO INSTITUCIONAL PERSONAL -->
      <header class="personal-hero" *ngIf="!isFullscreen()">
        <div class="hero-left">
          <div class="hero-icon-badge">🔔</div>
          <div>
            <div class="hero-tag">Bandeja Personal de Colaboración Colegiada</div>
            <h2>Notificaciones y Menciones en Ventana Completa</h2>
            <p>
              Hola <strong>{{ currentUserName() }}</strong>. Revisa los lugares donde tus colegas te etiquetaron (&#64;{{ userShortName() }}), visualizando el <strong>artículo, imagen o conversación completa</strong> de cada consulta.
            </p>
          </div>
        </div>

        <!-- Métricas Rápidas -->
        <div class="hero-stats">
          <div class="stat-box mentions">
            <span class="stat-num">&#64;{{ pendingMentionsCount() }}</span>
            <span class="stat-label">Menciones a ti</span>
          </div>
          <div class="stat-box pending">
            <span class="stat-num">{{ unreadTotal() }}</span>
            <span class="stat-label">Sin leer</span>
          </div>
          <div class="stat-box resolved">
            <span class="stat-num">{{ resolvedCount() }}</span>
            <span class="stat-label">Atendidas</span>
          </div>
        </div>
      </header>

      <!-- 2. BARRA DE CONTROL Y SELECTOR DE VISTA -->
      <div class="view-controls-bar">
        <div class="mode-toggles">
          <button
            class="toggle-btn"
            [class.active]="viewMode() === 'carousel'"
            (click)="viewMode.set('carousel')"
          >
            ↔️ Navegador Lateral de Lugares (Ventana Completa)
          </button>
          <button
            class="toggle-btn"
            [class.active]="viewMode() === 'list'"
            (click)="viewMode.set('list')"
          >
            📋 Lista Resumen ({{ displayedList().length }})
          </button>
        </div>

        <div class="filter-chips">
          <button
            class="filter-chip"
            [class.active]="currentFilter() === 'mentions'"
            (click)="currentFilter.set('mentions')"
          >
            🎯 Solo Menciones (&#64;)
          </button>
          <button
            class="filter-chip"
            [class.active]="currentFilter() === 'unread'"
            (click)="currentFilter.set('unread')"
          >
            ⏳ Por Atender
          </button>
          <button
            class="filter-chip"
            [class.active]="currentFilter() === 'resolved'"
            (click)="currentFilter.set('resolved')"
          >
            ✓ Ya Atendidas
          </button>
          <button
            class="filter-chip"
            [class.active]="currentFilter() === 'all'"
            (click)="currentFilter.set('all')"
          >
            Todas
          </button>
        </div>

        <!-- Botón Pantalla Completa / Expandir -->
        <div class="fullscreen-toggle-wrapper">
          <button
            class="btn-toggle-fullscreen"
            (click)="toggleFullscreen()"
            title="Alternar modo ventana completa"
          >
            {{ isFullscreen() ? '🗗 Restaurar Ventana' : '⛶ Maximizar Ventana Completa' }}
          </button>
        </div>
      </div>

      <!-- ============================================================== -->
      <!-- VISTA A: NAVEGADOR LATERAL EN VENTANA COMPLETA (1 A 1)          -->
      <!-- Muestra el artículo, imagen o conversación completa al lado    -->
      <!-- ============================================================== -->
      @if (viewMode() === 'carousel') {
        @if (activeItems().length === 0) {
          <div class="empty-inbox-card">
            <div class="empty-icon">🎉</div>
            <h3>¡Todo al día en tus menciones!</h3>
            <p>No tienes dudas ni comentarios pendientes con tu etiqueta en este filtro.</p>
            <button class="btn-refresh" (click)="currentFilter.set('all')">Ver todas las notificaciones</button>
          </div>
        } @else {
          <!-- Barra Superior de Navegación Lateral 1 a 1 -->
          <div class="lateral-nav-header">
            <div class="nav-arrows-group">
              <button
                class="btn-side-nav prev"
                (click)="prevLocation()"
                [disabled]="currentIndex() === 0"
                title="Lugar anterior (Flecha Izquierda ←)"
              >
                ◀ Anterior Lugar
              </button>
              
              <div class="location-counter">
                <span class="count-badge">Lugar {{ currentIndex() + 1 }} de {{ activeItems().length }}</span>
                <span class="keyboard-tip">(Usa ← → del teclado)</span>
              </div>

              <button
                class="btn-side-nav next"
                (click)="nextLocation()"
                [disabled]="currentIndex() === activeItems().length - 1"
                title="Siguiente lugar (Flecha Derecha →)"
              >
                Siguiente Lugar ▶
              </button>
            </div>

            <!-- Carrusel de Mini-Lugares (Chips para saltar directo) -->
            <div class="location-tabs-scroll">
              @for (item of activeItems(); track item.id; let idx = $index) {
                <button
                  class="location-chip"
                  [class.active]="currentIndex() === idx"
                  [class.resolved]="item.is_resolved"
                  (click)="currentIndex.set(idx)"
                >
                  <span class="chip-dot"></span>
                  <span class="chip-title">{{ getLocationShortTitle(item) }}</span>
                  @if (item.is_resolved) {
                    <span class="chip-check">✓</span>
                  }
                </button>
              }
            </div>
          </div>

          <!-- ESPACIO DE TRABAJO A VENTANA COMPLETA: VISOR INTEGRAL + PANEL DE TRIAGE -->
          @if (currentItem(); as cur) {
            <div class="full-window-workspace" [class.is-resolved]="cur.is_resolved">
              
              <!-- PANEL PRINCIPAL (IZQUIERDA / CENTRO): VISOR DEL RECURSO COMPLETO -->
              <div class="resource-full-viewport">
                <!-- Barra de Estado del Recurso -->
                <div class="resource-view-topbar">
                  <div class="resource-title-group">
                    <span class="resource-icon-badge">{{ getLocationIcon(cur) }}</span>
                    <div class="resource-info-text">
                      <div class="resource-type-label">{{ getResourceCategoryLabel(cur) }}</div>
                      <h3 class="resource-title">{{ cur.source_location || cur.title }}</h3>
                    </div>
                  </div>

                  <div class="topbar-right-controls">
                    @if (cur.is_resolved) {
                      <span class="status-badge resolved-badge">✓ Atendida y Resuelta</span>
                    } @else {
                      <span class="status-badge pending-badge">⏳ Requiere tu aclaración</span>
                    }

                    <button
                      class="btn-open-source"
                      (click)="openInOriginalViewer(cur)"
                      title="Navegar al visor con esta anotación seleccionada"
                    >
                      ↗ Abrir en Visor Especializado
                    </button>
                  </div>
                </div>

                <!-- CONTENIDO DEL RECURSO: ARTÍCULO, IMAGEN O CONVERSACIÓN COMPLETA -->
                <div class="resource-view-body">

                  <!-- CASO 1: ARTÍCULO CIENTÍFICO COMPLETO (PDF) -->
                  @if (isArticleResource(cur)) {
                    <div class="paper-complete-document">
                      <div class="paper-header-editorial">
                        <span class="journal-badge">Journal of Advanced Biomaterials Research • Vol. 14, 2026</span>
                        <h2 class="doc-title">
                          {{ cur.target_id === 'paper-2' ? 'Evaluación de Citotoxicidad Celular y Proliferación en Andamios Porosos 3D' : 'Síntesis y Caracterización de Nanocelulosa Bacteriana Modificada para Liberación Controlada de Antibióticos' }}
                        </h2>
                        <div class="doc-authors">
                          {{ cur.target_id === 'paper-2' ? 'Dra. Sofía Alarcón, Dr. Gabriel Vargas, Dra. Claudia Morales — Inst. de Biotecnología' : 'Dr. Carlos Méndez, Dra. Elena Ramos, Dr. Fernando Soto — Consorcio Interinstitucional C3pa' }}
                        </div>
                        <div class="doc-doi">DOI: 10.1016/j.biomaterials.2026.119842 • Acceso Colegiado C3</div>
                      </div>

                      <!-- Sección Abstract Completo -->
                      <div class="article-section-block">
                        <h4 class="sec-heading">Abstract / Resumen Estructurado</h4>
                        <p class="abstract-body">
                          La nanocelulosa bacteriana (BNC) producida por <em>Komagataeibacter xylinus</em> ofrece una resistencia mecánica excepcional (módulo de Young > 15 GPa), ultra-alta capacidad de retención de agua (> 98%) y biocompatibilidad tisular de grado médico. En este estudio desarrollamos un protocolo optimizado de funcionalización superficial con secado supercrítico (CO₂ a 31.1°C y 73.8 bar), evaluando su capacidad como matriz de elución controlada. Los resultados demuestran una incorporación homogénea del 85.2% del principio activo sin degradación de la red microfibrilar tridimensional.
                        </p>
                      </div>

                      <!-- Sección 1: Introducción -->
                      <div class="article-section-block">
                        <h4 class="sec-heading">1. Introducción y Marco de Modelado</h4>
                        <p>
                          Las infecciones microbianas persistentes en apósitos dérmicos representan un desafío crítico en medicina regenerativa. Los apósitos tradicionales sufren de rápida desecación y liberación en bolo del antimicrobiano, induciendo citotoxicidad local. La nanoarquitectura reticular de fibras de 20 a 80 nm carece totalmente de lignina, ofreciendo una superficie reactiva idónea para funcionalización.
                        </p>
                      </div>

                      <!-- Sección 2: Materiales y Métodos -->
                      <div class="article-section-block">
                        <h4 class="sec-heading">2. Materiales y Métodos Experimentales</h4>
                        <p>
                          La síntesis se llevó a cabo utilizando la cepa <em>Komagataeibacter xylinus</em> en medio Hestrin-Schramm (HS) con 20 g/L de glucosa. La velocidad de agitación se mantuvo en 250 rpm para asegurar homogeneidad. Las membranas cosechadas fueron sometidas a lavado con NaOH al 0.1M a 80°C durante 90 minutos para eliminar endotoxinas y restos celulares.
                        </p>
                      </div>

                      <!-- Sección 3: Resultados y Caracterización Fisicoquímica (Con Resaltado de la Mención) -->
                      <div class="article-section-block highlight-container">
                        <h4 class="sec-heading">3. Resultados Experimentales y Difracción de Rayos X</h4>
                        <p>
                          Los difractogramas confirmaron la presencia de picos característicos en 2θ = 14.5°, 16.8° y 22.7°.
                        </p>

                        <!-- FRAGMENTO CITADO CON RESALTADO FOSFORESCENTE Y PIN DE MENCIÓN -->
                        <div class="quoted-passage-pin">
                          <div class="pin-header">
                            <span class="pin-icon">📍</span>
                            <strong>Aquí te etiquetó {{ cur.actor_name }}:</strong>
                            <span class="pin-sub">Fragmento citado en el debate técnico</span>
                          </div>
                          <div class="pin-content">
                            "{{ cur.snippet_quoted || 'La cristalinidad relativa se calculó en 78.4% mediante difracción de rayos X (XRD) utilizando la ecuación de Segal.' }}"
                          </div>
                        </div>

                        <p>
                          Este valor de cristalinidad relativa representa un incremento del 6.2% comparado con celulosa vegetal procesada convencionalmente. Los espectros FTIR ratificaron bandas de tensión O-H a 3340 cm⁻¹ y enlaces C-O-C a 1055 cm⁻¹.
                        </p>

                        <!-- Tabla 1 Científica -->
                        <div class="embedded-table">
                          <div class="table-title"><strong>Tabla 1.</strong> Parámetros Fisicoquímicos y Cinéticos de Membranas BNC</div>
                          <table class="micro-table">
                            <thead>
                              <tr>
                                <th>Condición</th>
                                <th>Espesor (mm)</th>
                                <th>Módulo Young (GPa)</th>
                                <th>Cristalinidad Segal (%)</th>
                                <th>Elución a 72h (%)</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td>BNC-Control</td>
                                <td>1.45 ± 0.06</td>
                                <td>12.8 ± 0.9</td>
                                <td>74.2 ± 1.1</td>
                                <td>62.4 ± 2.1</td>
                              </tr>
                              <tr class="highlighted-row">
                                <td><strong>BNC-250 rpm (NaOH 0.1M)</strong></td>
                                <td>1.38 ± 0.04</td>
                                <td>15.4 ± 1.2</td>
                                <td><strong>78.4 ± 0.8</strong></td>
                                <td>85.2 ± 1.8</td>
                              </tr>
                              <tr>
                                <td>BNC-Liofilizada</td>
                                <td>1.62 ± 0.11</td>
                                <td>8.2 ± 0.6</td>
                                <td>72.3 ± 1.2</td>
                                <td>89.1 ± 3.0</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <!-- Sección 4: Discusión y Conclusiones -->
                      <div class="article-section-block">
                        <h4 class="sec-heading">4. Discusión y Conclusiones</h4>
                        <p>
                          La correlación entre la velocidad de cizallamiento y la cristalinidad calculada respalda el modelo cuantitativo del consorcio. La cinética de difusión de Korsmeyer-Peppas (n = 0.47) confirma transporte anómalo favorable para apósitos dérmicos.
                        </p>
                      </div>
                    </div>
                  }

                  <!-- CASO 2: IMAGEN CIENTÍFICA / MICROGRAFÍA SEM COMPLETA -->
                  @else if (isImageResource(cur)) {
                    <div class="image-complete-viewer">
                      <div class="image-viewport-canvas">
                        <div class="image-wrapper-relative">
                          <img
                            src="https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=1200&q=80"
                            alt="Micrografía SEM completa"
                            class="full-scientific-photo"
                          />

                          <!-- RECUADRO DELIMITADOR CITADO EN LA MENCIÓN -->
                          <div
                            class="bounding-box-highlight"
                            style="left: 39%; top: 31%; width: 24%; height: 22%;"
                          >
                            <span class="box-tag">🔍 Cuadrante citado por {{ cur.actor_name }}</span>
                            <div class="box-dimensions">24% × 22% [Centro]</div>
                          </div>

                          <!-- Escala de Microscopía -->
                          <div class="microscopy-scale-bar">
                            <span class="scale-line"></span>
                            <span class="scale-text">10 µm (10,000x)</span>
                          </div>
                        </div>
                      </div>

                      <div class="image-meta-footer">
                        <div class="meta-row">
                          <span><strong>Muestra:</strong> Red Fibrilar de Nanocelulosa sintetizada por <em>K. xylinus</em></span>
                          <span><strong>Instrumento:</strong> Microscopio Electrónico de Barrido (SEM 15kV)</span>
                          <span><strong>Región observada:</strong> Cuadrante central [X: 39%, Y: 31%, W: 24%, H: 22%]</span>
                        </div>
                      </div>
                    </div>
                  }

                  <!-- CASO 3: CONVERSACIÓN / FORO DE DISCUSIÓN COMPLETO -->
                  @else if (isForumResource(cur)) {
                    <div class="forum-complete-thread">
                      <!-- Post Original del Hilo -->
                      <div class="original-post-box">
                        <div class="post-header-line">
                          <div class="author-inline">
                            <img
                              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
                              class="thread-avatar"
                            />
                            <div>
                              <strong>Dr. Carlos Méndez</strong>
                              <small>Línea 1: Nanocelulosa y Síntesis • Publicado el 26 Oct 2026</small>
                            </div>
                          </div>
                          <span class="category-badge">📌 Avance Experimental / Biorreactores</span>
                        </div>

                        <h3 class="thread-title">Avance Semanal: Estandarización del medio de cultivo HS a escala 5L y escalamiento a 20L</h3>
                        
                        <div class="thread-markdown">
                          <p>
                            Estimados colegas, logramos estabilizar el biorreactor a 28°C y 250 rpm de agitación. La producción de membrana celulósica se incrementó en un <strong>34% en peso seco</strong> respecto al lote piloto anterior.
                          </p>
                          <p>
                            Para la siguiente etapa de escalamiento a biorreactores de tanque agitado de 20L en CINVESTAV, requerimos definir el volumen final del inóculo para asegurar que no se produzca sedimentación celular ni hipoxia.
                          </p>
                        </div>
                      </div>

                      <!-- Hilo Cronológico de Respuestas -->
                      <div class="thread-replies-timeline">
                        <h4 class="timeline-title">💬 Discusión Cronológica del Hilo (3 intervenciones):</h4>

                        <div class="reply-card">
                          <div class="reply-header">
                            <img src="https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80" class="reply-avatar" />
                            <strong>Dra. Sofía Alarcón:</strong>
                            <small>26 Oct 2026, 10:30</small>
                          </div>
                          <p>¡Excelente resultado Carlos! Ya tenemos listas las placas de 24 pozos para evaluar proliferación celular en cuanto nos entreguen los discos de muestra.</p>
                        </div>

                        <div class="reply-card">
                          <div class="reply-header">
                            <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80" class="reply-avatar" />
                            <strong>Dr. Ricardo Valenzuela:</strong>
                            <small>26 Oct 2026, 11:15</small>
                          </div>
                          <p>¿Midieron el espesor promedio de la película hidratada? Nos interesa para calcular la capacidad de carga del fármaco.</p>
                        </div>

                        <!-- COMENTARIO DONDE SE ETIQUETÓ AL USUARIO (DESTACADO) -->
                        <div class="reply-card mention-target-reply">
                          <div class="mention-banner-tag">
                            🎯 AQUÍ TE ETIQUETARON CON UNA TAREA PRIORITARIA
                          </div>
                          <div class="reply-header">
                            <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80" class="reply-avatar" />
                            <strong>Dr. Carlos Méndez:</strong>
                            <small>Hace 2 horas</small>
                          </div>
                          <div class="comment-highlight-text" [innerHTML]="formatMentions(cur.comment_text || cur.summary)"></div>
                        </div>
                      </div>
                    </div>
                  }

                  <!-- CASO 4: ACUERDO FORMAL O GENERAL -->
                  @else {
                    <div class="generic-complete-view">
                      <div class="generic-card">
                        <h3>Acuerdo Colegiado Formal C3pa</h3>
                        <p class="summary-text">{{ cur.summary }}</p>
                        <blockquote class="generic-quote">{{ cur.snippet_quoted || cur.title }}</blockquote>
                      </div>
                    </div>
                  }

                </div>
              </div>

              <!-- PANEL LATERAL DERECHO: BARRA DE TRIAGE, MCIÓN Y RESPUESTA ASÍNCRONA -->
              <aside class="triage-lateral-dock">
                <div class="dock-header">
                  <h4>🎯 Triage y Resolución Colegiada</h4>
                  <span class="dock-badge">{{ cur.is_mention ? 'Mención @Directa' : 'Consulta Técnica' }}</span>
                </div>

                <!-- Tarjeta de quien te etiquetó -->
                <div class="mention-origin-card">
                  <div class="actor-row">
                    <img
                      [src]="cur.actor_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'"
                      class="actor-photo"
                      alt="{{ cur.actor_name }}"
                    />
                    <div class="actor-meta">
                      <span class="actor-name">{{ cur.actor_name }}</span>
                      <small class="actor-time">{{ cur.created_at }}</small>
                    </div>
                  </div>

                  <div class="mention-comment-quote">
                    <p [innerHTML]="formatMentions(cur.comment_text || cur.summary)"></p>
                  </div>

                  @if (cur.action_required) {
                    <div class="action-required-pill">
                      <span class="action-label">🎯 Tarea solicitada:</span>
                      <strong class="action-desc">{{ cur.action_required }}</strong>
                    </div>
                  }
                </div>

                <!-- Formulario de Respuesta Inmediata y Cambio de Estado -->
                <div class="reply-box-dock">
                  <label class="reply-label">
                    ✍️ Tu respuesta técnica para este lugar:
                  </label>
                  
                  <textarea
                    [(ngModel)]="replyTexts[cur.id]"
                    placeholder="Escribe o dicta tu respuesta técnica para aclarar esta duda en el consorcio..."
                    rows="4"
                    class="dock-textarea"
                  ></textarea>

                  <div class="dock-actions-row">
                    <app-voice-input-btn
                      [compact]="false"
                      [tooltip]="'Dictar respuesta técnica por voz con Whisper'"
                      (textTranscribed)="onVoiceTranscribed(cur.id, $event)"
                    />

                    <button
                      class="btn-toggle-resolve"
                      [class.reopen]="cur.is_resolved"
                      (click)="toggleResolveStatus(cur)"
                    >
                      {{ cur.is_resolved ? '↩ Reabrir Duda' : '✓ Marcar como Atendida' }}
                    </button>
                  </div>

                  <button
                    class="btn-reply-and-next-dock"
                    (click)="submitReplyAndNext(cur)"
                    [disabled]="isSubmitting() || !replyTexts[cur.id]?.trim()"
                  >
                    {{ isSubmitting() ? 'Enviando...' : 'Enviar Respuesta y Pasar al Siguiente Lugar ▶' }}
                  </button>

                  <div class="keyboard-shortcuts-footer">
                    <span>💡 <strong>Navegación Rápida:</strong> Usa las flechas <code>←</code> y <code>→</code> del teclado para desplazarte por los lugares.</span>
                  </div>
                </div>
              </aside>

            </div>
          }
        }
      }

      <!-- ============================================================== -->
      <!-- VISTA B: LISTA RESUMEN DE NOTIFICACIONES Y MENCIONES           -->
      <!-- ============================================================== -->
      @if (viewMode() === 'list') {
        <div class="notifications-list-wrapper">
          @for (item of displayedList(); track item.id) {
            <div
              class="list-notification-card"
              [class.is-unread]="!item.is_read"
              [class.is-resolved]="item.is_resolved"
              (click)="openInCarouselAt(item)"
            >
              <div class="card-left-indicator">
                <span class="type-icon">{{ getLocationIcon(item) }}</span>
              </div>

              <div class="card-main-content">
                <div class="card-top-line">
                  <span class="source-tag">{{ item.source_location || item.title }}</span>
                  <span class="date-tag">{{ item.created_at }}</span>
                </div>

                <div class="author-comment-line">
                  <strong>{{ item.actor_name }}:</strong>
                  <span [innerHTML]="formatMentions(item.comment_text || item.summary)"></span>
                </div>

                @if (item.snippet_quoted) {
                  <blockquote class="mini-quote">"{{ item.snippet_quoted }}"</blockquote>
                }
              </div>

              <div class="card-action-side">
                @if (item.is_resolved) {
                  <span class="badge-resolved">✓ Atendida</span>
                } @else {
                  <span class="badge-pending">⏳ Pendiente</span>
                }
                <button
                  class="btn-focus-arrow"
                  title="Abrir en Ventana Completa"
                  (click)="openInCarouselAt(item); $event.stopPropagation()"
                >
                  Ver en Ventana Completa ↔️
                </button>
              </div>
            </div>
          } @empty {
            <div class="empty-inbox-card">
              <div class="empty-icon">📭</div>
              <h3>Sin notificaciones en esta categoría</h3>
              <p>Cambia el filtro para revisar otras alertas o menciones.</p>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .notifications-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-width: 100%;
      margin: 0 auto;
      padding: 16px 24px 60px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .notifications-container.fullscreen-mode {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      width: 100vw;
      height: 100vh;
      z-index: 9999;
      background: #f8fafc;
      padding: 14px 20px;
      overflow: hidden;
    }

    /* 1. HERO INSTITUCIONAL */
    .personal-hero {
      background: linear-gradient(135deg, #0b192c 0%, #1e3e62 100%);
      color: #ffffff;
      border-radius: 14px;
      padding: 20px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 20px;
      box-shadow: 0 8px 24px rgba(11, 25, 44, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .hero-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .hero-icon-badge {
      font-size: 34px;
      background: rgba(255, 255, 255, 0.12);
      width: 58px;
      height: 58px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    .hero-tag {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #38bdf8;
      margin-bottom: 2px;
    }
    .hero-left h2 {
      margin: 0 0 4px 0;
      font-size: 21px;
      font-weight: 800;
    }
    .hero-left p {
      margin: 0;
      font-size: 13.5px;
      color: #cbd5e1;
      max-width: 650px;
      line-height: 1.45;
    }
    .hero-stats {
      display: flex;
      gap: 12px;
    }
    .stat-box {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 10px;
      padding: 10px 16px;
      text-align: center;
      min-width: 85px;
    }
    .stat-num {
      display: block;
      font-size: 20px;
      font-weight: 800;
    }
    .stat-box.mentions .stat-num { color: #38bdf8; }
    .stat-box.pending .stat-num { color: #fbbf24; }
    .stat-box.resolved .stat-num { color: #4ade80; }
    .stat-label {
      font-size: 11px;
      color: #94a3b8;
      text-transform: uppercase;
    }

    /* 2. BARRA DE CONTROL Y SELECTOR */
    .view-controls-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      background: #ffffff;
      padding: 10px 18px;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }
    .mode-toggles {
      display: flex;
      background: #f1f5f9;
      padding: 3px;
      border-radius: 8px;
      border: 1px solid #cbd5e1;
    }
    .toggle-btn {
      padding: 7px 14px;
      border: none;
      background: transparent;
      color: #475569;
      font-size: 12.5px;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .toggle-btn.active {
      background: #1e3a8a;
      color: #ffffff;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    .filter-chips {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    .filter-chip {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      color: #475569;
      padding: 5px 12px;
      border-radius: 16px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }
    .filter-chip.active {
      background: #0284c7;
      border-color: #0284c7;
      color: #ffffff;
    }
    .btn-toggle-fullscreen {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      color: #1e293b;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-toggle-fullscreen:hover {
      background: #e2e8f0;
    }

    /* 3. BARRA DE NAVEGACIÓN LATERAL 1 A 1 */
    .lateral-nav-header {
      display: flex;
      flex-direction: column;
      gap: 10px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      padding: 12px 18px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    }
    .nav-arrows-group {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .btn-side-nav {
      padding: 8px 18px;
      border-radius: 8px;
      border: 1px solid #0284c7;
      background: #f0f9ff;
      color: #0369a1;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s;
    }
    .btn-side-nav:hover:not(:disabled) {
      background: #0284c7;
      color: #ffffff;
    }
    .btn-side-nav:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      border-color: #cbd5e1;
      background: #f1f5f9;
      color: #94a3b8;
    }
    .location-counter {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
    }
    .count-badge {
      font-size: 14px;
      font-weight: 800;
      color: #0f172a;
    }
    .keyboard-tip {
      font-size: 11px;
      color: #64748b;
    }
    .location-tabs-scroll {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding-bottom: 4px;
    }
    .location-chip {
      padding: 6px 12px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      color: #475569;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
      transition: all 0.15s;
    }
    .location-chip.active {
      background: #0284c7;
      border-color: #0284c7;
      color: #ffffff;
    }
    .location-chip.resolved {
      border-color: #86efac;
      background: #f0fdf4;
    }
    .location-chip.resolved.active {
      background: #16a34a;
      border-color: #16a34a;
      color: #ffffff;
    }
    .chip-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #94a3b8;
    }
    .location-chip.active .chip-dot {
      background: #ffffff;
    }

    /* ========================================================= */
    /* 4. ESPACIO DE TRABAJO A VENTANA COMPLETA (SPLIT-VIEW)      */
    /* ========================================================= */
    .full-window-workspace {
      display: grid;
      grid-template-columns: 1.5fr 1fr;
      gap: 18px;
      height: calc(100vh - 280px);
      min-height: 600px;
      background: transparent;
    }
    .fullscreen-mode .full-window-workspace {
      height: calc(100vh - 145px);
    }

    /* PANEL PRINCIPAL: VISOR DEL RECURSO COMPLETO */
    .resource-full-viewport {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.06);
    }
    .resource-view-topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f8fafc;
      padding: 12px 18px;
      border-bottom: 1px solid #e2e8f0;
      gap: 12px;
    }
    .resource-title-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .resource-icon-badge {
      font-size: 24px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      width: 42px;
      height: 42px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .resource-type-label {
      font-size: 11px;
      font-weight: 700;
      color: #0284c7;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .resource-title {
      margin: 0;
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
    }
    .topbar-right-controls {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .status-badge {
      font-size: 11.5px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 12px;
    }
    .status-badge.pending-badge {
      background: #fef3c7;
      color: #b45309;
    }
    .status-badge.resolved-badge {
      background: #dcfce7;
      color: #15803d;
    }
    .btn-open-source {
      padding: 6px 12px;
      background: #0284c7;
      border: none;
      border-radius: 6px;
      color: #ffffff;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-open-source:hover {
      background: #0369a1;
    }

    /* CUERPO DEL RECURSO */
    .resource-view-body {
      flex: 1;
      overflow-y: auto;
      padding: 24px 32px;
      background: #ffffff;
    }

    /* --- ARTÍCULO CIENTÍFICO COMPLETO --- */
    .paper-complete-document {
      max-width: 800px;
      margin: 0 auto;
      line-height: 1.7;
      color: #1e293b;
    }
    .paper-header-editorial {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .journal-badge {
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .doc-title {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      margin: 8px 0;
      line-height: 1.35;
    }
    .doc-authors {
      font-size: 13px;
      color: #334155;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .doc-doi {
      font-size: 11px;
      color: #64748b;
      font-family: monospace;
    }
    .article-section-block {
      margin-bottom: 22px;
    }
    .sec-heading {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
      margin-bottom: 8px;
    }
    .abstract-body {
      background: #f8fafc;
      border-left: 3px solid #1e3a8a;
      padding: 12px 16px;
      font-style: italic;
      color: #334155;
      font-size: 13.5px;
    }
    .quoted-passage-pin {
      background: #fef08a;
      border: 2px solid #ca8a04;
      border-radius: 8px;
      padding: 14px 18px;
      margin: 14px 0;
      box-shadow: 0 4px 14px rgba(202, 138, 4, 0.2);
      animation: pulseHighlight 2s infinite ease-in-out;
    }
    @keyframes pulseHighlight {
      0%, 100% { box-shadow: 0 0 0 rgba(202, 138, 4, 0.2); }
      50% { box-shadow: 0 0 16px rgba(202, 138, 4, 0.45); }
    }
    .pin-header {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: #854d0e;
      margin-bottom: 6px;
    }
    .pin-sub {
      font-size: 11px;
      color: #a16207;
      margin-left: auto;
    }
    .pin-content {
      font-size: 14px;
      font-weight: 700;
      color: #713f12;
      line-height: 1.5;
    }
    .embedded-table {
      margin: 16px 0;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      overflow: hidden;
    }
    .table-title {
      padding: 8px 12px;
      background: #f1f5f9;
      font-size: 12px;
      color: #0f172a;
      border-bottom: 1px solid #cbd5e1;
    }
    .micro-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    .micro-table th, .micro-table td {
      padding: 6px 12px;
      border-bottom: 1px solid #e2e8f0;
      text-align: left;
    }
    .micro-table th {
      background: #ffffff;
      font-weight: 700;
    }
    .highlighted-row {
      background: #eff6ff;
    }

    /* --- IMAGEN CIENTÍFICA COMPLETA --- */
    .image-complete-viewer {
      display: flex;
      flex-direction: column;
      height: 100%;
      gap: 12px;
    }
    .image-viewport-canvas {
      flex: 1;
      background: #0f172a;
      border-radius: 8px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      position: relative;
    }
    .image-wrapper-relative {
      position: relative;
      max-width: 100%;
      max-height: 100%;
      display: inline-block;
    }
    .full-scientific-photo {
      max-width: 100%;
      max-height: 480px;
      border-radius: 4px;
      display: block;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
    }
    .bounding-box-highlight {
      position: absolute;
      border: 3px solid #38bdf8;
      background: rgba(56, 189, 248, 0.25);
      border-radius: 4px;
      box-shadow: 0 0 15px rgba(56, 189, 248, 0.6);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      pointer-events: none;
    }
    .box-tag {
      background: #0284c7;
      color: #ffffff;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 2px;
      align-self: flex-start;
      margin: -22px 0 0 -2px;
      white-space: nowrap;
    }
    .box-dimensions {
      background: rgba(15, 23, 42, 0.8);
      color: #38bdf8;
      font-size: 10px;
      padding: 1px 4px;
      align-self: flex-end;
      margin: 0 2px 2px 0;
    }
    .microscopy-scale-bar {
      position: absolute;
      bottom: 12px;
      right: 16px;
      background: rgba(0, 0, 0, 0.7);
      padding: 4px 8px;
      border-radius: 4px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
    }
    .scale-line {
      width: 60px;
      height: 3px;
      background: #ffffff;
    }
    .scale-text {
      font-size: 10px;
      color: #ffffff;
      font-weight: 700;
    }
    .image-meta-footer {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px 14px;
      font-size: 12px;
      color: #475569;
    }
    .meta-row {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
    }

    /* --- CONVERSACIÓN / FORO COMPLETO --- */
    .forum-complete-thread {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .original-post-box {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 18px 22px;
    }
    .post-header-line {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .author-inline {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .thread-avatar {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      object-fit: cover;
    }
    .author-inline strong {
      display: block;
      font-size: 14px;
      color: #0f172a;
    }
    .author-inline small {
      color: #64748b;
      font-size: 11px;
    }
    .category-badge {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #1e40af;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
    }
    .thread-title {
      margin: 8px 0;
      font-size: 17px;
      font-weight: 700;
      color: #0f172a;
    }
    .thread-markdown {
      font-size: 13.5px;
      line-height: 1.6;
      color: #334155;
    }
    .thread-replies-timeline {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .timeline-title {
      margin: 0;
      font-size: 13px;
      font-weight: 700;
      color: #475569;
    }
    .reply-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 16px;
      font-size: 13px;
      color: #334155;
    }
    .reply-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }
    .reply-avatar {
      width: 24px;
      height: 24px;
      border-radius: 50%;
    }
    .reply-header small {
      color: #94a3b8;
      font-size: 11px;
      margin-left: auto;
    }
    .reply-card.mention-target-reply {
      background: #eff6ff;
      border: 2px solid #3b82f6;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
    }
    .mention-banner-tag {
      font-size: 11px;
      font-weight: 800;
      color: #1d4ed8;
      margin-bottom: 6px;
    }
    .comment-highlight-text {
      font-size: 14px;
      font-weight: 600;
      color: #1e3a8a;
    }

    /* --- CASO GENÉRICO --- */
    .generic-complete-view {
      padding: 30px;
    }

    /* ========================================================= */
    /* 5. PANEL LATERAL DERECHO: BARRA DE TRIAGE Y RESPUESTA     */
    /* ========================================================= */
    .triage-lateral-dock {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      padding: 20px;
      gap: 16px;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.04);
      border-left: 5px solid #0284c7;
    }
    .is-resolved .triage-lateral-dock {
      border-left-color: #16a34a;
    }
    .dock-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 10px;
    }
    .dock-header h4 {
      margin: 0;
      font-size: 15px;
      font-weight: 800;
      color: #0f172a;
    }
    .dock-badge {
      background: #eff6ff;
      color: #1e40af;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
    }

    /* TARJETA DE MENCIÓN */
    .mention-origin-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .actor-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .actor-photo {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid #ffffff;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
    }
    .actor-meta {
      display: flex;
      flex-direction: column;
    }
    .actor-name {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
    }
    .actor-time {
      font-size: 11px;
      color: #64748b;
    }
    .mention-comment-quote {
      font-size: 13.5px;
      color: #1e293b;
      line-height: 1.5;
    }
    .action-required-pill {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 6px;
      padding: 8px 12px;
      font-size: 12px;
      color: #991b1b;
    }
    .action-label {
      font-weight: 700;
      display: block;
      margin-bottom: 2px;
    }

    /* RESPUESTA EN EL DOCK */
    .reply-box-dock {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: auto;
    }
    .reply-label {
      font-size: 12px;
      font-weight: 700;
      color: #334155;
    }
    .dock-textarea {
      width: 100%;
      box-sizing: border-box;
      padding: 10px 12px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 13px;
      font-family: inherit;
      resize: vertical;
    }
    .dock-textarea:focus {
      outline: none;
      border-color: #0284c7;
      box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
    }
    .dock-actions-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
    }
    .btn-toggle-resolve {
      padding: 8px 14px;
      background: #dcfce7;
      color: #15803d;
      border: 1px solid #86efac;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-toggle-resolve.reopen {
      background: #f1f5f9;
      color: #475569;
      border-color: #cbd5e1;
    }
    .btn-reply-and-next-dock {
      width: 100%;
      background: #0284c7;
      color: #ffffff;
      border: none;
      padding: 10px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.15s;
    }
    .btn-reply-and-next-dock:hover:not(:disabled) {
      background: #0369a1;
    }
    .btn-reply-and-next-dock:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .keyboard-shortcuts-footer {
      font-size: 11px;
      color: #64748b;
      text-align: center;
    }
    .keyboard-shortcuts-footer code {
      background: #f1f5f9;
      padding: 1px 4px;
      border-radius: 3px;
      border: 1px solid #cbd5e1;
    }

    /* MODO LISTA */
    .notifications-list-wrapper {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .list-notification-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px 18px;
      display: flex;
      align-items: center;
      gap: 16px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .list-notification-card:hover {
      border-color: #0284c7;
      box-shadow: 0 4px 12px rgba(2, 132, 199, 0.08);
    }
    .list-notification-card.is-resolved {
      border-left: 4px solid #16a34a;
    }
    .card-left-indicator .type-icon {
      font-size: 24px;
    }
    .card-main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .card-top-line {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
    }
    .source-tag {
      font-weight: 700;
      color: #0f172a;
    }
    .date-tag {
      color: #64748b;
    }
    .author-comment-line {
      font-size: 13px;
      color: #334155;
    }
    .mini-quote {
      margin: 4px 0 0 0;
      font-size: 12px;
      color: #854d0e;
      background: #fef9c3;
      padding: 2px 6px;
      border-radius: 4px;
      font-style: italic;
    }
    .card-action-side {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 8px;
    }
    .badge-resolved {
      font-size: 11px;
      font-weight: 700;
      background: #dcfce7;
      color: #15803d;
      padding: 2px 8px;
      border-radius: 12px;
    }
    .badge-pending {
      font-size: 11px;
      font-weight: 700;
      background: #fef3c7;
      color: #b45309;
      padding: 2px 8px;
      border-radius: 12px;
    }
    .btn-focus-arrow {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #1e40af;
      padding: 5px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
    }
    .btn-focus-arrow:hover {
      background: #1e40af;
      color: #ffffff;
    }
    .empty-inbox-card {
      background: #ffffff;
      border: 2px dashed #cbd5e1;
      border-radius: 14px;
      padding: 40px 20px;
      text-align: center;
      color: #64748b;
    }
    .empty-icon {
      font-size: 40px;
      margin-bottom: 8px;
    }
    .btn-refresh {
      margin-top: 12px;
      background: #1e3e62;
      color: #ffffff;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
    }
  `]
})
export class PersonalNotificationsComponent implements OnInit {
  private notifService = inject(NotificationService);
  private authService = inject(AuthService);

  navigateTab = output<string>();

  viewMode = signal<'carousel' | 'list'>('carousel');
  currentFilter = signal<'mentions' | 'unread' | 'resolved' | 'all'>('mentions');
  currentIndex = signal<number>(0);
  isSubmitting = signal<boolean>(false);
  isFullscreen = signal<boolean>(false);

  replyTexts: Record<string, string> = {};

  user = this.authService.currentUser;
  currentUserName = computed(() => this.user()?.full_name || 'Dra. Elena Ramos');
  userShortName = computed(() => {
    const full = this.currentUserName();
    return full.split(' ')[0] || 'Elena';
  });

  allNotifications = this.notifService.notifications;
  unreadTotal = this.notifService.unreadCount;
  pendingMentionsCount = this.notifService.mentionsPendingCount;

  resolvedCount = computed(() =>
    this.allNotifications().filter(n => n.is_resolved).length
  );

  activeItems = computed(() => {
    const list = this.allNotifications();
    const filter = this.currentFilter();

    switch (filter) {
      case 'mentions':
        return list.filter(n => n.is_mention);
      case 'unread':
        return list.filter(n => !n.is_read || !n.is_resolved);
      case 'resolved':
        return list.filter(n => n.is_resolved);
      case 'all':
      default:
        return list;
    }
  });

  displayedList = computed(() => this.activeItems());

  currentItem = computed<NotificationItem | null>(() => {
    const items = this.activeItems();
    const idx = this.currentIndex();
    if (items.length === 0) return null;
    if (idx >= items.length) {
      return items[items.length - 1];
    }
    return items[idx];
  });

  ngOnInit(): void {
    this.notifService.fetchMentions().subscribe();
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if (this.viewMode() !== 'carousel') return;
    const target = event.target as HTMLElement;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
      return; // No interferir mientras se escribe
    }

    if (event.key === 'ArrowLeft') {
      this.prevLocation();
    } else if (event.key === 'ArrowRight') {
      this.nextLocation();
    }
  }

  toggleFullscreen(): void {
    this.isFullscreen.update(v => !v);
  }

  prevLocation(): void {
    if (this.currentIndex() > 0) {
      this.currentIndex.update(i => i - 1);
    }
  }

  nextLocation(): void {
    if (this.currentIndex() < this.activeItems().length - 1) {
      this.currentIndex.update(i => i + 1);
    }
  }

  openInCarouselAt(item: NotificationItem): void {
    this.viewMode.set('carousel');
    const idx = this.activeItems().findIndex(n => n.id === item.id);
    if (idx !== -1) {
      this.currentIndex.set(idx);
    }
  }

  isArticleResource(item: NotificationItem): boolean {
    const loc = (item.source_location || item.title || '').toLowerCase();
    const tab = (item.target_tab || '').toLowerCase();
    return tab.includes('pdf') || loc.includes('artículo') || loc.includes('paper') || loc.includes('pdf');
  }

  isImageResource(item: NotificationItem): boolean {
    const loc = (item.source_location || item.title || '').toLowerCase();
    const tab = (item.target_tab || '').toLowerCase();
    return tab.includes('annotator') || loc.includes('micrograf') || loc.includes('sem') || loc.includes('imagen');
  }

  isForumResource(item: NotificationItem): boolean {
    const loc = (item.source_location || item.title || '').toLowerCase();
    const tab = (item.target_tab || '').toLowerCase();
    return tab.includes('feed') || loc.includes('foro') || loc.includes('debate') || loc.includes('biorreactor');
  }

  getResourceCategoryLabel(item: NotificationItem): string {
    if (this.isArticleResource(item)) return '📄 Artículo Científico Completo';
    if (this.isImageResource(item)) return '🔬 Micrografía SEM de Alta Resolución';
    if (this.isForumResource(item)) return '💬 Hilo de Foro y Conversación Completa';
    return '📌 Recurso Colegiado';
  }

  getLocationShortTitle(item: NotificationItem): string {
    if (item.source_location) {
      const parts = item.source_location.split(':');
      return parts.length > 1 ? parts[1].trim() : item.source_location;
    }
    return item.title;
  }

  getLocationIcon(item: NotificationItem): string {
    const loc = (item.source_location || item.title || '').toLowerCase();
    if (loc.includes('sem') || loc.includes('imagen') || loc.includes('micrograf')) return '🔬';
    if (loc.includes('pdf') || loc.includes('paper') || loc.includes('artículo')) return '📄';
    if (loc.includes('foro') || loc.includes('debate') || loc.includes('biorreactor')) return '💬';
    if (loc.includes('acuerdo') || loc.includes('norma')) return '⚖️';
    return '📌';
  }

  formatMentions(text: string): string {
    if (!text) return '';
    return text.replace(/(@[A-Za-zÁÉÍÓÚáéíóúñÑ0-9_]+(?:\s+[A-Za-zÁÉÍÓÚáéíóúñÑ0-9_]+)?)/g, '<span style="background: rgba(2, 132, 199, 0.15); color: #0284c7; padding: 1px 6px; border-radius: 4px; font-weight: 700;">$1</span>');
  }

  onVoiceTranscribed(id: string, text: string): void {
    if (this.replyTexts[id]?.trim()) {
      this.replyTexts[id] += ' ' + text;
    } else {
      this.replyTexts[id] = text;
    }
  }

  toggleResolveStatus(item: NotificationItem): void {
    this.notifService.toggleResolve(item.id).subscribe();
  }

  submitReplyAndNext(item: NotificationItem): void {
    const text = this.replyTexts[item.id]?.trim();
    if (!text) return;

    this.isSubmitting.set(true);
    this.notifService.replyToMention(item.id, text, true).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.replyTexts[item.id] = '';
        if (this.currentIndex() < this.activeItems().length - 1) {
          this.nextLocation();
        }
      },
      error: () => {
        this.isSubmitting.set(false);
      }
    });
  }

  openInOriginalViewer(item: NotificationItem): void {
    this.notifService.markAsRead(item.id);
    const targetTab = item.target_tab || 'pdf-viewer';
    this.navigateTab.emit(targetTab);
  }
}
