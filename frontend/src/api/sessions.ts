import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';
import type { Session, SessionCreate, SessionSummary, End, EndCreate } from '../types/models';

export function useSessions(bowId?: string, arrowId?: string) {
  const params = new URLSearchParams();
  if (bowId) params.set('bow_id', bowId);
  if (arrowId) params.set('arrow_id', arrowId);
  const qs = params.toString();
  
  return useQuery({
    queryKey: ['sessions', bowId, arrowId],
    queryFn: () => apiFetch<SessionSummary[]>(`/api/sessions${qs ? '?' + qs : ''}`),
  });
}

export function useSession(id: string | null) {
  return useQuery({
    queryKey: ['sessions', id],
    queryFn: () => apiFetch<Session>(`/api/sessions/${id}`),
    enabled: !!id,
  });
}

export function useCreateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SessionCreate) =>
      apiFetch<Session>('/api/sessions', { 
        method: 'POST', 
        body: JSON.stringify(data) 
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  });
}

export function useDeleteSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/sessions/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  });
}

export function useSaveEnd() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, data }: { sessionId: string; data: EndCreate }) =>
      apiFetch<End>(`/api/sessions/${sessionId}/ends`, { 
        method: 'POST', 
        body: JSON.stringify(data) 
      }),
    onSuccess: (_, vars) => {
      // Invalidate both detail and list queries so summaries refresh
      qc.invalidateQueries({ queryKey: ['sessions', vars.sessionId] });
      qc.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}
