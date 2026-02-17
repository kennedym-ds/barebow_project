import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { TabSetupCreate, TabSetupUpdate } from '../types/models';
import { tabService } from '../services/tabService';

export function useTabs() {
  return useQuery({
    queryKey: ['tabs'],
    queryFn: () => tabService.list(),
  });
}

export function useTab(id: string | null) {
  return useQuery({
    queryKey: ['tabs', id],
    queryFn: () => tabService.getById(id!),
    enabled: !!id,
  });
}

export function useCreateTab() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: TabSetupCreate) => Promise.resolve(tabService.create(data)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tabs'] }),
  });
}

export function useUpdateTab() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TabSetupUpdate }) =>
      Promise.resolve(tabService.update(id, data)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tabs'] }),
  });
}

export function useDeleteTab() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => Promise.resolve(tabService.delete(id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tabs'] }),
  });
}

export function useUploadTabImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) =>
      tabService.uploadImage(id, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tabs'] }),
  });
}

export function useDeleteTabImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tabService.deleteImage(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tabs'] }),
  });
}
