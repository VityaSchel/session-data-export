<script lang="ts">
  import { filesize } from 'filesize'

  let {
    attachment,
    conversationId
  }: {
    attachment: {
      contentType: string
      size: number
      fileName: string
      src: string
    }
    conversationId: string
  } = $props()

  const link = $derived(`/data/conversations/${conversationId}/attachments/${attachment.src}`)
</script>

{#if attachment.src}
  {#if attachment.contentType.startsWith('image/')}
    <img
      src={link}
      alt="attachment"
      class="mt-1 mb-2 max-h-[500px] rounded-md bg-neutral-600 object-contain"
    />
  {:else}
    <a
      href={link}
      class="mt-1 mb-2 block border border-neutral-700 bg-neutral-900 px-3 py-2"
      download={attachment.fileName}
    >
      Save <span class="font-medium underline">{attachment.fileName}</span>
      ({filesize(attachment.size)})
    </a>
  {/if}
{:else}
  <div class="mt-1 mb-2 rounded-md bg-red-950 px-2 py-1">
    File not found locally: <span class="font-medium">{attachment.fileName}</span>
    ({filesize(attachment.size)}, {attachment.contentType})
  </div>
{/if}
