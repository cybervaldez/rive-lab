import { createFileRoute, redirect } from '@tanstack/react-router'
import { DEFAULT_RECIPE_KEY } from '../lib/recipes'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ to: '/$recipeKey', params: { recipeKey: DEFAULT_RECIPE_KEY } })
  },
})
