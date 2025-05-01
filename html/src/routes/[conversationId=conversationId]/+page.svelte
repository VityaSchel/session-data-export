<script lang="ts">
  import { page } from '$app/state'
  import AttachmentRender from '$lib/AttachmentRender.svelte'
  import { sameDay, shortSessionId } from '$lib/utils'

  type Message = {
    id: string
    sentAt: number
    source: string
    type: 'incoming' | 'outgoing'
    body: string
    messageHash: string
    attachments: {
      contentType: string
      size: number
      fileName: string
      src: string
    }[]
    dataExtractionNotification?: { type: number; source: string }
    messageRequestResponse?: unknown
  }

  let conversation:
    | undefined
    | null
    | {
        title: string
        type: 'private' | 'group'
        members: string[]
        avatar: boolean
        messagesFiles: number
        sog: boolean
      } = $state()

  let conversationId = $derived(page.params.conversationId)
  $effect(() => {
    conversation = undefined
    fetch(`/data/conversations/${conversationId}/conversation.json`)
      .then((response) => response.json())
      .then((data) => {
        conversation = data
      })
      .catch((error) => {
        conversation = null
        console.error('Error fetching conversation:', error)
      })
  })

  const pages = $derived(conversation?.messagesFiles ?? 1)
  let pageNumber = $derived.by(() => {
    const pageStr = page.url.searchParams.get('page')
    if (pageStr === null) {
      return 1
    }
    const pageNum = Number(pageStr)
    if (pageNum <= 0 || !Number.isSafeInteger(pageNum)) {
      return 1
    }
    return Math.min(pageNum, pages)
  })

  let messages: null | Message[] = $state(null)
  $effect(() => {
    messages = null
    if (conversation) {
      fetch(`/data/conversations/${conversationId}/messages_${pageNumber}.json`)
        .then((response) => response.json())
        .then((data) => {
          messages = data
        })
        .catch((error) => {
          messages = []
          console.error('Error fetching messages:', error)
        })
    }
  })
  const messagesGroupedByDates = $derived.by(() => {
    if (!messages) {
      return []
    }
    let lastReportedDate: Date | null = null
    let messagesGroup: Message[] = []
    let messagesGroups: Message[][] = []
    for (const message of messages) {
      if (lastReportedDate === null || sameDay(lastReportedDate, new Date(message.sentAt))) {
        messagesGroup.push(message)
        if (lastReportedDate === null) {
          lastReportedDate = new Date(message.sentAt)
        }
      } else {
        lastReportedDate = new Date(message.sentAt)
        messagesGroups.push(messagesGroup)
        messagesGroup = [message]
      }
    }
    messagesGroups.push(messagesGroup)
    return messagesGroups
  })
</script>

<main class="relative h-screen flex-1 overflow-auto">
  {#if conversation !== undefined}
    {#if conversation === null}
      <h1
        class="absolute top-1/2 left-1/2 w-max -translate-1/2 text-2xl font-medium md:text-4xl lg:text-6xl"
      >
        Chat not found
      </h1>
    {:else}
      {@const title = conversation.title || shortSessionId(conversationId)}
      <header
        class="sticky top-0 z-[2] flex h-16 w-full items-center justify-between border-x-0 border-t-0 border-b border-neutral-500/20 bg-[#121212] px-4"
      >
        <div class="flex items-center gap-1">
          {#if conversation.avatar}
            <img
              src="/data/conversations/{conversationId}/avatar.png"
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
          <h1 class="text-lg font-medium">{title}</h1>
        </div>
        <div class="flex items-center gap-2">
          {#snippet navigationButton(icon: 'left' | 'right', pageNumber: number)}
            {@const disabled = pageNumber <= 0 || pageNumber > pages}
            {#snippet Icon()}
              {#if icon === 'left'}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="1em"
                  height="1em"
                  viewBox="0 0 20 20"
                >
                  <path
                    fill="currentColor"
                    d="m5.83 9l5.58-5.58L10 2l-8 8l8 8l1.41-1.41L5.83 11H18V9z"
                  />
                </svg>
              {:else}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="1em"
                  height="1em"
                  viewBox="0 0 20 20"
                >
                  <path
                    fill="currentColor"
                    d="M2 11h12.2l-5.6 5.6L10 18l8-8l-8-8l-1.4 1.4L14.2 9H2z"
                  />
                </svg>
              {/if}
            {/snippet}
            {#if disabled}
              <span class="p-3 opacity-50">
                {@render Icon()}
              </span>
            {:else}
              <a href="?page={pageNumber}" aria-label="Previous page" class={['p-3']}>
                {@render Icon()}
              </a>
            {/if}
          {/snippet}
          {#if pages > 0}
            {@render navigationButton('left', pageNumber - 1)}
            <span class="tabular-nums">Page {pageNumber}/{conversation.messagesFiles}</span>
            {@render navigationButton('right', pageNumber + 1)}
          {/if}
        </div>
      </header>
      {#if conversation.sog}
        <p class="absolute top-1/2 left-1/2 max-w-[90%] -translate-1/2 text-center">
          Chat history for SOGS is not preserved for storage economy reasons. You can work with SQL
          database directly to restore any saved messages from SOGS.
        </p>
      {:else if messages}
        {#if messages.length == 0}
          <h4 class="absolute top-1/2 left-1/2 -translate-1/2 text-center">Messages not found</h4>
        {:else}
          <div class="flex flex-col gap-2 p-3">
            {#each messagesGroupedByDates as messagesAtDate (messagesAtDate[0].id)}
              <div class="flex flex-col gap-2">
                <div class="sticky top-19 z-[1] flex w-full justify-center text-white">
                  <span
                    class="rounded-full bg-gray-500/30 px-2 py-0.5 text-sm font-medium backdrop-blur-lg"
                  >
                    {new Date(messagesAtDate[0].sentAt).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                {#each messagesAtDate as message}
                  {#if message.dataExtractionNotification}
                    <div class="flex items-center justify-center">
                      <div class="rounded-xl bg-neutral-800 px-12 py-2 text-white">
                        <span class="font-medium">
                          {#if message.dataExtractionNotification.source === conversationId}
                            {conversation.title}
                          {:else}
                            You
                          {/if}
                        </span>
                        <!-- based on https://github.com/sessionjs/types/blob/main/src/signal-bindings/compiled.js -->
                        {#if message.dataExtractionNotification.type === 1}
                          took a screenshot
                        {:else if message.dataExtractionNotification.type === 2}
                          saved media
                        {/if}
                      </div>
                    </div>
                  {:else if 'messageRequestResponse' in message}
                    <div class="flex items-center justify-center">
                      <div class="rounded-xl bg-neutral-800 px-12 py-2 text-white">
                        Chat request accepted
                      </div>
                    </div>
                  {:else}
                    <div
                      class={[
                        'relative w-fit max-w-[90%] rounded-xl px-3 py-2 break-words',
                        {
                          'bg-neutral-800 text-white': message.type === 'incoming',
                          'bg-session ml-auto text-black': message.type === 'outgoing'
                        }
                      ]}
                    >
                      {#if message.attachments}
                        {#each message.attachments as attachment}
                          <AttachmentRender {attachment} {conversationId} />
                        {/each}
                      {/if}
                      <span
                        class={[
                          'absolute bottom-0 mb-1 w-max text-xs text-neutral-600',
                          {
                            'left-full ml-2': message.type === 'incoming',
                            'right-full mr-2': message.type === 'outgoing'
                          }
                        ]}
                        title={new Intl.DateTimeFormat('en-US', {
                          timeStyle: 'long'
                        }).format(new Date(message.sentAt))}
                      >
                        {new Intl.DateTimeFormat('en-US', {
                          timeStyle: 'short'
                        }).format(new Date(message.sentAt))}
                      </span>
                      {message.body}
                    </div>
                  {/if}
                {/each}
              </div>
            {/each}
          </div>
        {/if}
      {/if}
    {/if}
  {/if}
</main>
