import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SpaceItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  is_private: boolean;
  leader?: any;
  members_count: number;
  posts_count: number;
  color_accent: string;
}

export interface PostItem {
  id: string;
  space_id: string;
  space_name: string;
  author: {
    id: string;
    full_name: string;
    academic_title?: string;
    avatar_url?: string;
    institution_name?: string;
  };
  title: string;
  content_markdown: string;
  post_type: 'ADVANCE' | 'QUESTION' | 'ANNOUNCEMENT' | 'GENERAL';
  reactions: Record<string, number>;
  user_reacted: string[];
  comments_count: number;
  comments: {
    id: string;
    post_id: string;
    author: {
      id: string;
      full_name: string;
      academic_title?: string;
      avatar_url?: string;
      institution_name?: string;
    };
    content_markdown: string;
    created_at: string;
  }[];
  created_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class FeedService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8000/api/v1';

  getSpaces(): Observable<SpaceItem[]> {
    return this.http.get<SpaceItem[]>(`${this.apiUrl}/spaces`);
  }

  getFeed(spaceId?: string): Observable<PostItem[]> {
    let url = `${this.apiUrl}/posts/feed`;
    if (spaceId && spaceId !== 'all') {
      url += `?space_id=${spaceId}`;
    }
    return this.http.get<PostItem[]>(url);
  }

  createPost(payload: {
    space_id: string;
    title: string;
    content_markdown: string;
    post_type: string;
  }): Observable<PostItem> {
    return this.http.post<PostItem>(`${this.apiUrl}/posts`, payload);
  }

  addComment(postId: string, contentMarkdown: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/posts/${postId}/comments`, {
      content_markdown: contentMarkdown
    });
  }

  toggleReaction(postId: string, reactionType: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/posts/${postId}/reactions`, {
      reaction_type: reactionType
    });
  }
}
