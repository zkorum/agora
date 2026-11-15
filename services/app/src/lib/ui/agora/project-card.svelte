<script lang="ts">
  import { Button } from "bits-ui";

  import ExpandableText from "$ui/shared/expandable-text.svelte";
  import Icon from "$ui/shared/icon.svelte";

  import type { ProjectView } from "./view-types.js";

  let {
    project,
    onopen,
    layout = "grid",
  }: {
    project: ProjectView;
    onopen: () => void;
    layout?: "grid" | "list";
  } = $props();
</script>

<article class={["project-card", { list: layout === "list" }]}>
  <div
    class="
      cover
      {project.cover}"
    aria-hidden="true"
  ></div>
  <div class="info">
    <p class="organization">
      <span class="organization-mark" aria-hidden="true">CTC</span
      >{project.organization}
    </p>
    <h3>
      <Button.Root class="project-open" type="button" onclick={onopen}
        >{project.title}</Button.Root
      >
    </h3>
    <div class="description">
      <ExpandableText text={project.description} lines={5} />
    </div>
    <footer>
      <span>
        <Icon name="list" size={14} />
        {project.conversationCount}
        <span class="sr-only">activities</span>
      </span>
      <span>
        <Icon name="people" size={14} />
        {project.participantCount}
        <span class="sr-only">participants</span>
      </span>
      <span class="publication"
        ><Icon name="globe" size={14} /><span class="sr-only"
          >Public project</span
        ></span
      >
    </footer>
  </div>
</article>

<style>
  .project-card {
    position: relative;
    display: flex;
    flex-direction: column;
    border: 1px solid var(--sky-lighter);
    border-radius: 12px;
    padding: 8px;
    background: white;
    min-width: 0;
    min-height: 417px;
    box-shadow: 0 2px 6px #00000008;
  }
  .project-card:hover {
    box-shadow: 0 2px 5px #0000000d;
  }
  .cover {
    height: 128px;
    border-radius: 6px;
    flex-shrink: 0;
  }
  .coral {
    background: #f06c48;
  }
  .gradient {
    background: linear-gradient(
      165deg,
      var(--primary-base) 30%,
      var(--brand-blue)
    );
  }
  .mint {
    background: #bfe5d7;
  }
  .info {
    display: flex;
    flex-direction: column;
    padding: 16px 12px;
    flex: 1;
  }
  .organization {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 20px;
    margin-block-end: 12px;
    font-size: 14px;
    line-height: 16px;
    color: var(--ink-light);
  }
  .organization-mark {
    display: grid;
    place-items: center;
    width: 20px;
    height: 20px;
    border-radius: 5px;
    background: #f06c48;
    color: white;
    font-size: 7px;
    flex-shrink: 0;
  }
  h3 {
    font-size: 18px;
    font-weight: 600;
    line-height: 24px;
  }
  .project-card :global(.project-open) {
    border: 0;
    padding: 0;
    background: transparent;
    text-align: start;
    font: inherit;
    color: var(--ink-dark);
    cursor: pointer;
  }
  .project-card :global(.project-open::after) {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 12px;
  }
  .project-card :global(.project-open:focus-visible::after) {
    outline: 3px solid var(--primary-light);
    outline-offset: 2px;
  }
  .description {
    color: var(--ink-light);
    font-size: 14px;
    line-height: 21px;
    margin-block-start: 4px;
    flex: 1;
  }
  footer {
    display: flex;
    gap: 12px;
    min-height: 47px;
    padding-block-start: 16px;
    margin-block-start: 16px;
    border-block-start: 1px solid var(--sky-lighter);
    font-size: 14px;
    color: var(--ink-light);
  }
  footer span {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
  .publication {
    margin-inline-start: auto;
  }
  .list {
    flex-direction: row;
    min-height: 0;
  }
  .list .cover {
    width: 160px;
    height: auto;
    min-height: 130px;
  }
  @media (max-width: 760px) {
    .list {
      flex-direction: column;
    }
    .list .cover {
      width: 100%;
      height: 128px;
      min-height: 0;
    }
    .project-card {
      min-height: 417px;
    }
  }
</style>
