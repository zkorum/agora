<script lang="ts">
  import * as m from "$lib/paraglide/messages.js";
  import Chip from "$ui/shared/chip.svelte";
  import GradientText from "$ui/shared/gradient-text.svelte";
  import Text from "$ui/shared/text.svelte";

  // Civic Participation: Ballot box with checkmark and raised hands
  const svgCivic = `<svg viewBox="0 0 192 192" fill="none" xmlns="http://www.w3.org/2000/svg">
		<defs>
			<linearGradient id="civic-grad" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" stop-color="#6b4eff"/>
				<stop offset="100%" stop-color="#4f92f6"/>
			</linearGradient>
			<filter id="civic-shadow" x="-20%" y="-20%" width="140%" height="140%">
				<feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#6b4eff" flood-opacity="0.25"/>
			</filter>
		</defs>
		<!-- Ballot box -->
		<rect x="56" y="70" width="80" height="70" rx="6" fill="white" filter="url(#civic-shadow)"/>
		<rect x="56" y="70" width="80" height="16" rx="6" fill="url(#civic-grad)"/>
		<rect x="86" y="74" width="20" height="8" rx="2" fill="white" opacity="0.8"/>
		<!-- Ballot paper -->
		<rect x="80" y="50" width="32" height="40" rx="3" fill="white" filter="url(#civic-shadow)"/>
		<path d="M88 68 L94 74 L104 62" stroke="url(#civic-grad)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
		<!-- Raised hands -->
		<g opacity="0.9">
			<path d="M30 150 L30 120 C30 115 35 110 40 110 L45 110 L45 150" fill="url(#civic-grad)" opacity="0.7"/>
			<circle cx="37" cy="105" r="8" fill="url(#civic-grad)" opacity="0.7"/>
			<path d="M147 150 L147 125 C147 120 152 115 157 115 L162 115 L162 150" fill="url(#civic-grad)" opacity="0.6"/>
			<circle cx="154" cy="110" r="8" fill="url(#civic-grad)" opacity="0.6"/>
			<path d="M165 150 L165 130 C165 125 170 120 175 120 L180 120 L180 150" fill="url(#civic-grad)" opacity="0.5"/>
			<circle cx="172" cy="115" r="7" fill="url(#civic-grad)" opacity="0.5"/>
		</g>
		<!-- Stars decoration -->
		<circle cx="130" cy="45" r="3" fill="url(#civic-grad)" opacity="0.6"/>
		<circle cx="145" cy="55" r="2" fill="url(#civic-grad)" opacity="0.4"/>
		<circle cx="50" cy="55" r="2.5" fill="url(#civic-grad)" opacity="0.5"/>
	</svg>`;

  // Web3 & DAO: Connected nodes network diagram
  const svgWeb3 = `<svg viewBox="0 0 192 192" fill="none" xmlns="http://www.w3.org/2000/svg">
		<defs>
			<linearGradient id="web3-grad" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" stop-color="#6b4eff"/>
				<stop offset="100%" stop-color="#4f92f6"/>
			</linearGradient>
			<filter id="web3-shadow" x="-20%" y="-20%" width="140%" height="140%">
				<feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#6b4eff" flood-opacity="0.3"/>
			</filter>
			<filter id="web3-glow" x="-50%" y="-50%" width="200%" height="200%">
				<feGaussianBlur stdDeviation="3" result="blur"/>
				<feMerge>
					<feMergeNode in="blur"/>
					<feMergeNode in="SourceGraphic"/>
				</feMerge>
			</filter>
		</defs>
		<!-- Connection lines -->
		<g stroke="url(#web3-grad)" stroke-width="2" opacity="0.4">
			<line x1="96" y1="96" x2="45" y2="55"/>
			<line x1="96" y1="96" x2="147" y2="55"/>
			<line x1="96" y1="96" x2="45" y2="137"/>
			<line x1="96" y1="96" x2="147" y2="137"/>
			<line x1="45" y1="55" x2="96" y2="35"/>
			<line x1="147" y1="55" x2="96" y2="35"/>
			<line x1="45" y1="137" x2="96" y2="157"/>
			<line x1="147" y1="137" x2="96" y2="157"/>
			<line x1="45" y1="55" x2="25" y2="96"/>
			<line x1="45" y1="137" x2="25" y2="96"/>
			<line x1="147" y1="55" x2="167" y2="96"/>
			<line x1="147" y1="137" x2="167" y2="96"/>
		</g>
		<!-- Outer nodes -->
		<circle cx="96" cy="35" r="10" fill="white" filter="url(#web3-shadow)"/>
		<circle cx="96" cy="35" r="6" fill="url(#web3-grad)" opacity="0.7"/>
		<circle cx="96" cy="157" r="10" fill="white" filter="url(#web3-shadow)"/>
		<circle cx="96" cy="157" r="6" fill="url(#web3-grad)" opacity="0.7"/>
		<circle cx="25" cy="96" r="10" fill="white" filter="url(#web3-shadow)"/>
		<circle cx="25" cy="96" r="6" fill="url(#web3-grad)" opacity="0.7"/>
		<circle cx="167" cy="96" r="10" fill="white" filter="url(#web3-shadow)"/>
		<circle cx="167" cy="96" r="6" fill="url(#web3-grad)" opacity="0.7"/>
		<!-- Mid nodes -->
		<circle cx="45" cy="55" r="12" fill="white" filter="url(#web3-shadow)"/>
		<circle cx="45" cy="55" r="7" fill="url(#web3-grad)" opacity="0.8"/>
		<circle cx="147" cy="55" r="12" fill="white" filter="url(#web3-shadow)"/>
		<circle cx="147" cy="55" r="7" fill="url(#web3-grad)" opacity="0.8"/>
		<circle cx="45" cy="137" r="12" fill="white" filter="url(#web3-shadow)"/>
		<circle cx="45" cy="137" r="7" fill="url(#web3-grad)" opacity="0.8"/>
		<circle cx="147" cy="137" r="12" fill="white" filter="url(#web3-shadow)"/>
		<circle cx="147" cy="137" r="7" fill="url(#web3-grad)" opacity="0.8"/>
		<!-- Center node (larger) -->
		<circle cx="96" cy="96" r="22" fill="white" filter="url(#web3-shadow)"/>
		<circle cx="96" cy="96" r="16" fill="url(#web3-grad)" filter="url(#web3-glow)"/>
		<!-- Hexagon symbol in center -->
		<polygon points="96,84 104,88 104,96 96,100 88,96 88,88" fill="white" opacity="0.9"/>
	</svg>`;

  // Events & Conferences: Microphone with stage and audience dots
  const svgEvents = `<svg viewBox="0 0 192 192" fill="none" xmlns="http://www.w3.org/2000/svg">
		<defs>
			<linearGradient id="events-grad" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" stop-color="#6b4eff"/>
				<stop offset="100%" stop-color="#4f92f6"/>
			</linearGradient>
			<filter id="events-shadow" x="-20%" y="-20%" width="140%" height="140%">
				<feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#6b4eff" flood-opacity="0.25"/>
			</filter>
		</defs>
		<!-- Stage platform -->
		<path d="M20 115 L172 115 L160 135 L32 135 Z" fill="url(#events-grad)" opacity="0.15"/>
		<rect x="30" y="108" width="132" height="8" rx="2" fill="url(#events-grad)" opacity="0.3"/>
		<!-- Microphone -->
		<g filter="url(#events-shadow)">
			<rect x="82" y="35" width="28" height="50" rx="14" fill="white"/>
			<rect x="88" y="42" width="16" height="36" rx="8" fill="url(#events-grad)"/>
			<!-- Mic grille lines -->
			<line x1="88" y1="50" x2="104" y2="50" stroke="white" stroke-width="1" opacity="0.5"/>
			<line x1="88" y1="58" x2="104" y2="58" stroke="white" stroke-width="1" opacity="0.5"/>
			<line x1="88" y1="66" x2="104" y2="66" stroke="white" stroke-width="1" opacity="0.5"/>
		</g>
		<!-- Mic stand -->
		<path d="M96 85 L96 100" stroke="url(#events-grad)" stroke-width="4" stroke-linecap="round"/>
		<rect x="80" y="98" width="32" height="6" rx="3" fill="url(#events-grad)" opacity="0.8"/>
		<!-- Sound waves -->
		<path d="M70 55 Q60 60 70 70" stroke="url(#events-grad)" stroke-width="2" fill="none" opacity="0.4"/>
		<path d="M60 50 Q45 60 60 75" stroke="url(#events-grad)" stroke-width="2" fill="none" opacity="0.25"/>
		<path d="M122 55 Q132 60 122 70" stroke="url(#events-grad)" stroke-width="2" fill="none" opacity="0.4"/>
		<path d="M132 50 Q147 60 132 75" stroke="url(#events-grad)" stroke-width="2" fill="none" opacity="0.25"/>
		<!-- Audience dots (3 rows) -->
		<g fill="url(#events-grad)">
			<!-- Row 1 -->
			<circle cx="45" cy="150" r="6" opacity="0.8"/>
			<circle cx="65" cy="150" r="6" opacity="0.9"/>
			<circle cx="85" cy="150" r="6" opacity="0.85"/>
			<circle cx="105" cy="150" r="6" opacity="0.9"/>
			<circle cx="125" cy="150" r="6" opacity="0.85"/>
			<circle cx="145" cy="150" r="6" opacity="0.75"/>
			<!-- Row 2 -->
			<circle cx="35" cy="165" r="5" opacity="0.6"/>
			<circle cx="55" cy="165" r="5" opacity="0.7"/>
			<circle cx="75" cy="165" r="5" opacity="0.65"/>
			<circle cx="95" cy="165" r="5" opacity="0.7"/>
			<circle cx="115" cy="165" r="5" opacity="0.65"/>
			<circle cx="135" cy="165" r="5" opacity="0.6"/>
			<circle cx="155" cy="165" r="5" opacity="0.55"/>
			<!-- Row 3 -->
			<circle cx="45" cy="178" r="4" opacity="0.4"/>
			<circle cx="65" cy="178" r="4" opacity="0.45"/>
			<circle cx="85" cy="178" r="4" opacity="0.5"/>
			<circle cx="105" cy="178" r="4" opacity="0.45"/>
			<circle cx="125" cy="178" r="4" opacity="0.4"/>
			<circle cx="145" cy="178" r="4" opacity="0.35"/>
		</g>
	</svg>`;

  // Businesses: People silhouettes with speech bubbles
  const svgBusiness = `<svg viewBox="0 0 192 192" fill="none" xmlns="http://www.w3.org/2000/svg">
		<defs>
			<linearGradient id="biz-grad" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" stop-color="#6b4eff"/>
				<stop offset="100%" stop-color="#4f92f6"/>
			</linearGradient>
			<filter id="biz-shadow" x="-20%" y="-20%" width="140%" height="140%">
				<feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#6b4eff" flood-opacity="0.2"/>
			</filter>
		</defs>
		<!-- Person 1 (left) -->
		<g filter="url(#biz-shadow)">
			<circle cx="50" cy="105" r="18" fill="white"/>
			<circle cx="50" cy="105" r="14" fill="url(#biz-grad)" opacity="0.8"/>
			<path d="M26 160 Q26 130 50 130 Q74 130 74 160" fill="white"/>
			<path d="M30 155 Q30 135 50 135 Q70 135 70 155" fill="url(#biz-grad)" opacity="0.6"/>
		</g>
		<!-- Person 2 (center, larger) -->
		<g filter="url(#biz-shadow)">
			<circle cx="96" cy="95" r="22" fill="white"/>
			<circle cx="96" cy="95" r="17" fill="url(#biz-grad)"/>
			<path d="M66 160 Q66 125 96 125 Q126 125 126 160" fill="white"/>
			<path d="M71 155 Q71 130 96 130 Q121 130 121 155" fill="url(#biz-grad)" opacity="0.8"/>
		</g>
		<!-- Person 3 (right) -->
		<g filter="url(#biz-shadow)">
			<circle cx="142" cy="105" r="18" fill="white"/>
			<circle cx="142" cy="105" r="14" fill="url(#biz-grad)" opacity="0.8"/>
			<path d="M118 160 Q118 130 142 130 Q166 130 166 160" fill="white"/>
			<path d="M122 155 Q122 135 142 135 Q162 135 162 155" fill="url(#biz-grad)" opacity="0.6"/>
		</g>
		<!-- Speech bubble 1 (top left) -->
		<g filter="url(#biz-shadow)">
			<path d="M25 25 L75 25 Q80 25 80 30 L80 55 Q80 60 75 60 L45 60 L40 70 L40 60 L25 60 Q20 60 20 55 L20 30 Q20 25 25 25 Z" fill="white"/>
			<rect x="28" y="35" width="35" height="4" rx="2" fill="url(#biz-grad)" opacity="0.5"/>
			<rect x="28" y="45" width="25" height="4" rx="2" fill="url(#biz-grad)" opacity="0.3"/>
		</g>
		<!-- Speech bubble 2 (top right) -->
		<g filter="url(#biz-shadow)">
			<path d="M117 35 L167 35 Q172 35 172 40 L172 65 Q172 70 167 70 L147 70 L152 80 L142 70 L117 70 Q112 70 112 65 L112 40 Q112 35 117 35 Z" fill="white"/>
			<rect x="120" y="45" width="35" height="4" rx="2" fill="url(#biz-grad)" opacity="0.5"/>
			<rect x="120" y="55" width="28" height="4" rx="2" fill="url(#biz-grad)" opacity="0.3"/>
		</g>
		<!-- Connection dots between people -->
		<circle cx="73" cy="115" r="3" fill="url(#biz-grad)" opacity="0.4"/>
		<circle cx="119" cy="115" r="3" fill="url(#biz-grad)" opacity="0.4"/>
	</svg>`;

  const useCases = [
    {
      chip: () => m.usecases_public_consultation_chip(),
      tagline: () => m.usecases_public_consultation_tagline(),
      examples: () => m.usecases_public_consultation_examples(),
      svg: svgCivic,
    },
    {
      chip: () => m.usecases_events_chip(),
      tagline: () => m.usecases_events_tagline(),
      examples: () => m.usecases_events_examples(),
      svg: svgEvents,
    },
    {
      chip: () => m.usecases_web3_chip(),
      tagline: () => m.usecases_web3_tagline(),
      examples: () => m.usecases_web3_examples(),
      svg: svgWeb3,
    },
    {
      chip: () => m.usecases_businesses_chip(),
      tagline: () => m.usecases_businesses_tagline(),
      examples: () => m.usecases_businesses_examples(),
      svg: svgBusiness,
    },
  ];
</script>

<section id="usecases" class="px-8 py-20">
  <div class="mx-auto max-w-[1120px]">
    <Text size="base" weight="bold" class="mb-8">
      <GradientText>{m.usecases_label()}</GradientText>
    </Text>

    <div
      class="
        grid grid-cols-1 justify-items-center gap-x-5 gap-y-10
        md:grid-cols-2 md:justify-items-start
      "
    >
      {#each useCases as useCase, i (i)}
        <div
          class="
            flex flex-col items-center gap-4
            sm:flex-row sm:items-start sm:gap-6
          "
        >
          <div
            class="
              size-[160px] shrink-0 overflow-hidden rounded-2xl
              bg-linear-[115deg] from-gradient-light-purple from-46%
              to-gradient-light-blue
              sm:size-[192px]
            "
          >
            <!-- eslint-disable-next-line svelte/no-at-html-tags -- SVG is static developer-controlled content -->
            {@html useCase.svg}
          </div>
          <div
            class="
              flex min-w-0 flex-col gap-[6px]
              sm:pt-6
              md:min-w-[323px]
            "
          >
            <Chip
              class="
                self-center
                sm:self-start
              ">{useCase.chip()}</Chip
            >
            <Text size="base" weight="semibold">
              {useCase.tagline()}
            </Text>
            <ul
              class="
                list-disc pl-6 text-base tracking-base text-secondary-foreground
              "
            >
              {#each useCase.examples().split("|") as example, j (j)}
                <li>{example}</li>
              {/each}
            </ul>
          </div>
        </div>
      {/each}
    </div>
  </div>
</section>
