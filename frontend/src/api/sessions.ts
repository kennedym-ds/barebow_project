import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { SessionCreate, EndCreate } from '../types/models';
import { sessionService } from '../services/sessionService';

export function useSessions(bowId?: string, arrowId?: string) {
  return useQuery({
    queryKey: ['sessions', bowId, arrowId],
    queryFn: () => Promise.resolve(sessionService.list(bowId, arrowId)),
  });
}

export function useSession(id: string | null) {
  return useQuery({
    queryKey: ['sessions', id],
    queryFn: () => Promise.resolve(sessionService.getById(id!)),
    enabled: !!id,
  });
}

export function useCreateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SessionCreate) => Promise.resolve(sessionService.create(data)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  });
}

export function useDeleteSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => Promise.resolve(sessionService.delete(id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  });
}

export function useSaveEnd() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, data }: { sessionId: string; data: EndCreate }) =>
      Promise.resolve(sessionService.saveEnd(sessionId, data)),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['sessions', vars.sessionId] });
      qc.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}
