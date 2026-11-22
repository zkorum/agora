<script lang="ts">
  import Button from "$ui/shared/button.svelte";
  import ImagePicker from "$ui/shared/image-picker.svelte";

  let { disabled = false }: { disabled?: boolean } = $props();
  let image = $state<File | undefined>();
  let previousImage: File | undefined;
</script>

<ImagePicker
  label="Profile image"
  value={image}
  onValueChange={(value: File | undefined) => (image = value)}
  {disabled}
/>
<Button
  variant="quiet"
  onclick={() => {
    previousImage = image;
    image = undefined;
  }}>Clear externally</Button
>
<Button variant="quiet" onclick={() => (image = previousImage)}
  >Restore externally</Button
>
<Button
  variant="quiet"
  onclick={() => {
    image = new File(["not an image"], "broken.png", { type: "image/png" });
  }}>Set corrupt image externally</Button
>
