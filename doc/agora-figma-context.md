# Agora project-management design context

Source: [Agora App — Copy, 22/09/26](https://www.figma.com/design/fG61A7u0ztpZj3HbbULH86/Agora-App--Copy-?node-id=23415-112417). The linked node `23415:112417` is a canvas; its selected **Latest** group is `23471:120610`. The [published interactive reference](https://oculus-gray-14970553.figma.site/) shows the same project-management flow. Context below was read from the Figma MCP and the published reference on 26 September 2026.

## Figma variables

| Token | Value |
| --- | --- |
| Primary/Base | `#6B4EFF` |
| Primary/Dark | `#5538EE` |
| Ink/Dark | `#333238` |
| Ink/Base | `#434149` |
| Ink/Light | `#6D6A74` |
| Sky/White | `#FFFFFF` |
| Sky/Lightest | `#F6F5F8` |
| Sky/Lighter | `#E9E9F1` |
| Sky/Light | `#E2E1E7` |
| Sky/Base | `#CDCBD3` |
| Sky/Dark | `#9A97A4` |
| Green/Darkest, Green/Lightest | `#198155`, `#ECFCE5` |
| Yellow/Darkest, Yellow/Lightest | `#A05E03`, `#FFEFD7` |
| Red/Darkest, Red/Lightest | `#D3180C`, `#FFE5E5` |

Typography uses **Albert Sans**. The Figma styles returned include a bold 24px title with ~31px line height and -1px tracking; regular and medium 16px text with ~22px line height; and regular and medium 14px text with ~20px line height. The gradient variables returned without resolvable values, so don't infer their stops from this data.

## Relevant Figma frames

- **Projects overview:** two-column project-card grid, live/ended badges, sidebar navigation, grid/list controls, New project action. The overview sits inside a 1440px-wide desktop frame.
- **Project details:** published and cover-image variants (`23418:113845`, `23443:117513`), with breadcrumb, Share/View/settings actions, project description, and activity cards showing type, status, counts, sharing, and an overflow menu. Desktop frame is 1440 × 1338px.
- **New activity:** step 1 (`23418:115550`) and step 2 (`23418:115817`) are each 972 × 687px. Step 1 has three selectable 291px-wide cards for Proposals, Mapping, and Prioritising. Step 2 has activity name, description, project dropdown, Back and Create activity.
- **New project:** `23418:115184`, 728 × 823px, with project name, description, organisation, visibility, Cancel and Create Project.
- The Latest group also contains edit-project, project-settings, empty-project, and draft/activity states.

## Behaviors observed on the published reference

- Project cards open detail pages; breadcrumbs return to Projects. Grid/list switches the project layout.
- New project opens a form. New activity is a two-step flow: select type, then enter name/description and choose a project.
- Project detail offers edit via its description, settings, and a reorder-activities dialog. Activity cards open activity detail screens. Overflow menus contain Duplicate and Delete.
- In the published mock, Delete removes a project immediately, and some navigation/View controls do not transition. These are observed prototype behaviors rather than product requirements.
- At a narrow viewport, the published page clips desktop content. The standalone HTML prototype improves this with a responsive layout and a delete confirmation.

The editable, interactive HTML prototype is [agora-projects-interactive.html](agora-projects-interactive.html). Its `seed` array contains the visible sample projects and activities; its CSS custom properties now match the Figma variables above. Browser captures of the published reference are in `.playwright-mcp/` at the repository root (generated, gitignored artifacts).
