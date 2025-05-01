<script lang="ts">
  import { shortSessionId } from '$lib/utils'
  import { onMount } from 'svelte'

  let conversations = $state<
    | {
        id: string
        title: string
        avatar: boolean
        lastMessage: string
        lastMessageOutgoing: boolean
      }[]
    | null
  >(null)
  onMount(() => {
    fetch('/data/conversations/conversations.json')
      .then((response) => response.json())
      .then((data) => {
        conversations = data
      })
      .catch((error) => {
        console.error('Error fetching conversations:', error)
      })
  })
</script>

<aside class="relative h-screen w-[366px] border-y-0 border-r border-l-0 border-neutral-500/20 overflow-auto shrink-0">
  {#if conversations !== null}
    {#if conversations.length === 0}
      <span
        class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center text-3xl text-neutral-500"
      >
        You have
        <br />
        no chats
      </span>
    {:else}
      {#each conversations as conversation (conversation.id)}
        {@const title = conversation.title || shortSessionId(conversation.id)}
        <a
          class="flex h-16 items-center gap-1 overflow-hidden border-x-0 border-t-0 border-b border-neutral-500/20 px-3"
          href={conversation.id}
        >
          {#if conversation.avatar}
            <img
              src="/data/conversations/{conversation.id}/avatar.png"
              alt="Avatar"
              class="mr-2 h-10 w-10 shrink-0 rounded-full text-[0px]"
            />
          {:else}
            <div
              class="mr-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-500/20 text-sm text-neutral-500"
            >
              <span>
                {title.charAt(0).toUpperCase()}{title.charAt(1).toUpperCase()}
              </span>
            </div>
          {/if}
          <div class="flex w-full flex-col overflow-hidden text-ellipsis">
            <span class="block w-full overflow-hidden font-medium text-ellipsis whitespace-nowrap">
              {title}
            </span>
            {#if conversation.lastMessage}
              <span
                class={[
                  'inline-block w-full overflow-hidden text-sm text-ellipsis whitespace-nowrap',
                  {
                    'text-neutral-300': !conversation.lastMessageOutgoing,
                    'text-neutral-400': conversation.lastMessageOutgoing
                  }
                ]}
              >
                {#if conversation.lastMessageOutgoing}
                  <span class="inline-block text-xs font-semibold text-neutral-500 uppercase">
                    you:
                  </span>
                {/if}
                {conversation.lastMessage}
              </span>
            {/if}
          </div>
        </a>
      {/each}
    {/if}
  {/if}
</aside>
