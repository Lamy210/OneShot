import { createTRPCReact } from '@trpc/react-query'
import type { AppRouter } from '@oneshot/backend/routes'

export const trpc = createTRPCReact<AppRouter>()
