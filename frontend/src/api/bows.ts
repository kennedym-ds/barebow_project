import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { BowSetupCreate, BowSetupUpdate } from '../types/models';
import { bowService } from '../services/bowService';

export function useBows() {
  return useQuery({
    queryKey: ['bows'],
    queryFn: () => bowService.list(),
  });
}

export function useBow(id: string | null) {
  return useQuery({
    queryKey: ['bows', id],
    queryFn: () => bowService.getById(id!),
    enabled: !!id,
  });
}

export function useCreateBow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BowSetupCreate) => Promise.resolve(bowService.create(data)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bows'] }),
  });
}

export function useUpdateBow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: BowSetupUpdate }) =>
      Promise.resolve(bowService.update(id, data)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bows'] }),
  });
}

export function useDeleteBow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => Promise.resolve(bowService.delete(id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bows'] }),
  });
}
