import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/$recipeKey')({
  beforeLoad: ({ params }) => {
    throw redirect({ to: '/components/$recipeKey', params: { recipeKey: params.recipeKey } })
  },
})
