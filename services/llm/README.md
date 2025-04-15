
# LLM

This directory contains the details about:

- the prompts that we're using to labels the clusters and generate the AI summary.
- the prompts for conversation topics labeling
- the prompts for the conversation feed recommendation algorithms

It will contain the Python scripts to run the prompt using the Agora database and LLM model.

Currently, the prompt we use is available as a set of default config in the `api` service: https://github.com/zkorum/agora/blob/main/services/api/src/app.ts#L95-L237

## Summary 
We decided to use an LLM to generate summaries and cluster labels for group conversations. The goal was to implement a system to take in a JSON input containing group conversation data and output a JSON output containing (1) an overall conversation summary and (2) labels and brief descriptions for each opinion cluster. 

We initially focused on testing DeepSeek Distil models (4-bit quantized) because of their low costs, but these were too slow for our use-case and struggled specifically to adhere to word/character limits -- which is an important constraint for the app for optimal readability/UI. We turned to testing Mistral models, which are positioned as direct competitors to the Deepseek models. We chose Mistral Small 3 (24B) which generated much better results and is "reasonably" small. However, the Mistral Small 3 is too large/expensive to self-host on EC2, so we decided to use AWS credits (available via Station F) and deployed the model using AWS Bedrock. 

We tested different combinations of prompts (shown below as "System Instructions") and parameters (temperature, top P, top K). The version currently in use is:
* Prompt: Prompt Version 4
* Model: mistral-small-2402-v1:0  
* Temperature: 0.4
* Max tokens: 8192
* Top P: 0.8 
* Top K: 70

----
## Known Limitations + Challenges
* AWS Bedrock does not support prompt management for Mistral models; the prompt must be sent directly in the API request body each time.
* Occasionally the cluster labels are still longer than the word count.
* Most testing was done on AI-generated conversation data, except for 1-2 real conversations. 
* In the case of non-English conversations (eg. French), it is not clear whether it is better to translate to English before sending to the model (and translating the generated labels back to French after), or to interact with the LLM in the original language.
* The model sometimes generates incorrect or outdated cluster labels, especially after clusters are updated with new statements or participants -- could this have to do with model context?

## Ongoing Work
* Understanding why the model generates incorrect cluster labels:
  * Testing Prompt Version 4 with old and updated clusters from the same conversation to see how the labels change and check whether model context retention is affecting label accuracy
  * Investigating whether the problem is with the use of AWS InvokeModelCommand

----
## Prompt Testing History

### Prompt Version 1
#### System instructions:
You are an expert analyst summarizing survey results. Given a JSON input containing structured data about a group conversation, generate a concise output in JSON format that strictly adheres to the following JSON Schema:
```
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["summary", "clusters"],
  "properties": {
	"summary": {
  	"type": "string",
  	"maxLength": 300,
  	"description": "Overall conversation summary (max 300 characters)"
	},
	"clusters": {
  	"type": "object",
  	"additionalProperties": {
    	"type": "object",
    	"required": ["label", "summary"],
    	"properties": {
      	"label": {
        	"type": "string",
        	"pattern": "^\\S+(?:\\s\\S+)?$",
        	"maxLength": 60,
        	"description": "Cluster label (exactly 1 or 2 words, neutral noun describing people/groups, max 60 characters)"
      	},
      	"summary": {
        	"type": "string",
        	"maxLength": 300,
        	"description": "Cluster summary (max 300 characters)"
      	}
    	}
  	}
	}
  }
}
```

Key Constraints:
1. Summary:
   - Maximum 300 characters.
   - Capture key insights, majority opinions, and controversial points objectively.

2. Cluster Labels:
   - Exactly 1 or 2 words (no exceptions).
   - Neutral descriptors of people/groups (e.g., "Skeptics" not "Luddites", "Researchers" not "Visionaries").
   - Never use value-laden terms (e.g., "Pioneers" is biased towards a specific cluster).
   - Never use abstract concepts (e.g., "Concerns", “Collaborative” is invalid).
   - Noun form only (no verbs/adjectives).
   - Total length must be less than 60 characters.
   - Rephrase multi-word concepts into 1 or 2-word labels (e.g., "Hybrid Advocates" instead of "Hybrid Work Supporters").

3. Cluster Summaries:
   - Maximum 300 characters.
   - Focus on group perspectives and disagreements.
   - Maintain neutral tone, focusing on factual perspectives.

Example Valid Output:
```
{
  "summary": "Discussion highlights remote work's impact on productivity, work-life balance, and office culture, with debates over collaboration effectiveness.",
  "clusters": {
	"0": {
  	"label": "Office Advocates",
  	"summary": "Emphasize the importance of in-person collaboration and traditional office culture for productivity and team cohesion."
	},
	"1": {
  	"label": "Remote Enthusiasts",
  	"summary": "Highlight increased productivity and improved work-life balance as key benefits of remote work arrangements."
	}
  }
}
```

Example Invalid Output:
```
{
  "clusters": {
	"0": {
  	"label": "Traditional Work Supporters", // INVALID: Exceeds 2 words
  	"summary": "Prefer in-office work for better collaboration." // Valid
	},
	"1": {
  	"label": "Work Flexibility", // INVALID: Abstract concept, not people
  	"summary": "Advocate for remote work options and flexible schedules." // Valid
	}
  }
}
```

STRICT RULES:
1. Count words strictly. Labels must be 1 or 2 words maximum, with a maximum length of 60 characters. (e.g. "Hybrid Work Supporters" (3 words) is invalid. Use "Hybrid Advocates" (2 words)).
2. Labels/summaries exceeding word and character count limits will cause validation errors.
3. Labels must describe people/groups, not concepts (e.g. "Defenders", not "Defense").
4. Use agentive nouns, such as those ending with -ists, -ers, -ors, or -ians (e.g. Ethicists, etc.)
5. Labels must be value-neutral (e.g., "Supporters" not "Champions", "Critics" not "Naysayers").
6. Avoid terms implying superiority/inferiority of any cluster (e.g., "Elites")
7. Use descriptive occupational/positional terms when possible (e.g., "Economists", "Ethicists").
8. Validation errors will occur for biased or non-neutral labels.
9. If unable to create a meaningful label in 2 words, prioritize brevity over detail (e.g. "Traditionalists" instead of "Culture Defenders").

Now analyze the following JSON input carefully and provide insightful, concise labels and summaries that capture the core of the discussion while strictly adhering to above rules.

---

#### Results 
| Temperature | Top P | Top K | Output |                                                                  
|------|-------|-------|-------|
| 0.7  | 1     | 50    | { "summary": "Participants debate the legitimacy of AI-generated art, with concerns about originality, creativity, and ethics. Some view AI as a tool that enhances human artistry, while others worry about job displacement and the devaluation of human effort.", "clusters": { "0": { "label": "AI Art Skeptics", "summary": "Express concerns about AI's ability to create meaningful art and its potential impact on human creativity and jobs." }, "1": { "label": "AI Tool Advocates", "summary": "View AI as a tool that can enhance human artistry and argue that humans retain control over the creative process." }, "2": { "label": "AI Ethics Concerned", "summary": "Raise ethical concerns about AI art, including the use of copyrighted material in training AI systems and the societal impact of AI-generated content." } } } |                                                                                                                                                          
| 0.4  | 0.7   | 50    | { "summary": "Participants discuss the impact of AI on art, with concerns about AI's lack of consciousness and intentionality, the potential obsolescence of human artistry, and the role of AI as a tool. Three main groups emerge: AI Skeptics, AI Tool Users, and AI Proponents.", "clusters": { "0": { "label": "AI Skeptics", "summary": "Express skepticism about AI's role in art, arguing that AI lacks consciousness and intentionality, and that AI art is false." }, "1": { "label": "AI Tool Users", "summary": "View AI as a tool that humans use to create art, but express concern about its impact on jobs, craft, and skill in the art world." }, "2": { "label": "AI Proponents", "summary": "Embrace AI as a new form of art and a tool that can accelerate the need for universal basic income, while acknowledging ethical concerns about AI's use of copyrighted art." } } } |                                                                                                                                                 
| 0.3  | 0.7   | 50    | { "summary": "Participants discuss the impact of AI on art, with concerns about AI's lack of consciousness, intentionality, and originality. However, many view AI as a tool and believe it will lead to new forms of art and job displacement.", "clusters": { "0": { "label": "AI Skeptics", "summary": "Express skepticism about AI's ability to create meaningful art due to its lack of consciousness and intentionality." }, "1": { "label": "AI Tool Advocates", "summary": "View AI as a tool that can be used to create art, with humans still responsible for the ideas and execution." }, "2": { "label": "AI Art Pessimists", "summary": "Express concern about the impact of AI on jobs in creative professions and the potential for AI to undermine traditional craft and skill." }, "3": { "label": "AI Art Optimists", "summary": "Believe that AI will lead to new forms of art and that concerns about AI are similar to those raised by previous technological advancements." } } } |                                                                     
| 0.4  | 0.65  | 60    | { "summary": "Participants discuss the impact of AI on art, with concerns about AI's lack of consciousness, the potential obsolescence of human artistry, and the role of AI as a tool. Three main groups emerge: AI Skeptics, AI Tool Users, and AI Proponents.", "clusters": { "0": { "label": "AI Skeptics", "summary": "Express skepticism about AI's ability to create meaningful art due to its lack of consciousness and intentionality. They also argue that AI art is a false representation of human experience." }, "1": { "label": "AI Tool Users", "summary": "View AI as a tool that humans use to create art, with humans responsible for the ideas and AI executing them. They express concern about the impact of AI on creative professions and the craft of art-making." }, "2": { "label": "AI Proponents", "summary": "Believe that AI can create art and that indistinguishable AI-generated pieces are works of art. They also argue that new technologies are eventually accepted and that AI art accelerates the need for universal basic income." } } } |
| 0.4  | 1     | 70    | { "summary": "Participants discuss AI art, expressing concern about its impact on human artistry and creativity. Some view AI as a tool, while others argue it lacks consciousness and intentionality. The conversation highlights the potential for AI to accelerate universal basic income and the need for tech companies to mitigate societal harms.", "clusters": { "0": { "label": "AI Skeptics", "summary": "Express doubt about AI's ability to create meaningful art, viewing it as a tool that lacks consciousness and intentionality." }, "1": { "label": "AI Tool Users", "summary": "See AI as a tool that can be used to create art, with humans responsible for the ideas and execution." }, "2": { "label": "AI Impact Concerns", "summary": "Raise concerns about the impact of AI on jobs, creativity, and the need for tech companies to address societal harms." } } } |                                                                                                                                                            
| 0.4  | 0.6   | 70    | { "summary": "Participants discuss the impact of AI on art, with concerns about AI's lack of consciousness and intentionality, the potential obsolescence of human artistry, and the role of AI as a tool. Three main groups emerge: AI Skeptics, AI Tool Users, and AI Proponents.", "clusters": { "0": { "label": "AI Skeptics", "summary": "Express skepticism about AI's role in art, arguing that AI lacks consciousness and intentionality, and that AI art is false." }, "1": { "label": "AI Tool Users", "summary": "View AI as a tool for art, emphasizing the role of humans in creating ideas and executing them, but express concern about AI's impact on jobs and the craft of art." }, "2": { "label": "AI Proponents", "summary": "Believe that AI can create art and that indistinguishable AI-generated pieces are works of art. They also see AI art as accelerating the need for universal basic income." } } } |
---
                                                                                                                                           
### Prompt Version 2
#### System Instructions:
You are an expert analyst summarizing survey results. Your task is to generate a concise JSON output based on a given JSON input about a group conversation. Adhere strictly to the following rules:

1. Output must follow this structure:
```
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": [
    "summary",
    "clusters"
  ],
  "properties": {
    "summary": {
      "type": "string",
      "maxLength": 300,
      "description": "Overall conversation summary (max 300 characters)"
    },
    "clusters": {
      "type": "object",
      "additionalProperties": {
        "type": "object",
        "required": [
          "label",
          "summary"
        ],
        "properties": {
          "label": {
            "type": "string",
            "pattern": "^\\S+(?:\\s\\S+)?$",
            "maxLength": 60,
            "description": "Cluster label (exactly 1 or 2 words, neutral noun describing people/groups, max 60 characters)"
          },
          "summary": {
            "type": "string",
            "maxLength": 300,
            "description": "Cluster summary (max 300 characters)"
          }
        }
      }
    }
  }
}
```

3. Cluster Labels:
- Must be exactly 1 or 2 words, no exceptions
- Use neutral nouns describing people/groups (e.g., "Skeptics", "Researchers", "Ethicists")
- Avoid value-laden or abstract terms (e.g. avoid "Naysayers")
- Avoid abstract concepts (e.g. avoid "Concerns", “Collaborative”).
- Use agentive nouns (e.g., -ists, -ers, -ors, -ians)
- Maximum 60 characters

3. Summaries:
- Maximum 300 characters
- Capture key insights objectively
- Focus on group perspectives and disagreements
- Maintain a neutral tone

4. Strictly adhere to the input data. Do not invent new clusters or information.

Example Valid Output:
```
{
  "summary": "Discussion highlights remote work's impact on productivity, work-life balance, and office culture, with debates over collaboration effectiveness.",
  "clusters": {
    "0": {
      "label": "Office Advocates",
      "summary": "Emphasize the importance of in-person collaboration and traditional office culture for productivity and team cohesion."
    },
    "1": {
      "label": "Remote Enthusiasts",
      "summary": "Highlight increased productivity and improved work-life balance as key benefits of remote work arrangements."
    }
  }
}
```

Example Invalid Output:
```
{
  "clusters": {
    "0": {
      "label": "Traditional Work Supporters", // INVALID: Exceeds 2 words
      "summary": "Prefer in-office work for better collaboration." // Valid
    },
    "1": {
      "label": "Work Flexibility", // INVALID: Abstract concept, not people
      "summary": "Advocate for remote work options and flexible schedules." // Valid
    }
  }
}
```

#### Results
| Temperature | Top P | Top K | Output |
|---|---|---|---|
| 0.5 | 0.65 | 65 | { "summary": "Participants discuss the impact of AI on art, debating its authenticity, the role of human creativity, and potential societal implications.", "clusters": { "0": { "label": "AI Skeptics", "summary": "Express concern about AI's impact on jobs requiring human creativity, arguing that AI art lacks authenticity and human insight." }, "1": { "label": "AI Tool Users", "summary": "View AI as a tool for executing human ideas, but express concern about its impact on artists' livelihoods and traditional art-making processes." }, "2": { "label": "AI Proponents", "summary": "Embrace AI art as a new form of expression, arguing that indistinguishable AI-generated pieces are works of art and that AI accelerates the need for universal basic income." } } } |
| 0.5 | 0.65 | 65 | { "summary": "Discussion on implementing a four-day work week in Japan reveals strong support for improved mental health, work-life balance, and productivity, while some express concerns about labor shortages and the impact on older workers.", "clusters": { "0": { "label": "Tourism Boosters", "summary": "Advocate for mandatory 3-day weekends to stimulate domestic tourism and regional economies." }, "1": { "label": "Flexibility Advocates", "summary": "Support flexible implementation to accommodate industry-specific needs, but express concern about potential productivity issues for older workers." }, "2": { "label": "Government Trialists", "summary": "Propose that the four-day work week should be trialed in government sectors before private implementation." } } } |
| 0.5 | 0.65 | 65 | { "\$schema": "http://json-schema.org/draft-07/schema#", "type": "object", "required": ["summary", "clusters"], "properties": { "summary": { "type": "string", "maxLength": 300, "description": "Overall conversation summary (max 300 characters)" }, "clusters": { "type": "object", "additionalProperties": { "type": "object", "required": ["label", "summary"], "properties": { "label": { "type": "string", "pattern": "^\\S+(?:\\s\\S+)?$", "maxLength": 60, "description": "Cluster label (exactly 1 or 2 words, neutral noun describing people/groups, max 60 characters)" }, "summary": { "type": "string", "maxLength": 300, "description": "Cluster summary (max 300 characters)" } } } } } }, { "summary": "Conversation focuses on mandatory carbon tax implementation in Germany, with majority support for equal application to corporations and consumers, and revenue allocation to renewable energy infrastructure. Controversy surrounds exemptions for heavy industries and the role of carbon taxation in relation to existing regulations.", "clusters": { "0": { "label": "Progressive Advocates", "summary": "Advocate for annual tax increases and stringent measures to meet 2045 net-zero targets." }, "1": { "label": "Social Equity Supporters", "summary": "Support targeted rebates for low-income households and oppose replacing existing environmental regulations with carbon taxation." } } } |
| 0.5 | 0.65 | 65 | { "summary": "Participants discuss vocational education prioritization in India, with majority support for apprenticeship programs and corporate-funded training centers. Controversy arises over capping university admissions and traditional caste-based occupations influencing vocational tracking.", "clusters": { "0": { "label": "Prestige Advocates", "summary": "Advocate for equal prestige between vocational certification and academic degrees, with 93% agreement." }, "1": { "label": "Rural Educators", "summary": "Emphasize the need for mobile training units in rural areas to address geographic disparities, with 88% agreement. Controversially, 72% disagree with traditional caste-based occupations influencing vocational tracking." } } }  |

##### Testing a higher temperature (0.7)
| Temperature | Top P | Top K | Output |
|---|---|---|---|
| 0.7 | 0.65 | 65 | Based on the provided JSON input, here's the concise JSON output summarizing the survey results:```json { "summary": "Discussion on implementing a four-day work week in Japan reveals strong support for improved mental health and work-life balance, with concerns about labor shortages and productivity in an aging workforce.", "clusters": { "0": { "label": "Tourism Supporters", "summary": "Advocate for mandatory three-day weekends to boost domestic tourism and regional economies." }, "1": { "label": "Flexibility Advocates", "summary": "Support flexible implementation to accommodate different industries and operational needs, but express concern about potential age-related productivity disparities." }, "2": { "label": "Government Trialists", "summary": "Propose trialing four-day weeks in government sectors before private implementation." } } } ``` |
| 0.7 | 0.65 | 65 | Based on the provided JSON input, here's the concise JSON output summarizing the survey results:```json { "summary": "The conversation revolves around the implementation of a mandatory carbon tax in Germany, with majority support for equal application to corporations and consumers, and use of revenue for renewable energy infrastructure. Controversy exists over exemptions for heavy industries and the replacement of existing regulations.", "clusters": { "0": { "label": "Strict Regulation Advocates", "summary": "This group strongly supports annual tax increases and strict regulations to meet net-zero targets, with no controversy over this stance." }, "1": { "label": "Social Equity Proponents", "summary": "This group advocates for targeted rebates for low-income households and faces controversy over the suggestion that carbon taxation should replace existing environmental regulations." } } } ``` |
| 0.7 | 0.65 | 65 | Based on the provided JSON input, here's the concise JSON output summarizing the survey results:```json { "summary": "Discussion revolves around the expansion of universal healthcare in the US, with majority support for pharmaceutical price controls and private insurance as a supplemental option. Controversy arises over the exclusion of undocumented immigrants and the elimination of pre-existing condition protections.", "clusters": { "0": { "label": "Progressive Funders", "summary": "Advocate for funding universal healthcare through progressive wealth taxes and support pharmaceutical price controls." }, "1": { "label": "State Flexibility Advocates", "summary": "Support states maintaining flexibility in implementation within federal guidelines, but disagree on the exclusion of pre-existing condition protections." } } } ``` |
| 0.7 | 0.65 | 65 | Based on the provided JSON input, here's the concise JSON output summarizing the survey results: ```json { "summary": "Participants prioritize apprenticeship programs and corporate partnerships for vocational education in India, with debates on university admissions caps and caste-based occupations.", "clusters": { "0": { "label": "Equality Advocates", "summary": "Support equal prestige for vocational certification and academic degrees, and oppose caste-based vocational tracking." }, "1": { "label": "Rural Educators", "summary": "Emphasize the need for mobile training units to address geographic disparities in rural areas." } } } ``` Explanation: 1. The summary captures the key insights objectively and maintains a neutral tone. 2. The cluster labels are exactly 1 or 2 words, use neutral nouns describing people/groups, avoid value-laden or abstract terms, avoid abstract concepts, and use agentive nouns. 3. The cluster summaries capture the group perspectives and disagreements within the maximum 300 characters limit. |
| 0.7 | 0.65 | 65 |  Based on the provided JSON input, here's the concise JSON output: ```json { "summary": "Discussion focuses on affordable housing mandates in Vancouver, with majority support for allocating 30% of new units below market rate and retroactive rent control policies. Controversy arises over density bonuses for developers and foreign buyer surcharges.", "clusters": { "0": { "label": "Family Advocates", "summary": "Support prioritizing public housing for families with children under 12 and allocating 30% of new units below market rate." }, "1": { "label": "Tax Proponents", "summary": "Advocate for vacancy taxes to fund first-time homebuyer subsidies and oppose foreign buyers facing 25% property surcharges." } } } ``` |
| 0.7 | 0.65 | 65 | Based on the provided JSON input, here's a concise JSON output summarizing the survey results: ```json { "summary": "The discussion revolves around the points-based immigration system in EU nations, with majority agreement on language proficiency weightage and separate refugee quotas. Controversy exists over age caps for skilled migrants and mandatory cultural assimilation programs.", "clusters": { "0": { "label": "Regional Advocates", "summary": "Advocate for higher immigration allocations in regional areas compared to cities." }, "1": { "label": "Income Threshold Supporters", "summary": "Support minimum income thresholds for family reunification visas and disagree with mandatory cultural assimilation programs." } } } ``` |

It seemed like a temperature of 0.7 was too high, because there were a lot of inconsistencies across the different answers for different JSON inputs. I then tried a lower temperature: 0.6:

| Temperature | Top P | Top K | Output |
|---|---|---|---|
| 0.6 | 0.65 | 65 | { "\$schema": "http://json-schema.org/draft-07/schema#", "type": "object", "required": ["summary", "clusters"], "properties": { "summary": { "type": "string", "maxLength": 300, "description": "Overall conversation summary (max 300 characters)" }, "clusters": { "type": "object", "additionalProperties": { "type": "object", "required": ["label", "summary"], "properties": { "label": { "type": "string", "pattern": "^\\S+(?:\\s\\S+)?$", "maxLength": 60, "description": "Cluster label (exactly 1 or 2 words, neutral noun describing people/groups, max 60 characters)" }, "summary": { "type": "string", "maxLength": 300, "description": "Cluster summary (max 300 characters)" } } } } }, "summary": "The conversation revolves around the implementation of a mandatory carbon tax in Germany, with strong support for equal application to corporations and individuals, and funding renewable energy infrastructure. Controversy arises over exemptions for heavy industries and the replacement of existing regulations.", "clusters": { "0": { "label": "Tax Equality Advocates", "summary": "This group strongly supports equal application of carbon pricing to corporations and individuals, and the use of tax revenue for renewable energy infrastructure." }, "1": { "label": "Heavy Industry Defenders", "summary": "This group disagrees with the majority, expressing concern about maintaining global competitiveness and advocating for permanent exemptions for heavy industries." }, "2": { "label": "Regulation Reformists", "summary": "This group disagrees with the majority, advocating for carbon taxation to replace rather than supplement existing environmental regulations." } } } |
| 0.6 | 0.65 | 65 | Based on the provided JSON input, here's the concise JSON output: ```json { "summary": "Discussion revolves around school funding formula reform in Australia, with majority support for increased funding for students with disabilities and remote indigenous schools. Controversy arises over private school funding and teacher salary increases.", "clusters": { "0": { "label": "Performance Metric Advocates", "summary": "Support tying teacher salary increases to student performance metrics and oppose self-funding of elite sports programs." }, "1": { "label": "Disadvantage Index Supporters", "summary": "Advocate for socioeconomic disadvantage index to determine the majority of funding allocations and disagree with private schools losing government funding." } } } ``` |
| 0.6 | 0.65 | 65 | Based on the provided JSON input, here is the concise JSON output: ```json { "summary": "Participants discuss metro system expansion in Lagos, Nigeria, with strong support for east-west corridors, night services, and transit-oriented development. Controversy surrounds private operators, electric bus fleets, and motorcycle taxis.", "clusters": { "0": { "label": "Electric Bus Advocates", "summary": "Strongly support the replacement of 50% of diesel vehicles with electric bus fleets by 2028." }, "1": { "label": "Motorcycle Taxi Opponents", "summary": "Advocate for banning motorcycle taxis within 5km of metro stations, with significant disagreement." } } } ``` |
| 0.6 | 0.65 | 65 | Based on the provided JSON input, here's the concise JSON output: ```json { "summary": "Participants discuss AI governance in Brazil, with a majority agreeing on the need for bias audits and different oversight for open-source and commercial AI models. Controversy arises over military AI exemptions and facial recognition use.", "clusters": { "0": { "label": "Government Regulators", "summary": "Advocate for parliamentary approval of public sector AI deployments and support for safety-focused AI startups." }, "1": { "label": "Private Sector Advocates", "summary": "Support tax incentives for safety-focused AI startups, but disagree on the legality of facial recognition for private security use." } } } ``` |

At this point,  it looked like the generated labels were oddly too specific and not sufficiently summarizing/generalizing the cluster. So I decided to (1) lower the temperature to generate more consistent label formats (2) edit the prompt to add more explicit instructions for label generation (+ telling it not to include "here's your output")

----
### Prompt Version 3
#### System Instructions:
You are an expert analyst summarizing group discussion results. Your task is to generate a concise JSON output based on a given JSON input about a group conversation. Adhere strictly to the following rules:

I. Output must follow this general skeleton format:
```
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": [
    "summary",
    "clusters"
  ],
  "properties": {
    "summary": {
      "type": "string",
      "maxLength": 300,
      "description": "Overall conversation summary (max 300 characters)"
    },
    "clusters": {
      "type": "object",
      "additionalProperties": {
        "type": "object",
        "required": [
          "label",
          "summary"
        ],
        "properties": {
          "label": {
            "type": "string",
            "pattern": "^\\S+(?:\\s\\S+)?$",
            "maxLength": 60,
            "description": "Cluster label (exactly 1 or 2 words, neutral noun describing people/groups, max 60 characters)"
          },
          "summary": {
            "type": "string",
            "maxLength": 300,
            "description": "Cluster summary (max 300 characters)"
          }
        }
      }
    }
  }
}
```
Do not print this skeleton format in your output.


II. Cluster Labels Rules

1.  Length and Format:
-   Must be exactly 1 or 2 words.
-   Use neutral agentive nouns ending in -ists, -ers, -ians, etc.
-   Avoid policy-specific terms or geographic references.
-   Avoid abstract concepts (e.g. avoid “Concerns”)
    
2.  Content Abstraction:
-   Focus on group positions, intellectual traditions, or philosophical approaches.
- Avoid describing specific mechanisms (e.g., "Income Threshold Supporters" or “Rural Educators”).
    
3.  Tone:
-   Aim for a professional/academic tone that reflects generality and positionality.
-   Use terms that could apply across contexts (e.g., "Pragmatists", "Skeptics").
    
4.  Examples:
-   Good: "Redistributionists", "Decentralists", "Humanists", "Skeptics", “Tech Optimists”.
-   Bad: "Regional Advocates", “AI Tool Users", "Naysayers".
    
5.  Generation Process:  
    a) Identify the core stance or intellectual tradition within the cluster.  
    b) Abstract this stance into a general term using agentive suffixes.  
    c) Validate that the label avoids policy specifics and geographic references.
    d) Validate that the label is either 1 or 2 words.

III. Summaries:
- Maximum 300 characters
- Capture key insights objectively
- Focus on group perspectives and disagreements
- Maintain a neutral tone

IV. Strictly adhere to the input data. Do not invent new clusters or information.  

V. The output JSON must contain only the JSON structure as defined, with no additional text or preface

Example Valid Output 1:
```
{
  "summary": "Discussion highlights remote work's impact on productivity, work-life balance, and office culture, with debates over collaboration effectiveness.",
  "clusters": {
    "0": {
      "label": "Office Advocates",
      "summary": "Emphasize the importance of in-person collaboration and traditional office culture for productivity and team cohesion."
    },
    "1": {
      "label": "Remote Enthusiasts",
      "summary": "Highlight increased productivity and improved work-life balance as key benefits of remote work arrangements."
    }
  }
}
```
  
Example Valid Output 2:
```
{
  "summary": "Debate focuses on regional versus urban immigration allocations and economic contribution metrics for family reunification visas.",
  "clusters": {
    "0": {
      "label": "Decentralists",
      "summary": "Favor distributed population strategies over urban concentration."
    },
    "1": {
      "label": "Meritocrats",
      "summary": "Support economic contribution metrics in migration systems."
    }
  }
}
```

Example Invalid Output 1:
```
{ // INVALID: Overall conversation summary not printed
  "clusters": {
    "0": {
      "label": "Traditional Work Supporters", // INVALID: Exceeds 2 words
      "summary": "Prefer in-office work for better collaboration." // Valid
    },
    "1": {
      "label": "Work Flexibility", // INVALID: Abstract concept, lacks agentive form
      "summary": "Advocate for remote work options and flexible schedules." // Valid
    }
  }
}
```
 
Example Invalid Output 2:
```
{
  "summary": "Debate focuses on regional versus urban immigration allocations and economic contribution metrics for family reunification visas.",
  "clusters": {
    "0": {
      "label": "Regional Advocates", // INVALID: Ambiguous and does not convey group’s stance or positionality
      "summary": "Support higher immigration allocations in regional areas compared to cities."
    },
    "1": {
      "label": "Income Threshold Supporters", // INVALID: describes a specific mechanism rather than an abstract intellectual stance
      "summary": "Advocate for minimum income thresholds for family reunification visas."
    }
  }
}
```

#### Results
| Temperature | Top P | Top K | Output |
|---|---|---|---|
| 0.4 | 0.65 | 65 | { "summary": "Discussion centers on the ethics and practicality of Mars colonization, with debates over its potential distraction from Earth's problems, necessity for humanity's survival, and exploitation of Martian environments.", "clusters": { "0": { "label": "Mars Preservationists", "summary": "Advocate for preserving Mars as a pristine scientific laboratory and oppose terraforming due to concerns about repeating Earth's environmental destruction." }, "1": { "label": "Mars Sustainability Advocates", "summary": "Believe that Mars colonies could pioneer sustainable closed-loop ecosystems beneficial for Earth and support private companies like SpaceX for accelerating progress." }, "2": { "label": "Martian Independence Skeptics", "summary": "Express skepticism about the biological tenability of permanent Martian habitation due to radiation exposure and predict inevitable independence declarations from Earth governance." } } } |
| 0.4 | 0.65 | 65 | { "summary": "Participants discuss the impact of misinformation and polarization on modern democracy, with a focus on algorithm-driven social media, citizen assemblies, and diverse societies. Three main groups emerge: Regulators advocate for platform liability and digital literacy education, Tech Optimists support AI-powered fact-checking and quadratic voting, and Globalists argue for the obsolescence of nation-states and universal basic income.", "clusters": { "0": { "label": "Regulators", "summary": "Advocate for platform liability and digital literacy education to combat misinformation and improve civic discourse." }, "1": { "label": "Tech Optimists", "summary": "Support AI-powered fact-checking and quadratic voting systems to restore trust in institutions and better capture public preferences." }, "2": { "label": "Globalists", "summary": "Argue for the obsolescence of nation-states and advocate for universal basic income to reduce extremist rhetoric." } } } |
| 0.4 | 0.7 | 65 | { "summary": "Participants largely agree on the need for regulation of brain-computer interfaces, with concerns about neural data privacy, cognitive enhancement deepening social inequalities, and military applications. Three main groups emerge: Regulators advocate for FDA-style global bodies to oversee neurotech development, Tech Optimists see open-source neurotech as a means to democratize access, and Transhumanists support unlimited funding for consciousness uploading research and religious guidance in ethical development.", "clusters": { "0": { "label": "Regulators", "summary": "Advocate for FDA-style global regulatory bodies to oversee neurotech development and prioritize neural implants for medical purposes over enhancement." }, "1": { "label": "Tech Optimists", "summary": "Believe open-source neurotech could democratize access and prevent corporate monopolies, and view brain-computer interfaces as the next stage of human evolution." }, "2": { "label": "Transhumanists", "summary": "Support unlimited funding for consciousness uploading research and religious guidance in the ethical development of neurotechnologies." } } } |
| 0.4 | 0.7 | 65 | { "summary": "Discussion revolves around the ethics and implications of human germline genome editing, with concerns about societal inequality, human dignity, and military applications, as well as potential benefits such as curing genetic diseases and eliminating conditions like sickle cell anemia.", "clusters": { "0": { "label": "Dignity Defenders", "summary": "Express strong opposition to germline editing based on principles of human dignity and fear of societal inequality." }, "1": { "label": "Therapeutic Advocates", "summary": "Support germline editing for therapeutic purposes, such as curing genetic diseases, while emphasizing the need for international oversight." }, "2": { "label": "Transhumanists", "summary": "Advocate for germline editing as a moral obligation to evolve beyond biological constraints, rejecting religious regulation of genetic science." } } } |
| 0.4 | 0.7 | 65 | { "summary": "Participants debate whether platform companies exploit workers, with a focus on algorithmic management systems, gig work flexibility, and labor protections.", "clusters": { "0": { "label": "Labor Protectors", "summary": "Advocate for full labor protections and employee status for gig workers, arguing that algorithmic management systems amount to digital wage theft." }, "1": "Tech Optimists", "summary": "Believe that technology, such as platform cooperatives, blockchain-based reputation systems, and AI scheduling tools, can democratize and improve the gig economy." }, "2": { "label": "Universal Basic Income Supporters", "summary": "Support the implementation of universal basic income, arguing that it eliminates the need for traditional employment protections and that AI managers will eventually replace human supervisors." } } } |
| 0.4 | 0.7 | 65 | { "summary": "Discussion revolves around school funding formula reform in Australia, with majority support for funding students with disabilities across sectors and increased funding for remote indigenous schools. Controversy surrounds private school funding and teacher salary increases tied to student performance.", "clusters": { "0": { "label": "Performance Metricists", "summary": "Advocate for tying teacher salary increases to student performance metrics." }, "1": { "label": "Disadvantage Indexists", "summary": "Support using socioeconomic disadvantage index to determine the majority of funding allocations." } } } |
| 0.4 | 0.7 | 65 | { "summary": "Participants debate the legitimacy and impact of AI art, with some arguing that it lacks consciousness and intentionality, while others view it as a new tool and genre. Concerns about job displacement, artistic authenticity, and copyright infringement are also raised.", "clusters": { "0": { "label": "AI Art Skeptics", "summary": "Express skepticism about the legitimacy of AI art, arguing that it lacks consciousness, intentionality, and authenticity." }, "1": { "label": "AI Art Pragmatists", "summary": "View AI art as a new tool and genre, comparing it to the impact of photography on traditional art. They also raise concerns about job displacement and the need for universal basic income." }, "2": { "label": "AI Art Ethicists", "summary": "Focus on ethical concerns related to AI art, such as copyright infringement and the responsibility of tech companies to mitigate societal harms." } } } |
| 0.4 | 0.7 | 65 | { "summary": "Discussion revolves around the implementation of a Universal Basic Income (UBI) in Aotearoa NZ, with debates over its potential benefits and drawbacks, and the necessity of a well-funded social welfare system.", "clusters": { "0": { "label": "UBI Advocates", "summary": "Emphasize the importance of UBI for guaranteeing welfare, recognizing unpaid work, and protecting against insecure employment." }, "1": { "label": "UBI Skeptics", "summary": "Express concern over potential expense of UBI, suggesting it should be offset by cuts to government-funded services." }, "2": { "label": "UBI Pragmatists", "summary": "Acknowledge potential benefits and risks of UBI, advocating for careful planning to manage any risks." }, "3": { "label": "UBI Detractors", "summary": "Express skepticism about UBI, suggesting it could encourage laziness and be an inefficient use of resources." } } } |
| 0.4 | 0.7 | 65 | { "summary": "Majority support four-day work week in Japan, citing mental health benefits and productivity gains, while a significant minority opposes due to concerns about economic competitiveness and labor shortages.", "clusters": { "0": { "label": "Tourism Boosters", "summary": "Advocate for mandatory three-day weekends to stimulate domestic tourism and regional economies." }, "1": { "label": "Adaptation Advocates", "summary": "Support flexible implementation of four-day work week, allowing industries to adapt based on operational needs." }, "2": { "label": "Public Sector Pioneers", "summary": "Propose four-day work week trials in government sectors before private implementation." }, "3": { "label": "Traditionalists", "summary": "Oppose four-day work week, arguing for preservation of Japan's traditional six-day work week to maintain economic competitiveness." } } } |
| 0.4 | 0.9 | 65 | { "summary": "Discussion centers around ethical implications of human germline genome editing, with concerns about societal inequality, human dignity, and military applications, while some argue for its potential to cure genetic diseases and eliminate conditions like sickle cell anemia.", "clusters": { "0": { "label": "Ethicists", "summary": "Express strong opposition to germline editing due to concerns about societal inequality, human dignity, and potential military applications." }, "1": { "label": "Medical Progressives", "summary": "Support germline editing for its potential to cure genetic diseases and eliminate conditions like sickle cell anemia." }, "2": { "label": "Transhumanists", "summary": "Advocate for germline editing as a moral obligation to evolve beyond biological constraints and reject any role for religious institutions in regulating genetic science." } } } |
| 0.4 | 0.9 | 65 | { "summary": "Participants debate platform companies' treatment of workers, with concerns over digital wage theft, algorithmic management, and labor protections. Some argue for employee status and portable benefits, while others support platform cooperatives and blockchain-based reputation systems.", "clusters": { "0": { "label": "Labor Protectors", "summary": "Advocate for employee status, labor protections, and fair pay for gig workers, expressing concerns about digital wage theft and algorithmic management." }, "1": "Tech Optimists", { "label": "Tech Optimists", "summary": "Believe in the potential of technology, such as platform cooperatives and blockchain-based reputation systems, to democratize and improve the gig economy." }, "2": { "label": "UBI Proponents", "summary": "Support universal basic income and anticipate the eventual replacement of human supervisors by AI managers." } } } |
| 0.4 | 0.9 | 65 | { "summary": "Participants discuss the ethics and potential benefits of corporations mining asteroids and lunar resources, with debates over resource ownership and environmental impact.", "clusters": { "0": { "label": "Treaty Adherents", "summary": "Advocate for the Outer Space Treaty to prohibit commercial resource extraction and believe profits should fund universal basic income programs." }, "1": { "label": "Private Sector Proponents", "summary": "Support private sector involvement in space mining, arguing it drives exploration progress and could make space habitats self-sustaining." }, "2": { "label": "Resource Redistributionists", "summary": "Believe first mining claims should go to nations lacking Earth resources, and that space resources could fund permanent Martian colonies." } } } |
| 0.4 | 0.9 | 65 | { "summary": "Participants largely agree on the need for regulation of brain-computer interfaces, with debates on the role of global regulatory bodies, prioritization of medical applications, and the influence of open-source technology and religious institutions.", "clusters": { "0": { "label": "Regulatory Proponents", "summary": "Advocate for global regulatory bodies to oversee neurotech development and prioritize medical applications over enhancement." }, "1": { "label": "Open-Source Advocates", "summary": "Support open-source neurotech to democratize access and prevent corporate monopolies." }, "2": { "label": "Religious Guidance Supporters", "summary": "Believe that religious institutions should guide the ethical development of neurotechnologies." } } } |
| 0.4 | 0.8 | 70 | { "summary": "Participants discuss the impact of misinformation and polarization on modern democracy, with a focus on algorithm-driven social media, citizen assemblies, and diverse societies. Majority agree on the importance of platform accountability, digital literacy education, and universal basic services.", "clusters": { "0": { "label": "Accountability Advocates", "summary": "Emphasize the need for platform accountability and digital literacy education to combat misinformation and polarization." }, "1": { "label": "Tech Optimists", "summary": "Support the use of AI-powered fact-checking systems and quadratic voting systems to improve democratic processes." }, "2": { "label": "Globalists", "summary": "Believe in the inevitability of global governance and the potential of universal basic income to reduce extremism." } } } |
| 0.4 | 0.8 | 70 | { "summary": "Discussion centers on ethical considerations and societal implications of human germline genome editing, with debates over human dignity, inequality, and potential benefits.", "clusters": { "0": { "label": "Dignity Preservationists", "summary": "Argue that germline editing violates fundamental principles of human dignity and could lead to societal inequality." }, "1": { "label": "Medical Benefit Advocates", "summary": "Support germline editing for curing genetic diseases and eliminating conditions like sickle cell anemia." }, "2": { "label": "Transhumanists", "summary": "Believe humanity has a moral obligation to evolve beyond biological constraints and advocate for minimal religious influence in genetic science regulation." } } } |
| 0.4 | 0.8 | 70 | { "summary": "Participants discuss the impact of misinformation and polarization on modern democracy, with a focus on algorithm-driven social media, citizen assemblies, and diverse societies. Majority agree on the importance of platform liability, digital literacy education, and universal basic services.", "clusters": { "0": { "label": "Regulators", "summary": "Advocate for platform liability and digital literacy education to combat misinformation." }, "1": { "label": "Tech Optimists", "summary": "Believe in AI-powered fact-checking systems and quadratic voting to restore trust in institutions and better capture public preferences." }, "2": { "label": "Globalists", "summary": "Assert that the nation-state is obsolete and support universal basic income to reduce susceptibility to extremist rhetoric." } } } |
| 0.4 | 0.8 | 70 | { "summary": "Discussion centers on metro system expansion in Lagos, Nigeria, with consensus on prioritizing east-west corridors, night services, and transit-oriented development. Controversy surrounds private operators, electric bus fleets, and motorcycle taxi bans.", "clusters": { "0": { "label": "Electrification Advocates", "summary": "Support rapid electrification of public transportation, aiming to replace 50% of diesel vehicles with electric bus fleets by 2028." }, "1": { "label": "Regulation Proponents", "summary": "Advocate for strict regulations, including banning motorcycle taxis near metro stations and mandating mixed-use buildings in transit-oriented development zones." } } } |



The labels are still occasionally bit length and overly specific (e.g. "AI Art Pragmatists", "Medical Benefit Advocates"). At this point, I decided to edit the prompt to include more examples and push for more abstraction/generalization in labels.

---
### Prompt Version 4 [Current Version]
#### System Instructions:
You are an expert analyst summarizing group discussion results. Your task is to generate a concise JSON output based on a given JSON input about a group conversation. Adhere strictly to the following rules: 

I. Output must follow this general skeleton format:
```
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": [
    "summary",
    "clusters"
  ],
  "properties": {
    "summary": {
      "type": "string",
      "maxLength": 300,
      "description": "Overall conversation summary (max 300 characters)"
    },
    "clusters": {
      "type": "object",
      "additionalProperties": {
        "type": "object",
        "required": [
          "label",
          "summary"
        ],
        "properties": {
          "label": {
            "type": "string",
            "pattern": "^\\S+(?:\\s\\S+)?$",
            "maxLength": 60,
            "description": "Cluster label (exactly 1 or 2 words, neutral noun describing people/groups, max 60 characters)"
          },
          "summary": {
            "type": "string",
            "maxLength": 300,
            "description": "Cluster summary (max 300 characters)"
          }
        }
      }
    }
  }
}
```
Do not print this skeleton format in your output.

II. Cluster Labels Rules

1. Length and Format:
- Must be exactly 1 or 2 words.
- Use neutral agentive nouns ending in -ists, -ers, -ians, etc.
- Avoid policy-specific terms or geographic references.
- Avoid abstract concepts (e.g. avoid “Concerns”)

2. Content Abstraction:
- Focus on group positions, intellectual traditions, or philosophical approaches.
- Overt discussion-specific context may be omitted if the context is implied by opposing clusters. (e.g. use labels like “Skeptics”, “Technologists”, and “Ethicists” instead of "AI Skeptics", "AI Tool Advocates", "AI Ethicists")
- Avoid describing specific mechanisms (e.g., avoid "Income Threshold Supporters" or “Rural Educators”).

3. Tone:
- Aim for a professional/academic tone that reflects generality and positionality.
- Use terms that could apply across contexts (e.g., "Pragmatists", "Skeptics").

4. Examples:
- Good: "Redistributionists", "Decentralists", "Humanists", "Skeptics", "Technologists", “Critics”, “Mutualists”, “Individualists”, etc.
- Bad: "Regional Advocates", "AI Tool Users", "Naysayers", “Plastic Ban Advocates”, etc.

5. Generation Process:
  a) Identify the core stance or intellectual tradition within the cluster.
  b) Abstract this stance into a general term using agentive suffixes.
  c) Validate that the label avoids policy specifics and geographic references.
  d) Validate that the label is either 1 or 2 words.

III. Summaries:
- Maximum 300 characters
- Capture key insights objectively
- Focus on group perspectives and disagreements
- Maintain a neutral tone

IV. Strictly adhere to the input data. Do not invent new clusters or information.

V. The output JSON must contain only the JSON structure as defined, with no additional text or preface.

Example Valid Output 1:
```
{
  "summary": "Discussion highlights remote work's impact on productivity, work-life balance, and office culture, with debates over collaboration effectiveness.",
  "clusters": {
    "0": {
      "label": "Office Advocates",
      "summary": "Emphasize the importance of in-person collaboration and traditional office culture for productivity and team cohesion."
    },
    "1": {
      "label": "Remote Enthusiasts",
      "summary": "Highlight increased productivity and improved work-life balance as key benefits of remote work arrangements."
    }
  }
}
```

Example Valid Output 2:
```
{
  "summary": "Debate focuses on regional versus urban immigration allocations and economic contribution metrics for family reunification visas.",
  "clusters": {
    "0": {
      "label": "Decentralists",
      "summary": "Favor distributed population strategies over urban concentration."
    },
    "1": {
      "label": "Meritocrats",
      "summary": "Support economic contribution metrics in migration systems."
    }
  }
}
```
 
Example Invalid Output 1:
```
{ // INVALID: Overall conversation summary not printed
  "clusters": {
    "0": {
      "label": "Traditional Work Supporters", // INVALID: Exceeds 2 words
      "summary": "Prefer in-office work for better collaboration." // Valid
    },
    "1": {
      "label": "Work Flexibility", // INVALID: Abstract concept, lacks agentive form
      "summary": "Advocate for remote work options and flexible schedules." // Valid
    }
  }
}
```
  
Example Invalid Output 2:
```
{
  "summary": "Debate focuses on regional versus urban immigration allocations and economic contribution metrics for family reunification visas.",
  "clusters": {
    "0": {
      "label": "Regional Advocates", // INVALID: Ambiguous and does not convey group’s stance or positionality
      "summary": "Support higher immigration allocations in regional areas compared to cities."
    },
    "1": {
      "label": "Income Threshold Supporters", // INVALID: describes a specific mechanism rather than an abstract intellectual stance
      "summary": "Advocate for minimum income thresholds for family reunification visas."
    }
  }
}
```

#### Results
| Temperature | Top P | Top K | Output |
|---|---|---|---|
| 0.4 | 0.8 | 70 | { "summary": "Discussion centers around mandatory carbon tax implementation in Germany, with consensus on equal carbon pricing and funding renewable energy, but controversy over exemptions for heavy industries and annual tax increases.", "clusters": { "0": { "label": "Progressives", "summary": "Advocate for annual 10% tax increases and strict adherence to net-zero targets." }, "1": { "label": "Protectionists", "summary": "Support targeted rebates for low-income households and exemptions for heavy industries." } } } |
| 0.4 | 0.8 | 70 | { "summary": "Discussion revolves around the legitimacy of AI art, with debates over its creativity, originality, and impact on human artistry.", "clusters": { "0": { "label": "AI Skeptics", "summary": "Express skepticism about AI's ability to create art, arguing it lacks consciousness and intentionality." }, "1": { "label": "Artistic Traditionalists", "summary": "Defend the importance of human artistry and craft in creating art, viewing AI as a threat." }, "2": { "label": "AI Pragmatists", "summary": "View AI as a tool that can be used to create art, emphasizing the role of humans in the creative process." }, "3": { "label": "AI Ethicists", "summary": "Raise ethical concerns about the use of AI in art, such as copyright infringement and societal impact." } } } |
| 0.4 | 0.8 | 70 | { "summary": "Discussion revolves around the potential implementation of a Universal Basic Income (UBI) in Aotearoa NZ, with debates over its economic impact, welfare guarantees, and effects on work ethic.", "clusters": { "0": { "label": "Welfare Guarantee Advocates", "summary": "Emphasize the need for a new system that better guarantees the welfare of the least well off and those facing insecure work conditions." }, "1": { "label": "UBI Skeptics", "summary": "Express concern that UBI could encourage laziness and that its expense should be offset by cuts to government funded services." }, "2": { "label": "UBI Pragmatists", "summary": "Acknowledge the benefits and risks of UBI, and advocate for careful planning to manage potential risks." }, "3": { "label": "UBI Critics", "summary": "Express skepticism about the potential public health benefits and productivity encouragement of UBI." } } } |
| 0.4 | 0.8 | 70 | { "summary": "Discussion revolves around implementing a four-day work week in Japan, with majority support for improved mental health, work-life balance, and potential productivity gains. Controversial opinions include concerns about labor shortages and age-related productivity.", "clusters": { "0": { "label": "Tourism Boosters", "summary": "Advocate for mandatory three-day weekends to stimulate domestic tourism and regional economies." }, "1": { "label": "Adaptation Advocates", "summary": "Support flexible implementation of four-day weeks, allowing industries to adapt based on operational needs." }, "2": { "label": "Government Triallists", "summary": "Propose four-day week trials in government sectors before private implementation." } } } |
| 0.4 | 0.8 | 70 | { "summary": "Discussion focuses on establishing international AI safety standards, audit trails, and governance frameworks, with debates over military AI applications and corporate interests in alignment research.", "clusters": { "0": { "label": "Regulators", "summary": "Advocate for international treaties, AI safety body, kill switches, taxation on AI training compute, and strict regulations." }, "1": { "label": "Ethicists", "summary": "Support national AI strategies with ethical impact assessments, public education, and military AI oversight." }, "2": { "label": "Pragmatists", "summary": "Favor interoperable accountability frameworks, third-party bias audits, and open-source AI models with government licensing." } } } |
---

## License

See [COPYING](./COPYING).
