import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/apps/stream-overlay')({
  component: () => <Outlet />,
})
