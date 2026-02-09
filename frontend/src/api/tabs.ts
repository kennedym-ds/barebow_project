import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';
import type { TabSetup, TabSetupCreate, TabSetupUpdate } from '../types/models';

export function useTabs() {
  return useQuery({ 
    queryKey: ['tabs'], 
    queryFn: () => apiFetch<TabSetup[]>('/api/tabs') 
  });
}

export function useTab(id: string | null) {
  return useQuery({
    queryKey: ['tabs', id],
    queryFn: () => apiFetch<TabSetup>(`/api/tabs/${id}`),
    enabled: !!id,
  });
}

export function useCreateTab() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: TabSetupCreate) =>
      apiFetch<TabSetup>('/api/tabs', { 
        method: 'POST', 
        body: JSON.stringify(data) 
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tabs'] }),
  });
}

export function useUpdateTab() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TabSetupUpdate }) =>
      apiFetch<TabSetup>(`/api/tabs/${id}`, { 
        method: 'PUT', 
        body: JSON.stringify(data) 
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tabs'] }),
  });
}

export function useDeleteTab() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/tabs/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tabs'] }),
  });
}
