<script lang="ts">
  import { page } from '$app/state'

  let is404page = page.status === 404
</script>

<main class="flex h-screen flex-1 items-center justify-center text-center">
  <h1 class="text-2xl font-medium md:text-4xl lg:text-6xl">
    {is404page ? 'Page not found' : 'Error'}
  </h1>
</main>
