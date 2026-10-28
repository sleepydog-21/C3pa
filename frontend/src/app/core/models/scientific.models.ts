export type UserRole = 'ADMIN' | 'LEADER' | 'RESEARCHER' | 'GUEST';

export interface User {
  id: string;
  email: string;
  fullName: string;
  academicTitle?: string;
  role: UserRole;
  avatarUrl?: string;
  institutionName?: string;
}

export interface Space {
  id: string;
  name: string;
  slug: string;
  description: string;
  isPrivate: boolean;
  roleInSpace?: 'LEADER' | 'CONTRIBUTOR' | 'VIEWER';
}

export type ResourceType = 'PDF' | 'IMAGE' | 'AUDIO' | 'DATASET';

export interface ScientificResource {
  id: string;
  space_id: string;
  uploader: User;
  title: string;
  resource_type: ResourceType;
  storage_path: string;
  mime_type: string;
  file_size: number;
  metadata: {
    authors?: string;
    doi?: string;
    tags?: string[];
    thumbnail_url?: string;
    [key: string]: any;
  };
  commentsCount: number;
  hasUnreadComments: boolean;
  unreadCommentsCount: number;
  transcript?: string;
  indexing_status?: 'PROCESSING' | 'READY' | 'FAILED';
  chunks_count?: number;
  createdAt: string;
}

export interface ImageCoordinates {
  x: number; // 0.0 - 1.0 relativo
  y: number;
  width: number;
  height: number;
}

export interface AudioSegment {
  id: number;
  start: number; // segundos
  end: number;
  text: string;
}

export interface ThreadComment {
  id: string;
  author: User;
  content: string;
  parentCommentId?: string;
  createdAt: string;
  replies?: ThreadComment[];
}

export interface ScientificAnnotation {
  id: string;
  resourceId: string;
  author: User;
  targetType: 'IMAGE_REGION' | 'PDF_SELECTION' | 'AUDIO_TIMESTAMP';
  coordinates: ImageCoordinates | { page: number; rects?: number[][] } | { start_time: number; end_time: number };
  highlightedText?: string;
  noteContent: string;
  isResolved?: boolean;
  resolvedBy?: User;
  resolvedAt?: string;
  commentsCount: number;
  comments?: ThreadComment[];
  createdAt: string;
}

export interface Decision {
  id: string;
  spaceId: string;
  title: string;
  rationale: string;
  status: 'PROPOSED' | 'APPROVED' | 'SUPERSEDED';
  recordedBy: User;
  resolvedAt: string;
  tasksCount: number;
}

export interface RAGSource {
  source_type: string;
  title: string;
  space_name?: string;
  author?: string;
  date?: string;
  link_url?: string;
  snippet: string;
  target_tab?: 'pdf-viewer' | 'feed' | 'decisions' | 'library' | string;
  item_id?: string;
  deep_link_label?: string;
  is_unresolved?: boolean;
}

export interface RAGResponse {
  answer: string;
  sources: RAGSource[];
  model_used: string;
}

export interface InvitationCreateRequest {
  email: string;
  role: string;
  institution_name: string;
  target_space_id?: string;
  expires_in_days?: number;
}

export interface InvitationDTO {
  id: string;
  inviter_name: string;
  email: string;
  token: string;
  role: string;
  institution_name: string;
  target_space_id: string;
  target_space_name: string;
  invite_url: string;
  expires_at: string;
  is_used: boolean;
  status: 'PENDING' | 'USED' | 'EXPIRED';
  created_at: string;
}

export interface VerifyTokenResponse {
  valid: boolean;
  email: string;
  role: string;
  institution_name: string;
  target_space_id: string;
  target_space_name: string;
  expires_at: string;
}

export interface RegisterByInviteRequest {
  token: string;
  full_name: string;
  academic_title: string;
  password: string;
  avatar_url?: string;
}

export interface UserRegisteredResponse {
  id: string;
  full_name: string;
  email: string;
  role: string;
  institution_name: string;
  academic_title: string;
  message: string;
}

export interface DigestMetrics {
  posts_count: number;
  comments_count: number;
  resources_count: number;
  active_users_count: number;
  decisions_count?: number;
}

export interface WeeklyDigestDTO {
  id: string;
  space_id: string;
  space_name: string;
  week_start_date: string;
  week_end_date: string;
  status: 'DRAFT' | 'PUBLISHED';
  metrics: DigestMetrics;
  summary_markdown: string;
  published_by?: string;
  published_at?: string;
  created_at: string;
}

export interface GenerateDigestRequest {
  space_id: string;
  space_name?: string;
  days_back?: number;
}

export interface UpdateDigestRequest {
  summary_markdown: string;
}


