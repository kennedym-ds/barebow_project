import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';
import type { BowSetup, BowSetupCreate, BowSetupUpdate } from '../types/models';

export function useBows() {
  return useQuery({ 
    queryKey: ['bows'], 
    queryFn: () => apiFetch<BowSetup[]>('/api/bows') 
  });
}

export function useBow(id: string | null) {
  return useQuery({
    queryKey: ['bows', id],
    queryFn: () => apiFetch<BowSetup>(`/api/bows/${id}`),
    enabled: !!id,
  });
}

export function useCreateBow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BowSetupCreate) =>
      apiFetch<BowSetup>('/api/bows', { 
        method: 'POST', 
        body: JSON.stringify(data) 
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bows'] }),
  });
}

export function useUpdateBow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: BowSetupUpdate }) =>
      apiFetch<BowSetup>(`/api/bows/${id}`, { 
        method: 'PUT', 
        body: JSON.stringify(data) 
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bows'] }),
  });
}

export function useDeleteBow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/bows/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bows'] }),
  });
}
