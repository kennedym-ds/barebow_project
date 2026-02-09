import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';
import type { ArrowSetup, ArrowSetupCreate, ArrowSetupUpdate, ArrowShaft } from '../types/models';

export function useArrows() {
  return useQuery({ 
    queryKey: ['arrows'], 
    queryFn: () => apiFetch<ArrowSetup[]>('/api/arrows') 
  });
}

export function useArrow(id: string | null) {
  return useQuery({
    queryKey: ['arrows', id],
    queryFn: () => apiFetch<ArrowSetup>(`/api/arrows/${id}`),
    enabled: !!id,
  });
}

export function useCreateArrow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ArrowSetupCreate) =>
      apiFetch<ArrowSetup>('/api/arrows', { 
        method: 'POST', 
        body: JSON.stringify(data) 
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['arrows'] }),
  });
}

export function useUpdateArrow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ArrowSetupUpdate }) =>
      apiFetch<ArrowSetup>(`/api/arrows/${id}`, { 
        method: 'PUT', 
        body: JSON.stringify(data) 
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['arrows'] }),
  });
}

export function useDeleteArrow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/arrows/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['arrows'] }),
  });
}

// Shaft sub-resource hooks
export function useShafts(arrowId: string | null) {
  return useQuery({
    queryKey: ['arrows', arrowId, 'shafts'],
    queryFn: () => apiFetch<ArrowShaft[]>(`/api/arrows/${arrowId}/shafts`),
    enabled: !!arrowId,
  });
}

export function useImportShafts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ arrowId, shafts }: { arrowId: string; shafts: Omit<ArrowShaft, 'id' | 'arrow_setup_id'>[] }) =>
      apiFetch<ArrowShaft[]>(`/api/arrows/${arrowId}/shafts`, {
        method: 'POST',
        body: JSON.stringify(shafts),
      }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['arrows', variables.arrowId, 'shafts'] });
    },
  });
}

export function useDeleteShafts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (arrowId: string) =>
      apiFetch<void>(`/api/arrows/${arrowId}/shafts`, { method: 'DELETE' }),
    onSuccess: (_data, arrowId) => {
      qc.invalidateQueries({ queryKey: ['arrows', arrowId, 'shafts'] });
    },
  });
}
