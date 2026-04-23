import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'

/**
 * Supprime une notification définitivement.
 */
export function useDeleteNotification() {
  const qc = useQueryClient()
  return useMutation<void, Error, { id: string }>({
    mutationFn: async ({ id }) => {
      await api.delete(`/notifications/${id}`)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}
