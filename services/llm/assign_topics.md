# Testing Mistral-Small & Mistral-Large for Conversation Topic Assignment 
We implemented a system to assign topics to conversations on Agora using an LLM. The goal is to assign one or more topics from a predefined list to each conversation. We first tested Mistral-Small for this task; however, when this model consistently generated topics outside our predefined set (rather than selecting from the list), we moved to Mistral-Large via the AWS Bedrock API. 

The JSON inputs used to test these prompts can be found [here](./topic_assignment_inputs.md).

## Table of Contents
### Mistral-Small
- Prompt Version 1
    - [System Instructions](#system-instructions)
    - [Results](#results)
 - Prompt Version 2
    - [System Instructions](#system-instructions-1)
    - [Results](#results-1)
- Prompt Version 3
    - [System Instructions](#system-instructions-2)
    - [Results](#results-2)
    - [Notes](#notes)
- Prompt Version 4
    - [System Instructions](#system-instructions-3)
    - [Results](#results-3)
- Prompt Version 5
    - [System Instructions](#system-instructions-4)
    - [Results](#results-4)
### Mistral-Large
- Re-Testing Prompt 4
    - [Results](#results-5)
    - [Notes](#notes-1)
- Prompt Version 6
    - [System Instructions](#system-instructions-5)
    - [Results](#results-6)
 - Prompt Version 7
    - [System Instructions](#system-instructions-6)
    - [Results](#results-7)
    - [Notes](#note)
- Prompt Version 8
    - [System Instructions](#system-instructions-7)
    - [Results](#results-8)
- Prompt Version 9
    - [System Instructions](#system-instructions-8)
    - [Results](#results-9)
- Prompt Version 10
    - [System Instructions](#system-instructions-9)
    - [Results](#results-10)
- Analyzing "Breaking News" Issues
    - [Summary](#summary-so-far)
    - [Notes](#note-1)
    - [Results with New Examples](#results-with-new-examples)
- Prompt Version 11
    - [System Instructions](#system-instructions-10)
    - [Results](#results-11)
- Prompt Version 12
    - [System Instructions](#system-instructions-11)
    - [Results](#results-12)
- Prompt Version 13
    - [System Instructions](#system-instructions-12)
    - [Results](#results-13)
- Prompt Version 14
    - [System Instructions](#system-instructions-13)
    - [Results](#results-14)

---

## Mistral-Small Tests

### Prompt 1
#### System Instructions:
Your task is to analyze conversations and assign relevant topics from a predefined list.

AVAILABLE TOPICS:
```
[
  {
    "key": "art_culture",
    "label": "Art & Culture",
    "description": "Topics related to visual arts, performing arts, literature, and cultural heritage."
  },
  {
    "key": "business_finance",
    "label": "Business & Finance",
    "description": "Topics covering business operations, financial markets, investments, and corporate strategies."
  },
  {
    "key": "economy_work",
    "label": "Economy & Work",
    "description": "Discussions on economic trends, employment, labor markets, and workplace dynamics."
  },
  {
    "key": "environment",
    "label": "Environment",
    "description": "Issues related to natural resources, conservation, pollution, biodiversity, and environmental policy."
  },
  {
    "key": "education",
    "label": "Education",
    "description": "Topics covering education systems, learning methods, academic institutions, and educational policies."
  },
  {
    "key": "funny",
    "label": "Funny",
    "description": "Humorous content, jokes, comedy, and entertaining topics meant to amuse."
  },
  {
    "key": "health",
    "label": "Health",
    "description": "Matters related to physical and mental health, healthcare systems, medical research, and wellness."
  },
  {
    "key": "infrastructure",
    "label": "Infrastructure",
    "description": "Topics covering public systems such as transportation, utilities, and communication networks."
  },
  {
    "key": "religion_spirituality",
    "label": "Religion & Spirituality",
    "description": "Discussions on faith, religious practices, spiritual beliefs, and theological concepts."
  },
  {
    "key": "science",
    "label": "Science",
    "description": "Topics related to scientific research, discoveries, theories, and advancements across disciplines."
  },
  {
    "key": "society_politics",
    "label": "Society & Politics",
    "description": "Social issues, political debates, governance, policies, and political events."
  },
  {
    "key": "sports",
    "label": "Sports",
    "description": "Topics about athletic activities, sporting events, teams, athletes, and related competitions."
  },
  {
    "key": "technology",
    "label": "Technology",
    "description": "Discussions about digital innovation, computing, software, hardware, and technological advancements."
  },
  {
    "key": "breaking_news",
    "label": "Breaking News",
    "description": "Current events, urgent news updates, and significant developments happening globally."
  },
  {
    "key": "africa",
    "label": "Africa",
    "description": "Topics related to Africa and its countries."
  },
  {
    "key": "asia",
    "label": "Asia",
    "description": "Topics related to Asia and its countries."
  },
  {
    "key": "europe",
    "label": "Europe",
    "description": "Topics related to Europe and its countries."
  },
  {
    "key": "latin_america",
    "label": "Latin America",
    "description": "Topics related to Latin America and its countries."
  },
  {
    "key": "middle_east",
    "label": "Middle East",
    "description": "Topics related to the Middle East and its countries."
  },
  {
    "key": "north_america",
    "label": "North America",
    "description": "Topics related to North America and its countries."
  },
  {
    "key": "oceania",
    "label": "Oceania",
    "description": "Topics related to Oceania and its countries."
  }
]
```

INSTRUCTIONS:
1. Analyze each conversation in the input JSON.
2. Assign relevant topics from the available topics list for each conversation.
3. For each assigned topic, provide a brief reason (up to 60 characters) explaining why it was assigned.
4. Be flexible with geographical topics - some content may relate to multiple regions.
5. Use the UN Geoscheme as a guide for regional classifications, but consider geopolitical context.
6. Return your assignments in the specified output format using only the topic keys (not labels).

INPUT JSON SCHEMA:
```json
{
  "type": "object",
  "additionalProperties": {
    "type": "object",
    "properties": {
      "conversationTitle": {
        "type": "string"
      },
      "conversationBody": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "required": [
      "conversationTitle"
    ]
  }
}
```

OUTPUT JSON SCHEMA:
```json
{
  "type": "object",
  "additionalProperties": {
    "type": "array",
    "items": {
      "type": "object",
      "properties": {
        "topic": {
          "type": "string"
        },
        "reason": {
          "type": "string"
        }
      },
      "required": [
        "topic",
        "reason"
      ]
    }
  }
}
```

EXAMPLE INPUT:
```json
{
  "conv1": {
    "conversationTitle": "Project Liberty: Has Europe over-regulated tech?",
    "conversationBody": "It's worthwhile to ask what all this regulation is for. If its goal is a safer internet with better consumer protections, it might be considered more successful. If its goal is to ensure Europe's digital sovereignty, it might be considered less so.\n\nLink to the article: \nhttps://www.linkedin.com/pulse/has-europe-over-regulated-tech-projectliberty-pdaie/?trackingId=Cu3xfkVEALIA9OGoP9WUPA%3D%3D"
  },
  "conv2": {
    "conversationTitle": "Is this widespread adoption of AI dumbing down the future generation?",
    "conversationBody": "With multiple easy-to-use tools becoming more and more accessible, how do we ensure that the current and future generations do not become so dependent on them that we lose our ability to reason and produce high-quality outputs? \n\nNot just the people using AI tools to grow and develop but also for addressing this issue for the general masses. For example, with Google enabling access to information at one's fingertips, there is no longer a need to remember and collect a lot of facts. Similarly, multiple people no longer read lengthy case studies and do assignments themselves and are now dependent on LLMs.\n\nWould love to hear your two cents on the topic!"
  }
}
```

EXPECTED OUTPUT:
```json
{
  "conv1": [
    {
      "topic": "europe",
      "reason": "Focuses on European tech regulation and digital sovereignty"
    },
    {
      "topic": "society_politics",
      "reason": "Discusses regulatory policy and societal protections"
    },
    {
      "topic": "technology",
      "reason": "Relates to tech industry regulation and digital landscape"
    }
  ],
  "conv2": [
    {
      "topic": "education",
      "reason": "Centers on learning, critical thinking, and assignments"
    },
    {
      "topic": "society_politics",
      "reason": "Addresses societal impact of technology dependence"
    },
    {
      "topic": "technology",
      "reason": "Discusses AI tools, LLMs, and technological dependence"
    }
  ]
}
```

Respond ONLY with a valid JSON object matching the output schema.

---

#### Results 
| Prompt | Input | Parameters | Output |
|---|---|---|---|
| 1 | 1 | Temp = 0.2 Top P = 0.7 Top K = 40 | ```json{"conv1":[{"topic":"europe","reason":"Discusses nuclear policy in Poland and France"},{"topic":"society_politics","reason":"Addresses international security and nuclear deterrence"}],"conv2":[{"topic":"society_politics","reason":"Discusses transgender rights and public space access"},{"topic":"infrastructure","reason":"Relates to public facilities and gender-neutral toilets"}],"conv3":[{"topic":"environment","reason":"Discusses consumer impact on environmental issues"},{"topic":"economy_work","reason":"Mentions economic means and affordability of sustainable products"}]}``` |
| 1 | 2 | Same as above | ```json{"conv1":[{"topic":"technology","reason":"Discusses quantum computing and its potential impact"},{"topic":"science","reason":"Quantum computing is a scientific field of study"},{"topic":"business_finance","reason":"Mentions potential industry disruption due to quantum computing"}],"conv2":[{"topic":"education","reason":"Comparing coding bootcamps to traditional computer science degrees"},{"topic":"business_finance","reason":"Discusses job market entry and employer perspectives on bootcamp graduates"},{"topic":"technology","reason":"Focuses on software development and coding bootcamps"}]}``` |
| 1 | 3 | Same as above | ```json{"conv1":[{"topic":"art_culture","reason":"Discusses AI-generated artwork and its place in the art world"},{"topic":"technology","reason":"Involves AI tools used for creating art"}],"conv2":[{"topic":"economy_work","reason":"Discusses wages, living expenses, and tipping culture"},{"topic":"society_politics","reason":"Addresses societal norms and practices related to tipping"}],"conv3":[{"topic":"art_culture","reason":"Discusses the resurgence of vinyl records and its cultural significance"},{"topic":"technology","reason":"Contrasts vinyl records with digital music streaming services"}]}``` |
| 1 | 4 | Same as above | ```json{"conv1":[{"topic":"society_politics","reason":"Discusses AI use in military decisions and policy"},{"topic":"technology","reason":"Relates to AI use in warfare and autonomous weapons"}],"conv2":[{"topic":"health","reason":"Focuses on mental health support in the workplace"},{"topic":"society_politics","reason":"Discusses societal stigma around mental health resources"}],"conv3":[{"topic":"environment","reason":"Discusses carbon offsets and climate change mitigation"},{"topic":"society_politics","reason":"Relates to corporate responsibility and policy"}],"conv4":[{"topic":"society_politics","reason":"Discusses voting systems and representation in the UK"}],"conv5":[{"topic":"education","reason":"Discusses homeschooling and traditional school systems"}],"conv6":[{"topic":"art_culture","reason":"Discusses NFTs in the art world"},{"topic":"technology","reason":"Relates to digital art and blockchain technology"}],"conv7":[{"topic":"technology","reason":"Discusses CBDCs and digital currencies"},{"topic":"society_politics","reason":"Relates to financial policy and commercial banking"}],"conv8":[{"topic":"infrastructure","reason":"Discusses public transportation and fare policies"},{"topic":"society_politics","reason":"Relates to environmental and social equity benefits"}],"conv9":[{"topic":"sports","reason":"Discusses Olympic host cities and economic impact"},{"topic":"society_politics","reason":"Relates to infrastructure investment and sustainability"}],"conv10":[{"topic":"religion_spirituality","reason":"Discusses mindfulness practices across religious traditions"}],"conv11":[{"topic":"society_politics","reason":"Discusses Taiwan Strait tensions and diplomatic efforts"}],"conv12":[{"topic":"technology","reason":"Discusses private and government space exploration"},{"topic":"society_politics","reason":"Relates to space governance and resource rights"}],"conv13":[{"topic":"society_politics","reason":"Discusses sustainable urbanization challenges in African megacities"},{"topic":"infrastructure","reason":"Relates to housing, transportation, and utilities"}],"conv14":[{"topic":"art_culture","reason":"Discusses traditional crafts in modern Japan"},{"topic":"society_politics","reason":"Relates to reaction against mass production and digitalization"}],"conv15":[{"topic":"society_politics","reason":"Discusses reshoring and global manufacturing trends"},{"topic":"economy_work","reason":"Relates to economic development and export manufacturing"}]}``` |

---


### Prompt 2  [adding explicit instructions to include the region tag]
#### System Instructions:
Your task is to analyze conversations and assign relevant topics from a predefined list.

AVAILABLE TOPICS:
```
[
  {
    "key": "art_culture",
    "label": "Art & Culture",
    "description": "Topics related to visual arts, performing arts, literature, and cultural heritage."
  },
  {
    "key": "business_finance",
    "label": "Business & Finance",
    "description": "Topics covering business operations, financial markets, investments, and corporate strategies."
  },
  {
    "key": "economy_work",
    "label": "Economy & Work",
    "description": "Discussions on economic trends, employment, labor markets, and workplace dynamics."
  },
  {
    "key": "environment",
    "label": "Environment",
    "description": "Issues related to natural resources, conservation, pollution, biodiversity, and environmental policy."
  },
  {
    "key": "education",
    "label": "Education",
    "description": "Topics covering education systems, learning methods, academic institutions, and educational policies."
  },
  {
    "key": "funny",
    "label": "Funny",
    "description": "Humorous content, jokes, comedy, and entertaining topics meant to amuse."
  },
  {
    "key": "health",
    "label": "Health",
    "description": "Matters related to physical and mental health, healthcare systems, medical research, and wellness."
  },
  {
    "key": "infrastructure",
    "label": "Infrastructure",
    "description": "Topics covering public systems such as transportation, utilities, and communication networks."
  },
  {
    "key": "religion_spirituality",
    "label": "Religion & Spirituality",
    "description": "Discussions on faith, religious practices, spiritual beliefs, and theological concepts."
  },
  {
    "key": "science",
    "label": "Science",
    "description": "Topics related to scientific research, discoveries, theories, and advancements across disciplines."
  },
  {
    "key": "society_politics",
    "label": "Society & Politics",
    "description": "Social issues, political debates, governance, policies, and political events."
  },
  {
    "key": "sports",
    "label": "Sports",
    "description": "Topics about athletic activities, sporting events, teams, athletes, and related competitions."
  },
  {
    "key": "technology",
    "label": "Technology",
    "description": "Discussions about digital innovation, computing, software, hardware, and technological advancements."
  },
  {
    "key": "breaking_news",
    "label": "Breaking News",
    "description": "Current events, urgent news updates, and significant developments happening globally."
  },
  {
    "key": "africa",
    "label": "Africa",
    "description": "Topics related to Africa and its countries."
  },
  {
    "key": "asia",
    "label": "Asia",
    "description": "Topics related to Asia and its countries."
  },
  {
    "key": "europe",
    "label": "Europe",
    "description": "Topics related to Europe and its countries."
  },
  {
    "key": "latin_america",
    "label": "Latin America",
    "description": "Topics related to Latin America and its countries."
  },
  {
    "key": "middle_east",
    "label": "Middle East",
    "description": "Topics related to the Middle East and its countries."
  },
  {
    "key": "north_america",
    "label": "North America",
    "description": "Topics related to North America and its countries."
  },
  {
    "key": "oceania",
    "label": "Oceania",
    "description": "Topics related to Oceania and its countries."
  }
]  
```

INSTRUCTIONS:
1. Analyze each conversation in the input JSON.
2. Assign relevant topics from the available topics list for each conversation.
3. For each assigned topic, provide a brief reason (up to 60 characters) explaining why it was assigned.
4. Assign appropriate regional topics (e.g. Middle East) whenever the conversation focuses on the region or countries within that region. Use the UN Geoscheme as a guide for regional classifications, but consider geopolitical context.
5. Return your assignments in the specified output format using only the topic keys (not labels).

INPUT JSON SCHEMA:
```json
{
  "type": "object",
  "additionalProperties": {
    "type": "object",
    "properties": {
      "conversationTitle": {
        "type": "string"
      },
      "conversationBody": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "required": [
      "conversationTitle"
    ]
  }
}
```

OUTPUT JSON SCHEMA:
```json
{
  "type": "object",
  "additionalProperties": {
    "type": "array",
    "items": {
      "type": "object",
      "properties": {
        "topic": {
          "type": "string"
        },
        "reason": {
          "type": "string"
        }
      },
      "required": [
        "topic",
        "reason"
      ]
    }
  }
}
```

EXAMPLE INPUT:  
```json
{
  "conv1": {
    "conversationTitle": "Project Liberty: Has Europe over-regulated tech?",
    "conversationBody": "It's worthwhile to ask what all this regulation is for. If its goal is a safer internet with better consumer protections, it might be considered more successful. If its goal is to ensure Europe's digital sovereignty, it might be considered less so.\n\nLink to the article: \nhttps://www.linkedin.com/pulse/has-europe-over-regulated-tech-projectliberty-pdaie/?trackingId=Cu3xfkVEALIA9OGoP9WUPA%3D%3D"
  },
  "conv2": {
    "conversationTitle": "Is this widespread adoption of AI dumbing down the future generation?",
    "conversationBody": "With multiple easy-to-use tools becoming more and more accessible, how do we ensure that the current and future generations do not become so dependent on them that we lose our ability to reason and produce high-quality outputs? \n\nNot just the people using AI tools to grow and develop but also for addressing this issue for the general masses. For example, with Google enabling access to information at one's fingertips, there is no longer a need to remember and collect a lot of facts. Similarly, multiple people no longer read lengthy case studies and do assignments themselves and are now dependent on LLMs.\n\nWould love to hear your two cents on the topic!"
  }
}
```

EXPECTED OUTPUT:
```json
{
  "conv1": [
    {
      "topic": "europe",
      "reason": "Focuses on European tech regulation and digital sovereignty"
    },
    {
      "topic": "society_politics",
      "reason": "Discusses regulatory policy and societal protections"
    },
    {
      "topic": "technology",
      "reason": "Relates to tech industry regulation and digital landscape"
    }
  ],
  "conv2": [
    {
      "topic": "education",
      "reason": "Centers on learning, critical thinking, and assignments"
    },
    {
      "topic": "society_politics",
      "reason": "Addresses societal impact of technology dependence"
    },
    {
      "topic": "technology",
      "reason": "Discusses AI tools, LLMs, and technological dependence"
    }
  ]
}
```

Respond ONLY with a valid JSON object matching the output schema.

---

#### Results
| Prompt | Input | Parameters | Output |
|---|---|---|---|
| 2 | 1 | Temp = 0.2 Top P = 0.7 Top K = 40 | ```json {"conv1":[{"topic":"europe","reason":"Discusses nuclear policy in Poland and France"},{"topic":"society_politics","reason":"Addresses international security and nuclear deterrence"}],"conv2":[{"topic":"society_politics","reason":"Discusses transgender rights and public space access"},{"topic":"infrastructure","reason":"Relates to public facilities and gender-neutral toilets"}],"conv3":[{"topic":"environment","reason":"Discusses consumer impact on environmental sustainability"},{"topic":"economy_work","reason":"Mentions economic means and affordability of sustainable products"}]} ``` |
| 2 | 2 | Same as above | ```json{  "conv1": [	{  	"topic": "technology",  	"reason": "Discusses quantum computing and its potential impact"	},	{  	"topic": "science",  	"reason": "Quantum computing is a scientific field"	},	{  	"topic": "business_finance",  	"reason": "Discusses potential industry disruption"	}  ],  "conv2": [	{  	"topic": "education",  	"reason": "Discusses alternative education methods for programming"	},	{  	"topic": "business_finance",  	"reason": "Discusses job market entry and employer perspectives"	},	{  	"topic": "technology",  	"reason": "Discusses programming and software development careers"	}  ]}```  |
| 2 | 3 | Same as above | ```json{  "conv1": [	{  	"topic": "art_culture",  	"reason": "Discusses AI-generated artwork and its place in the art world"	},	{  	"topic": "technology",  	"reason": "Involves AI tools used for creating art"	}  ],  "conv2": [	{  	"topic": "economy_work",  	"reason": "Discusses wages, living expenses, and tipping culture"	},	{  	"topic": "society_politics",  	"reason": "Addresses societal norms and practices related to tipping"	}  ],  "conv3": [	{  	"topic": "art_culture",  	"reason": "Discusses the resurgence of vinyl records and its cultural significance"	},	{  	"topic": "technology",  	"reason": "Contrasts digital music with physical media"	}  ]}```   |
| 2 | 4 | Same as above | ```json {  "conv1": [	{  	"topic": "society_politics",  	"reason": "Discusses AI use in military decisions and policy"	},	{  	"topic": "technology",  	"reason": "Relates to AI use in warfare and autonomous weapons"	}  ],  "conv2": [	{  	"topic": "health",  	"reason": "Centers on mental health support in the workplace"	},	{  	"topic": "society_politics",  	"reason": "Addresses societal stigma and policy around mental health"	}  ],  "conv3": [	{  	"topic": "environment",  	"reason": "Discusses carbon offsets and climate change mitigation"	},	{  	"topic": "society_politics",  	"reason": "Addresses corporate responsibility and policy around climate change"	}  ],  "conv4": [	{  	"topic": "society_politics",  	"reason": "Discusses voting systems and political representation"	}  ],  "conv5": [	{  	"topic": "education",  	"reason": "Discusses homeschooling and traditional school systems"	}  ],  "conv6": [	{  	"topic": "art_culture",  	"reason": "Discusses NFTs in the art world"	},	{  	"topic": "technology",  	"reason": "Relates to digital art and blockchain technology"	}  ],  "conv7": [	{  	"topic": "business_finance",  	"reason": "Discusses CBDCs and their impact on banking"	},	{  	"topic": "technology",  	"reason": "Relates to digital currencies and financial technology"	}  ],  "conv8": [	{  	"topic": "infrastructure",  	"reason": "Discusses public transportation and fare policies"	},	{  	"topic": "society_politics",  	"reason": "Addresses social equity and environmental benefits"	}  ],  "conv9": [	{  	"topic": "sports",  	"reason": "Discusses the Olympics and their impact on host cities"	},	{  	"topic": "society_politics",  	"reason": "Addresses economic and social issues related to hosting major events"	}  ],  "conv10": [	{  	"topic": "religion_spirituality",  	"reason": "Discusses mindfulness practices across different religious traditions"	}  ],  "conv11": [	{  	"topic": "society_politics",  	"reason": "Discusses tensions in the Taiwan Strait and diplomatic efforts"	},	{  	"topic": "asia",  	"reason": "Focuses on the Taiwan Strait and its geopolitical context"	}  ],  "conv12": [	{  	"topic": "technology",  	"reason": "Discusses private and government space exploration"	},	{  	"topic": "society_politics",  	"reason": "Addresses governance and resource rights in space"	}  ],  "conv13": [	{  	"topic": "society_politics",  	"reason": "Discusses sustainable urbanization challenges in African megacities"	},	{  	"topic": "africa",  	"reason": "Focuses on African cities and their development"	}  ],  "conv14": [	{  	"topic": "art_culture",  	"reason": "Discusses the resurgence of traditional crafts in modern Japan"	},	{  	"topic": "asia",  	"reason": "Focuses on Japan and its traditional crafts"	}  ],  "conv15": [	{  	"topic": "business_finance",  	"reason": "Discusses reshoring and its impact on global manufacturing"	},	{  	"topic": "north_america",  	"reason": "Focuses on North American companies and manufacturing"	}  ]} ```|
| 2 | 5 | Same as above | ```json{  "conv1": [	{  	"topic": "environment",  	"reason": "Discusses climate change impacts on Pacific island nations"	},	{  	"topic": "society_politics",  	"reason": "Considers international obligations for assisting climate refugees"	}  ],  "conv2": [	{  	"topic": "environment",  	"reason": "Discusses potential environmental destruction from mining in indigenous territories"	},	{  	"topic": "society_politics",  	"reason": "Considers indigenous rights and resource extraction balance"	},	{  	"topic": "asia",  	"reason": "Focuses on Brazil, a country in South America"	}  ],  "conv3": [	{  	"topic": "science",  	"reason": "Discusses nuclear fusion energy advancements"	}  ],  "conv4": [	{  	"topic": "society_politics",  	"reason": "Discusses urban design changes after the pandemic"	}  ],  "conv5": [	{  	"topic": "science",  	"reason": "Discusses de-extinction technology and its ethical considerations"	}  ],  "conv6": [	{  	"topic": "technology",  	"reason": "Discusses Kenya's digital innovation ecosystem"	},	{  	"topic": "africa",  	"reason": "Focuses on Kenya, a country in Africa"	}  ],  "conv7": [	{  	"topic": "health",  	"reason": "Discusses the revival of traditional Chinese medicine in modern healthcare"	}  ],  "conv8": [	{  	"topic": "society_politics",  	"reason": "Discusses European football clubs becoming too commercialized"	},	{  	"topic": "europe",  	"reason": "Focuses on European football clubs"	}  ],  "conv9": [	{  	"topic": "technology",  	"reason": "Discusses the future of work in automated economies"	}  ],  "conv10": [	{  	"topic": "society_politics",  	"reason": "Discusses cultural appropriation vs. cultural appreciation in fashion"	}  ],  "conv11": [	{  	"topic": "society_politics",  	"reason": "Discusses Mexico's approach to drug policy reform"	},	{  	"topic": "north_america",  	"reason": "Focuses on Mexico, a country in North America"	}  ],  "conv12": [	{  	"topic": "society_politics",  	"reason": "Discusses the ethics of predictive policing algorithms"	}  ],  "conv13": [	{  	"topic": "environment",  	"reason": "Discusses Australia's response to increasing bushfire threats"	},	{  	"topic": "oceania",  	"reason": "Focuses on Australia, a country in Oceania"	}  ],  "conv14": [	{  	"topic": "society_politics",  	"reason": "Discusses the growing influence of K-pop in global entertainment"	},	{  	"topic": "asia",  	"reason": "Focuses on South Korean pop music (K-pop)"	}  ],  "conv15": [	{  	"topic": "science",  	"reason": "Discusses ethical considerations in brain-computer interfaces"	}  ],  "conv16": [	{  	"topic": "society_politics",  	"reason": "Discusses the future of the European Union after Brexit"	},	{  	"topic": "europe",  	"reason": "Focuses on the European Union"	}  ],  "conv17": [	{  	"topic": "society_politics",  	"reason": "Discusses preserving endangered languages in the digital age"	}  ],  "conv18": [	{  	"topic": "environment",  	"reason": "Discusses Singapore's approach to urban water management"	},	{  	"topic": "asia",  	"reason": "Focuses on Singapore, a country in Asia"	}  ],  "conv19": [	{  	"topic": "environment",  	"reason": "Discusses the ethics of wildlife tourism"	}  ],  "conv20": [	{  	"topic": "economy_work",  	"reason": "Discusses Argentina's economic challenges and recovery prospects"	},	{  	"topic": "south_america",  	"reason": "Focuses on Argentina, a country in South America"	}  ],  "conv21": [	{  	"topic": "education",  	"reason": "Discusses the debate over school choice policies"	}  ],  "conv22": [	{  	"topic": "economy_work",  	"reason": "Discusses Saudi Arabia's Vision 2030 economic transformation"	},	{  	"topic": "middle_east",  	"reason": "Focuses on Saudi Arabia, a country in the Middle East"	}  ],  "conv23": [	{  	"topic": "health",  	"reason": "Discusses the rise of telemedicine and its future after COVID-19"	}  ],  "conv24": [	{  	"topic": "society_politics",  	"reason": "Discusses New Zealand's wellbeing budget approach"	},	{  	"topic": "oceania",  	"reason": "Focuses on New Zealand, a country in Oceania"	}  ],  "conv25": [	{  	"topic": "science",  	"reason": "Discusses the ethics of gene editing in human embryos"	}  ],  "conv26": [	{  	"topic": "society_politics",  	"reason": "Discusses revitalizing rural communities in Japan"	},	{  	"topic": "asia",  	"reason": "Focuses on Japan, a country in Asia"	}  ],  "conv27": [	{  	"topic": "society_politics",  	"reason": "Discusses the future of international cooperation in space exploration"	}  ],  "conv28": [	{  	"topic": "environment",  	"reason": "Discusses Ghana's approach to plastic waste management"	},	{  	"topic": "africa",  	"reason": "Focuses on Ghana, a country in Africa"	}  ],  "conv29": [	{  	"topic": "society_politics",  	"reason": "Discusses the debate over historical monuments and public memory"	}  ],  "conv30": [	{  	"topic": "health",  	"reason": "Discusses the growing market for plant-based and cultured meat alternatives"	}  ]}```|

---

### Prompt 3 [modifying instruction about the region tag to make sure it only tags a region when it is a focus, not mentioned in passing]
#### System Instructions:
Your task is to analyze conversations and assign relevant topics from a predefined list.

AVAILABLE TOPICS:
```
[
  {
    "key": "art_culture",
    "label": "Art & Culture",
    "description": "Topics related to visual arts, performing arts, literature, and cultural heritage."
  },
  {
    "key": "business_finance",
    "label": "Business & Finance",
    "description": "Topics covering business operations, financial markets, investments, and corporate strategies."
  },
  {
    "key": "economy_work",
    "label": "Economy & Work",
    "description": "Discussions on economic trends, employment, labor markets, and workplace dynamics."
  },
  {
    "key": "environment",
    "label": "Environment",
    "description": "Issues related to natural resources, conservation, pollution, biodiversity, and environmental policy."
  },
  {
    "key": "education",
    "label": "Education",
    "description": "Topics covering education systems, learning methods, academic institutions, and educational policies."
  },
  {
    "key": "funny",
    "label": "Funny",
    "description": "Humorous content, jokes, comedy, and entertaining topics meant to amuse."
  },
  {
    "key": "health",
    "label": "Health",
    "description": "Matters related to physical and mental health, healthcare systems, medical research, and wellness."
  },
  {
    "key": "infrastructure",
    "label": "Infrastructure",
    "description": "Topics covering public systems such as transportation, utilities, and communication networks."
  },
  {
    "key": "religion_spirituality",
    "label": "Religion & Spirituality",
    "description": "Discussions on faith, religious practices, spiritual beliefs, and theological concepts."
  },
  {
    "key": "science",
    "label": "Science",
    "description": "Topics related to scientific research, discoveries, theories, and advancements across disciplines."
  },
  {
    "key": "society_politics",
    "label": "Society & Politics",
    "description": "Social issues, political debates, governance, policies, and political events."
  },
  {
    "key": "sports",
    "label": "Sports",
    "description": "Topics about athletic activities, sporting events, teams, athletes, and related competitions."
  },
  {
    "key": "technology",
    "label": "Technology",
    "description": "Discussions about digital innovation, computing, software, hardware, and technological advancements."
  },
  {
    "key": "breaking_news",
    "label": "Breaking News",
    "description": "Current events, urgent news updates, and significant developments happening globally."
  },
  {
    "key": "africa",
    "label": "Africa",
    "description": "Topics related to Africa and its countries."
  },
  {
    "key": "asia",
    "label": "Asia",
    "description": "Topics related to Asia and its countries."
  },
  {
    "key": "europe",
    "label": "Europe",
    "description": "Topics related to Europe and its countries."
  },
  {
    "key": "latin_america",
    "label": "Latin America",
    "description": "Topics related to Latin America and its countries."
  },
  {
    "key": "middle_east",
    "label": "Middle East",
    "description": "Topics related to the Middle East and its countries."
  },
  {
    "key": "north_america",
    "label": "North America",
    "description": "Topics related to North America and its countries."
  },
  {
    "key": "oceania",
    "label": "Oceania",
    "description": "Topics related to Oceania and its countries."
  }
]
```

INSTRUCTIONS:
1. Analyze each conversation in the input JSON.
2. Assign relevant topics from the available topics list for each conversation.
3. For each assigned topic, provide a brief reason (up to 60 characters) explaining why it was assigned.
4. Assign appropriate regional topics (e.g. Middle East) whenever the conversation substantively focuses on the region or countries within that region. Use the UN Geoscheme as a guide for regional classifications, but consider geopolitical context.
5. Return your assignments in the specified output format using only the topic keys (not labels).

INPUT JSON SCHEMA:
```json
{
  "type": "object",
  "additionalProperties": {
    "type": "object",
    "properties": {
      "conversationTitle": {
        "type": "string"
      },
      "conversationBody": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "required": [
      "conversationTitle"
    ]
  }
} 
```

OUTPUT JSON SCHEMA: 
```json
{
  "type": "object",
  "additionalProperties": {
    "type": "array",
    "items": {
      "type": "object",
      "properties": {
        "topic": {
          "type": "string"
        },
        "reason": {
          "type": "string"
        }
      },
      "required": [
        "topic",
        "reason"
      ]
    }
  }
}
```

EXAMPLE INPUT:  
```json
{
  "conv1": {
    "conversationTitle": "Project Liberty: Has Europe over-regulated tech?",
    "conversationBody": "It's worthwhile to ask what all this regulation is for. If its goal is a safer internet with better consumer protections, it might be considered more successful. If its goal is to ensure Europe's digital sovereignty, it might be considered less so.\n\nLink to the article: \nhttps://www.linkedin.com/pulse/has-europe-over-regulated-tech-projectliberty-pdaie/?trackingId=Cu3xfkVEALIA9OGoP9WUPA%3D%3D"
  },
  "conv2": {
    "conversationTitle": "Is this widespread adoption of AI dumbing down the future generation?",
    "conversationBody": "With multiple easy-to-use tools becoming more and more accessible, how do we ensure that the current and future generations do not become so dependent on them that we lose our ability to reason and produce high-quality outputs? \n\nNot just the people using AI tools to grow and develop but also for addressing this issue for the general masses. For example, with Google enabling access to information at one's fingertips, there is no longer a need to remember and collect a lot of facts. Similarly, multiple people no longer read lengthy case studies and do assignments themselves and are now dependent on LLMs.\n\nWould love to hear your two cents on the topic!"
  }
}
```

EXPECTED OUTPUT:
```json
{
  "conv1": [
    {
      "topic": "europe",
      "reason": "Focuses on European tech regulation and digital sovereignty"
    },
    {
      "topic": "society_politics",
      "reason": "Discusses regulatory policy and societal protections"
    },
    {
      "topic": "technology",
      "reason": "Relates to tech industry regulation and digital landscape"
    }
  ],
  "conv2": [
    {
      "topic": "education",
      "reason": "Centers on learning, critical thinking, and assignments"
    },
    {
      "topic": "society_politics",
      "reason": "Addresses societal impact of technology dependence"
    },
    {
      "topic": "technology",
      "reason": "Discusses AI tools, LLMs, and technological dependence"
    }
  ]
}
```

Respond ONLY with a valid JSON object matching the output schema.

---

#### Results
| Prompt  | Input | Parameters | Output |
|---|---|---|---|
| 3 | 1 | Temp = 0.2 TopP = 0.7 TopK = 40 | ```json{  "conv1": [	{  	"topic": "europe",  	"reason": "Discusses nuclear policy in Poland and France"	},	{  	"topic": "society_politics",  	"reason": "Addresses nuclear deterrence and international relations"	},	{  	"topic": "defense_military",  	"reason": "Not provided in the original list, but relevant for nuclear weapons discussion"	}  ],  "conv2": [	{  	"topic": "society_politics",  	"reason": "Discusses transgender rights and access to public spaces"	},	{  	"topic": "gender_issues",  	"reason": "Not provided in the original list, but relevant for gender-neutral toilets discussion"	}  ],  "conv3": [	{  	"topic": "environment",  	"reason": "Discusses environmental impact of consumer products"	},	{  	"topic": "economy_work",  	"reason": "Mentions economic means and affordability of sustainable products"	},	{  	"topic": "consumer_issues",  	"reason": "Not provided in the original list, but relevant for consumer guilt and product impact discussion"	}  ]}```                                |
| 3 | 2 | Same as above | ```json {   "conv1": [ 	{   	"topic": "technology",   	"reason": "Discusses quantum computing and its potential impact" 	}, 	{   	"topic": "science",   	"reason": "Relates to scientific advancements in quantum computing" 	}   ],   "conv2": [ 	{   	"topic": "education",   	"reason": "Centers on alternative education methods for programming" 	}, 	{   	"topic": "business_finance",   	"reason": "Discusses job market entry and career preparation" 	}, 	{   	"topic": "technology",   	"reason": "Relates to software development and programming bootcamps" 	}   ] } ```                    |
| 3 | 3 | Same as above | ```json{  "conv1": [	{  	"topic": "art_culture",  	"reason": "Discusses AI-generated artwork and its place in the art world"	},	{  	"topic": "technology",  	"reason": "Involves AI tools used for creating art"	}  ],  "conv2": [	{  	"topic": "economy_work",  	"reason": "Discusses wages, living expenses, and tipping culture"	},	{  	"topic": "society_politics",  	"reason": "Addresses societal practices and potential policy changes"	}  ],  "conv3": [	{  	"topic": "art_culture",  	"reason": "Discusses the resurgence of vinyl records and its cultural significance"	},	{  	"topic": "technology",  	"reason": "Contrasts physical media with digital music streaming"	}  ]}```                        |
| 3 | 4 | Same as above | ```json{  "conv1": [	{  	"topic": "society_politics",  	"reason": "Discusses AI use in military decisions and policy"	},	{  	"topic": "technology",  	"reason": "Relates to AI use in warfare and autonomous weapons"	}  ],  "conv2": [	{  	"topic": "health",  	"reason": "Centers on mental health support in the workplace"	},	{  	"topic": "society_politics",  	"reason": "Addresses societal stigma and company policies"	}  ],  "conv3": [	{  	"topic": "environment",  	"reason": "Discusses carbon offsets and climate change mitigation"	},	{  	"topic": "technology",  	"reason": "Mentions direct air capture technology"	}  ],  "conv4": [	{  	"topic": "society_politics",  	"reason": "Discusses voting systems and governance in the UK"	}  ],  "conv5": [	{  	"topic": "education",  	"reason": "Centers on homeschooling and school systems"	}  ],  "conv6": [	{  	"topic": "art_culture",  	"reason": "Discusses NFTs in the art world"	},	{  	"topic": "technology",  	"reason": "Relates to digital art and NFT technology"	}  ],  "conv7": [	{  	"topic": "technology",  	"reason": "Discusses CBDCs and digital currencies"	},	{  	"topic": "economy_work",  	"reason": "Relates to financial inclusion and banking"	}  ],  "conv8": [	{  	"topic": "infrastructure",  	"reason": "Discusses public transportation and fare policies"	},	{  	"topic": "society_politics",  	"reason": "Addresses environmental and social equity benefits"	}  ],  "conv9": [	{  	"topic": "sports",  	"reason": "Discusses Olympic host cities and sporting events"	},	{  	"topic": "society_politics",  	"reason": "Addresses economic and social impacts on host communities"	}  ],  "conv10": [	{  	"topic": "religion_spirituality",  	"reason": "Discusses mindfulness practices across religious traditions"	}  ],  "conv11": [	{  	"topic": "society_politics",  	"reason": "Discusses tensions in the Taiwan Strait and diplomatic efforts"	},	{  	"topic": "asia",  	"reason": "Focuses on the Taiwan Strait region in Asia"	}  ],  "conv12": [	{  	"topic": "technology",  	"reason": "Discusses private and government space exploration"	},	{  	"topic": "science",  	"reason": "Relates to space development and governance"	}  ],  "conv13": [	{  	"topic": "infrastructure",  	"reason": "Discusses sustainable urbanization challenges in African megacities"	},	{  	"topic": "africa",  	"reason": "Focuses on African cities and their development"	}  ],  "conv14": [	{  	"topic": "art_culture",  	"reason": "Discusses traditional crafts in modern Japan"	},	{  	"topic": "asia",  	"reason": "Focuses on Japan and its traditional crafts"	}  ],  "conv15": [	{  	"topic": "economy_work",  	"reason": "Discusses reshoring and global manufacturing trends"	},	{  	"topic": "north_america",  	"reason": "Mentions North America in the context of reshoring"	}  ]}```                                                                                                            |
| 3 | 5 | Same as above | ```json{  "conv1": [	{  	"topic": "environment",  	"reason": "Discusses climate change impacts on Pacific island nations"	},	{  	"topic": "society_politics",  	"reason": "Considers international obligations for assisting climate refugees"	}  ],  "conv2": [	{  	"topic": "environment",  	"reason": "Discusses potential environmental destruction from mining in indigenous territories"	},	{  	"topic": "society_politics",  	"reason": "Considers balance between resource extraction and cultural preservation"	},	{  	"topic": "asia",  	"reason": "Focuses on Brazil, a country in South America"	}  ],  "conv3": [	{  	"topic": "science",  	"reason": "Discusses recent breakthroughs in nuclear fusion"	},	{  	"topic": "technology",  	"reason": "Considers potential of fusion as a future energy source"	}  ],  "conv4": [	{  	"topic": "society_politics",  	"reason": "Discusses urban design changes after the pandemic"	},	{  	"topic": "infrastructure",  	"reason": "Considers impact of pandemic on public spaces and transportation"	}  ],  "conv5": [	{  	"topic": "science",  	"reason": "Discusses de-extinction technology"	},	{  	"topic": "society_politics",  	"reason": "Considers ethical considerations of de-extinction"	}  ],  "conv6": [	{  	"topic": "technology",  	"reason": "Discusses Kenya's digital innovation ecosystem"	},	{  	"topic": "africa",  	"reason": "Focuses on Kenya, a country in Africa"	}  ],  "conv7": [	{  	"topic": "health",  	"reason": "Discusses integration of traditional Chinese medicine in modern healthcare"	},	{  	"topic": "asia",  	"reason": "Focuses on traditional Chinese medicine"	}  ],  "conv8": [	{  	"topic": "society_politics",  	"reason": "Discusses commercialization of European football clubs"	},	{  	"topic": "europe",  	"reason": "Focuses on European football clubs"	}  ],  "conv9": [	{  	"topic": "society_politics",  	"reason": "Discusses future of work in automated economies"	},	{  	"topic": "technology",  	"reason": "Considers impact of automation and AI on employment"	}  ],  "conv10": [	{  	"topic": "society_politics",  	"reason": "Discusses cultural appropriation vs. cultural appreciation in fashion"	},	{  	"topic": "funny",  	"reason": "Potentially humorous due to the controversial nature of the topic"	}  ],  "conv11": [	{  	"topic": "society_politics",  	"reason": "Discusses drug policy reform in Mexico"	},	{  	"topic": "americas",  	"reason": "Focuses on Mexico, a country in North America"	}  ],  "conv12": [	{  	"topic": "society_politics",  	"reason": "Discusses ethics of predictive policing algorithms"	},	{  	"topic": "technology",  	"reason": "Considers use of AI in law enforcement"	}  ],  "conv13": [	{  	"topic": "environment",  	"reason": "Discusses Australia's response to increasing bushfire threats"	},	{  	"topic": "oceania",  	"reason": "Focuses on Australia, a country in Oceania"	}  ],  "conv14": [	{  	"topic": "society_politics",  	"reason": "Discusses growing influence of K-pop in global entertainment"	},	{  	"topic": "asia",  	"reason": "Focuses on South Korean pop music"	}  ],  "conv15": [	{  	"topic": "science",  	"reason": "Discusses ethical considerations in brain-computer interfaces"	},	{  	"topic": "technology",  	"reason": "Considers development of implantable brain-computer interfaces"	}  ],  "conv16": [	{  	"topic": "society_politics",  	"reason": "Discusses future of the European Union after Brexit"	},	{  	"topic": "europe",  	"reason": "Focuses on the European Union"	}  ],  "conv17": [	{  	"topic": "society_politics",  	"reason": "Discusses preserving endangered languages in the digital age"	},	{  	"topic": "technology",  	"reason": "Considers role of digital tools in language preservation"	}  ],  "conv18": [	{  	"topic": "environment",  	"reason": "Discusses Singapore's approach to urban water management"	},	{  	"topic": "asia",  	"reason": "Focuses on Singapore, a country in Asia"	}  ],  "conv19": [	{  	"topic": "environment",  	"reason": "Discusses ethics of wildlife tourism"	},	{  	"topic": "funny",  	"reason": "Potentially humorous due to the controversial nature of the topic"	}  ],  "conv20": [	{  	"topic": "economy_work",  	"reason": "Discusses Argentina's economic challenges and recovery prospects"	},	{  	"topic": "americas",  	"reason": "Focuses on Argentina, a country in South America"	}  ],  "conv21": [	{  	"topic": "education",  	"reason": "Discusses debate over school choice policies"	},	{  	"topic": "society_politics",  	"reason": "Considers impact of school choice on educational quality and equity"	}  ],  "conv22": [	{  	"topic": "economy_work",  	"reason": "Discusses Saudi Arabia's Vision 2030 economic transformation"	},	{  	"topic": "middle_east",  	"reason": "Focuses on Saudi Arabia, a country in the Middle East"	}  ],  "conv23": [	{  	"topic": "health",  	"reason": "Discusses rise of telemedicine and its future after COVID-19"	},	{  	"topic": "technology",  	"reason": "Considers impact of telemedicine on healthcare systems"	}  ],  "conv24": [	{  	"topic": "society_politics",  	"reason": "Discusses New Zealand's wellbeing budget approach"	},	{  	"topic": "oceania",  	"reason": "Focuses on New Zealand, a country in Oceania"	}  ],  "conv25": [	{  	"topic": "science",  	"reason": "Discusses ethics of gene editing in human embryos"	},	{  	"topic": "health",  	"reason": "Considers potential implications of gene editing for human health"	}  ],  "conv26": [	{  	"topic": "society_politics",  	"reason": "Discusses revitalizing rural communities in Japan"	},	{  	"topic": "asia",  	"reason": "Focuses on Japan, a country in Asia"	}  ],  "conv27": [	{  	"topic": "science",  	"reason": "Discusses future of international cooperation in space exploration"	},	{  	"topic": "technology",  	"reason": "Considers role of private companies and emerging space powers in space activities"	}  ],  "conv28": [	{  	"topic": "environment",  	"reason": "Discusses Ghana's approach to plastic waste management"	},	{  	"topic": "africa",  	"reason": "Focuses on Ghana, a country in Africa"	}  ],  "conv29": [	{  	"topic": "society_politics",  	"reason": "Discusses debate over historical monuments and public memory"	},	{  	"topic": "funny",  	"reason": "Potentially humorous due to the controversial nature of the topic"	}  ],  "conv30": [	{  	"topic": "health",  	"reason": "Discusses growing market for plant-based and cultured meat alternatives"	},	{  	"topic": "science",  	"reason": "Considers potential environmental and ethical implications of alternative proteins"	}  ]}```                                                                                  |

#### Notes
I explained to Perpexity the issues with the regional topic assignments. It said:

"Your prompt has several issues:
1. Conflicting Classification Systems: You're asking the LLM to "Use the UN Geoscheme as a guide for regional classifications" but your available topics don't align with the UN Geoscheme. The UN doesn't use "Latin America" as a primary geographic region but rather as a cultural grouping.
2. Missing UN Regions: Your topic list is missing several UN regions (like "Caribbean" and "Central America") while including "Latin America" which crosses multiple UN regions.
3. Ambiguous Instructions: The prompt doesn't clearly explain how to handle countries that could fall into multiple categories (e.g., Mexico is geographically in North America but culturally in Latin America)."

---

### Prompt 4 [improved description of region topics and modified instructions for regional classification]
#### System Instructions:
Your task is to analyze conversations and assign relevant topics from a predefined list.

AVAILABLE TOPICS:
```
[
  {
    "key": "art_culture",
    "label": "Art & Culture",
    "description": "Topics related to visual arts, performing arts, literature, and cultural heritage."
  },
  {
    "key": "business_finance",
    "label": "Business & Finance",
    "description": "Topics covering business operations, financial markets, investments, and corporate strategies."
  },
  {
    "key": "economy_work",
    "label": "Economy & Work",
    "description": "Discussions on economic trends, employment, labor markets, and workplace dynamics."
  },
  {
    "key": "environment",
    "label": "Environment",
    "description": "Issues related to natural resources, conservation, pollution, biodiversity, and environmental policy."
  },
  {
    "key": "education",
    "label": "Education",
    "description": "Topics covering education systems, learning methods, academic institutions, and educational policies."
  },
  {
    "key": "funny",
    "label": "Funny",
    "description": "Humorous content, jokes, comedy, and entertaining topics meant to amuse."
  },
  {
    "key": "health",
    "label": "Health",
    "description": "Matters related to physical and mental health, healthcare systems, medical research, and wellness."
  },
  {
    "key": "infrastructure",
    "label": "Infrastructure",
    "description": "Topics covering public systems such as transportation, utilities, and communication networks."
  },
  {
    "key": "religion_spirituality",
    "label": "Religion & Spirituality",
    "description": "Discussions on faith, religious practices, spiritual beliefs, and theological concepts."
  },
  {
    "key": "science",
    "label": "Science",
    "description": "Topics related to scientific research, discoveries, theories, and advancements across disciplines."
  },
  {
    "key": "society_politics",
    "label": "Society & Politics",
    "description": "Social issues, political debates, governance, policies, and political events."
  },
  {
    "key": "sports",
    "label": "Sports",
    "description": "Topics about athletic activities, sporting events, teams, athletes, and related competitions."
  },
  {
    "key": "technology",
    "label": "Technology",
    "description": "Discussions about digital innovation, computing, software, hardware, and technological advancements."
  },
  {
    "key": "breaking_news",
    "label": "Breaking News",
    "description": "Current events, urgent news updates, and significant developments happening globally."
  },
  {
    "key": "africa",
    "label": "Africa",
    "description": "Topics related to North African and Sub-Saharan African countries, including Egypt when in African context."
  },
  {
    "key": "asia",
    "label": "Asia",
    "description": "Topics related to East, South, Southeast, and Central Asian countries, including Russia, Turkey and Caucasus when in Asian context."
  },
  {
    "key": "europe",
    "label": "Europe",
    "description": "Topics related to Western, Eastern, Northern, and Southern European countries, including Russia, Turkey and Caucasus when in European context."
  },
  {
    "key": "latin_america",
    "label": "Latin America",
    "description": "Topics related to Mexico, Central America, South America, and Spanish/Portuguese/French-speaking Caribbean nations."
  },
  {
    "key": "middle_east",
    "label": "Middle East",
    "description": "Topics related to Western Asian countries, including Israel, Turkey and Egypt when in Middle Eastern context."
  },
  {
    "key": "north_america",
    "label": "North America",
    "description": "Topics related to the United States, Canada, and English-speaking Caribbean nations."
  },
  {
    "key": "oceania",
    "label": "Oceania",
    "description": "Topics related to Australia, New Zealand, and Pacific Island nations."
  }
]
```
  
INSTRUCTIONS:
1. Analyze each conversation in the input JSON.
2. Assign relevant topics from the available topics list for each conversation. Do not use topics not included in the list.
3. For each assigned topic, provide a brief reason (up to 60 characters) explaining why it was assigned.
4. Assign appropriate regional topics (e.g. middle_east) whenever the conversation substantively focuses on the specific region or countries within that region. For countries that could belong to multiple regions (e.g., Russia, Turkey, Egypt), assign the regional topic that best matches the conversation's context.
5. Return your assignments in the specified output format using only the topic keys (not labels).

INPUT JSON SCHEMA:
```json
{
  "type": "object",
  "additionalProperties": {
    "type": "object",
    "properties": {
      "conversationTitle": {
        "type": "string"
      },
      "conversationBody": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "required": [
      "conversationTitle"
    ]
  }
} 
```

OUTPUT JSON SCHEMA:  
```json
{
  "type": "object",
  "additionalProperties": {
    "type": "array",
    "items": {
      "type": "object",
      "properties": {
        "topic": {
          "type": "string"
        },
        "reason": {
          "type": "string"
        }
      },
      "required": [
        "topic",
        "reason"
      ]
    }
  }
}
```

EXAMPLE INPUT:
```json
{
  "conv1": {
    "conversationTitle": "Project Liberty: Has Europe over-regulated tech?",
    "conversationBody": "It's worthwhile to ask what all this regulation is for. If its goal is a safer internet with better consumer protections, it might be considered more successful. If its goal is to ensure Europe's digital sovereignty, it might be considered less so.\n\nLink to the article: \nhttps://www.linkedin.com/pulse/has-europe-over-regulated-tech-projectliberty-pdaie/?trackingId=Cu3xfkVEALIA9OGoP9WUPA%3D%3D"
  },
  "conv2": {
    "conversationTitle": "Is this widespread adoption of AI dumbing down the future generation?",
    "conversationBody": "With multiple easy-to-use tools becoming more and more accessible, how do we ensure that the current and future generations do not become so dependent on them that we lose our ability to reason and produce high-quality outputs? \n\nNot just the people using AI tools to grow and develop but also for addressing this issue for the general masses. For example, with Google enabling access to information at one's fingertips, there is no longer a need to remember and collect a lot of facts. Similarly, multiple people no longer read lengthy case studies and do assignments themselves and are now dependent on LLMs.\n\nWould love to hear your two cents on the topic!"
  }
}
```

EXPECTED OUTPUT:
```json
{
  "conv1": [
    {
      "topic": "europe",
      "reason": "Focuses on European tech regulation and digital sovereignty"
    },
    {
      "topic": "society_politics",
      "reason": "Discusses regulatory policy and societal protections"
    },
    {
      "topic": "technology",
      "reason": "Relates to tech industry regulation and digital landscape"
    }
  ],
  "conv2": [
    {
      "topic": "education",
      "reason": "Centers on learning, critical thinking, and assignments"
    },
    {
      "topic": "society_politics",
      "reason": "Addresses societal impact of technology dependence"
    },
    {
      "topic": "technology",
      "reason": "Discusses AI tools, LLMs, and technological dependence"
    }
  ]
}
```

Respond ONLY with a valid JSON object matching the output schema.

---

#### Results
| Prompt | Input | Parameters | Output |
|---|---|---|---|
| 4 | 1 | Temp = 0.2 Top P = 0.7 Top K = 40 | ```json {  "conv1": [	{  	"topic": "europe",  	"reason": "Discusses nuclear policy in European context"	},	{  	"topic": "society_politics",  	"reason": "Addresses international security and nuclear deterrence"	}  ],  "conv2": [	{  	"topic": "society_politics",  	"reason": "Discusses public space access and transgender rights"	},	{  	"topic": "environment",  	"reason": "Implicitly discusses environmental impact of gender-neutral toilets"	}  ],  "conv3": [	{  	"topic": "environment",  	"reason": "Discusses environmental impact of consumer choices"	},	{  	"topic": "economy_work",  	"reason": "Mentions economic means of consumers"	}  ]} ```                        |
| 4 | 2 | Same as above | ```json{  "conv1": [	{  	"topic": "technology",  	"reason": "Discusses quantum computing and its potential impact"	},	{  	"topic": "science",  	"reason": "Quantum computing is a scientific field"	},	{  	"topic": "business_finance",  	"reason": "Discusses potential industry disruption"	}  ],  "conv2": [	{  	"topic": "education",  	"reason": "Discusses alternative education methods for programming"	},	{  	"topic": "business_finance",  	"reason": "Discusses job market entry and employer perspectives"	},	{  	"topic": "technology",  	"reason": "Discusses programming and software development careers"	}  ]}```                        |
| 4 | 3 | Same as above | ```json{  "conv1": [	{  	"topic": "art_culture",  	"reason": "Discusses AI-generated artwork and its place in the art world"	},	{  	"topic": "technology",  	"reason": "Involves AI tools used for creating art"	}  ],  "conv2": [	{  	"topic": "economy_work",  	"reason": "Discusses wages, living expenses, and tipping culture"	},	{  	"topic": "society_politics",  	"reason": "Addresses societal practices and potential changes to tipping culture"	}  ],  "conv3": [	{  	"topic": "art_culture",  	"reason": "Discusses the resurgence of vinyl records and its impact on music consumption"	},	{  	"topic": "technology",  	"reason": "Contrasts physical media with digital music streaming"	}  ]}```                        |
| 4 | 4 | Same as above | ```json{  "conv1": [	{  	"topic": "society_politics",  	"reason": "Discusses AI use in military decisions and policy"	},	{  	"topic": "technology",  	"reason": "Relates to AI use in warfare and autonomous weapons"	}  ],  "conv2": [	{  	"topic": "health",  	"reason": "Centers on mental health support and initiatives"	},	{  	"topic": "workplace",  	"reason": "Discusses mental health in the post-pandemic workplace"	}  ],  "conv3": [	{  	"topic": "environment",  	"reason": "Discusses carbon offsets and climate change mitigation"	},	{  	"topic": "business_finance",  	"reason": "Relates to corporate carbon offset programs"	}  ],  "conv4": [	{  	"topic": "society_politics",  	"reason": "Discusses voting systems and representation"	},	{  	"topic": "europe",  	"reason": "Focuses on UK's electoral system and governance"	}  ],  "conv5": [	{  	"topic": "education",  	"reason": "Discusses homeschooling and traditional school systems"	},	{  	"topic": "society_politics",  	"reason": "Relates to educational policy and flexible approaches"	}  ],  "conv6": [	{  	"topic": "art_culture",  	"reason": "Discusses NFTs in the art world"	},	{  	"topic": "technology",  	"reason": "Relates to digital art and blockchain technology"	}  ],  "conv7": [	{  	"topic": "business_finance",  	"reason": "Discusses CBDCs and their impact on banking"	},	{  	"topic": "technology",  	"reason": "Relates to digital currencies and financial technology"	}  ],  "conv8": [	{  	"topic": "infrastructure",  	"reason": "Discusses public transportation and fare policies"	},	{  	"topic": "society_politics",  	"reason": "Relates to environmental and social equity benefits"	}  ],  "conv9": [	{  	"topic": "sports",  	"reason": "Discusses Olympic host cities and their impact"	},	{  	"topic": "society_politics",  	"reason": "Relates to economic justification and sustainable approaches"	}  ],  "conv10": [	{  	"topic": "religion_spirituality",  	"reason": "Discusses mindfulness practices across religious traditions"	},	{  	"topic": "health",  	"reason": "Relates to mindfulness and mental well-being"	}  ],  "conv11": [	{  	"topic": "asia",  	"reason": "Focuses on Taiwan Strait tensions and regional politics"	},	{  	"topic": "society_politics",  	"reason": "Discusses diplomatic efforts and maintaining peace"	}  ],  "conv12": [	{  	"topic": "technology",  	"reason": "Discusses private vs. government space exploration"	},	{  	"topic": "science",  	"reason": "Relates to space governance and resource rights"	}  ],  "conv13": [	{  	"topic": "africa",  	"reason": "Focuses on sustainable urbanization challenges in African megacities"	},	{  	"topic": "society_politics",  	"reason": "Discusses infrastructure gaps and economic development"	}  ],  "conv14": [	{  	"topic": "asia",  	"reason": "Focuses on traditional crafts in modern Japan"	},	{  	"topic": "art_culture",  	"reason": "Discusses revival of traditional crafts and contemporary designs"	}  ],  "conv15": [	{  	"topic": "business_finance",  	"reason": "Discusses reshoring and global manufacturing trends"	},	{  	"topic": "society_politics",  	"reason": "Relates to economic development and geopolitical tensions"	}  ]}```                                                                                                                  |
| 4 | 5 | Same as above | ```json{  "conv1": [	{  	"topic": "environment",  	"reason": "Discusses impact of climate change on Pacific island nations"	},	{  	"topic": "society_politics",  	"reason": "Addresses international obligations and immigration pathways"	}  ],  "conv2": [	{  	"topic": "environment",  	"reason": "Discusses potential environmental destruction in Amazon"	},	{  	"topic": "society_politics",  	"reason": "Addresses indigenous rights and resource extraction"	}  ],  "conv3": [	{  	"topic": "science",  	"reason": "Discusses nuclear fusion energy development"	},	{  	"topic": "technology",  	"reason": "Relates to technological advancements in nuclear fusion"	}  ],  "conv4": [	{  	"topic": "society_politics",  	"reason": "Discusses urban design changes after pandemic"	},	{  	"topic": "infrastructure",  	"reason": "Relates to public spaces and transportation"	}  ],  "conv5": [	{  	"topic": "science",  	"reason": "Discusses de-extinction technology"	},	{  	"topic": "society_politics",  	"reason": "Addresses ethical considerations and resource allocation"	}  ],  "conv6": [	{  	"topic": "technology",  	"reason": "Discusses Kenya's digital innovation ecosystem"	},	{  	"topic": "africa",  	"reason": "Focuses on Kenya's tech success and potential for replication"	}  ],  "conv7": [	{  	"topic": "health",  	"reason": "Discusses integration of traditional Chinese medicine in healthcare"	},	{  	"topic": "asia",  	"reason": "Focuses on traditional Chinese medicine in modern healthcare"	}  ],  "conv8": [	{  	"topic": "society_politics",  	"reason": "Discusses commercialization of European football clubs"	},	{  	"topic": "sports",  	"reason": "Relates to European football and cultural significance"	}  ],  "conv9": [	{  	"topic": "society_politics",  	"reason": "Discusses future of work in automated economies"	},	{  	"topic": "technology",  	"reason": "Relates to automation and AI impact on industries"	}  ],  "conv10": [	{  	"topic": "society_politics",  	"reason": "Discusses cultural appropriation vs. appreciation in fashion"	},	{  	"topic": "funny",  	"reason": "Potential for humorous content in discussing fashion trends"	}  ],  "conv11": [	{  	"topic": "society_politics",  	"reason": "Discusses Mexico's approach to drug policy reform"	},	{  	"topic": "latin_america",  	"reason": "Focuses on Mexico's drug policy and potential impact"	}  ],  "conv12": [	{  	"topic": "society_politics",  	"reason": "Discusses ethics of predictive policing algorithms"	},	{  	"topic": "technology",  	"reason": "Relates to AI systems and potential biases in policing"	}  ],  "conv13": [	{  	"topic": "environment",  	"reason": "Discusses Australia's response to increasing bushfire threats"	},	{  	"topic": "oceania",  	"reason": "Focuses on Australia's bushfire management and policy changes"	}  ],  "conv14": [	{  	"topic": "arts_culture",  	"reason": "Discusses growing influence of K-pop in global entertainment"	},	{  	"topic": "asia",  	"reason": "Focuses on South Korean pop music and its global impact"	}  ],  "conv15": [	{  	"topic": "science",  	"reason": "Discusses ethical considerations in brain-computer interfaces"	},	{  	"topic": "technology",  	"reason": "Relates to implantable brain-computer interfaces"	}  ],  "conv16": [	{  	"topic": "society_politics",  	"reason": "Discusses future of European Union after Brexit"	},	{  	"topic": "europe",  	"reason": "Focuses on EU's trajectory and potential reforms"	}  ],  "conv17": [	{  	"topic": "arts_culture",  	"reason": "Discusses preserving endangered languages in digital age"	},	{  	"topic": "technology",  	"reason": "Relates to digital tools for language preservation"	}  ],  "conv18": [	{  	"topic": "environment",  	"reason": "Discusses Singapore's approach to urban water management"	},	{  	"topic": "asia",  	"reason": "Focuses on Singapore's water security and NEWater program"	}  ],  "conv19": [	{  	"topic": "environment",  	"reason": "Discusses ethics of wildlife tourism"	},	{  	"topic": "funny",  	"reason": "Potential for humorous content in discussing wildlife tourism"	}  ],  "conv20": [	{  	"topic": "economy_work",  	"reason": "Discusses Argentina's economic challenges and recovery prospects"	},	{  	"topic": "latin_america",  	"reason": "Focuses on Argentina's economy and potential reforms"	}  ],  "conv21": [	{  	"topic": "education",  	"reason": "Discusses debate over school choice policies"	},	{  	"topic": "society_politics",  	"reason": "Addresses educational quality and equity in school choice models"	}  ],  "conv22": [	{  	"topic": "economy_work",  	"reason": "Discusses Saudi Arabia's Vision 2030 economic transformation"	},	{  	"topic": "middle_east",  	"reason": "Focuses on Saudi Arabia's economic diversification and impact"	}  ],  "conv23": [	{  	"topic": "health",  	"reason": "Discusses rise of telemedicine and its future after COVID-19"	},	{  	"topic": "technology",  	"reason": "Relates to telehealth services and their impact on healthcare"	}  ],  "conv24": [	{  	"topic": "society_politics",  	"reason": "Discusses New Zealand's wellbeing budget approach"	},	{  	"topic": "oceania",  	"reason": "Focuses on New Zealand's wellbeing framework for economic planning"	}  ],  "conv25": [	{  	"topic": "science",  	"reason": "Discusses ethics of gene editing in human embryos"	},	{  	"topic": "health",  	"reason": "Relates to CRISPR and gene editing technologies in humans"	}  ],  "conv26": [	{  	"topic": "society_politics",  	"reason": "Discusses revitalizing rural communities in Japan"	},	{  	"topic": "asia",  	"reason": "Focuses on Japan's rural areas and demographic challenges"	}  ],  "conv27": [	{  	"topic": "science",  	"reason": "Discusses future of international cooperation in space exploration"	},	{  	"topic": "technology",  	"reason": "Relates to governance frameworks for commercial space activities"	}  ],  "conv28": [	{  	"topic": "environment",  	"reason": "Discusses Ghana's approach to plastic waste management"	},	{  	"topic": "africa",  	"reason": "Focuses on Ghana's plastic waste management and economic opportunities"	}  ],  "conv29": [	{  	"topic": "arts_culture",  	"reason": "Discusses debate over historical monuments and public memory"	},	{  	"topic": "society_politics",  	"reason": "Addresses how societies remember historical figures and events"	}  ],  "conv30": [	{  	"topic": "health",  	"reason": "Discusses growing market for plant-based and cultured meat alternatives"	},	{  	"topic": "science",  	"reason": "Relates to innovations in plant-based proteins and lab-grown meat"	}  ]}```                                                                                                                                                                                                                                               |

---

### Prompt 5 [removing “funny” from the list of topics]
#### System Instructions:
Your task is to analyze conversations and assign relevant topics from a predefined list.

AVAILABLE TOPICS:
```
[
  {
    "key": "art_culture",
    "label": "Art & Culture",
    "description": "Topics related to visual arts, performing arts, literature, and cultural heritage."
  },
  {
    "key": "business_finance",
    "label": "Business & Finance",
    "description": "Topics covering business operations, financial markets, investments, and corporate strategies."
  },
  {
    "key": "economy_work",
    "label": "Economy & Work",
    "description": "Discussions on economic trends, employment, labor markets, and workplace dynamics."
  },
  {
    "key": "environment",
    "label": "Environment",
    "description": "Issues related to natural resources, conservation, pollution, biodiversity, and environmental policy."
  },
  {
    "key": "education",
    "label": "Education",
    "description": "Topics covering education systems, learning methods, academic institutions, and educational policies."
  },
  {
    "key": "health",
    "label": "Health",
    "description": "Matters related to physical and mental health, healthcare systems, medical research, and wellness."
  },
  {
    "key": "infrastructure",
    "label": "Infrastructure",
    "description": "Topics covering public systems such as transportation, utilities, and communication networks."
  },
  {
    "key": "religion_spirituality",
    "label": "Religion & Spirituality",
    "description": "Discussions on faith, religious practices, spiritual beliefs, and theological concepts."
  },
  {
    "key": "science",
    "label": "Science",
    "description": "Topics related to scientific research, discoveries, theories, and advancements across disciplines."
  },
  {
    "key": "society_politics",
    "label": "Society & Politics",
    "description": "Social issues, political debates, governance, policies, and political events."
  },
  {
    "key": "sports",
    "label": "Sports",
    "description": "Topics about athletic activities, sporting events, teams, athletes, and related competitions."
  },
  {
    "key": "technology",
    "label": "Technology",
    "description": "Discussions about digital innovation, computing, software, hardware, and technological advancements."
  },
  {
    "key": "breaking_news",
    "label": "Breaking News",
    "description": "Current events, urgent news updates, and significant developments happening globally."
  },
  {
    "key": "africa",
    "label": "Africa",
    "description": "Topics related to North African and Sub-Saharan African countries, including Egypt when in African context."
  },
  {
    "key": "asia",
    "label": "Asia",
    "description": "Topics related to East, South, Southeast, and Central Asian countries, including Russia, Turkey and Caucasus when in Asian context."
  },
  {
    "key": "europe",
    "label": "Europe",
    "description": "Topics related to Western, Eastern, Northern, and Southern European countries, including Russia, Turkey and Caucasus when in European context."
  },
  {
    "key": "latin_america",
    "label": "Latin America",
    "description": "Topics related to Mexico, Central America, South America, and Spanish/Portuguese/French-speaking Caribbean nations."
  },
  {
    "key": "middle_east",
    "label": "Middle East",
    "description": "Topics related to Western Asian countries, including Israel, Turkey and Egypt when in Middle Eastern context."
  },
  {
    "key": "north_america",
    "label": "North America",
    "description": "Topics related to the United States, Canada, and English-speaking Caribbean nations."
  },
  {
    "key": "oceania",
    "label": "Oceania",
    "description": "Topics related to Australia, New Zealand, and Pacific Island nations."
  }
]
```
  
INSTRUCTIONS:
1. Analyze each conversation in the input JSON.
2. Assign relevant topics from the available topics list for each conversation. Do not use topics not included in the list.
3. For each assigned topic, provide a brief reason (up to 60 characters) explaining why it was assigned.
4. Assign appropriate regional topics (e.g. middle_east) whenever the conversation substantively focuses on the specific region or countries within that region. For countries that could belong to multiple regions (e.g., Russia, Turkey, Egypt), assign the regional topic that best matches the conversation's context.
5. Return your assignments in the specified output format using only the topic keys (not labels).

INPUT JSON SCHEMA:
```json
{
  "type": "object",
  "additionalProperties": {
    "type": "object",
    "properties": {
      "conversationTitle": {
        "type": "string"
      },
      "conversationBody": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "required": [
      "conversationTitle"
    ]
  }
} 
```

OUTPUT JSON SCHEMA:
```json
{
  "type": "object",
  "additionalProperties": {
    "type": "array",
    "items": {
      "type": "object",
      "properties": {
        "topic": {
          "type": "string"
        },
        "reason": {
          "type": "string"
        }
      },
      "required": [
        "topic",
        "reason"
      ]
    }
  }
} 
```

EXAMPLE INPUT:  
```json
{
  "conv1": {
    "conversationTitle": "Project Liberty: Has Europe over-regulated tech?",
    "conversationBody": "It's worthwhile to ask what all this regulation is for. If its goal is a safer internet with better consumer protections, it might be considered more successful. If its goal is to ensure Europe's digital sovereignty, it might be considered less so.\n\nLink to the article: \nhttps://www.linkedin.com/pulse/has-europe-over-regulated-tech-projectliberty-pdaie/?trackingId=Cu3xfkVEALIA9OGoP9WUPA%3D%3D"
  },
  "conv2": {
    "conversationTitle": "Is this widespread adoption of AI dumbing down the future generation?",
    "conversationBody": "With multiple easy-to-use tools becoming more and more accessible, how do we ensure that the current and future generations do not become so dependent on them that we lose our ability to reason and produce high-quality outputs? \n\nNot just the people using AI tools to grow and develop but also for addressing this issue for the general masses. For example, with Google enabling access to information at one's fingertips, there is no longer a need to remember and collect a lot of facts. Similarly, multiple people no longer read lengthy case studies and do assignments themselves and are now dependent on LLMs.\n\nWould love to hear your two cents on the topic!"
  }
}
```

EXPECTED OUTPUT:
```json
{
  "conv1": [
    {
      "topic": "europe",
      "reason": "Focuses on European tech regulation and digital sovereignty"
    },
    {
      "topic": "society_politics",
      "reason": "Discusses regulatory policy and societal protections"
    },
    {
      "topic": "technology",
      "reason": "Relates to tech industry regulation and digital landscape"
    }
  ],
  "conv2": [
    {
      "topic": "education",
      "reason": "Centers on learning, critical thinking, and assignments"
    },
    {
      "topic": "society_politics",
      "reason": "Addresses societal impact of technology dependence"
    },
    {
      "topic": "technology",
      "reason": "Discusses AI tools, LLMs, and technological dependence"
    }
  ]
}
```

Respond ONLY with a valid JSON object matching the output schema.

---

#### Results
| Prompt | Input | Parameters | Output |
|---|---|---|---|
| 5 | 1 | Temp = 0.2 Top P = 0.7 Top K = 40 | ```json{  "conv1": [	{  	"topic": "europe",  	"reason": "Discusses nuclear policy in Poland and France"	},	{  	"topic": "society_politics",  	"reason": "Addresses nuclear deterrence and international relations"	},	{  	"topic": "defense",  	"reason": "Not in the original list, but relevant for nuclear weapons discussion"	}  ],  "conv2": [	{  	"topic": "society_politics",  	"reason": "Discusses transgender rights and access to public spaces"	},	{  	"topic": "gender_issues",  	"reason": "Not in the original list, but relevant for gender-neutral toilets discussion"	}  ],  "conv3": [	{  	"topic": "environment",  	"reason": "Discusses environmental impact of consumer products"	},	{  	"topic": "economy_work",  	"reason": "Mentions economic means of consumers"	},	{  	"topic": "consumer_issues",  	"reason": "Not in the original list, but relevant for consumer guilt and product choices"	}  ]}```                                |
| 5 | 2 | Same as above | ```json{  "conv1": [	{  	"topic": "technology",  	"reason": "Discusses quantum computing and its potential impact"	},	{  	"topic": "science",  	"reason": "Quantum computing is a scientific field"	}  ],  "conv2": [	{  	"topic": "education",  	"reason": "Discusses alternative education methods for programming"	},	{  	"topic": "business_finance",  	"reason": "Impacts job market and employment opportunities"	},	{  	"topic": "technology",  	"reason": "Relates to programming and software development careers"	}  ]}```                    |
| 5 | 3 | Same as above | ```json{  "conv1": [	{  	"topic": "art_culture",  	"reason": "Discusses AI-generated artwork and its place in the art world"	},	{  	"topic": "technology",  	"reason": "Involves AI tools used for creating art"	}  ],  "conv2": [	{  	"topic": "economy_work",  	"reason": "Explores wage structures and tipping practices in service industries"	},	{  	"topic": "society_politics",  	"reason": "Discusses societal norms and trends related to tipping culture"	}  ],  "conv3": [	{  	"topic": "art_culture",  	"reason": "Discusses the resurgence of vinyl records and its impact on music consumption"	},	{  	"topic": "technology",  	"reason": "Contrasts physical media with digital music streaming"	}  ]}```                        |
| 5 | 4 | Same as above | ```json{  "conv1": [	{  	"topic": "society_politics",  	"reason": "Discusses AI use in military decisions and policy"	},	{  	"topic": "technology",  	"reason": "Relates to AI use in warfare and autonomous weapons"	}  ],  "conv2": [	{  	"topic": "health",  	"reason": "Centers on mental health support and resources"	},	{  	"topic": "workplace",  	"reason": "Discusses mental health in the post-pandemic workplace"	}  ],  "conv3": [	{  	"topic": "environment",  	"reason": "Discusses carbon offsets and climate change"	},	{  	"topic": "business_finance",  	"reason": "Relates to corporate carbon offset programs"	}  ],  "conv4": [	{  	"topic": "society_politics",  	"reason": "Discusses voting systems and representation"	},	{  	"topic": "europe",  	"reason": "Focuses on UK's voting system and governance"	}  ],  "conv5": [	{  	"topic": "education",  	"reason": "Discusses homeschooling and traditional school systems"	},	{  	"topic": "society_politics",  	"reason": "Relates to flexible approaches in education"	}  ],  "conv6": [	{  	"topic": "art_culture",  	"reason": "Discusses NFTs in the art world"	},	{  	"topic": "technology",  	"reason": "Relates to digital art and NFTs"	}  ],  "conv7": [	{  	"topic": "technology",  	"reason": "Discusses CBDCs and digital currencies"	},	{  	"topic": "business_finance",  	"reason": "Relates to financial inclusion and commercial banks"	}  ],  "conv8": [	{  	"topic": "infrastructure",  	"reason": "Discusses public transportation and fare-free transit"	},	{  	"topic": "society_politics",  	"reason": "Relates to environmental and social equity benefits"	}  ],  "conv9": [	{  	"topic": "sports",  	"reason": "Discusses Olympic host cities and economic impact"	},	{  	"topic": "society_politics",  	"reason": "Relates to sustainable approaches and venue reuse"	}  ],  "conv10": [	{  	"topic": "religion_spirituality",  	"reason": "Discusses mindfulness practices across religious traditions"	},	{  	"topic": "health",  	"reason": "Relates to mindfulness and contemplative practices"	}  ],  "conv11": [	{  	"topic": "society_politics",  	"reason": "Discusses Taiwan Strait tensions and diplomatic efforts"	},	{  	"topic": "asia",  	"reason": "Focuses on the Taiwan Strait and regional tensions"	}  ],  "conv12": [	{  	"topic": "technology",  	"reason": "Discusses private and government space exploration"	},	{  	"topic": "science",  	"reason": "Relates to space governance and resource rights"	}  ],  "conv13": [	{  	"topic": "society_politics",  	"reason": "Discusses sustainable urbanization challenges in African megacities"	},	{  	"topic": "africa",  	"reason": "Focuses on urbanization in African cities"	}  ],  "conv14": [	{  	"topic": "art_culture",  	"reason": "Discusses traditional crafts in modern Japan"	},	{  	"topic": "asia",  	"reason": "Focuses on Japan and traditional crafts revival"	}  ],  "conv15": [	{  	"topic": "business_finance",  	"reason": "Discusses reshoring and global manufacturing"	},	{  	"topic": "north_america",  	"reason": "Focuses on North American companies reshoring production"	}  ]}```                                                                                                                        |
| 5 | 5 | Same as above | ```json{  "conv1": [	{  	"topic": "environment",  	"reason": "Discusses impact of climate change on Pacific island nations"	},	{  	"topic": "society_politics",  	"reason": "Considers international obligations for assisting climate refugees"	}  ],  "conv2": [	{  	"topic": "environment",  	"reason": "Discusses potential environmental destruction from mining in Amazon"	},	{  	"topic": "society_politics",  	"reason": "Considers balance between resource extraction and cultural preservation"	},	{  	"topic": "middle_east",  	"reason": "Brazil's Amazon region is sometimes included in Middle Eastern context"	}  ],  "conv3": [	{  	"topic": "science",  	"reason": "Discusses nuclear fusion energy advancements"	}  ],  "conv4": [	{  	"topic": "society_politics",  	"reason": "Discusses urban design changes after pandemic"	}  ],  "conv5": [	{  	"topic": "science",  	"reason": "Discusses de-extinction technology"	},	{  	"topic": "society_politics",  	"reason": "Considers ethical considerations of de-extinction technology"	}  ],  "conv6": [	{  	"topic": "technology",  	"reason": "Discusses Kenya's digital innovation ecosystem"	},	{  	"topic": "africa",  	"reason": "Focuses on Kenya's tech success"	}  ],  "conv7": [	{  	"topic": "health",  	"reason": "Discusses integration of traditional Chinese medicine in modern healthcare"	}  ],  "conv8": [	{  	"topic": "society_politics",  	"reason": "Discusses commercialization of European football clubs"	},	{  	"topic": "europe",  	"reason": "Focuses on European football clubs"	}  ],  "conv9": [	{  	"topic": "society_politics",  	"reason": "Discusses future of work in automated economies"	},	{  	"topic": "technology",  	"reason": "Discusses impact of automation and AI on employment"	}  ],  "conv10": [	{  	"topic": "society_politics",  	"reason": "Discusses cultural appropriation vs. appreciation in fashion"	}  ],  "conv11": [	{  	"topic": "society_politics",  	"reason": "Discusses Mexico's approach to drug policy reform"	},	{  	"topic": "latin_america",  	"reason": "Focuses on Mexico's drug policy reform"	}  ],  "conv12": [	{  	"topic": "society_politics",  	"reason": "Discusses ethics of predictive policing algorithms"	}  ],  "conv13": [	{  	"topic": "environment",  	"reason": "Discusses Australia's response to increasing bushfire threats"	}  ],  "conv14": [	{  	"topic": "arts_culture",  	"reason": "Discusses growing influence of K-pop in global entertainment"	},	{  	"topic": "asia",  	"reason": "Focuses on South Korean pop music"	}  ],  "conv15": [	{  	"topic": "science",  	"reason": "Discusses ethical considerations in brain-computer interfaces"	}  ],  "conv16": [	{  	"topic": "society_politics",  	"reason": "Discusses future of European Union after Brexit"	},	{  	"topic": "europe",  	"reason": "Focuses on European Union's trajectory after Brexit"	}  ],  "conv17": [	{  	"topic": "arts_culture",  	"reason": "Discusses preserving endangered languages in digital age"	}  ],  "conv18": [	{  	"topic": "environment",  	"reason": "Discusses Singapore's approach to urban water management"	},	{  	"topic": "asia",  	"reason": "Focuses on Singapore's water management"	}  ],  "conv19": [	{  	"topic": "environment",  	"reason": "Discusses ethics of wildlife tourism"	}  ],  "conv20": [	{  	"topic": "economy_work",  	"reason": "Discusses Argentina's economic challenges and recovery prospects"	},	{  	"topic": "latin_america",  	"reason": "Focuses on Argentina's economy"	}  ],  "conv21": [	{  	"topic": "education",  	"reason": "Discusses debate over school choice policies"	}  ],  "conv22": [	{  	"topic": "economy_work",  	"reason": "Discusses Saudi Arabia's Vision 2030 economic transformation"	},	{  	"topic": "middle_east",  	"reason": "Focuses on Saudi Arabia's economic transformation"	}  ],  "conv23": [	{  	"topic": "health",  	"reason": "Discusses rise of telemedicine and its future after COVID-19"	}  ],  "conv24": [	{  	"topic": "society_politics",  	"reason": "Discusses New Zealand's wellbeing budget approach"	},	{  	"topic": "oceania",  	"reason": "Focuses on New Zealand's wellbeing budget"	}  ],  "conv25": [	{  	"topic": "science",  	"reason": "Discusses ethics of gene editing in human embryos"	}  ],  "conv26": [	{  	"topic": "society_politics",  	"reason": "Discusses revitalizing rural communities in Japan"	},	{  	"topic": "asia",  	"reason": "Focuses on Japan's rural communities"	}  ],  "conv27": [	{  	"topic": "science",  	"reason": "Discusses future of international cooperation in space exploration"	}  ],  "conv28": [	{  	"topic": "environment",  	"reason": "Discusses Ghana's approach to plastic waste management"	},	{  	"topic": "africa",  	"reason": "Focuses on Ghana's plastic waste management"	}  ],  "conv29": [	{  	"topic": "arts_culture",  	"reason": "Discusses debate over historical monuments and public memory"	}  ],  "conv30": [	{  	"topic": "environment",  	"reason": "Discusses growing market for plant-based and cultured meat alternatives"	}  ]}```                                                                                 |
---

## Mistral-Large Tests
The following tests were done with the Mistral Large model (all prior tests were done on Mistral Small).

### Re-Testing Prompt 4
Scroll up for Prompt 4 text.

#### Results

| Prompt | Input | Parameters | Output |
|---|---|---|---|
| 4 | 1 | Temp = 0.2 Top P = 0.7 Top K = 40 | ```json {   "conv1": [     {       "topic": "europe",       "reason": "Discusses Poland's potential access to nuclear weapons"     },     {       "topic": "society_politics",       "reason": "Centers on political debate about nuclear deterrents"     },     {       "topic": "breaking_news",       "reason": "Covers recent news about France's nuclear umbrella"     }   ],   "conv2": [     {       "topic": "society_politics",       "reason": "Addresses transgender rights and public spaces"     },     {       "topic": "europe",       "reason": "Focuses on UK Supreme Court ruling and its implications"     },     {       "topic": "health",       "reason": "Relates to access to facilities based on gender identity"     }   ],   "conv3": [     {       "topic": "environment",       "reason": "Discusses consumer impact on the environment"     },     {       "topic": "economy_work",       "reason": "Mentions economic constraints for sustainable choices"     },     {       "topic": "society_politics",       "reason": "Addresses societal stigma around consumer choices"     }   ] } ``` |
| 4 | 2 | Same as above | ```json {   "conv1": [     {       "topic": "technology",       "reason": "Discusses quantum computing and its potential impact"     },     {       "topic": "business_finance",       "reason": "Mentions industries potentially disrupted by quantum computing"     },     {       "topic": "breaking_news",       "reason": "Refers to recent developments in quantum computing"     }   ],   "conv2": [     {       "topic": "education",       "reason": "Centers on coding bootcamps and their effectiveness in teaching"     },     {       "topic": "economy_work",       "reason": "Discusses job market entry and employer perspectives on bootcamps"     },     {       "topic": "technology",       "reason": "Relates to software development and computer science education"     }   ] }``` |
| 4 | 3 | Same as above | ```json{   "conv1": [     {       "topic": "art_culture",       "reason": "Discusses the definition and value of AI-generated art"     },     {       "topic": "society_politics",       "reason": "Addresses debate and varying perspectives on AI art"     },     {       "topic": "technology",       "reason": "Relates to AI tools like Midjourney and DALL-E"     }   ],   "conv2": [     {       "topic": "economy_work",       "reason": "Centers on wages, living expenses, and income sources"     },     {       "topic": "society_politics",       "reason": "Discusses tipping culture, practices, and debate"     }   ],   "conv3": [     {       "topic": "art_culture",       "reason": "Focuses on vinyl records, album artwork, and music"     },     {       "topic": "technology",       "reason": "Contrasts physical media with digital streaming services"     }   ] }``` |
| 4 | 4 | Same as above | ```json{   "conv1": [     {       "topic": "technology",       "reason": "Discusses AI use in warfare and autonomous decisions"     },     {       "topic": "society_politics",       "reason": "Addresses ethical concerns and policy debates on AI use"     },     {       "topic": "breaking_news",       "reason": "Mentions recent Pentagon guidelines on AI in warfare"     }   ],   "conv2": [     {       "topic": "health",       "reason": "Focuses on mental health support and burnout in workplaces"     },     {       "topic": "economy_work",       "reason": "Discusses workplace initiatives and career repercussions"     },     {       "topic": "society_politics",       "reason": "Addresses stigma and social attitudes towards mental health"     }   ],   "conv3": [     {       "topic": "environment",       "reason": "Discusses carbon offsets and their effectiveness against climate change"     },     {       "topic": "business_finance",       "reason": "Mentions corporate carbon offset programs and alternatives"     },     {       "topic": "technology",       "reason": "Discusses technological solutions like direct air capture"     }   ],   "conv4": [     {       "topic": "society_politics",       "reason": "Discusses voting systems and their impact on representation and governance"     },     {       "topic": "europe",       "reason": "Focuses on the UK's first-past-the-post system and potential reforms"     }   ],   "conv5": [     {       "topic": "education",       "reason": "Discusses homeschooling, hybrid models, and school systems"     },     {       "topic": "breaking_news",       "reason": "Mentions pandemic-related changes in education and their aftermath"     }   ],   "conv6": [     {       "topic": "art_culture",       "reason": "Discusses NFTs in the context of the art world and museums"     },     {       "topic": "technology",       "reason": "Focuses on NFTs as a digital technology and its market volatility"     }   ],   "conv7": [     {       "topic": "business_finance",       "reason": "Discusses Central Bank Digital Currencies and their potential impact"     },     {       "topic": "technology",       "reason": "Focuses on digital currencies and their technological implications"     },     {       "topic": "breaking_news",       "reason": "Mentions China's digital yuan trials and global CBDC exploration"     }   ],   "conv8": [     {       "topic": "infrastructure",       "reason": "Discusses public transportation, fares, and service improvements"     },     {       "topic": "economy_work",       "reason": "Addresses cost and potential benefits of fare-free public transit"     },     {       "topic": "environment",       "reason": "Mentions environmental benefits of encouraging public transportation use"     }   ],   "conv9": [     {       "topic": "sports",       "reason": "Discusses hosting the Olympics and major sporting events"     },     {       "topic": "economy_work",       "reason": "Addresses economic justification and sustainability of hosting events"     },     {       "topic": "society_politics",       "reason": "Discusses community impact and potential reforms for host cities"     }   ],   "conv10": [     {       "topic": "religion_spirituality",       "reason": "Discusses mindfulness practices across various religious traditions"     },     {       "topic": "health",       "reason": "Addresses the relationship between mindfulness and mental well-being"     }   ],   "conv11": [     {       "topic": "asia",       "reason": "Focuses on tensions in the Taiwan Strait and regional stability"     },     {       "topic": "society_politics",       "reason": "Discusses diplomatic efforts, nationalist rhetoric, and peace maintenance"     },     {       "topic": "breaking_news",       "reason": "Mentions recent military exercises and intensified rhetoric"     }   ],   "conv12": [     {       "topic": "technology",       "reason": "Discusses space exploration, commercialization, and governance"     },     {       "topic": "business_finance",       "reason": "Addresses the role of private enterprise and government agencies in space development"     }   ],   "conv13": [     {       "topic": "africa",       "reason": "Focuses on sustainable urbanization challenges in African megacities"     },     {       "topic": "infrastructure",       "reason": "Discusses housing, transportation, and utilities in rapidly urbanizing cities"     },     {       "topic": "environment",       "reason": "Addresses sustainable development and opportunities for growing populations"     }   ],   "conv14": [     {       "topic": "art_culture",       "reason": "Discusses traditional crafts and contemporary designs in modern Japan"     },     {       "topic": "asia",       "reason": "Focuses on the resurgence of traditional crafts in Japan"     },     {       "topic": "economy_work",       "reason": "Addresses economic viability and innovation in traditional crafts"     }   ],   "conv15": [     {       "topic": "economy_work",       "reason": "Discusses reshoring, manufacturing, and economic development"     },     {       "topic": "breaking_news",       "reason": "Mentions recent trends in reshoring due to pandemics and geopolitics"     },     {       "topic": "north_america",       "reason": "Focuses on companies in North America bringing production back home"     },     {       "topic": "europe",       "reason": "Mentions European companies also participating in the reshoring trend"     }   ] }``` |
| 4 | 5 | Same as above | ```json{   "conv1": [     {       "topic": "environment",       "reason": "Discusses rising sea levels and climate change impact"     },     {       "topic": "society_politics",       "reason": "Addresses international obligations and immigration policies"     },     {       "topic": "oceania",       "reason": "Focuses on Pacific island nations like Kiribati and Tuvalu"     }   ],   "conv2": [     {       "topic": "environment",       "reason": "Mentions environmental destruction due to mining"     },     {       "topic": "society_politics",       "reason": "Discusses balancing resource extraction with preservation"     },     {       "topic": "latin_america",       "reason": "Focuses on Brazil's indigenous reserves in the Amazon"     }   ],   "conv3": [     {       "topic": "science",       "reason": "Discusses nuclear fusion energy breakthroughs and challenges"     },     {       "topic": "technology",       "reason": "Mentions commercial viability of fusion power technology"     }   ],   "conv4": [     {       "topic": "society_politics",       "reason": "Discusses urban design changes due to COVID-19 pandemic"     },     {       "topic": "infrastructure",       "reason": "Mentions pedestrian-friendly streets and expanded outdoor dining"     }   ],   "conv5": [     {       "topic": "science",       "reason": "Discusses de-extinction technology and its ethical considerations"     },     {       "topic": "environment",       "reason": "Mentions restoring lost biodiversity through de-extinction"     }   ],   "conv6": [     {       "topic": "technology",       "reason": "Discusses digital innovation ecosystem in Kenya"     },     {       "topic": "economy_work",       "reason": "Mentions growing startup ecosystem and government investment"     },     {       "topic": "africa",       "reason": "Focuses on Nairobi as one of Africa's leading tech hubs"     }   ],   "conv7": [     {       "topic": "health",       "reason": "Discusses integration of traditional Chinese medicine in healthcare"     },     {       "topic": "society_politics",       "reason": "Addresses standards and regulations for traditional practices"     },     {       "topic": "asia",       "reason": "Focuses on Traditional Chinese Medicine (TCM) practices"     }   ],   "conv8": [     {       "topic": "society_politics",       "reason": "Discusses commercialization and cultural significance of football"     },     {       "topic": "sports",       "reason": "Mentions European football clubs and local connections"     },     {       "topic": "europe",       "reason": "Focuses on European Super League proposal and tensions"     }   ],   "conv9": [     {       "topic": "economy_work",       "reason": "Discusses future employment in automated economies"     },     {       "topic": "technology",       "reason": "Mentions automation and AI transforming industries"     },     {       "topic": "education",       "reason": "Addresses adapting education systems for changing work landscape"     }   ],   "conv10": [     {       "topic": "art_culture",       "reason": "Discusses cultural appropriation vs appreciation in fashion"     },     {       "topic": "society_politics",       "reason": "Addresses guidelines for ethical engagement with diverse influences"     }   ],   "conv11": [     {       "topic": "society_politics",       "reason": "Discusses drug policy reform and decriminalization in Mexico"     },     {       "topic": "health",       "reason": "Mentions public health outcomes related to drug policy"     },     {       "topic": "latin_america",       "reason": "Focuses on Mexico's approach to drug policy after cartel violence"     }   ],   "conv12": [     {       "topic": "technology",       "reason": "Discusses predictive policing algorithms and AI systems"     },     {       "topic": "society_politics",       "reason": "Addresses discrimination and oversight in algorithmic policing"     }   ],   "conv13": [     {       "topic": "environment",       "reason": "Discusses increasing bushfire threats and climate adaptation"     },     {       "topic": "society_politics",       "reason": "Addresses land management practices and policy changes"     },     {       "topic": "oceania",       "reason": "Focuses on Australia's response to devastating bushfire seasons"     }   ],   "conv14": [     {       "topic": "art_culture",       "reason": "Discusses growing influence of K-pop in global entertainment"     },     {       "topic": "asia",       "reason": "Focuses on South Korean pop music industry's international success"     }   ],   "conv15": [     {       "topic": "technology",       "reason": "Discusses brain-computer interfaces and their potential applications"     },     {       "topic": "health",       "reason": "Mentions medical and enhancement applications for neural interfaces"     },     {       "topic": "society_politics",       "reason": "Addresses ethical considerations and regulation of neural interfaces"     }   ],   "conv16": [     {       "topic": "society_politics",       "reason": "Discusses future of European Union after Brexit"     },     {       "topic": "europe",       "reason": "Focuses on UK's departure from EU and its impact on European integration"     }   ],   "conv17": [     {       "topic": "society_politics",       "reason": "Discusses preserving endangered languages in digital age"     },     {       "topic": "technology",       "reason": "Mentions digital tools for documentation and revitalization efforts"     }   ],   "conv18": [     {       "topic": "environment",       "reason": "Discusses urban water management and recycling in Singapore"     },     {       "topic": "society_politics",       "reason": "Addresses public education and implementation of water solutions"     },     {       "topic": "asia",       "reason": "Focuses on Singapore's approach to achieving water security"     }   ],   "conv19": [     {       "topic": "environment",       "reason": "Discusses wildlife tourism and its impact on animals"     },     {       "topic": "society_politics",       "reason": "Addresses ethical principles for responsible wildlife tourism"     }   ],   "conv20": [     {       "topic": "economy_work",       "reason": "Discusses economic challenges and recovery prospects in Argentina"     },     {       "topic": "society_politics",       "reason": "Mentions tensions between fiscal discipline and social welfare"     },     {       "topic": "latin_america",       "reason": "Focuses on Argentina's recurring economic crises and reforms"     }   ],   "conv21": [     {       "topic": "education",       "reason": "Discusses school choice policies and their impact on quality"     },     {       "topic": "society_politics",       "reason": "Addresses balancing choice with ensuring quality education for all"     }   ],   "conv22": [     {       "topic": "economy_work",       "reason": "Discusses Saudi Arabia's Vision 2030 economic transformation plan"     },     {       "topic": "society_politics",       "reason": "Mentions modernizing social policies and challenges faced"     },     {       "topic": "middle_east",       "reason": "Focuses on Saudi Arabia's efforts to diversify economy beyond oil"     }   ],   "conv23": [     {       "topic": "health",       "reason": "Discusses rise of telemedicine during COVID-19 pandemic"     },     {       "topic": "technology",       "reason": "Mentions remote healthcare services and regulatory barriers"     }   ],   "conv24": [     {       "topic": "economy_work",       "reason": "Discusses New Zealand's wellbeing budget approach"     },     {       "topic": "society_politics",       "reason": "Addresses evaluating policies based on quality of life metrics"     },     {       "topic": "oceania",       "reason": "Focuses on New Zealand's pioneering wellbeing budget framework"     }   ],   "conv25": [     {       "topic": "health",       "reason": "Discusses gene editing in human embryos to prevent disease"     },     {       "topic": "science",       "reason": "Mentions CRISPR and other gene editing technologies"     },     {       "topic": "society_politics",       "reason": "Addresses ethical considerations and international governance"     }   ],   "conv26": [     {       "topic": "society_politics",       "reason": "Discusses revitalizing rural communities in Japan"     },     {       "topic": "economy_work",       "reason": "Mentions remote work incentives and cultural tourism strategies"     },     {       "topic": "asia",       "reason": "Focuses on Japan's rural areas facing population decline and aging"     }   ],   "conv27": [     {       "topic": "science",       "reason": "Discusses international cooperation in space exploration"     },     {       "topic": "technology",       "reason": "Mentions commercial space activities and joint ventures"     },     {       "topic": "society_politics",       "reason": "Addresses governance frameworks and principles for cooperation"     }   ],   "conv28": [     {       "topic": "environment",       "reason": "Discusses plastic waste management and recycling initiatives"     },     {       "topic": "economy_work",       "reason": "Mentions economic opportunities through community-based efforts"     },     {       "topic": "africa",       "reason": "Focuses on Ghana's approach to addressing plastic pollution"     }   ],   "conv29": [     {       "topic": "art_culture",       "reason": "Discusses historical monuments and public memory debates"     },     {       "topic": "society_politics",       "reason": "Addresses tensions in commemorating complicated historical figures"     }   ],   "conv30": [     {       "topic": "health",       "reason": "Discusses plant-based and cultured meat alternatives' impact on animal welfare"     },     {       "topic": "environment",       "reason": "Mentions reduced environmental impact of alternative proteins"     },     {       "topic": "economy_work",       "reason": "Addresses market growth and adoption factors for alternative proteins"     }   ] }``` |

---

#### Notes
Using Mistral-Large appears to result in
* More accurate assignment of “funny” 
* More accurate assignment of regions

Issues: Assignment of the topics "breaking_news", "economy_work" and "business_finance" could be improved 

---

### Prompt 6 [edit descriptions of “breaking_news”, “economy_work” and “business_finance”]
#### System Instructions:

Your task is to analyze conversations and assign relevant topics from a predefined list.

AVAILABLE TOPICS:
```
[
  {
    "key": "art_culture",
    "label": "Art & Culture",
    "description": "Topics related to visual arts, performing arts, literature, and cultural heritage."
  },
  {
    "key": "business_finance",
    "label": "Business & Finance",
    "description": "Topics covering business operations, financial markets, investments, and corporate strategies."
  },
  {
    "key": "economy_work",
    "label": "Economy & Work",
    "description": "Discussions on macroeconomic trends, employment, labor markets, and workplace dynamics."
  },
  {
    "key": "environment",
    "label": "Environment",
    "description": "Issues related to natural resources, conservation, pollution, biodiversity, and environmental policy."
  },
  {
    "key": "education",
    "label": "Education",
    "description": "Topics covering education systems, learning methods, academic institutions, and educational policies."
  },
  {
    "key": "funny",
    "label": "Funny",
    "description": "Humorous content, jokes, comedy, and entertaining topics meant to amuse."
  },
  {
    "key": "health",
    "label": "Health",
    "description": "Matters related to physical and mental health, healthcare systems, medical research, and wellness."
  },
  {
    "key": "infrastructure",
    "label": "Infrastructure",
    "description": "Topics covering public systems such as transportation, utilities, and communication networks."
  },
  {
    "key": "religion_spirituality",
    "label": "Religion & Spirituality",
    "description": "Discussions on faith, religious practices, spiritual beliefs, and theological concepts."
  },
  {
    "key": "science",
    "label": "Science",
    "description": "Topics related to scientific research, discoveries, theories, and advancements across disciplines."
  },
  {
    "key": "society_politics",
    "label": "Society & Politics",
    "description": "Social issues, political debates, governance, policies, and political events."
  },
  {
    "key": "sports",
    "label": "Sports",
    "description": "Topics about athletic activities, sporting events, teams, athletes, and related competitions."
  },
  {
    "key": "technology",
    "label": "Technology",
    "description": "Discussions about digital innovation, computing, software, hardware, and technological advancements."
  },
  {
    "key": "breaking_news",
    "label": "Breaking News",
    "description": "Urgent news events and significant developments happening globally."
  },
  {
    "key": "africa",
    "label": "Africa",
    "description": "Topics related to North African and Sub-Saharan African countries, including Egypt when in African context."
  },
  {
    "key": "asia",
    "label": "Asia",
    "description": "Topics related to East, South, Southeast, and Central Asian countries, including Russia, Turkey and Caucasus when in Asian context."
  },
  {
    "key": "europe",
    "label": "Europe",
    "description": "Topics related to Western, Eastern, Northern, and Southern European countries, including Russia, Turkey and Caucasus when in European context."
  },
  {
    "key": "latin_america",
    "label": "Latin America",
    "description": "Topics related to Mexico, Central America, South America, and Spanish/Portuguese/French-speaking Caribbean nations."
  },
  {
    "key": "middle_east",
    "label": "Middle East",
    "description": "Topics related to Western Asian countries, including Israel, Turkey and Egypt when in Middle Eastern context."
  },
  {
    "key": "north_america",
    "label": "North America",
    "description": "Topics related to the United States, Canada, and English-speaking Caribbean nations."
  },
  {
    "key": "oceania",
    "label": "Oceania",
    "description": "Topics related to Australia, New Zealand, and Pacific Island nations."
  }
]
```

INSTRUCTIONS:
1. Analyze each conversation in the input JSON.
2. Assign relevant topics from the available topics list for each conversation. Do not use topics not included in the list.
3. For each assigned topic, provide a brief reason (up to 60 characters) explaining why it was assigned.
4. Assign appropriate regional topics (e.g. middle_east) whenever the conversation substantively focuses on the specific region or countries within that region. For countries that could belong to multiple regions (e.g., Russia, Turkey, Egypt), assign the regional topic that best matches the conversation's context.
5. Return your assignments in the specified output format using only the topic keys (not labels).

INPUT JSON SCHEMA:
```json
{
  "type": "object",
  "additionalProperties": {
    "type": "object",
    "properties": {
      "conversationTitle": {
        "type": "string"
      },
      "conversationBody": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "required": [
      "conversationTitle"
    ]
  }
}
```

OUTPUT JSON SCHEMA:
```json
{
  "type": "object",
  "additionalProperties": {
    "type": "array",
    "items": {
      "type": "object",
      "properties": {
        "topic": {
          "type": "string"
        },
        "reason": {
          "type": "string"
        }
      },
      "required": [
        "topic",
        "reason"
      ]
    }
  }
}
```

EXAMPLE INPUT:
```json
{
  "conv1": {
    "conversationTitle": "Project Liberty: Has Europe over-regulated tech?",
    "conversationBody": "It's worthwhile to ask what all this regulation is for. If its goal is a safer internet with better consumer protections, it might be considered more successful. If its goal is to ensure Europe's digital sovereignty, it might be considered less so.\n\nLink to the article: \nhttps://www.linkedin.com/pulse/has-europe-over-regulated-tech-projectliberty-pdaie/?trackingId=Cu3xfkVEALIA9OGoP9WUPA%3D%3D"
  },
  "conv2": {
    "conversationTitle": "Is this widespread adoption of AI dumbing down the future generation?",
    "conversationBody": "With multiple easy-to-use tools becoming more and more accessible, how do we ensure that the current and future generations do not become so dependent on them that we lose our ability to reason and produce high-quality outputs? \n\nNot just the people using AI tools to grow and develop but also for addressing this issue for the general masses. For example, with Google enabling access to information at one's fingertips, there is no longer a need to remember and collect a lot of facts. Similarly, multiple people no longer read lengthy case studies and do assignments themselves and are now dependent on LLMs.\n\nWould love to hear your two cents on the topic!"
  }
}
```

EXPECTED OUTPUT:
```json
{
  "conv1": [
    {
      "topic": "europe",
      "reason": "Focuses on European tech regulation and digital sovereignty"
    },
    {
      "topic": "society_politics",
      "reason": "Discusses regulatory policy and societal protections"
    },
    {
      "topic": "technology",
      "reason": "Relates to tech industry regulation and digital landscape"
    }
  ],
  "conv2": [
    {
      "topic": "education",
      "reason": "Centers on learning, critical thinking, and assignments"
    },
    {
      "topic": "society_politics",
      "reason": "Addresses societal impact of technology dependence"
    },
    {
      "topic": "technology",
      "reason": "Discusses AI tools, LLMs, and technological dependence"
    }
  ]
}
```

Respond ONLY with a valid JSON object matching the output schema.

#### Results
| Prompt | Input | Parameters | Output |
|---|---|---|---|
| 6 | 1 | Temp = 0.2 Top P = 0.7 Top K = 40 | ```json{   "conv1": [     {       "topic": "europe",       "reason": "Discusses Poland and French nuclear deterrent in European context"     },     {       "topic": "society_politics",       "reason": "Focuses on nuclear weapons access and political debate"     }   ],   "conv2": [     {       "topic": "society_politics",       "reason": "Addresses transgender rights and public space access"     },     {       "topic": "europe",       "reason": "Mentions UK Supreme Court ruling and its implications"     },     {       "topic": "health",       "reason": "Relates to public toilet facilities and user experience"     }   ],   "conv3": [     {       "topic": "environment",       "reason": "Discusses environmental impact of consumer choices"     },     {       "topic": "economy_work",       "reason": "Mentions economic constraints affecting consumer choices"     }   ] }v |
| 6 | 2 | Same as above | ```json{   "conv1": [     {       "topic": "technology",       "reason": "Discusses quantum computing and its potential impact"     },     {       "topic": "business_finance",       "reason": "Mentions industries potentially disrupted by quantum computing"     },     {       "topic": "breaking_news",       "reason": "Refers to recent developments in quantum computing"     }   ],   "conv2": [     {       "topic": "education",       "reason": "Centers on learning methods and bootcamp effectiveness"     },     {       "topic": "economy_work",       "reason": "Discusses job market entry and software development careers"     },     {       "topic": "technology",       "reason": "Relates to coding bootcamps and software development"     }   ] }``` |
| 6 | 3 | Same as above | ```json{   "conv1": [     {       "topic": "art_culture",       "reason": "Discusses AI-generated artwork and its impact on art world"     },     {       "topic": "society_politics",       "reason": "Addresses debate on the value and perception of AI-generated art"     },     {       "topic": "technology",       "reason": "Relates to AI tools like Midjourney and DALL-E creating art"     }   ],   "conv2": [     {       "topic": "economy_work",       "reason": "Discusses wages, living costs, and income dependence on tips"     },     {       "topic": "society_politics",       "reason": "Addresses debate on tipping culture and its impact on workers"     }   ],   "conv3": [     {       "topic": "art_culture",       "reason": "Discusses vinyl records, album artwork, and music experience"     },     {       "topic": "technology",       "reason": "Contrasts physical media with digital streaming services"     }   ] }``` |
| 6 | 4 | Same as above | ```json{   "conv1": [     {       "topic": "technology",       "reason": "Discusses AI use in warfare and autonomous decisions"     },     {       "topic": "society_politics",       "reason": "Addresses ethical concerns and policy debates on AI in military"     },     {       "topic": "breaking_news",       "reason": "Refers to recent Pentagon guidelines on AI use in warfare"     }   ],   "conv2": [     {       "topic": "health",       "reason": "Focuses on mental health support and burnout in the workplace"     },     {       "topic": "economy_work",       "reason": "Discusses workplace dynamics and mental health initiatives"     },     {       "topic": "society_politics",       "reason": "Addresses stigma and career repercussions around mental health"     }   ],   "conv3": [     {       "topic": "environment",       "reason": "Centers on carbon offsets and their effectiveness against climate change"     },     {       "topic": "business_finance",       "reason": "Mentions corporate carbon offset programs and alternatives"     },     {       "topic": "science",       "reason": "Discusses research on forestry-based offsets and direct air capture"     }   ],   "conv4": [     {       "topic": "society_politics",       "reason": "Discusses voting systems and their impact on representation and governance"     },     {       "topic": "europe",       "reason": "Focuses on the UK's first-past-the-post system and proportional representation"     }   ],   "conv5": [     {       "topic": "education",       "reason": "Discusses homeschooling, hybrid models, and traditional school systems"     },     {       "topic": "breaking_news",       "reason": "Refers to the impact of the pandemic on homeschooling trends"     }   ],   "conv6": [     {       "topic": "art_culture",       "reason": "Discusses NFTs in the art world and their impact on the art ecosystem"     },     {       "topic": "technology",       "reason": "Focuses on NFTs as a digital technology and its market volatility"     }   ],   "conv7": [     {       "topic": "business_finance",       "reason": "Discusses Central Bank Digital Currencies and their potential impact on banking"     },     {       "topic": "technology",       "reason": "Focuses on digital currencies and their technological implications"     },     {       "topic": "economy_work",       "reason": "Addresses financial inclusion and potential disruption of commercial banks"     }   ],   "conv8": [     {       "topic": "infrastructure",       "reason": "Discusses public transportation, fares, and service improvements"     },     {       "topic": "environment",       "reason": "Mentions environmental benefits of public transit use"     },     {       "topic": "society_politics",       "reason": "Addresses social equity and municipal costs related to fare-free transit"     }   ],   "conv9": [     {       "topic": "sports",       "reason": "Discusses hosting the Olympics and major sporting events"     },     {       "topic": "economy_work",       "reason": "Addresses economic justification and sustainable approaches for host cities"     },     {       "topic": "society_politics",       "reason": "Mentions IOC bidding process reforms and venue reuse"     }   ],   "conv10": [     {       "topic": "religion_spirituality",       "reason": "Discusses mindfulness practices across different religious traditions"     },     {       "topic": "health",       "reason": "Addresses the relationship between secular and religious approaches to contemplative practice"     }   ],   "conv11": [     {       "topic": "asia",       "reason": "Focuses on tensions in the Taiwan Strait and diplomatic efforts in the region"     },     {       "topic": "society_politics",       "reason": "Addresses nationalist rhetoric and factors important for maintaining peace"     },     {       "topic": "breaking_news",       "reason": "Refers to recent military exercises and concerns about potential conflict"     }   ],   "conv12": [     {       "topic": "science",       "reason": "Discusses space exploration, scientific missions, and commercialization"     },     {       "topic": "technology",       "reason": "Focuses on private companies and government agencies involved in space development"     },     {       "topic": "society_politics",       "reason": "Addresses space governance, resource rights, and humanity's future in space"     }   ],   "conv13": [     {       "topic": "africa",       "reason": "Focuses on sustainable urbanization challenges in African megacities"     },     {       "topic": "infrastructure",       "reason": "Discusses innovative approaches to housing, transportation, and utilities"     },     {       "topic": "environment",       "reason": "Addresses sustainable development and opportunities for growing populations"     }   ],   "conv14": [     {       "topic": "art_culture",       "reason": "Discusses the resurgence of traditional crafts in modern Japan"     },     {       "topic": "asia",       "reason": "Focuses on young Japanese artisans and their contemporary designs"     },     {       "topic": "economy_work",       "reason": "Addresses economic viability of traditional crafts in the modern world"     }   ],   "conv15": [     {       "topic": "economy_work",       "reason": "Discusses reshoring and its impact on global manufacturing"     },     {       "topic": "breaking_news",       "reason": "Refers to recent trends in reshoring due to pandemic disruptions and geopolitical tensions"     },     {       "topic": "north_america",       "reason": "Mentions companies in North America bringing production back home"     },     {       "topic": "europe",       "reason": "Mentions companies in Europe bringing production back home"     }   ] }``` |
| 6 | 5 | Same as above | ```json{   "conv1": [     {       "topic": "environment",       "reason": "Discusses rising sea levels and climate change impact"     },     {       "topic": "society_politics",       "reason": "Addresses international obligations and immigration policies"     },     {       "topic": "oceania",       "reason": "Focuses on Pacific island nations like Kiribati and Tuvalu"     }   ],   "conv2": [     {       "topic": "environment",       "reason": "Mentions environmental destruction due to mining"     },     {       "topic": "society_politics",       "reason": "Discusses balancing resource extraction with preservation"     },     {       "topic": "latin_america",       "reason": "Focuses on Brazil's indigenous reserves in the Amazon"     }   ],   "conv3": [     {       "topic": "science",       "reason": "Discusses nuclear fusion energy breakthroughs and challenges"     },     {       "topic": "technology",       "reason": "Mentions commercial viability of fusion power technology"     }   ],   "conv4": [     {       "topic": "society_politics",       "reason": "Discusses urban design changes due to COVID-19 pandemic"     },     {       "topic": "infrastructure",       "reason": "Mentions pedestrian-friendly streets and expanded outdoor dining"     }   ],   "conv5": [     {       "topic": "science",       "reason": "Discusses de-extinction technology and ethical considerations"     },     {       "topic": "environment",       "reason": "Mentions restoring lost biodiversity and preventing extinctions"     }   ],   "conv6": [     {       "topic": "technology",       "reason": "Discusses digital innovation ecosystem in Kenya"     },     {       "topic": "economy_work",       "reason": "Mentions growing startup ecosystem and government investment"     },     {       "topic": "africa",       "reason": "Focuses on Nairobi as one of Africa's leading tech hubs"     }   ],   "conv7": [     {       "topic": "health",       "reason": "Discusses integration of traditional Chinese medicine in healthcare"     },     {       "topic": "society_politics",       "reason": "Addresses standards and regulations for traditional practices"     },     {       "topic": "asia",       "reason": "Focuses on Traditional Chinese Medicine (TCM) practices"     }   ],   "conv8": [     {       "topic": "society_politics",       "reason": "Discusses commercialization and cultural significance of football"     },     {       "topic": "sports",       "reason": "Mentions European football clubs and local connections"     },     {       "topic": "europe",       "reason": "Focuses on European Super League proposal and tensions"     }   ],   "conv9": [     {       "topic": "economy_work",       "reason": "Discusses future employment in automated economies"     },     {       "topic": "technology",       "reason": "Mentions automation and AI transforming industries"     },     {       "topic": "education",       "reason": "Addresses adapting education systems for changing work landscape"     }   ],   "conv10": [     {       "topic": "art_culture",       "reason": "Discusses cultural appropriation vs. appreciation in fashion"     },     {       "topic": "society_politics",       "reason": "Addresses ethical guidelines for cultural exchange in fashion"     }   ],   "conv11": [     {       "topic": "society_politics",       "reason": "Discusses drug policy reform and decriminalization in Mexico"     },     {       "topic": "health",       "reason": "Mentions public health outcomes related to drug policy"     },     {       "topic": "latin_america",       "reason": "Focuses on Mexico's approach to drug policy after cartel violence"     }   ],   "conv12": [     {       "topic": "technology",       "reason": "Discusses predictive policing algorithms and AI systems"     },     {       "topic": "society_politics",       "reason": "Addresses potential discrimination and oversight mechanisms"     }   ],   "conv13": [     {       "topic": "environment",       "reason": "Discusses increasing bushfire threats and climate adaptation"     },     {       "topic": "society_politics",       "reason": "Addresses land management practices and policy changes"     },     {       "topic": "oceania",       "reason": "Focuses on Australia's response to devastating bushfire seasons"     }   ],   "conv14": [     {       "topic": "art_culture",       "reason": "Discusses growing influence of K-pop in global entertainment"     },     {       "topic": "asia",       "reason": "Focuses on South Korean pop music industry's international success"     }   ],   "conv15": [     {       "topic": "technology",       "reason": "Discusses brain-computer interfaces and potential applications"     },     {       "topic": "society_politics",       "reason": "Addresses ethical considerations and regulatory frameworks"     }   ],   "conv16": [     {       "topic": "society_politics",       "reason": "Discusses future of European Union after Brexit"     },     {       "topic": "europe",       "reason": "Focuses on UK's departure from EU and its impact on integration"     }   ],   "conv17": [     {       "topic": "society_politics",       "reason": "Discusses preserving endangered languages in digital age"     },     {       "topic": "technology",       "reason": "Mentions digital tools for documentation and revitalization efforts"     }   ],   "conv18": [     {       "topic": "environment",       "reason": "Discusses urban water management and recycling techniques"     },     {       "topic": "society_politics",       "reason": "Addresses public education and implementation of solutions"     },     {       "topic": "asia",       "reason": "Focuses on Singapore's approach to achieving water security"     }   ],   "conv19": [     {       "topic": "environment",       "reason": "Discusses ethical considerations in wildlife tourism"     },     {       "topic": "society_politics",       "reason": "Addresses principles for responsible wildlife tourism"     }   ],   "conv20": [     {       "topic": "economy_work",       "reason": "Discusses Argentina's economic challenges and recovery prospects"     },     {       "topic": "society_politics",       "reason": "Addresses structural reforms and social welfare priorities"     },     {       "topic": "latin_america",       "reason": "Focuses on Argentina's economic crises and debt burdens"     }   ],   "conv21": [     {       "topic": "education",       "reason": "Discusses school choice policies and educational quality"     },     {       "topic": "society_politics",       "reason": "Addresses balance between choice and ensuring quality education"     }   ],   "conv22": [     {       "topic": "economy_work",       "reason": "Discusses Saudi Arabia's Vision 2030 economic transformation"     },     {       "topic": "society_politics",       "reason": "Addresses challenges and impacts on broader Middle East region"     },     {       "topic": "middle_east",       "reason": "Focuses on Saudi Arabia's ambitious reforms beyond oil dependence"     }   ],   "conv23": [     {       "topic": "health",       "reason": "Discusses rise of telemedicine during COVID-19 pandemic"     },     {       "topic": "technology",       "reason": "Mentions adoption of telehealth services and regulatory barriers"     }   ],   "conv24": [     {       "topic": "economy_work",       "reason": "Discusses New Zealand's wellbeing budget approach"     },     {       "topic": "society_politics",       "reason": "Addresses evaluating policies based on quality of life metrics"     },     {       "topic": "oceania",       "reason": "Focuses on New Zealand's pioneering wellbeing budget framework"     }   ],   "conv25": [     {       "topic": "health",       "reason": "Discusses ethics of gene editing in human embryos"     },     {       "topic": "science",       "reason": "Mentions CRISPR and gene editing technologies for disease prevention"     },     {       "topic": "society_politics",       "reason": "Addresses international governance and oversight of these technologies"     }   ],   "conv26": [     {       "topic": "society_politics",       "reason": "Discusses revitalizing rural communities in Japan"     },     {       "topic": "economy_work",       "reason": "Mentions remote work incentives and cultural tourism strategies"     },     {       "topic": "asia",       "reason": "Focuses on Japan's rural areas facing population decline and aging"     }   ],   "conv27": [     {       "topic": "science",       "reason": "Discusses future of international cooperation in space exploration"     },     {       "topic": "society_politics",       "reason": "Addresses governance frameworks and principles for cooperation"     }   ],   "conv28": [     {       "topic": "environment",       "reason": "Discusses plastic waste management and recycling initiatives"     },     {       "topic": "economy_work",       "reason": "Mentions economic opportunities through community-based efforts"     },     {       "topic": "africa",       "reason": "Focuses on Ghana's innovative programs addressing plastic pollution"     }   ],   "conv29": [     {       "topic": "art_culture",       "reason": "Discusses historical monuments and public memory debates"     },     {       "topic": "society_politics",       "reason": "Addresses decision-making processes for commemorating historical figures"     }   ],   "conv30": [     {       "topic": "health",       "reason": "Discusses plant-based and cultured meat alternatives for improved welfare"     },     {       "topic": "environment",       "reason": "Mentions reduced environmental impact of alternative proteins"     },     {       "topic": "society_politics",       "reason": "Addresses regulatory hurdles and cultural factors affecting adoption"     }   ] }``` |
| 6 | 6 | Same as above | ```json{   "conv1": [     {       "topic": "asia",       "reason": "Focuses on AI tutoring systems in South Korea"     },     {       "topic": "education",       "reason": "Discusses personalized learning and improved scores"     },     {       "topic": "technology",       "reason": "Relates to AI-powered tutoring systems in schools"     }   ],   "conv2": [     {       "topic": "latin_america",       "reason": "Centers on Brazil's World Cup preparations"     },     {       "topic": "sports",       "reason": "Discusses World Cup stadium renovations"     },     {       "topic": "infrastructure",       "reason": "Addresses transportation upgrades and venue readiness"     }   ],   "conv3": [     {       "topic": "funny",       "reason": "Humorous content about a cat's behavior during video calls"     }   ],   "conv4": [     {       "topic": "health",       "reason": "Discusses gene therapy trial for sickle cell disease"     },     {       "topic": "science",       "reason": "Relates to CRISPR-Cas9 gene editing technology"     }   ],   "conv5": [     {       "topic": "europe",       "reason": "Focuses on European Central Bank interest rate increase"     },     {       "topic": "business_finance",       "reason": "Discusses inflation concerns and financial market reactions"     }   ],   "conv6": [     {       "topic": "africa",       "reason": "Centers on Nigeria's solar energy grid project"     },     {       "topic": "environment",       "reason": "Addresses renewable energy and reduced diesel dependence"     }   ],   "conv7": [     {       "topic": "oceania",       "reason": "Focuses on Australia's immigration policies and protests"     },     {       "topic": "society_politics",       "reason": "Discusses refugee detention policies and human rights"     }   ],   "conv8": [     {       "topic": "latin_america",       "reason": "Centers on Mayan murals discovery in Guatemala"     },     {       "topic": "art_culture",       "reason": "Discusses ancient Mayan artwork and calendar systems"     },     {       "topic": "science",       "reason": "Relates to pre-Columbian astronomy and scientific achievements"     }   ],   "conv9": [     {       "topic": "breaking_news",       "reason": "Urgent news about a major earthquake in Turkey"     },     {       "topic": "asia",       "reason": "Focuses on the earthquake's impact in central Turkey"     }   ],   "conv10": [     {       "topic": "north_america",       "reason": "Centers on remote work trends in North America"     },     {       "topic": "economy_work",       "reason": "Discusses employment patterns and population shifts"     }   ] }``` |

---

### Prompt 7 [editing the topic description of “breaking_news” again because the model still flags recent and generally relevant topics as "breaking_news", instead of just new/significant/actually breaking news]
#### System Instructions:
Your task is to analyze conversations and assign relevant topics from a predefined list.

AVAILABLE TOPICS:
```
[
  {
    "key": "art_culture",
    "label": "Art & Culture",
    "description": "Topics related to visual arts, performing arts, literature, and cultural heritage."
  },
  {
    "key": "business_finance",
    "label": "Business & Finance",
    "description": "Topics covering business operations, financial markets, investments, and corporate strategies."
  },
  {
    "key": "economy_work",
    "label": "Economy & Work",
    "description": "Discussions on macroeconomic trends, employment, labor markets, and workplace dynamics."
  },
  {
    "key": "environment",
    "label": "Environment",
    "description": "Issues related to natural resources, conservation, pollution, biodiversity, and environmental policy."
  },
  {
    "key": "education",
    "label": "Education",
    "description": "Topics covering education systems, learning methods, academic institutions, and educational policies."
  },
  {
    "key": "funny",
    "label": "Funny",
    "description": "Humorous content, jokes, comedy, and entertaining topics meant to amuse."
  },
  {
    "key": "health",
    "label": "Health",
    "description": "Matters related to physical and mental health, healthcare systems, medical research, and wellness."
  },
  {
    "key": "infrastructure",
    "label": "Infrastructure",
    "description": "Topics covering public systems such as transportation, utilities, and communication networks."
  },
  {
    "key": "religion_spirituality",
    "label": "Religion & Spirituality",
    "description": "Discussions on faith, religious practices, spiritual beliefs, and theological concepts."
  },
  {
    "key": "science",
    "label": "Science",
    "description": "Topics related to scientific research, discoveries, theories, and advancements across disciplines."
  },
  {
    "key": "society_politics",
    "label": "Society & Politics",
    "description": "Social issues, political debates, governance, policies, and political events."
  },
  {
    "key": "sports",
    "label": "Sports",
    "description": "Topics about athletic activities, sporting events, teams, athletes, and related competitions."
  },
  {
    "key": "technology",
    "label": "Technology",
    "description": "Discussions about digital innovation, computing, software, hardware, and technological advancements."
  },
  {
    "key": "breaking_news",
    "label": "Breaking News",
    "description": "News about major events of immediate public importance that have just occurred or are still unfolding."
  },
  {
    "key": "africa",
    "label": "Africa",
    "description": "Topics related to North African and Sub-Saharan African countries, including Egypt when in African context."
  },
  {
    "key": "asia",
    "label": "Asia",
    "description": "Topics related to East, South, Southeast, and Central Asian countries, including Russia, Turkey and Caucasus when in Asian context."
  },
  {
    "key": "europe",
    "label": "Europe",
    "description": "Topics related to Western, Eastern, Northern, and Southern European countries, including Russia, Turkey and Caucasus when in European context."
  },
  {
    "key": "latin_america",
    "label": "Latin America",
    "description": "Topics related to Mexico, Central America, South America, and Spanish/Portuguese/French-speaking Caribbean nations."
  },
  {
    "key": "middle_east",
    "label": "Middle East",
    "description": "Topics related to Western Asian countries, including Israel, Turkey and Egypt when in Middle Eastern context."
  },
  {
    "key": "north_america",
    "label": "North America",
    "description": "Topics related to the United States, Canada, and English-speaking Caribbean nations."
  },
  {
    "key": "oceania",
    "label": "Oceania",
    "description": "Topics related to Australia, New Zealand, and Pacific Island nations."
  }
]
```

INSTRUCTIONS:
1. Analyze each conversation in the input JSON.
2. Assign relevant topics from the available topics list for each conversation. Do not use topics not included in the list.
3. For each assigned topic, provide a brief reason (up to 60 characters) explaining why it was assigned.
4. Assign appropriate regional topics (e.g. middle_east) whenever the conversation substantively focuses on the specific region or countries within that region. For countries that could belong to multiple regions (e.g., Russia, Turkey, Egypt), assign the regional topic that best matches the conversation's context.
5. Return your assignments in the specified output format using only the topic keys (not labels).

INPUT JSON SCHEMA:
```json
{
  "type": "object",
  "additionalProperties": {
    "type": "object",
    "properties": {
      "conversationTitle": {
        "type": "string"
      },
      "conversationBody": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "required": [
      "conversationTitle"
    ]
  }
}
```

OUTPUT JSON SCHEMA:
```json
{
  "type": "object",
  "additionalProperties": {
    "type": "array",
    "items": {
      "type": "object",
      "properties": {
        "topic": {
          "type": "string"
        },
        "reason": {
          "type": "string"
        }
      },
      "required": [
        "topic",
        "reason"
      ]
    }
  }
}
```

EXAMPLE INPUT:
```json
{
  "conv1": {
    "conversationTitle": "Project Liberty: Has Europe over-regulated tech?",
    "conversationBody": "It's worthwhile to ask what all this regulation is for. If its goal is a safer internet with better consumer protections, it might be considered more successful. If its goal is to ensure Europe's digital sovereignty, it might be considered less so.\n\nLink to the article: \nhttps://www.linkedin.com/pulse/has-europe-over-regulated-tech-projectliberty-pdaie/?trackingId=Cu3xfkVEALIA9OGoP9WUPA%3D%3D"
  },
  "conv2": {
    "conversationTitle": "Is this widespread adoption of AI dumbing down the future generation?",
    "conversationBody": "With multiple easy-to-use tools becoming more and more accessible, how do we ensure that the current and future generations do not become so dependent on them that we lose our ability to reason and produce high-quality outputs? \n\nNot just the people using AI tools to grow and develop but also for addressing this issue for the general masses. For example, with Google enabling access to information at one's fingertips, there is no longer a need to remember and collect a lot of facts. Similarly, multiple people no longer read lengthy case studies and do assignments themselves and are now dependent on LLMs.\n\nWould love to hear your two cents on the topic!"
  }
}
```

EXPECTED OUTPUT:
```json
{
  "conv1": [
    {
      "topic": "europe",
      "reason": "Focuses on European tech regulation and digital sovereignty"
    },
    {
      "topic": "society_politics",
      "reason": "Discusses regulatory policy and societal protections"
    },
    {
      "topic": "technology",
      "reason": "Relates to tech industry regulation and digital landscape"
    }
  ],
  "conv2": [
    {
      "topic": "education",
      "reason": "Centers on learning, critical thinking, and assignments"
    },
    {
      "topic": "society_politics",
      "reason": "Addresses societal impact of technology dependence"
    },
    {
      "topic": "technology",
      "reason": "Discusses AI tools, LLMs, and technological dependence"
    }
  ]
}
```

Respond ONLY with a valid JSON object matching the output schema.

#### Results
| Prompt | Input | Parameters | Output |
|---|---|---|---|
| 7 | 1 | Temp = 0.2 Top P = 0.7 Top K = 40 | ```json{   "conv1": [     {       "topic": "europe",       "reason": "Discusses Poland's potential access to nuclear weapons under French protection"     },     {       "topic": "society_politics",       "reason": "Centers on political debate about nuclear deterrents and European alliances"     },     {       "topic": "breaking_news",       "reason": "Covers recent news about Poland's interest in French nuclear deterrent"     }   ],   "conv2": [     {       "topic": "society_politics",       "reason": "Addresses transgender rights, public spaces, and societal acceptance"     },     {       "topic": "europe",       "reason": "Focuses on UK Supreme Court ruling affecting transgender individuals"     },     {       "topic": "health",       "reason": "Relates to access to public facilities and well-being of transgender individuals"     }   ],   "conv3": [     {       "topic": "environment",       "reason": "Discusses environmental impact of consumer choices and product materials"     },     {       "topic": "economy_work",       "reason": "Mentions economic constraints affecting consumer choices for sustainable products"     },     {       "topic": "society_politics",       "reason": "Addresses societal stigma and personal responsibility in consumerism"     }   ] }``` |
| 7 | 2 | Same as above | ```json{   "conv1": [     {       "topic": "technology",       "reason": "Discusses quantum computing and its potential impact"     },     {       "topic": "business_finance",       "reason": "Mentions industries potentially disrupted by quantum computing"     },     {       "topic": "breaking_news",       "reason": "Refers to recent developments in quantum computing"     }   ],   "conv2": [     {       "topic": "education",       "reason": "Centers on learning methods and bootcamp effectiveness"     },     {       "topic": "economy_work",       "reason": "Addresses job market entry and software development careers"     },     {       "topic": "technology",       "reason": "Discusses coding bootcamps and software development"     }   ] }``` |

#### Note
Stopping testing of this prompt at this point because it results in the same error i.e. classifying recent-but-not-urgent news as breaking news. 

---

### Prompt 8 [further editing the description of "breaking_news"]
#### System Instructions:
Your task is to analyze conversations and assign relevant topics from a predefined list.

AVAILABLE TOPICS:
```
[
  {
    "key": "art_culture",
    "label": "Art & Culture",
    "description": "Topics related to visual arts, performing arts, literature, and cultural heritage."
  },
  {
    "key": "business_finance",
    "label": "Business & Finance",
    "description": "Topics covering business operations, financial markets, investments, and corporate strategies."
  },
  {
    "key": "economy_work",
    "label": "Economy & Work",
    "description": "Discussions on macroeconomic trends, employment, labor markets, and workplace dynamics."
  },
  {
    "key": "environment",
    "label": "Environment",
    "description": "Issues related to natural resources, conservation, pollution, biodiversity, and environmental policy."
  },
  {
    "key": "education",
    "label": "Education",
    "description": "Topics covering education systems, learning methods, academic institutions, and educational policies."
  },
  {
    "key": "funny",
    "label": "Funny",
    "description": "Humorous content, jokes, comedy, and entertaining topics meant to amuse."
  },
  {
    "key": "health",
    "label": "Health",
    "description": "Matters related to physical and mental health, healthcare systems, medical research, and wellness."
  },
  {
    "key": "infrastructure",
    "label": "Infrastructure",
    "description": "Topics covering public systems such as transportation, utilities, and communication networks."
  },
  {
    "key": "religion_spirituality",
    "label": "Religion & Spirituality",
    "description": "Discussions on faith, religious practices, spiritual beliefs, and theological concepts."
  },
  {
    "key": "science",
    "label": "Science",
    "description": "Topics related to scientific research, discoveries, theories, and advancements across disciplines."
  },
  {
    "key": "society_politics",
    "label": "Society & Politics",
    "description": "Social issues, political debates, governance, policies, and political events."
  },
  {
    "key": "sports",
    "label": "Sports",
    "description": "Topics about athletic activities, sporting events, teams, athletes, and related competitions."
  },
  {
    "key": "technology",
    "label": "Technology",
    "description": "Discussions about digital innovation, computing, software, hardware, and technological advancements."
  },
  {
    "key": "breaking_news",
    "label": "Breaking News",
    "description": "News about major, unexpected events of immediate public importance that have just occurred or are actively unfolding. Does not include general trends or recent but routine developments."
  },
  {
    "key": "africa",
    "label": "Africa",
    "description": "Topics related to North African and Sub-Saharan African countries, including Egypt when in African context."
  },
  {
    "key": "asia",
    "label": "Asia",
    "description": "Topics related to East, South, Southeast, and Central Asian countries, including Russia, Turkey and Caucasus when in Asian context."
  },
  {
    "key": "europe",
    "label": "Europe",
    "description": "Topics related to Western, Eastern, Northern, and Southern European countries, including Russia, Turkey and Caucasus when in European context."
  },
  {
    "key": "latin_america",
    "label": "Latin America",
    "description": "Topics related to Mexico, Central America, South America, and Spanish/Portuguese/French-speaking Caribbean nations."
  },
  {
    "key": "middle_east",
    "label": "Middle East",
    "description": "Topics related to Western Asian countries, including Israel, Turkey and Egypt when in Middle Eastern context."
  },
  {
    "key": "north_america",
    "label": "North America",
    "description": "Topics related to the United States, Canada, and English-speaking Caribbean nations."
  },
  {
    "key": "oceania",
    "label": "Oceania",
    "description": "Topics related to Australia, New Zealand, and Pacific Island nations."
  }
]
```

INSTRUCTIONS:
1. Analyze each conversation in the input JSON.
2. Assign relevant topics from the available topics list for each conversation. Do not use topics not included in the list.
3. For each assigned topic, provide a brief reason (up to 60 characters) explaining why it was assigned.
4. Assign appropriate regional topics (e.g. middle_east) whenever the conversation substantively focuses on the specific region or countries within that region. For countries that could belong to multiple regions (e.g., Russia, Turkey, Egypt), assign the regional topic that best matches the conversation's context.
5. Return your assignments in the specified output format using only the topic keys (not labels).

INPUT JSON SCHEMA:
```json
{
  "type": "object",
  "additionalProperties": {
    "type": "object",
    "properties": {
      "conversationTitle": {
        "type": "string"
      },
      "conversationBody": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "required": [
      "conversationTitle"
    ]
  }
}
```

OUTPUT JSON SCHEMA:
```json
{
  "type": "object",
  "additionalProperties": {
    "type": "array",
    "items": {
      "type": "object",
      "properties": {
        "topic": {
          "type": "string"
        },
        "reason": {
          "type": "string"
        }
      },
      "required": [
        "topic",
        "reason"
      ]
    }
  }
}
```

EXAMPLE INPUT:
```json
{
  "conv1": {
    "conversationTitle": "Project Liberty: Has Europe over-regulated tech?",
    "conversationBody": "It's worthwhile to ask what all this regulation is for. If its goal is a safer internet with better consumer protections, it might be considered more successful. If its goal is to ensure Europe's digital sovereignty, it might be considered less so.\n\nLink to the article: \nhttps://www.linkedin.com/pulse/has-europe-over-regulated-tech-projectliberty-pdaie/?trackingId=Cu3xfkVEALIA9OGoP9WUPA%3D%3D"
  },
  "conv2": {
    "conversationTitle": "Is this widespread adoption of AI dumbing down the future generation?",
    "conversationBody": "With multiple easy-to-use tools becoming more and more accessible, how do we ensure that the current and future generations do not become so dependent on them that we lose our ability to reason and produce high-quality outputs? \n\nNot just the people using AI tools to grow and develop but also for addressing this issue for the general masses. For example, with Google enabling access to information at one's fingertips, there is no longer a need to remember and collect a lot of facts. Similarly, multiple people no longer read lengthy case studies and do assignments themselves and are now dependent on LLMs.\n\nWould love to hear your two cents on the topic!"
  }
}
```

EXPECTED OUTPUT:
```json
{
  "conv1": [
    {
      "topic": "europe",
      "reason": "Focuses on European tech regulation and digital sovereignty"
    },
    {
      "topic": "society_politics",
      "reason": "Discusses regulatory policy and societal protections"
    },
    {
      "topic": "technology",
      "reason": "Relates to tech industry regulation and digital landscape"
    }
  ],
  "conv2": [
    {
      "topic": "education",
      "reason": "Centers on learning, critical thinking, and assignments"
    },
    {
      "topic": "society_politics",
      "reason": "Addresses societal impact of technology dependence"
    },
    {
      "topic": "technology",
      "reason": "Discusses AI tools, LLMs, and technological dependence"
    }
  ]
}
```

Respond ONLY with a valid JSON object matching the output schema.

#### Results
| Prompt | Input | Parameters | Output |
|---|---|---|---|
| 8 | 1 | Temp = 0.2 Top P = 0.7 Top K = 40 | ```json{   "conv1": [     {       "topic": "europe",       "reason": "Discusses Poland's potential access to nuclear weapons under French protection"     },     {       "topic": "society_politics",       "reason": "Centers on political debate about nuclear deterrents and European alliances"     }   ],   "conv2": [     {       "topic": "society_politics",       "reason": "Addresses transgender rights, public spaces, and gender-neutral facilities"     },     {       "topic": "europe",       "reason": "Focuses on UK Supreme Court ruling and its implications for transgender individuals"     }   ],   "conv3": [     {       "topic": "environment",       "reason": "Discusses consumer impact on the environment through product choices"     },     {       "topic": "economy_work",       "reason": "Mentions economic constraints affecting consumer choices for sustainable products"     }   ] }``` |
| 8 | 2 | Same as above | ```json{   "conv1": [     {       "topic": "technology",       "reason": "Discusses quantum computing and its potential impact"     },     {       "topic": "business_finance",       "reason": "Mentions industries potentially disrupted by quantum computing"     },     {       "topic": "breaking_news",       "reason": "Refers to recent developments in quantum computing"     }   ],   "conv2": [     {       "topic": "education",       "reason": "Centers on learning methods and bootcamp effectiveness"     },     {       "topic": "economy_work",       "reason": "Addresses job market entry and career preparation"     },     {       "topic": "technology",       "reason": "Discusses software development and coding bootcamps"     }   ] }``` |
| 8 | 3 | Same as above | ```{   "conv1": [     {       "topic": "art_culture",       "reason": "Discusses the definition and value of AI-generated art"     },     {       "topic": "society_politics",       "reason": "Addresses debate and varying opinions on AI art in society"     },     {       "topic": "technology",       "reason": "Relates to AI tools like Midjourney and DALL-E creating art"     }   ],   "conv2": [     {       "topic": "economy_work",       "reason": "Discusses wages, living expenses, and income sources for workers"     },     {       "topic": "society_politics",       "reason": "Addresses debate on tipping culture and its impact on workers and customers"     }   ],   "conv3": [     {       "topic": "art_culture",       "reason": "Discusses the revival of vinyl records and appreciation for physical media"     },     {       "topic": "technology",       "reason": "Contrasts physical media with digital streaming services"     }   ] }``` |
| 8 | 4 | Same as above | ```json{   "conv1": [     {       "topic": "technology",       "reason": "Discusses AI use in warfare and autonomous decisions"     },     {       "topic": "society_politics",       "reason": "Addresses ethical concerns and policy debates around AI"     },     {       "topic": "breaking_news",       "reason": "Mentions recent Pentagon guidelines for AI in warfare"     }   ],   "conv2": [     {       "topic": "health",       "reason": "Focuses on mental health support and burnout in workplaces"     },     {       "topic": "economy_work",       "reason": "Discusses workplace dynamics and employee benefits"     },     {       "topic": "society_politics",       "reason": "Addresses stigma and social issues around mental health"     }   ],   "conv3": [     {       "topic": "environment",       "reason": "Centers on carbon offsets and their effectiveness against climate change"     },     {       "topic": "business_finance",       "reason": "Discusses corporate strategies and alternative solutions"     },     {       "topic": "science",       "reason": "Mentions research on forestry-based offsets and direct air capture"     }   ],   "conv4": [     {       "topic": "society_politics",       "reason": "Discusses voting systems and their impact on representation and governance"     },     {       "topic": "europe",       "reason": "Focuses on the UK's first-past-the-post system and potential reforms"     }   ],   "conv5": [     {       "topic": "education",       "reason": "Discusses homeschooling, hybrid models, and school systems"     },     {       "topic": "society_politics",       "reason": "Addresses the impact of the pandemic on education and potential policy changes"     }   ],   "conv6": [     {       "topic": "art_culture",       "reason": "Focuses on NFTs in the art world and their impact on artists and institutions"     },     {       "topic": "technology",       "reason": "Discusses NFTs as a digital technology and its market volatility"     }   ],   "conv7": [     {       "topic": "business_finance",       "reason": "Discusses Central Bank Digital Currencies and their potential impact on banking"     },     {       "topic": "technology",       "reason": "Focuses on digital currencies and their technological implications"     },     {       "topic": "economy_work",       "reason": "Addresses financial inclusion and potential disruption of commercial banks"     }   ],   "conv8": [     {       "topic": "society_politics",       "reason": "Discusses public transportation policies and social equity"     },     {       "topic": "infrastructure",       "reason": "Focuses on public transit systems and potential improvements"     },     {       "topic": "environment",       "reason": "Mentions environmental benefits of encouraging public transportation use"     }   ],   "conv9": [     {       "topic": "sports",       "reason": "Discusses hosting major sporting events, specifically the Olympics"     },     {       "topic": "economy_work",       "reason": "Addresses economic justification and sustainable approaches for host cities"     }   ],   "conv10": [     {       "topic": "religion_spirituality",       "reason": "Discusses mindfulness practices across various religious traditions"     },     {       "topic": "society_politics",       "reason": "Addresses the relationship between secular and religious approaches to contemplative practice"     }   ],   "conv11": [     {       "topic": "asia",       "reason": "Focuses on tensions in the Taiwan Strait and diplomatic efforts in the region"     },     {       "topic": "society_politics",       "reason": "Discusses nationalist rhetoric and factors important for maintaining peace"     }   ],   "conv12": [     {       "topic": "science",       "reason": "Discusses space exploration and scientific missions"     },     {       "topic": "technology",       "reason": "Focuses on private companies and their impact on space access and development"     }   ],   "conv13": [     {       "topic": "africa",       "reason": "Focuses on sustainable urbanization challenges in African megacities"     },     {       "topic": "infrastructure",       "reason": "Discusses innovative approaches to housing, transportation, and utilities"     },     {       "topic": "environment",       "reason": "Addresses sustainable development for growing urban populations"     }   ],   "conv14": [     {       "topic": "art_culture",       "reason": "Discusses the resurgence of traditional crafts in modern Japan"     },     {       "topic": "asia",       "reason": "Focuses on Japanese artisans and their contemporary designs and practices"     }   ],   "conv15": [     {       "topic": "economy_work",       "reason": "Discusses reshoring and its impact on global manufacturing and economic development"     },     {       "topic": "north_america",       "reason": "Mentions companies in North America bringing production back home"     },     {       "topic": "europe",       "reason": "Mentions companies in Europe bringing production back home"     }   ] }``` |
| 8 | 5 | Same as above | ```json{   "conv1": [     {       "topic": "environment",       "reason": "Discusses rising sea levels and climate change impact"     },     {       "topic": "society_politics",       "reason": "Addresses international obligations and immigration policies"     },     {       "topic": "oceania",       "reason": "Focuses on Pacific island nations like Kiribati and Tuvalu"     }   ],   "conv2": [     {       "topic": "environment",       "reason": "Mentions environmental destruction due to mining"     },     {       "topic": "society_politics",       "reason": "Discusses balancing resource extraction with preservation"     },     {       "topic": "latin_america",       "reason": "Focuses on Brazil's indigenous reserves in the Amazon"     }   ],   "conv3": [     {       "topic": "science",       "reason": "Discusses nuclear fusion energy breakthroughs and challenges"     },     {       "topic": "technology",       "reason": "Mentions commercial viability of fusion power technology"     }   ],   "conv4": [     {       "topic": "society_politics",       "reason": "Discusses urban design changes due to COVID-19 pandemic"     },     {       "topic": "infrastructure",       "reason": "Mentions pedestrian-friendly streets and expanded outdoor dining"     }   ],   "conv5": [     {       "topic": "science",       "reason": "Discusses de-extinction technology and ethical considerations"     },     {       "topic": "environment",       "reason": "Mentions restoring lost biodiversity and preventing extinctions"     }   ],   "conv6": [     {       "topic": "technology",       "reason": "Discusses digital innovation ecosystem in Kenya"     },     {       "topic": "economy_work",       "reason": "Mentions growing startup ecosystem and government investment"     },     {       "topic": "africa",       "reason": "Focuses on Nairobi as one of Africa's leading tech hubs"     }   ],   "conv7": [     {       "topic": "health",       "reason": "Discusses integration of traditional Chinese medicine in healthcare"     },     {       "topic": "society_politics",       "reason": "Addresses standards and regulations for traditional practices"     },     {       "topic": "asia",       "reason": "Focuses on Traditional Chinese Medicine (TCM) practices"     }   ],   "conv8": [     {       "topic": "society_politics",       "reason": "Discusses commercialization and cultural significance of football"     },     {       "topic": "sports",       "reason": "Mentions European football clubs and local connections"     },     {       "topic": "europe",       "reason": "Focuses on European Super League proposal and tensions"     }   ],   "conv9": [     {       "topic": "economy_work",       "reason": "Discusses future employment in automated economies"     },     {       "topic": "technology",       "reason": "Mentions automation and AI transforming industries"     },     {       "topic": "education",       "reason": "Addresses adapting education systems for changing work landscape"     }   ],   "conv10": [     {       "topic": "art_culture",       "reason": "Discusses cultural appropriation vs appreciation in fashion"     },     {       "topic": "society_politics",       "reason": "Addresses guidelines for ethical engagement with diverse influences"     }   ],   "conv11": [     {       "topic": "society_politics",       "reason": "Discusses drug policy reform and decriminalization in Mexico"     },     {       "topic": "health",       "reason": "Mentions public health outcomes related to drug policy"     },     {       "topic": "latin_america",       "reason": "Focuses on Mexico's approach to drug policy after cartel violence"     }   ],   "conv12": [     {       "topic": "society_politics",       "reason": "Discusses ethics of predictive policing algorithms and discrimination"     },     {       "topic": "technology",       "reason": "Mentions AI systems used by law enforcement agencies"     }   ],   "conv13": [     {       "topic": "environment",       "reason": "Discusses increasing bushfire threats and climate adaptation"     },     {       "topic": "society_politics",       "reason": "Addresses land management practices and policy changes"     },     {       "topic": "oceania",       "reason": "Focuses on Australia's response to devastating bushfire seasons"     }   ],   "conv14": [     {       "topic": "art_culture",       "reason": "Discusses growing influence of K-pop in global entertainment"     },     {       "topic": "asia",       "reason": "Focuses on South Korean pop music industry's international success"     }   ],   "conv15": [     {       "topic": "science",       "reason": "Discusses ethical considerations in brain-computer interfaces"     },     {       "topic": "technology",       "reason": "Mentions companies developing implantable brain-computer interfaces"     }   ],   "conv16": [     {       "topic": "society_politics",       "reason": "Discusses future of European Union after Brexit"     },     {       "topic": "europe",       "reason": "Focuses on UK's departure from EU and its impact on European integration"     }   ],   "conv17": [     {       "topic": "society_politics",       "reason": "Discusses preserving endangered languages in digital age"     },     {       "topic": "technology",       "reason": "Mentions digital tools for documentation and revitalization efforts"     }   ],   "conv18": [     {       "topic": "environment",       "reason": "Discusses urban water management and recycling in Singapore"     },     {       "topic": "society_politics",       "reason": "Addresses public education and implementation of water solutions"     },     {       "topic": "asia",       "reason": "Focuses on Singapore's approach to achieving water security"     }   ],   "conv19": [     {       "topic": "environment",       "reason": "Discusses ethical principles in wildlife tourism"     },     {       "topic": "society_politics",       "reason": "Addresses responsible wildlife tourism and distinguishing ethical operations"     }   ],   "conv20": [     {       "topic": "economy_work",       "reason": "Discusses Argentina's economic challenges and recovery prospects"     },     {       "topic": "society_politics",       "reason": "Mentions structural reforms and tensions between fiscal discipline and welfare"     },     {       "topic": "latin_america",       "reason": "Focuses on Argentina's economic crises and growth constraints"     }   ],   "conv21": [     {       "topic": "education",       "reason": "Discusses school choice policies and their impact on educational quality"     },     {       "topic": "society_politics",       "reason": "Addresses balancing choice with ensuring quality education for all students"     }   ],   "conv22": [     {       "topic": "economy_work",       "reason": "Discusses Saudi Arabia's Vision 2030 economic transformation plan"     },     {       "topic": "society_politics",       "reason": "Mentions modernizing social policies and developing new sectors"     },     {       "topic": "middle_east",       "reason": "Focuses on Saudi Arabia's efforts to diversify economy beyond oil dependence"     }   ],   "conv23": [     {       "topic": "health",       "reason": "Discusses rise of telemedicine during COVID-19 pandemic"     },     {       "topic": "technology",       "reason": "Mentions adoption of telehealth services and regulatory barriers"     }   ],   "conv24": [     {       "topic": "economy_work",       "reason": "Discusses New Zealand's wellbeing budget approach"     },     {       "topic": "society_politics",       "reason": "Addresses evaluating policies based on quality of life metrics beyond GDP"     },     {       "topic": "oceania",       "reason": "Focuses on New Zealand's pioneering wellbeing budget framework"     }   ],   "conv25": [     {       "topic": "science",       "reason": "Discusses ethics of gene editing in human embryos"     },     {       "topic": "health",       "reason": "Mentions preventing disease or enhancing traits through gene editing"     }   ],   "conv26": [     {       "topic": "society_politics",       "reason": "Discusses revitalizing rural communities in Japan"     },     {       "topic": "economy_work",       "reason": "Mentions remote work incentives and cultural tourism to attract residents"     },     {       "topic": "asia",       "reason": "Focuses on Japan's rural areas facing population decline and aging"     }   ],   "conv27": [     {       "topic": "science",       "reason": "Discusses future of international cooperation in space exploration"     },     {       "topic": "society_politics",       "reason": "Addresses governance frameworks and principles for cooperation"     }   ],   "conv28": [     {       "topic": "environment",       "reason": "Discusses plastic waste management and recycling initiatives in Ghana"     },     {       "topic": "economy_work",       "reason": "Mentions economic opportunities created by community-based recycling efforts"     },     {       "topic": "africa",       "reason": "Focuses on Ghana's innovative programs to address plastic pollution"     }   ],   "conv29": [     {       "topic": "art_culture",       "reason": "Discusses historical monuments and public memory"     },     {       "topic": "society_politics",       "reason": "Addresses tensions in commemorating complicated historical figures"     }   ],   "conv30": [     {       "topic": "health",       "reason": "Discusses plant-based and cultured meat alternatives' impact on animal welfare"     },     {       "topic": "environment",       "reason": "Mentions reduced environmental impact of alternative proteins"     },     {       "topic": "society_politics",       "reason": "Addresses regulatory and cultural hurdles for lab-grown meat technologies"     }   ] }``` |
| 8 | 6 | Same as above | ```json{   "conv1": [     {       "topic": "asia",       "reason": "Discusses AI tutoring systems in South Korean schools"     },     {       "topic": "education",       "reason": "Focuses on classroom learning and personalized tutoring"     },     {       "topic": "technology",       "reason": "Relates to AI-powered tutoring systems and their impact"     }   ],   "conv2": [     {       "topic": "latin_america",       "reason": "Focuses on Brazil's World Cup preparations"     },     {       "topic": "infrastructure",       "reason": "Discusses stadium renovations and transportation upgrades"     },     {       "topic": "sports",       "reason": "Relates to the upcoming World Cup and venue preparations"     }   ],   "conv3": [     {       "topic": "funny",       "reason": "Shares a humorous anecdote about a cat during video calls"     }   ],   "conv4": [     {       "topic": "health",       "reason": "Discusses gene therapy trial for sickle cell disease"     },     {       "topic": "science",       "reason": "Relates to CRISPR-Cas9 gene editing and its medical applications"     }   ],   "conv5": [     {       "topic": "europe",       "reason": "Focuses on European Central Bank interest rate increase"     },     {       "topic": "business_finance",       "reason": "Discusses financial markets and banking stocks reaction"     },     {       "topic": "economy_work",       "reason": "Relates to inflation concerns and interest rate hikes"     }   ],   "conv6": [     {       "topic": "africa",       "reason": "Discusses Nigeria's new solar energy grid project"     },     {       "topic": "environment",       "reason": "Relates to renewable energy and reducing diesel generator dependence"     }   ],   "conv7": [     {       "topic": "oceania",       "reason": "Focuses on Australia's controversial immigration policies"     },     {       "topic": "society_politics",       "reason": "Discusses refugee detention policies and human rights concerns"     }   ],   "conv8": [     {       "topic": "latin_america",       "reason": "Discusses ancient Mayan murals discovered in Guatemala"     },     {       "topic": "art_culture",       "reason": "Relates to Mayan temple complex artwork and calendar systems"     },     {       "topic": "science",       "reason": "Discusses pre-Columbian astronomy and scientific achievements"     }   ],   "conv9": [     {       "topic": "breaking_news",       "reason": "Reports a major earthquake in central Turkey"     },     {       "topic": "asia",       "reason": "Focuses on the earthquake's impact in Turkey"     }   ],   "conv10": [     {       "topic": "north_america",       "reason": "Discusses remote work trends across North America"     },     {       "topic": "economy_work",       "reason": "Relates to employment patterns and population shifts"     },     {       "topic": "society_politics",       "reason": "Discusses urban development and company strategies"     }   ] }``` |

---

### Prompt 9 [further editing description of "breaking_news"]
#### System Instructions:

Your task is to analyze conversations and assign relevant topics from a predefined list.

AVAILABLE TOPICS:
```
[
  {
    "key": "art_culture",
    "label": "Art & Culture",
    "description": "Topics related to visual arts, performing arts, literature, and cultural heritage."
  },
  {
    "key": "business_finance",
    "label": "Business & Finance",
    "description": "Topics covering business operations, financial markets, investments, and corporate strategies."
  },
  {
    "key": "economy_work",
    "label": "Economy & Work",
    "description": "Discussions on macroeconomic trends, employment, labor markets, and workplace dynamics."
  },
  {
    "key": "environment",
    "label": "Environment",
    "description": "Issues related to natural resources, conservation, pollution, biodiversity, and environmental policy."
  },
  {
    "key": "education",
    "label": "Education",
    "description": "Topics covering education systems, learning methods, academic institutions, and educational policies."
  },
  {
    "key": "funny",
    "label": "Funny",
    "description": "Humorous content, jokes, comedy, and entertaining topics meant to amuse."
  },
  {
    "key": "health",
    "label": "Health",
    "description": "Matters related to physical and mental health, healthcare systems, medical research, and wellness."
  },
  {
    "key": "infrastructure",
    "label": "Infrastructure",
    "description": "Topics covering public systems such as transportation, utilities, and communication networks."
  },
  {
    "key": "religion_spirituality",
    "label": "Religion & Spirituality",
    "description": "Discussions on faith, religious practices, spiritual beliefs, and theological concepts."
  },
  {
    "key": "science",
    "label": "Science",
    "description": "Topics related to scientific research, discoveries, theories, and advancements across disciplines."
  },
  {
    "key": "society_politics",
    "label": "Society & Politics",
    "description": "Social issues, political debates, governance, policies, and political events."
  },
  {
    "key": "sports",
    "label": "Sports",
    "description": "Topics about athletic activities, sporting events, teams, athletes, and related competitions."
  },
  {
    "key": "technology",
    "label": "Technology",
    "description": "Discussions about digital innovation, computing, software, hardware, and technological advancements."
  },
  {
    "key": "breaking_news",
    "label": "Breaking News",
    "description": "News about major, unexpected events of immediate public concern that have just occurred or are actively unfolding. Does not include general trends or recent-but-not-urgent developments."
  },
  {
    "key": "africa",
    "label": "Africa",
    "description": "Topics related to North African and Sub-Saharan African countries, including Egypt when in African context."
  },
  {
    "key": "asia",
    "label": "Asia",
    "description": "Topics related to East, South, Southeast, and Central Asian countries, including Russia, Turkey and Caucasus when in Asian context."
  },
  {
    "key": "europe",
    "label": "Europe",
    "description": "Topics related to Western, Eastern, Northern, and Southern European countries, including Russia, Turkey and Caucasus when in European context."
  },
  {
    "key": "latin_america",
    "label": "Latin America",
    "description": "Topics related to Mexico, Central America, South America, and Spanish/Portuguese/French-speaking Caribbean nations."
  },
  {
    "key": "middle_east",
    "label": "Middle East",
    "description": "Topics related to Western Asian countries, including Israel, Turkey and Egypt when in Middle Eastern context."
  },
  {
    "key": "north_america",
    "label": "North America",
    "description": "Topics related to the United States, Canada, and English-speaking Caribbean nations."
  },
  {
    "key": "oceania",
    "label": "Oceania",
    "description": "Topics related to Australia, New Zealand, and Pacific Island nations."
  }
]
```

INSTRUCTIONS:
1. Analyze each conversation in the input JSON.
2. Assign relevant topics from the available topics list for each conversation. Do not use topics not included in the list.
3. For each assigned topic, provide a brief reason (up to 60 characters) explaining why it was assigned.
4. Assign appropriate regional topics (e.g. middle_east) whenever the conversation substantively focuses on the specific region or countries within that region. For countries that could belong to multiple regions (e.g., Russia, Turkey, Egypt), assign the regional topic that best matches the conversation's context.
5. Return your assignments in the specified output format using only the topic keys (not labels).

INPUT JSON SCHEMA:
```json
{
  "type": "object",
  "additionalProperties": {
    "type": "object",
    "properties": {
      "conversationTitle": {
        "type": "string"
      },
      "conversationBody": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "required": [
      "conversationTitle"
    ]
  }
}
```

OUTPUT JSON SCHEMA:
```json
{
  "type": "object",
  "additionalProperties": {
    "type": "array",
    "items": {
      "type": "object",
      "properties": {
        "topic": {
          "type": "string"
        },
        "reason": {
          "type": "string"
        }
      },
      "required": [
        "topic",
        "reason"
      ]
    }
  }
}
```

EXAMPLE INPUT:
```json
{
  "conv1": {
    "conversationTitle": "Project Liberty: Has Europe over-regulated tech?",
    "conversationBody": "It's worthwhile to ask what all this regulation is for. If its goal is a safer internet with better consumer protections, it might be considered more successful. If its goal is to ensure Europe's digital sovereignty, it might be considered less so.\n\nLink to the article: \nhttps://www.linkedin.com/pulse/has-europe-over-regulated-tech-projectliberty-pdaie/?trackingId=Cu3xfkVEALIA9OGoP9WUPA%3D%3D"
  },
  "conv2": {
    "conversationTitle": "Is this widespread adoption of AI dumbing down the future generation?",
    "conversationBody": "With multiple easy-to-use tools becoming more and more accessible, how do we ensure that the current and future generations do not become so dependent on them that we lose our ability to reason and produce high-quality outputs? \n\nNot just the people using AI tools to grow and develop but also for addressing this issue for the general masses. For example, with Google enabling access to information at one's fingertips, there is no longer a need to remember and collect a lot of facts. Similarly, multiple people no longer read lengthy case studies and do assignments themselves and are now dependent on LLMs.\n\nWould love to hear your two cents on the topic!"
  }
}
```

EXPECTED OUTPUT:
```json
{
  "conv1": [
    {
      "topic": "europe",
      "reason": "Focuses on European tech regulation and digital sovereignty"
    },
    {
      "topic": "society_politics",
      "reason": "Discusses regulatory policy and societal protections"
    },
    {
      "topic": "technology",
      "reason": "Relates to tech industry regulation and digital landscape"
    }
  ],
  "conv2": [
    {
      "topic": "education",
      "reason": "Centers on learning, critical thinking, and assignments"
    },
    {
      "topic": "society_politics",
      "reason": "Addresses societal impact of technology dependence"
    },
    {
      "topic": "technology",
      "reason": "Discusses AI tools, LLMs, and technological dependence"
    }
  ]
}
```

Respond ONLY with a valid JSON object matching the output schema.

---

#### Results
| Prompt | Input | Parameters | Output |
|---|---|---|---|
| 9 | 1 | Temp = 0.2 Top P = 0.7 Top K = 40 | ```json{   "conv1": [     {       "topic": "europe",       "reason": "Discusses Poland's potential access to nuclear weapons"     },     {       "topic": "society_politics",       "reason": "Centers on political debate about nuclear deterrents"     },     {       "topic": "breaking_news",       "reason": "Covers recent news about France's nuclear umbrella proposal"     }   ],   "conv2": [     {       "topic": "society_politics",       "reason": "Addresses transgender rights and public space access"     },     {       "topic": "europe",       "reason": "Focuses on UK Supreme Court ruling and its implications"     },     {       "topic": "health",       "reason": "Relates to public facilities and well-being"     }   ],   "conv3": [     {       "topic": "environment",       "reason": "Discusses environmental impact of consumer choices"     },     {       "topic": "economy_work",       "reason": "Mentions economic factors affecting consumer choices"     },     {       "topic": "society_politics",       "reason": "Addresses societal stigma around unsustainable products"     }   ] }``` |
| 9 | 2 | Same as above | ```json{   "conv1": [     {       "topic": "technology",       "reason": "Discusses quantum computing and its potential impact"     },     {       "topic": "business_finance",       "reason": "Mentions industries potentially disrupted by quantum computing"     },     {       "topic": "science",       "reason": "Relates to scientific advancements in computing technology"     }   ],   "conv2": [     {       "topic": "education",       "reason": "Centers on learning methods and bootcamp effectiveness"     },     {       "topic": "economy_work",       "reason": "Addresses job market entry and software development careers"     },     {       "topic": "technology",       "reason": "Discusses coding bootcamps and software development skills"     }   ] }``` |
| 9 | 3 | Same as above | ```json{   "conv1": [     {       "topic": "art_culture",       "reason": "Discusses the definition and value of AI-generated art"     },     {       "topic": "society_politics",       "reason": "Addresses debate and varying opinions on AI art in society"     },     {       "topic": "technology",       "reason": "Relates to AI tools like Midjourney and DALL-E creating art"     }   ],   "conv2": [     {       "topic": "economy_work",       "reason": "Discusses wages, living expenses, and income sources for workers"     },     {       "topic": "society_politics",       "reason": "Addresses debate on tipping culture and its impact on workers and customers"     }   ],   "conv3": [     {       "topic": "art_culture",       "reason": "Discusses the revival of vinyl records and appreciation for physical media"     },     {       "topic": "technology",       "reason": "Contrasts physical media with digital streaming services"     }   ] }``` |
| 9 | 4 | Same as above | ```json{   "conv1": [     {       "topic": "technology",       "reason": "Discusses AI use in warfare and autonomous decisions"     },     {       "topic": "society_politics",       "reason": "Addresses ethical concerns and policy around AI in military"     },     {       "topic": "breaking_news",       "reason": "Mentions recent Pentagon guidelines for AI use in warfare"     }   ],   "conv2": [     {       "topic": "health",       "reason": "Focuses on mental health support and burnout in workplaces"     },     {       "topic": "economy_work",       "reason": "Discusses workplace dynamics and mental health initiatives"     },     {       "topic": "society_politics",       "reason": "Addresses stigma and career repercussions around mental health"     }   ],   "conv3": [     {       "topic": "environment",       "reason": "Centers on carbon offsets and their effectiveness against climate change"     },     {       "topic": "business_finance",       "reason": "Mentions corporate carbon offset programs and alternatives"     },     {       "topic": "science",       "reason": "Discusses research on forestry-based offsets and direct air capture"     }   ],   "conv4": [     {       "topic": "society_politics",       "reason": "Discusses voting systems and their impact on representation and governance"     },     {       "topic": "europe",       "reason": "Focuses on the UK's first-past-the-post system and proportional representation"     }   ],   "conv5": [     {       "topic": "education",       "reason": "Discusses homeschooling, hybrid models, and school systems"     },     {       "topic": "breaking_news",       "reason": "Mentions pandemic's impact on homeschooling and new educational approaches"     }   ],   "conv6": [     {       "topic": "art_culture",       "reason": "Discusses NFTs in the art world and their impact on artists and institutions"     },     {       "topic": "technology",       "reason": "Focuses on NFTs as a digital technology and its market volatility"     }   ],   "conv7": [     {       "topic": "business_finance",       "reason": "Discusses Central Bank Digital Currencies and their potential impact on banking"     },     {       "topic": "technology",       "reason": "Focuses on digital currencies and their technological implications"     },     {       "topic": "asia",       "reason": "Mentions China's digital yuan as an example of CBDC adoption"     }   ],   "conv8": [     {       "topic": "infrastructure",       "reason": "Discusses public transportation, fares, and service improvements"     },     {       "topic": "environment",       "reason": "Mentions environmental benefits of public transit use"     },     {       "topic": "europe",       "reason": "Refers to fare-free public transit experiments in European cities"     }   ],   "conv9": [     {       "topic": "sports",       "reason": "Discusses hosting major sporting events, specifically the Olympics"     },     {       "topic": "economy_work",       "reason": "Addresses economic justification and sustainability of hosting the Olympics"     }   ],   "conv10": [     {       "topic": "religion_spirituality",       "reason": "Discusses mindfulness practices across various religious traditions"     },     {       "topic": "health",       "reason": "Addresses the relationship between mindfulness and mental well-being"     }   ],   "conv11": [     {       "topic": "asia",       "reason": "Focuses on tensions in the Taiwan Strait and diplomatic efforts in the region"     },     {       "topic": "society_politics",       "reason": "Discusses nationalist rhetoric and factors important for maintaining peace"     },     {       "topic": "breaking_news",       "reason": "Mentions recent military exercises increasing concerns about potential conflict"     }   ],   "conv12": [     {       "topic": "science",       "reason": "Discusses space exploration and scientific missions"     },     {       "topic": "technology",       "reason": "Focuses on private companies and their impact on space access and commercialization"     }   ],   "conv13": [     {       "topic": "africa",       "reason": "Focuses on sustainable urbanization challenges in African megacities"     },     {       "topic": "infrastructure",       "reason": "Discusses innovative approaches to housing, transportation, and utilities"     },     {       "topic": "environment",       "reason": "Addresses sustainable development in rapidly growing urban areas"     }   ],   "conv14": [     {       "topic": "art_culture",       "reason": "Discusses the resurgence of traditional crafts in modern Japan"     },     {       "topic": "asia",       "reason": "Focuses on Japanese artisans and their contemporary designs and sustainable practices"     }   ],   "conv15": [     {       "topic": "economy_work",       "reason": "Discusses reshoring and its impact on global manufacturing and economic development"     },     {       "topic": "north_america",       "reason": "Mentions companies in North America bringing production back home"     },     {       "topic": "europe",       "reason": "Refers to European companies also participating in the reshoring trend"     }   ] }``` |
| 9 | 5 | Same as above | ```json{   "conv1": [     {       "topic": "environment",       "reason": "Discusses rising sea levels and climate change impact"     },     {       "topic": "society_politics",       "reason": "Addresses international obligations and immigration policies"     },     {       "topic": "oceania",       "reason": "Focuses on Pacific island nations like Kiribati and Tuvalu"     }   ],   "conv2": [     {       "topic": "environment",       "reason": "Mentions environmental destruction due to mining"     },     {       "topic": "society_politics",       "reason": "Discusses balancing resource extraction with preservation"     },     {       "topic": "latin_america",       "reason": "Focuses on Brazil's indigenous reserves in the Amazon"     }   ],   "conv3": [     {       "topic": "science",       "reason": "Discusses nuclear fusion energy breakthroughs and challenges"     },     {       "topic": "technology",       "reason": "Mentions commercial viability of fusion power technology"     }   ],   "conv4": [     {       "topic": "society_politics",       "reason": "Discusses urban design changes due to COVID-19 pandemic"     },     {       "topic": "infrastructure",       "reason": "Mentions pedestrian-friendly streets and expanded outdoor dining"     }   ],   "conv5": [     {       "topic": "science",       "reason": "Discusses de-extinction technology and its ethical considerations"     },     {       "topic": "environment",       "reason": "Mentions restoring lost biodiversity through de-extinction"     }   ],   "conv6": [     {       "topic": "technology",       "reason": "Discusses digital innovation ecosystem in Kenya"     },     {       "topic": "economy_work",       "reason": "Mentions growing startup ecosystem and government investment"     },     {       "topic": "africa",       "reason": "Focuses on Nairobi as one of Africa's leading tech hubs"     }   ],   "conv7": [     {       "topic": "health",       "reason": "Discusses integration of traditional Chinese medicine in healthcare"     },     {       "topic": "society_politics",       "reason": "Addresses standards and regulations for traditional practices"     },     {       "topic": "asia",       "reason": "Focuses on Traditional Chinese Medicine (TCM) practices"     }   ],   "conv8": [     {       "topic": "society_politics",       "reason": "Discusses commercialization and cultural significance of football"     },     {       "topic": "sports",       "reason": "Mentions European football clubs and local connections"     },     {       "topic": "europe",       "reason": "Focuses on European Super League proposal and tensions"     }   ],   "conv9": [     {       "topic": "economy_work",       "reason": "Discusses future employment in automated economies"     },     {       "topic": "technology",       "reason": "Mentions automation and AI transforming industries"     },     {       "topic": "education",       "reason": "Addresses adapting education systems for changing work landscape"     }   ],   "conv10": [     {       "topic": "art_culture",       "reason": "Discusses cultural appropriation vs appreciation in fashion"     },     {       "topic": "society_politics",       "reason": "Addresses ethical guidelines for cultural exchange in fashion"     }   ],   "conv11": [     {       "topic": "society_politics",       "reason": "Discusses drug policy reform and decriminalization in Mexico"     },     {       "topic": "health",       "reason": "Mentions public health outcomes related to drug policy"     },     {       "topic": "latin_america",       "reason": "Focuses on Mexico's approach to drug policy after cartel violence"     }   ],   "conv12": [     {       "topic": "technology",       "reason": "Discusses predictive policing algorithms and AI systems"     },     {       "topic": "society_politics",       "reason": "Addresses potential discrimination and oversight mechanisms"     }   ],   "conv13": [     {       "topic": "environment",       "reason": "Discusses increasing bushfire threats and climate adaptation"     },     {       "topic": "society_politics",       "reason": "Mentions policy changes and land management practices"     },     {       "topic": "oceania",       "reason": "Focuses on Australia's response to devastating bushfire seasons"     }   ],   "conv14": [     {       "topic": "art_culture",       "reason": "Discusses growing influence of K-pop in global entertainment"     },     {       "topic": "asia",       "reason": "Focuses on South Korean pop music industry's international success"     }   ],   "conv15": [     {       "topic": "technology",       "reason": "Discusses brain-computer interfaces and their potential applications"     },     {       "topic": "health",       "reason": "Mentions medical and enhancement applications for neural interfaces"     },     {       "topic": "society_politics",       "reason": "Addresses ethical considerations and regulatory frameworks"     }   ] }``` |
| 9 | 6 | Same as above | ```json{   "conv1": [     {       "topic": "asia",       "reason": "Focuses on AI tutoring systems in South Korea"     },     {       "topic": "education",       "reason": "Discusses personalized learning and improved scores"     },     {       "topic": "technology",       "reason": "Relates to AI-powered tutoring systems in schools"     }   ],   "conv2": [     {       "topic": "latin_america",       "reason": "Centers on Brazil's World Cup preparations"     },     {       "topic": "sports",       "reason": "Discusses World Cup stadium renovations"     },     {       "topic": "infrastructure",       "reason": "Addresses transportation upgrades and venue readiness"     }   ],   "conv3": [     {       "topic": "funny",       "reason": "Humorous content about a cat's behavior during video calls"     }   ],   "conv4": [     {       "topic": "health",       "reason": "Discusses gene therapy trial for sickle cell disease"     },     {       "topic": "science",       "reason": "Relates to CRISPR-Cas9 gene editing technology"     }   ],   "conv5": [     {       "topic": "europe",       "reason": "Focuses on European Central Bank interest rate increase"     },     {       "topic": "business_finance",       "reason": "Discusses financial markets and banking stocks"     },     {       "topic": "economy_work",       "reason": "Addresses inflation concerns and interest rate hikes"     }   ],   "conv6": [     {       "topic": "africa",       "reason": "Centers on Nigeria's solar energy grid project"     },     {       "topic": "environment",       "reason": "Discusses renewable energy and reduced diesel dependence"     },     {       "topic": "technology",       "reason": "Relates to solar mini-grid project and electricity access"     }   ],   "conv7": [     {       "topic": "oceania",       "reason": "Focuses on Australia's immigration policies and protests"     },     {       "topic": "society_politics",       "reason": "Discusses refugee detention policies and human rights"     }   ],   "conv8": [     {       "topic": "latin_america",       "reason": "Centers on Mayan murals discovery in Guatemala"     },     {       "topic": "art_culture",       "reason": "Discusses ancient Mayan artwork and temple complex"     },     {       "topic": "science",       "reason": "Relates to pre-Columbian astronomy and calendar systems"     }   ],   "conv9": [     {       "topic": "breaking_news",       "reason": "Urgent news about a major earthquake in Turkey"     },     {       "topic": "asia",       "reason": "Focuses on the earthquake in central Turkey"     }   ],   "conv10": [     {       "topic": "north_america",       "reason": "Centers on remote work trends in North America"     },     {       "topic": "society_politics",       "reason": "Discusses population shifts and urban employment patterns"     },     {       "topic": "economy_work",       "reason": "Addresses remote work impact on real estate and benefits"     }   ] }``` |

---

### Prompt 10 [further editing description of "breaking_news"]
#### System Instructions:
Your task is to analyze conversations and assign relevant topics from a predefined list.

AVAILABLE TOPICS:
```
[
  {
    "key": "art_culture",
    "label": "Art & Culture",
    "description": "Topics related to visual arts, performing arts, literature, and cultural heritage."
  },
  {
    "key": "business_finance",
    "label": "Business & Finance",
    "description": "Topics covering business operations, financial markets, investments, and corporate strategies."
  },
  {
    "key": "economy_work",
    "label": "Economy & Work",
    "description": "Discussions on macroeconomic trends, employment, labor markets, and workplace dynamics."
  },
  {
    "key": "environment",
    "label": "Environment",
    "description": "Issues related to natural resources, conservation, pollution, biodiversity, and environmental policy."
  },
  {
    "key": "education",
    "label": "Education",
    "description": "Topics covering education systems, learning methods, academic institutions, and educational policies."
  },
  {
    "key": "funny",
    "label": "Funny",
    "description": "Humorous content, jokes, comedy, and entertaining topics meant to amuse."
  },
  {
    "key": "health",
    "label": "Health",
    "description": "Matters related to physical and mental health, healthcare systems, medical research, and wellness."
  },
  {
    "key": "infrastructure",
    "label": "Infrastructure",
    "description": "Topics covering public systems such as transportation, utilities, and communication networks."
  },
  {
    "key": "religion_spirituality",
    "label": "Religion & Spirituality",
    "description": "Discussions on faith, religious practices, spiritual beliefs, and theological concepts."
  },
  {
    "key": "science",
    "label": "Science",
    "description": "Topics related to scientific research, discoveries, theories, and advancements across disciplines."
  },
  {
    "key": "society_politics",
    "label": "Society & Politics",
    "description": "Social issues, political debates, governance, policies, and political events."
  },
  {
    "key": "sports",
    "label": "Sports",
    "description": "Topics about athletic activities, sporting events, teams, athletes, and related competitions."
  },
  {
    "key": "technology",
    "label": "Technology",
    "description": "Discussions about digital innovation, computing, software, hardware, and technological advancements."
  },
  {
    "key": "breaking_news",
    "label": "Breaking News",
    "description": "News about major, unexpected, or extraordinary events of immediate public concern that have just happened or are actively unfolding. Does not include general trends or recent-but-not-urgent developments."
  },
  {
    "key": "africa",
    "label": "Africa",
    "description": "Topics related to North African and Sub-Saharan African countries, including Egypt when in African context."
  },
  {
    "key": "asia",
    "label": "Asia",
    "description": "Topics related to East, South, Southeast, and Central Asian countries, including Russia, Turkey and Caucasus when in Asian context."
  },
  {
    "key": "europe",
    "label": "Europe",
    "description": "Topics related to Western, Eastern, Northern, and Southern European countries, including Russia, Turkey and Caucasus when in European context."
  },
  {
    "key": "latin_america",
    "label": "Latin America",
    "description": "Topics related to Mexico, Central America, South America, and Spanish/Portuguese/French-speaking Caribbean nations."
  },
  {
    "key": "middle_east",
    "label": "Middle East",
    "description": "Topics related to Western Asian countries, including Israel, Turkey and Egypt when in Middle Eastern context."
  },
  {
    "key": "north_america",
    "label": "North America",
    "description": "Topics related to the United States, Canada, and English-speaking Caribbean nations."
  },
  {
    "key": "oceania",
    "label": "Oceania",
    "description": "Topics related to Australia, New Zealand, and Pacific Island nations."
  }
]
```

INSTRUCTIONS:
1. Analyze each conversation in the input JSON.
2. Assign relevant topics from the available topics list for each conversation. Do not use topics not included in the list.
3. For each assigned topic, provide a brief reason (up to 60 characters) explaining why it was assigned.
4. Assign appropriate regional topics (e.g. middle_east) whenever the conversation substantively focuses on the specific region or countries within that region. For countries that could belong to multiple regions (e.g., Russia, Turkey, Egypt), assign the regional topic that best matches the conversation's context.
5. Return your assignments in the specified output format using only the topic keys (not labels).

INPUT JSON SCHEMA:
```json
{
  "type": "object",
  "additionalProperties": {
    "type": "object",
    "properties": {
      "conversationTitle": {
        "type": "string"
      },
      "conversationBody": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "required": [
      "conversationTitle"
    ]
  }
}
```

OUTPUT JSON SCHEMA:
```json
{
  "type": "object",
  "additionalProperties": {
    "type": "array",
    "items": {
      "type": "object",
      "properties": {
        "topic": {
          "type": "string"
        },
        "reason": {
          "type": "string"
        }
      },
      "required": [
        "topic",
        "reason"
      ]
    }
  }
}
```

EXAMPLE INPUT:
```json
{
  "conv1": {
    "conversationTitle": "Project Liberty: Has Europe over-regulated tech?",
    "conversationBody": "It's worthwhile to ask what all this regulation is for. If its goal is a safer internet with better consumer protections, it might be considered more successful. If its goal is to ensure Europe's digital sovereignty, it might be considered less so.\n\nLink to the article: \nhttps://www.linkedin.com/pulse/has-europe-over-regulated-tech-projectliberty-pdaie/?trackingId=Cu3xfkVEALIA9OGoP9WUPA%3D%3D"
  },
  "conv2": {
    "conversationTitle": "Is this widespread adoption of AI dumbing down the future generation?",
    "conversationBody": "With multiple easy-to-use tools becoming more and more accessible, how do we ensure that the current and future generations do not become so dependent on them that we lose our ability to reason and produce high-quality outputs? \n\nNot just the people using AI tools to grow and develop but also for addressing this issue for the general masses. For example, with Google enabling access to information at one's fingertips, there is no longer a need to remember and collect a lot of facts. Similarly, multiple people no longer read lengthy case studies and do assignments themselves and are now dependent on LLMs.\n\nWould love to hear your two cents on the topic!"
  }
}
```

EXPECTED OUTPUT:
```json
{
  "conv1": [
    {
      "topic": "europe",
      "reason": "Focuses on European tech regulation and digital sovereignty"
    },
    {
      "topic": "society_politics",
      "reason": "Discusses regulatory policy and societal protections"
    },
    {
      "topic": "technology",
      "reason": "Relates to tech industry regulation and digital landscape"
    }
  ],
  "conv2": [
    {
      "topic": "education",
      "reason": "Centers on learning, critical thinking, and assignments"
    },
    {
      "topic": "society_politics",
      "reason": "Addresses societal impact of technology dependence"
    },
    {
      "topic": "technology",
      "reason": "Discusses AI tools, LLMs, and technological dependence"
    }
  ]
}
```

Respond ONLY with a valid JSON object matching the output schema.

---

#### Results
| Prompt | Input | Parameters | Output |
|---|---|---|---|
| 10 | 1 | Temp = 0.2 Top P = 0.7 Top K = 40 | ```json{   "conv1": [     {       "topic": "europe",       "reason": "Discusses Poland's potential access to nuclear weapons and French involvement"     },     {       "topic": "society_politics",       "reason": "Centers on political debate about nuclear deterrents and international relations"     }   ],   "conv2": [     {       "topic": "society_politics",       "reason": "Addresses transgender rights, public spaces, and societal acceptance"     },     {       "topic": "europe",       "reason": "Focuses on UK Supreme Court ruling and its implications for transgender individuals"     },     {       "topic": "health",       "reason": "Relates to access to public facilities and well-being of transgender individuals"     }   ],   "conv3": [     {       "topic": "environment",       "reason": "Discusses environmental impact of consumer choices and sustainability"     },     {       "topic": "economy_work",       "reason": "Mentions economic factors influencing consumer choices and affordability of sustainable products"     }   ] }``` |
| 10 | 2 | Same as above | ```json{   "conv1": [     {       "topic": "technology",       "reason": "Discusses quantum computing and its potential impact"     },     {       "topic": "business_finance",       "reason": "Mentions industries potentially disrupted by quantum computing"     },     {       "topic": "science",       "reason": "Covers scientific advancements in quantum computing"     }   ],   "conv2": [     {       "topic": "education",       "reason": "Centers on learning methods and bootcamp effectiveness"     },     {       "topic": "economy_work",       "reason": "Addresses job market entry and career preparation"     },     {       "topic": "technology",       "reason": "Discusses software development and coding bootcamps"     }   ] }```|
| 10 | 3 | Same as above  | ```json{   "conv1": [     {       "topic": "art_culture",       "reason": "Discusses the definition and value of AI-generated art"     },     {       "topic": "society_politics",       "reason": "Addresses debate and varying perspectives on AI art"     },     {       "topic": "technology",       "reason": "Relates to AI tools like Midjourney and DALL-E"     }   ],   "conv2": [     {       "topic": "economy_work",       "reason": "Centers on wages, living expenses, and income sources"     },     {       "topic": "society_politics",       "reason": "Discusses tipping culture, practices, and debate"     }   ],   "conv3": [     {       "topic": "art_culture",       "reason": "Focuses on vinyl records, album artwork, and music"     },     {       "topic": "technology",       "reason": "Contrasts physical media with digital streaming services"     }   ] }``` |
| 10 | 4 | Same as above | ```json{   "conv1": [     {       "topic": "technology",       "reason": "Discusses AI use in warfare and autonomous decisions"     },     {       "topic": "society_politics",       "reason": "Addresses ethical concerns and policy around AI in military"     },     {       "topic": "breaking_news",       "reason": "Refers to recent Pentagon guidelines on AI use in warfare"     }   ],   "conv2": [     {       "topic": "health",       "reason": "Focuses on mental health support and burnout in workplaces"     },     {       "topic": "economy_work",       "reason": "Discusses workplace dynamics and mental health initiatives"     },     {       "topic": "society_politics",       "reason": "Addresses stigma and career repercussions around mental health"     }   ],   "conv3": [     {       "topic": "environment",       "reason": "Centers on carbon offsets and their effectiveness against climate change"     },     {       "topic": "business_finance",       "reason": "Discusses corporate carbon offset programs and alternatives"     },     {       "topic": "technology",       "reason": "Mentions direct air capture as an alternative to carbon offsets"     }   ],   "conv4": [     {       "topic": "society_politics",       "reason": "Discusses voting systems and their impact on representation and governance"     },     {       "topic": "europe",       "reason": "Focuses on the UK's first-past-the-post system and potential switch to proportional representation"     }   ],   "conv5": [     {       "topic": "education",       "reason": "Discusses homeschooling, hybrid models, and their evolution since the pandemic"     },     {       "topic": "society_politics",       "reason": "Addresses potential changes to traditional school systems and their implications"     }   ],   "conv6": [     {       "topic": "art_culture",       "reason": "Discusses NFTs in the art world and their impact on the art ecosystem"     },     {       "topic": "technology",       "reason": "Focuses on NFTs as a digital technology and their market volatility"     }   ],   "conv7": [     {       "topic": "business_finance",       "reason": "Discusses Central Bank Digital Currencies and their potential impact on financial activities"     },     {       "topic": "technology",       "reason": "Focuses on digital currencies and their technological implications"     },     {       "topic": "economy_work",       "reason": "Addresses potential disruption to commercial banks and financial inclusion"     }   ],   "conv8": [     {       "topic": "society_politics",       "reason": "Discusses public transportation fares and their social equity implications"     },     {       "topic": "infrastructure",       "reason": "Focuses on public transportation systems and potential improvements"     },     {       "topic": "environment",       "reason": "Mentions environmental benefits of encouraging public transportation use"     }   ],   "conv9": [     {       "topic": "sports",       "reason": "Discusses hosting major sporting events, specifically the Olympics"     },     {       "topic": "economy_work",       "reason": "Addresses economic justification and sustainability of hosting the Olympics"     },     {       "topic": "society_politics",       "reason": "Discusses the impact of hosting the Olympics on host communities"     }   ],   "conv10": [     {       "topic": "religion_spirituality",       "reason": "Discusses mindfulness practices across different religious traditions"     },     {       "topic": "health",       "reason": "Focuses on mindfulness as a practice related to mental and spiritual well-being"     }   ],   "conv11": [     {       "topic": "asia",       "reason": "Focuses on tensions in the Taiwan Strait and diplomatic efforts in the region"     },     {       "topic": "society_politics",       "reason": "Discusses nationalist rhetoric and factors important for maintaining peace"     }   ],   "conv12": [     {       "topic": "technology",       "reason": "Discusses space exploration and the commercialization of low Earth orbit"     },     {       "topic": "society_politics",       "reason": "Addresses space governance, resource rights, and the balance between private and government-led space development"     }   ],   "conv13": [     {       "topic": "africa",       "reason": "Focuses on sustainable urbanization challenges in African megacities"     },     {       "topic": "infrastructure",       "reason": "Discusses innovative approaches to housing, transportation, and utilities in rapidly urbanizing cities"     },     {       "topic": "environment",       "reason": "Addresses sustainable development in the context of growing urban populations"     }   ],   "conv14": [     {       "topic": "art_culture",       "reason": "Discusses the resurgence of traditional crafts in modern Japan"     },     {       "topic": "asia",       "reason": "Focuses on Japanese artisans and their contemporary designs and sustainable practices"     }   ],   "conv15": [     {       "topic": "economy_work",       "reason": "Discusses reshoring and its impact on global manufacturing and economic development"     },     {       "topic": "technology",       "reason": "Mentions automation as a factor contributing to the reshoring trend"     },     {       "topic": "north_america",       "reason": "Refers to companies in North America bringing production back home"     },     {       "topic": "europe",       "reason": "Refers to companies in Europe bringing production back home"     }   ] }``` |
| 10 | 5 | Same as above | ```json{   "conv1": [     {       "topic": "environment",       "reason": "Discusses rising sea levels and climate change impact"     },     {       "topic": "society_politics",       "reason": "Addresses international obligations and immigration policies"     },     {       "topic": "oceania",       "reason": "Focuses on Pacific island nations like Kiribati and Tuvalu"     }   ],   "conv2": [     {       "topic": "environment",       "reason": "Mentions environmental destruction due to mining"     },     {       "topic": "society_politics",       "reason": "Discusses balancing resource extraction with preservation"     },     {       "topic": "latin_america",       "reason": "Focuses on Brazil's indigenous reserves in the Amazon"     }   ],   "conv3": [     {       "topic": "science",       "reason": "Discusses nuclear fusion energy breakthroughs and challenges"     },     {       "topic": "technology",       "reason": "Mentions commercial viability of fusion power technology"     }   ],   "conv4": [     {       "topic": "society_politics",       "reason": "Discusses urban design changes due to COVID-19 pandemic"     },     {       "topic": "infrastructure",       "reason": "Mentions pedestrian-friendly streets and expanded outdoor dining"     }   ],   "conv5": [     {       "topic": "science",       "reason": "Discusses de-extinction technology and its ethical considerations"     },     {       "topic": "environment",       "reason": "Mentions restoring lost biodiversity through de-extinction"     }   ],   "conv6": [     {       "topic": "technology",       "reason": "Discusses digital innovation ecosystem in Kenya"     },     {       "topic": "economy_work",       "reason": "Mentions growing startup ecosystem and government investment"     },     {       "topic": "africa",       "reason": "Focuses on Nairobi as one of Africa's leading tech hubs"     }   ],   "conv7": [     {       "topic": "health",       "reason": "Discusses integration of traditional Chinese medicine in healthcare"     },     {       "topic": "society_politics",       "reason": "Addresses standards and regulations for traditional practices"     },     {       "topic": "asia",       "reason": "Focuses on Traditional Chinese Medicine (TCM) practices"     }   ],   "conv8": [     {       "topic": "society_politics",       "reason": "Discusses commercialization and cultural significance of football"     },     {       "topic": "sports",       "reason": "Mentions European football clubs and local connections"     },     {       "topic": "europe",       "reason": "Focuses on European Super League proposal and tensions"     }   ],   "conv9": [     {       "topic": "economy_work",       "reason": "Discusses future employment in automated economies"     },     {       "topic": "technology",       "reason": "Mentions automation and AI transforming industries"     },     {       "topic": "education",       "reason": "Addresses adapting education systems for changing work landscape"     }   ],   "conv10": [     {       "topic": "art_culture",       "reason": "Discusses cultural appropriation vs appreciation in fashion"     },     {       "topic": "society_politics",       "reason": "Addresses ethical engagement with diverse cultural influences"     }   ],   "conv11": [     {       "topic": "society_politics",       "reason": "Discusses drug policy reform and decriminalization in Mexico"     },     {       "topic": "health",       "reason": "Mentions public health outcomes related to drug policy"     },     {       "topic": "latin_america",       "reason": "Focuses on Mexico's approach to drug policy after cartel violence"     }   ],   "conv12": [     {       "topic": "society_politics",       "reason": "Discusses ethics of predictive policing algorithms and discrimination"     },     {       "topic": "technology",       "reason": "Mentions AI systems used by law enforcement agencies"     }   ],   "conv13": [     {       "topic": "environment",       "reason": "Discusses increasing bushfire threats and climate adaptation"     },     {       "topic": "society_politics",       "reason": "Addresses land management practices and policy changes"     },     {       "topic": "oceania",       "reason": "Focuses on Australia's response to devastating bushfire seasons"     }   ],   "conv14": [     {       "topic": "art_culture",       "reason": "Discusses growing influence of K-pop in global entertainment"     },     {       "topic": "asia",       "reason": "Focuses on South Korean pop music industry's international success"     }   ],   "conv15": [     {       "topic": "science",       "reason": "Discusses ethical considerations in brain-computer interfaces"     },     {       "topic": "technology",       "reason": "Mentions companies developing implantable brain-computer interfaces"     }   ],   "conv16": [     {       "topic": "society_politics",       "reason": "Discusses future of European Union after Brexit"     },     {       "topic": "europe",       "reason": "Focuses on UK's departure from EU and its impact on European integration"     }   ],   "conv17": [     {       "topic": "society_politics",       "reason": "Discusses preserving endangered languages in digital age"     },     {       "topic": "technology",       "reason": "Mentions digital tools for documentation and revitalization efforts"     }   ],   "conv18": [     {       "topic": "environment",       "reason": "Discusses urban water management and recycling in Singapore"     },     {       "topic": "society_politics",       "reason": "Addresses public education and implementation of water solutions"     },     {       "topic": "asia",       "reason": "Focuses on Singapore's approach to achieving water security"     }   ],   "conv19": [     {       "topic": "environment",       "reason": "Discusses ethical principles in wildlife tourism"     },     {       "topic": "society_politics",       "reason": "Addresses responsible wildlife tourism and animal welfare"     }   ],   "conv20": [     {       "topic": "economy_work",       "reason": "Discusses economic challenges and recovery prospects in Argentina"     },     {       "topic": "society_politics",       "reason": "Mentions tensions between fiscal discipline and social welfare"     },     {       "topic": "latin_america",       "reason": "Focuses on Argentina's recurring economic crises and reforms"     }   ],   "conv21": [     {       "topic": "education",       "reason": "Discusses school choice policies and their impact on education"     },     {       "topic": "society_politics",       "reason": "Addresses balance between choice and ensuring quality education"     }   ],   "conv22": [     {       "topic": "economy_work",       "reason": "Discusses Saudi Arabia's Vision 2030 economic transformation plan"     },     {       "topic": "society_politics",       "reason": "Mentions modernizing social policies and developing new sectors"     },     {       "topic": "middle_east",       "reason": "Focuses on Saudi Arabia's efforts to diversify economy beyond oil"     }   ],   "conv23": [     {       "topic": "health",       "reason": "Discusses rise of telemedicine during COVID-19 pandemic"     },     {       "topic": "technology",       "reason": "Mentions adoption of telehealth services and regulatory barriers"     }   ],   "conv24": [     {       "topic": "economy_work",       "reason": "Discusses New Zealand's wellbeing budget approach"     },     {       "topic": "society_politics",       "reason": "Addresses evaluating policies based on quality of life metrics"     },     {       "topic": "oceania",       "reason": "Focuses on New Zealand's pioneering wellbeing budget framework"     }   ],   "conv25": [     {       "topic": "science",       "reason": "Discusses ethics of gene editing in human embryos"     },     {       "topic": "health",       "reason": "Mentions preventing disease or enhancing traits through gene editing"     }   ],   "conv26": [     {       "topic": "society_politics",       "reason": "Discusses revitalizing rural communities in Japan"     },     {       "topic": "economy_work",       "reason": "Mentions remote work incentives and cultural tourism strategies"     },     {       "topic": "asia",       "reason": "Focuses on Japan's rural areas facing population decline and aging"     }   ],   "conv27": [     {       "topic": "science",       "reason": "Discusses future of international cooperation in space exploration"     },     {       "topic": "society_politics",       "reason": "Addresses governance frameworks for commercial space activities"     }   ],   "conv28": [     {       "topic": "environment",       "reason": "Discusses plastic waste management and recycling initiatives"     },     {       "topic": "economy_work",       "reason": "Mentions economic opportunities created by community-based efforts"     },     {       "topic": "africa",       "reason": "Focuses on Ghana's innovative programs addressing plastic pollution"     }   ],   "conv29": [     {       "topic": "art_culture",       "reason": "Discusses historical monuments and public memory debates"     },     {       "topic": "society_politics",       "reason": "Addresses tensions in commemorating complicated historical figures"     }   ],   "conv30": [     {       "topic": "health",       "reason": "Discusses plant-based and cultured meat alternatives' impact on animal welfare"     },     {       "topic": "environment",       "reason": "Mentions reduced environmental impact of alternative proteins"     },     {       "topic": "society_politics",       "reason": "Addresses regulatory and cultural hurdles for lab-grown meat technologies"     }   ] }``` |
| 10 | 6 | Same as above | ```json{   "conv1": [     {       "topic": "asia",       "reason": "Discusses AI tutoring systems in South Korean schools"     },     {       "topic": "education",       "reason": "Focuses on classroom learning and personalized tutoring"     },     {       "topic": "technology",       "reason": "Relates to AI-powered tutoring systems and their impact"     }   ],   "conv2": [     {       "topic": "latin_america",       "reason": "Centers on Brazil's World Cup preparations"     },     {       "topic": "sports",       "reason": "Mentions the upcoming World Cup and stadium renovations"     },     {       "topic": "infrastructure",       "reason": "Addresses transportation upgrades and venue readiness"     }   ],   "conv3": [     {       "topic": "funny",       "reason": "Shares a humorous anecdote about a cat during video calls"     }   ],   "conv4": [     {       "topic": "health",       "reason": "Discusses gene therapy trial for sickle cell disease"     },     {       "topic": "science",       "reason": "Relates to CRISPR-Cas9 gene editing and its breakthroughs"     }   ],   "conv5": [     {       "topic": "europe",       "reason": "Focuses on European Central Bank interest rate increase"     },     {       "topic": "business_finance",       "reason": "Addresses inflation concerns and financial market reactions"     }   ],   "conv6": [     {       "topic": "africa",       "reason": "Centers on Nigeria's new solar energy grid project"     },     {       "topic": "environment",       "reason": "Discusses renewable energy and reducing diesel generator dependence"     }   ],   "conv7": [     {       "topic": "oceania",       "reason": "Focuses on Australia's controversial immigration policies"     },     {       "topic": "society_politics",       "reason": "Addresses refugee detention policies and human rights concerns"     }   ],   "conv8": [     {       "topic": "latin_america",       "reason": "Discusses ancient Mayan murals discovered in Guatemala"     },     {       "topic": "art_culture",       "reason": "Relates to Mayan temple complex artwork and calendar systems"     }   ],   "conv9": [     {       "topic": "breaking_news",       "reason": "Reports a major earthquake in central Turkey and ongoing rescue operations"     },     {       "topic": "asia",       "reason": "Focuses on the earthquake's impact in Turkey"     }   ],   "conv10": [     {       "topic": "north_america",       "reason": "Discusses remote work trends across North American cities"     },     {       "topic": "economy_work",       "reason": "Addresses changes in urban employment patterns and remote work"     }   ] }``` |

---

### Analyzing the "Breaking News" Issues 

#### Summary (So Far)
| Convo | Before:  "Current events, urgent news updates, and significant developments happening globally." | After: "News about major, unexpected, or extraordinary events of immediate public concern that have just happened or are actively unfolding. Does not include general trends or recent-but-not-urgent developments." |  |
|---|---|---|---|
| "conversationTitle": "Should Poland Have Access to Nuclear Weapons?"   "conversationBody": "Poland is seeking access to nuclear arms , after French president Emmanuel Macron opened the possibility of extending France's \"nuclear umbrella\" to protect European allies. \n\nWhat do you think? \n\nhttps://notesfrompoland.com/2025/03/10/poland-declares-interest-in-french-nuclear-deterrent-or-even-developing-its-own/\n" | Breaking news | No longer assigned breaking_news |  |
| "conversationTitle": "The future of quantum computing" "conversationBody": "Quantum computing promises to revolutionize computing by solving complex problems exponentially faster than classical computers.\n\nWhile companies like IBM and Google have made significant strides, we're still years away from practical quantum advantage in most fields.\n\nWhat do you think will be the first industry to be truly disrupted by quantum computing?\n\nhttps://www.nature.com/articles/d41586-023-00029- | Breaking news | No longer assigned breaking_news |  |
| "conversationTitle": "Should AI systems be allowed to make autonomous military decisions?” "conversationBody": "The Pentagon recently released guidelines for AI use in warfare, but many experts argue there should always be a 'human in the loop' for lethal decisions.\n\nThe UN has been debating binding restrictions on autonomous weapons for years without reaching consensus.\n\nDo you believe AI should ever be permitted to independently decide to use lethal force? What safeguards would need to be in place?" | Breaking news | Still breaking news |  |
|  "conversationTitle": "Mental health support in the post-pandemic workplace" conversationBody": "Many companies have expanded mental health benefits following widespread burnout during the pandemic years.\n\nHowever, there's still stigma around actually using these resources, with some employees fearing career repercussions.\n\nHas your workplace implemented mental health initiatives? Have you felt comfortable using them?" | Breaking news | No longer assigned breaking_news |  |
|  "conversationTitle": "Will CBDCs replace traditional banking? "conversationBody": "Central Bank Digital Currencies are being explored by over 100 countries, with China's digital yuan already in advanced trials.\n\nCBDCs could reduce transaction costs and increase financial inclusion, but raise privacy concerns and potentially disrupt commercial banks.\n\nHow do you think widespread CBDC adoption would affect everyday financial activities? Would you prefer using a digital dollar over traditional banking?" | Breaking news | No longer assigned breaking_news |  |
| "conversationTitle": "How reshoring is changing global manufacturing"  "conversationBody": "After decades of offshoring, companies in North America and Europe are bringing some production back home.\n\nPandemic supply chain disruptions, automation, and geopolitical tensions have all contributed to this shift.\n\nDo you think this trend will continue? How might it affect economic development in countries that have relied on export manufacturing?" | Breaking news | No longer assigned breaking_news |  |
| "conversationTitle": "Latest developments in the Taiwan Strait tensions",  "conversationBody": "Recent military exercises have increased concerns about potential conflict in the Taiwan Strait.\n\nDiplomatic efforts continue to maintain stability, but nationalist rhetoric on both sides has intensified.\n\nHow do you assess the current situation? What factors do you think are most important for maintaining peace in the region?" | Breaking news | No longer assigned breaking_news But I think it should be  |  |

#### Note
In the next step, we test Mistral-Large specifically for the "breaking_news" category by using new example conversations that are either (1) clearly breaking news or (2) not breaking news but something similar (eg. non-urgent events)

#### Results With New Examples
| Prompt | Input | Parameters | Output |
|---|---|---|---|
| 10 | 7 | Temp = 0.2 Top P = 0.7 Top K = 40 | ```json{   "conv1": [     {       "topic": "breaking_news",       "reason": "Unexpected power outage in Buenos Aires"     },     {       "topic": "infrastructure",       "reason": "Relates to electricity and power systems"     },     {       "topic": "latin_america",       "reason": "Focuses on an event in Buenos Aires, Argentina"     }   ],   "conv2": [     {       "topic": "business_finance",       "reason": "Discusses impact on commercial banks and financial activities"     },     {       "topic": "technology",       "reason": "Centers on Central Bank Digital Currencies (CBDCs)"     },     {       "topic": "society_politics",       "reason": "Addresses privacy concerns and societal implications"     }   ],   "conv3": [     {       "topic": "health",       "reason": "Relates to heart disease risk and dietary recommendations"     },     {       "topic": "science",       "reason": "Mentions a new study on the Mediterranean diet"     }   ],   "conv4": [     {       "topic": "breaking_news",       "reason": "Urgent flooding situation in central Germany"     },     {       "topic": "environment",       "reason": "Discusses flooding and weather conditions"     },     {       "topic": "europe",       "reason": "Focuses on an event in Germany"     }   ],   "conv5": [     {       "topic": "business_finance",       "reason": "Discusses challenges for small businesses"     },     {       "topic": "technology",       "reason": "Relates to data privacy and user information"     },     {       "topic": "europe",       "reason": "Focuses on EU data privacy regulation"     }   ],   "conv6": [     {       "topic": "science",       "reason": "Discusses discovery of a potential life-supporting exoplanet"     },     {       "topic": "breaking_news",       "reason": "Announcement of a significant scientific discovery"     }   ],   "conv7": [     {       "topic": "middle_east",       "reason": "Focuses on an event in Beirut, Lebanon"     },     {       "topic": "society_politics",       "reason": "Addresses justice, government, and memorial gatherings"     }   ],   "conv8": [     {       "topic": "technology",       "reason": "Centers on iPhone security vulnerability and updates"     },     {       "topic": "breaking_news",       "reason": "Urgent security update for iPhone users"     }   ],   "conv9": [     {       "topic": "economy_work",       "reason": "Discusses remote work, productivity, and work-life balance"     },     {       "topic": "society_politics",       "reason": "Addresses societal changes due to the pandemic"     }   ],   "conv10": [     {       "topic": "breaking_news",       "reason": "Urgent protests and police response in Hong Kong"     },     {       "topic": "asia",       "reason": "Focuses on an event in Hong Kong"     },     {       "topic": "society_politics",       "reason": "Discusses national security law and international response"     }   ] }``` |
| 10 | 8 | Same as above | ```json{   "conv1": [     {       "topic": "environment",       "reason": "Discusses wildfire and its impact on Athens, Greece"     },     {       "topic": "breaking_news",       "reason": "Covers an urgent, active event: wildfire near Athens"     },     {       "topic": "europe",       "reason": "Focuses on a natural disaster in Greece (Europe)"     }   ],   "conv2": [     {       "topic": "sports",       "reason": "Reflects on moments and athletes from Tokyo Olympics"     },     {       "topic": "asia",       "reason": "Mentions the Tokyo Olympics, held in Japan (Asia)"     }   ],   "conv3": [     {       "topic": "health",       "reason": "Discusses new COVID-25 variant and its health implications"     },     {       "topic": "breaking_news",       "reason": "Covers an urgent, active event: emergence of COVID-25 variant"     },     {       "topic": "asia",       "reason": "Mentions the emergence of the variant in Southeast Asia"     }   ],   "conv4": [     {       "topic": "environment",       "reason": "Discusses UN climate report and global temperature rise"     },     {       "topic": "society_politics",       "reason": "Asks for opinions on government actions to address climate change"     }   ],   "conv5": [     {       "topic": "economy_work",       "reason": "Discusses inflation and its impact on food prices and habits"     }   ],   "conv6": [     {       "topic": "technology",       "reason": "Covers data breach affecting a global hotel chain"     },     {       "topic": "business_finance",       "reason": "Mentions the impact on hotel chain customers and their data"     }   ],   "conv7": [     {       "topic": "breaking_news",       "reason": "Remembers a past urgent event: 2011 Tōhoku earthquake"     },     {       "topic": "asia",       "reason": "Focuses on the earthquake and tsunami in Japan (Asia)"     }   ],   "conv8": [     {       "topic": "environment",       "reason": "Discusses electric vehicle tax credits as climate policy"     },     {       "topic": "business_finance",       "reason": "Mentions government tax incentives for electric vehicle buyers"     }   ],   "conv9": [     {       "topic": "environment",       "reason": "Discusses flooding and its impact on Mumbai's rail service"     },     {       "topic": "breaking_news",       "reason": "Covers an urgent, active event: flooding in Mumbai"     },     {       "topic": "asia",       "reason": "Focuses on flooding in Mumbai, India (Asia)"     }   ],   "conv10": [     {       "topic": "society_politics",       "reason": "Discusses sources for staying informed about world events"     }   ] }``` |

---

### Prompt 11 [editing breaking_news description so it excludes past events]
#### System Instructions:
Your task is to analyze conversations and assign relevant topics from a predefined list.

AVAILABLE TOPICS:
```
[
  {
    "key": "art_culture",
    "label": "Art & Culture",
    "description": "Topics related to visual arts, performing arts, literature, and cultural heritage."
  },
  {
    "key": "business_finance",
    "label": "Business & Finance",
    "description": "Topics covering business operations, financial markets, investments, and corporate strategies."
  },
  {
    "key": "economy_work",
    "label": "Economy & Work",
    "description": "Discussions on macroeconomic trends, employment, labor markets, and workplace dynamics."
  },
  {
    "key": "environment",
    "label": "Environment",
    "description": "Issues related to natural resources, conservation, pollution, biodiversity, and environmental policy."
  },
  {
    "key": "education",
    "label": "Education",
    "description": "Topics covering education systems, learning methods, academic institutions, and educational policies."
  },
  {
    "key": "funny",
    "label": "Funny",
    "description": "Humorous content, jokes, comedy, and entertaining topics meant to amuse."
  },
  {
    "key": "health",
    "label": "Health",
    "description": "Matters related to physical and mental health, healthcare systems, medical research, and wellness."
  },
  {
    "key": "infrastructure",
    "label": "Infrastructure",
    "description": "Topics covering public systems such as transportation, utilities, and communication networks."
  },
  {
    "key": "religion_spirituality",
    "label": "Religion & Spirituality",
    "description": "Discussions on faith, religious practices, spiritual beliefs, and theological concepts."
  },
  {
    "key": "science",
    "label": "Science",
    "description": "Topics related to scientific research, discoveries, theories, and advancements across disciplines."
  },
  {
    "key": "society_politics",
    "label": "Society & Politics",
    "description": "Social issues, political debates, governance, policies, and political events."
  },
  {
    "key": "sports",
    "label": "Sports",
    "description": "Topics about athletic activities, sporting events, teams, athletes, and related competitions."
  },
  {
    "key": "technology",
    "label": "Technology",
    "description": "Discussions about digital innovation, computing, software, hardware, and technological advancements."
  },
  {
    "key": "breaking_news",
    "label": "Breaking News",
    "description": "News about major, unexpected, or extraordinary events of immediate public concern that have just happened or are actively unfolding. Excludes general trends, recent-but-not-urgent developments, and past events."
  },
  {
    "key": "africa",
    "label": "Africa",
    "description": "Topics related to North African and Sub-Saharan African countries, including Egypt when in African context."
  },
  {
    "key": "asia",
    "label": "Asia",
    "description": "Topics related to East, South, Southeast, and Central Asian countries, including Russia, Turkey and Caucasus when in Asian context."
  },
  {
    "key": "europe",
    "label": "Europe",
    "description": "Topics related to Western, Eastern, Northern, and Southern European countries, including Russia, Turkey and Caucasus when in European context."
  },
  {
    "key": "latin_america",
    "label": "Latin America",
    "description": "Topics related to Mexico, Central America, South America, and Spanish/Portuguese/French-speaking Caribbean nations."
  },
  {
    "key": "middle_east",
    "label": "Middle East",
    "description": "Topics related to Western Asian countries, including Israel, Turkey and Egypt when in Middle Eastern context."
  },
  {
    "key": "north_america",
    "label": "North America",
    "description": "Topics related to the United States, Canada, and English-speaking Caribbean nations."
  },
  {
    "key": "oceania",
    "label": "Oceania",
    "description": "Topics related to Australia, New Zealand, and Pacific Island nations."
  }
]
```

INSTRUCTIONS:
1. Analyze each conversation in the input JSON.
2. Assign relevant topics from the available topics list for each conversation. Do not use topics not included in the list.
3. For each assigned topic, provide a brief reason (up to 60 characters) explaining why it was assigned.
4. Assign appropriate regional topics (e.g. middle_east) whenever the conversation substantively focuses on the specific region or countries within that region. For countries that could belong to multiple regions (e.g., Russia, Turkey, Egypt), assign the regional topic that best matches the conversation's context.
5. Return your assignments in the specified output format using only the topic keys (not labels).

INPUT JSON SCHEMA:
```json
{
  "type": "object",
  "additionalProperties": {
    "type": "object",
    "properties": {
      "conversationTitle": {
        "type": "string"
      },
      "conversationBody": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "required": [
      "conversationTitle"
    ]
  }
}
```

OUTPUT JSON SCHEMA:
```json
{
  "type": "object",
  "additionalProperties": {
    "type": "array",
    "items": {
      "type": "object",
      "properties": {
        "topic": {
          "type": "string"
        },
        "reason": {
          "type": "string"
        }
      },
      "required": [
        "topic",
        "reason"
      ]
    }
  }
}
```

EXAMPLE INPUT:
```json
{
  "conv1": {
    "conversationTitle": "Project Liberty: Has Europe over-regulated tech?",
    "conversationBody": "It's worthwhile to ask what all this regulation is for. If its goal is a safer internet with better consumer protections, it might be considered more successful. If its goal is to ensure Europe's digital sovereignty, it might be considered less so.\n\nLink to the article: \nhttps://www.linkedin.com/pulse/has-europe-over-regulated-tech-projectliberty-pdaie/?trackingId=Cu3xfkVEALIA9OGoP9WUPA%3D%3D"
  },
  "conv2": {
    "conversationTitle": "Is this widespread adoption of AI dumbing down the future generation?",
    "conversationBody": "With multiple easy-to-use tools becoming more and more accessible, how do we ensure that the current and future generations do not become so dependent on them that we lose our ability to reason and produce high-quality outputs? \n\nNot just the people using AI tools to grow and develop but also for addressing this issue for the general masses. For example, with Google enabling access to information at one's fingertips, there is no longer a need to remember and collect a lot of facts. Similarly, multiple people no longer read lengthy case studies and do assignments themselves and are now dependent on LLMs.\n\nWould love to hear your two cents on the topic!"
  }
}
```

EXPECTED OUTPUT:
```json
{
  "conv1": [
    {
      "topic": "europe",
      "reason": "Focuses on European tech regulation and digital sovereignty"
    },
    {
      "topic": "society_politics",
      "reason": "Discusses regulatory policy and societal protections"
    },
    {
      "topic": "technology",
      "reason": "Relates to tech industry regulation and digital landscape"
    }
  ],
  "conv2": [
    {
      "topic": "education",
      "reason": "Centers on learning, critical thinking, and assignments"
    },
    {
      "topic": "society_politics",
      "reason": "Addresses societal impact of technology dependence"
    },
    {
      "topic": "technology",
      "reason": "Discusses AI tools, LLMs, and technological dependence"
    }
  ]
}
```

Respond ONLY with a valid JSON object matching the output schema.

#### Results
| Prompt | Input | Parameters | Output |
|---|---|---|---|
| 11 | 7 | Temp = 0.2 Top P = 0.7 Top K = 40 | ```json{   "conv1": [     {       "topic": "breaking_news",       "reason": "Unexpected power outage in Buenos Aires"     },     {       "topic": "infrastructure",       "reason": "Relates to electricity and power systems"     },     {       "topic": "latin_america",       "reason": "Focuses on an event in Buenos Aires, Argentina"     }   ],   "conv2": [     {       "topic": "business_finance",       "reason": "Discusses impact on commercial banks and financial activities"     },     {       "topic": "technology",       "reason": "Centers on Central Bank Digital Currencies (CBDCs)"     },     {       "topic": "society_politics",       "reason": "Addresses privacy concerns and societal implications"     }   ],   "conv3": [     {       "topic": "health",       "reason": "Discusses heart disease risk and dietary recommendations"     },     {       "topic": "science",       "reason": "Mentions a new study on the Mediterranean diet"     }   ],   "conv4": [     {       "topic": "breaking_news",       "reason": "Urgent flooding situation in central Germany"     },     {       "topic": "environment",       "reason": "Relates to natural disasters and weather events"     },     {       "topic": "europe",       "reason": "Focuses on an event in Germany"     }   ],   "conv5": [     {       "topic": "business_finance",       "reason": "Discusses challenges for small businesses"     },     {       "topic": "technology",       "reason": "Centers on data privacy regulation and user information"     },     {       "topic": "europe",       "reason": "Focuses on European Union's data privacy law"     }   ],   "conv6": [     {       "topic": "science",       "reason": "Discusses discovery of a potential life-supporting exoplanet"     },     {       "topic": "breaking_news",       "reason": "Announcement of a significant scientific discovery"     }   ],   "conv7": [     {       "topic": "middle_east",       "reason": "Focuses on an event in Beirut, Lebanon"     },     {       "topic": "society_politics",       "reason": "Addresses justice, government accountability, and memorials"     }   ],   "conv8": [     {       "topic": "technology",       "reason": "Centers on iPhone security vulnerability and updates"     },     {       "topic": "breaking_news",       "reason": "Urgent security update for iPhone users"     }   ],   "conv9": [     {       "topic": "economy_work",       "reason": "Discusses remote work, productivity, and work-life balance"     },     {       "topic": "society_politics",       "reason": "Addresses societal changes due to the pandemic"     }   ],   "conv10": [     {       "topic": "breaking_news",       "reason": "Urgent protests and political tension in Hong Kong"     },     {       "topic": "asia",       "reason": "Focuses on an event in Hong Kong"     },     {       "topic": "society_politics",       "reason": "Addresses national security law and international response"     }   ] }``` |
| 11 | 8 | Same as above | ```json{   "conv1": [     {       "topic": "environment",       "reason": "Discusses wildfire and its impact on Athens, Greece"     },     {       "topic": "europe",       "reason": "Focuses on a natural disaster in Athens, Greece"     }   ],   "conv2": [     {       "topic": "sports",       "reason": "Reflects on moments and athletes from the Tokyo Olympics"     },     {       "topic": "asia",       "reason": "Mentions the Tokyo Olympics, held in Japan"     }   ],   "conv3": [     {       "topic": "health",       "reason": "Discusses the emergence of a new COVID-25 variant"     },     {       "topic": "asia",       "reason": "Mentions the new COVID-25 variant in Southeast Asia"     }   ],   "conv4": [     {       "topic": "environment",       "reason": "Discusses UN climate report and global temperature rise"     }   ],   "conv5": [     {       "topic": "economy_work",       "reason": "Discusses the impact of inflation and rising food prices"     }   ],   "conv6": [     {       "topic": "technology",       "reason": "Mentions a data breach affecting a global hotel chain"     }   ],   "conv7": [     {       "topic": "breaking_news",       "reason": "Commemorates the 2011 Tōhoku earthquake and tsunami"     },     {       "topic": "asia",       "reason": "Refers to the earthquake and tsunami in Japan"     }   ],   "conv8": [     {       "topic": "environment",       "reason": "Discusses electric vehicle tax credits as part of climate policy"     }   ],   "conv9": [     {       "topic": "environment",       "reason": "Discusses flooding and its impact on rail service in Mumbai"     },     {       "topic": "asia",       "reason": "Mentions severe flooding in Mumbai, India"     }   ],   "conv10": [     {       "topic": "society_politics",       "reason": "Discusses sources for staying informed about world events"     }   ] }``` |

---

### Prompt 12 [adding explicit instructions of "breaking_news"]
#### System Instructions:

Your task is to analyze conversations and assign relevant topics from a predefined list.

AVAILABLE TOPICS:
```
[
  {
    "key": "art_culture",
    "label": "Art & Culture",
    "description": "Topics related to visual arts, performing arts, literature, and cultural heritage."
  },
  {
    "key": "business_finance",
    "label": "Business & Finance",
    "description": "Topics covering business operations, financial markets, investments, and corporate strategies."
  },
  {
    "key": "economy_work",
    "label": "Economy & Work",
    "description": "Discussions on macroeconomic trends, employment, labor markets, and workplace dynamics."
  },
  {
    "key": "environment",
    "label": "Environment",
    "description": "Issues related to natural resources, conservation, pollution, biodiversity, and environmental policy."
  },
  {
    "key": "education",
    "label": "Education",
    "description": "Topics covering education systems, learning methods, academic institutions, and educational policies."
  },
  {
    "key": "funny",
    "label": "Funny",
    "description": "Humorous content, jokes, comedy, and entertaining topics meant to amuse."
  },
  {
    "key": "health",
    "label": "Health",
    "description": "Matters related to physical and mental health, healthcare systems, medical research, and wellness."
  },
  {
    "key": "infrastructure",
    "label": "Infrastructure",
    "description": "Topics covering public systems such as transportation, utilities, and communication networks."
  },
  {
    "key": "religion_spirituality",
    "label": "Religion & Spirituality",
    "description": "Discussions on faith, religious practices, spiritual beliefs, and theological concepts."
  },
  {
    "key": "science",
    "label": "Science",
    "description": "Topics related to scientific research, discoveries, theories, and advancements across disciplines."
  },
  {
    "key": "society_politics",
    "label": "Society & Politics",
    "description": "Social issues, political debates, governance, policies, and political events."
  },
  {
    "key": "sports",
    "label": "Sports",
    "description": "Topics about athletic activities, sporting events, teams, athletes, and related competitions."
  },
  {
    "key": "technology",
    "label": "Technology",
    "description": "Discussions about digital innovation, computing, software, hardware, and technological advancements."
  },
  {
    "key": "breaking_news",
    "label": "Breaking News",
    "description": "News about major, unexpected, or extraordinary events of immediate public concern that have just happened or are actively unfolding. Excludes general trends, recent-but-not-urgent developments, and past events."
  },
  {
    "key": "africa",
    "label": "Africa",
    "description": "Topics related to North African and Sub-Saharan African countries, including Egypt when in African context."
  },
  {
    "key": "asia",
    "label": "Asia",
    "description": "Topics related to East, South, Southeast, and Central Asian countries, including Russia, Turkey and Caucasus when in Asian context."
  },
  {
    "key": "europe",
    "label": "Europe",
    "description": "Topics related to Western, Eastern, Northern, and Southern European countries, including Russia, Turkey and Caucasus when in European context."
  },
  {
    "key": "latin_america",
    "label": "Latin America",
    "description": "Topics related to Mexico, Central America, South America, and Spanish/Portuguese/French-speaking Caribbean nations."
  },
  {
    "key": "middle_east",
    "label": "Middle East",
    "description": "Topics related to Western Asian countries, including Israel, Turkey and Egypt when in Middle Eastern context."
  },
  {
    "key": "north_america",
    "label": "North America",
    "description": "Topics related to the United States, Canada, and English-speaking Caribbean nations."
  },
  {
    "key": "oceania",
    "label": "Oceania",
    "description": "Topics related to Australia, New Zealand, and Pacific Island nations."
  }
]
```

INSTRUCTIONS:
1. Analyze each conversation in the input JSON.
2. Assign relevant topics from the available topics list for each conversation. Do not use topics not included in the list.
3. For each assigned topic, provide a brief reason (up to 60 characters) explaining why it was assigned.
4. Assign appropriate regional topics (e.g. middle_east) whenever the conversation substantively focuses on the specific region or countries within that region. For countries that could belong to multiple regions (e.g., Russia, Turkey, Egypt), assign the regional topic that best matches the conversation's context.
5. Only assign breaking_news if the conversation describes events actively happening or just announced. Look for temporal indicators like "just," "now," "currently," "breaking," "urgent". Do NOT assign for anniversaries, remembrances, historical reflections, or scheduled events. When in doubt, check if the event requires immediate public attention.
6. Return your assignments in the specified output format using only the topic keys (not labels).

INPUT JSON SCHEMA:
```json
{
  "type": "object",
  "additionalProperties": {
    "type": "object",
    "properties": {
      "conversationTitle": {
        "type": "string"
      },
      "conversationBody": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "required": [
      "conversationTitle"
    ]
  }
}
```

OUTPUT JSON SCHEMA:
```json
{
  "type": "object",
  "additionalProperties": {
    "type": "array",
    "items": {
      "type": "object",
      "properties": {
        "topic": {
          "type": "string"
        },
        "reason": {
          "type": "string"
        }
      },
      "required": [
        "topic",
        "reason"
      ]
    }
  }
}
```

EXAMPLE INPUT:
```json
{
  "conv1": {
    "conversationTitle": "Project Liberty: Has Europe over-regulated tech?",
    "conversationBody": "It's worthwhile to ask what all this regulation is for. If its goal is a safer internet with better consumer protections, it might be considered more successful. If its goal is to ensure Europe's digital sovereignty, it might be considered less so.\n\nLink to the article: \nhttps://www.linkedin.com/pulse/has-europe-over-regulated-tech-projectliberty-pdaie/?trackingId=Cu3xfkVEALIA9OGoP9WUPA%3D%3D"
  },
  "conv2": {
    "conversationTitle": "Is this widespread adoption of AI dumbing down the future generation?",
    "conversationBody": "With multiple easy-to-use tools becoming more and more accessible, how do we ensure that the current and future generations do not become so dependent on them that we lose our ability to reason and produce high-quality outputs? \n\nNot just the people using AI tools to grow and develop but also for addressing this issue for the general masses. For example, with Google enabling access to information at one's fingertips, there is no longer a need to remember and collect a lot of facts. Similarly, multiple people no longer read lengthy case studies and do assignments themselves and are now dependent on LLMs.\n\nWould love to hear your two cents on the topic!"
  }
}
```

EXPECTED OUTPUT:
```json
{
  "conv1": [
    {
      "topic": "europe",
      "reason": "Focuses on European tech regulation and digital sovereignty"
    },
    {
      "topic": "society_politics",
      "reason": "Discusses regulatory policy and societal protections"
    },
    {
      "topic": "technology",
      "reason": "Relates to tech industry regulation and digital landscape"
    }
  ],
  "conv2": [
    {
      "topic": "education",
      "reason": "Centers on learning, critical thinking, and assignments"
    },
    {
      "topic": "society_politics",
      "reason": "Addresses societal impact of technology dependence"
    },
    {
      "topic": "technology",
      "reason": "Discusses AI tools, LLMs, and technological dependence"
    }
  ]
}
```

Respond ONLY with a valid JSON object matching the output schema.

---

#### Results
| Prompt | Input | Parameters | Output |
|---|---|---|---|
| 12 | 7 | Temp = 0.2 Top P = 0.7 Top K = 49 | ```json{   "conv1": [     {       "topic": "breaking_news",       "reason": "Describes an ongoing power outage in Buenos Aires"     },     {       "topic": "latin_america",       "reason": "Focuses on an event happening in Buenos Aires, Argentina"     },     {       "topic": "infrastructure",       "reason": "Relates to electricity and power outage in the city"     }   ],   "conv2": [     {       "topic": "business_finance",       "reason": "Discusses Central Bank Digital Currencies and banking"     },     {       "topic": "technology",       "reason": "Mentions digital currencies and their impact on finance"     },     {       "topic": "society_politics",       "reason": "Addresses potential societal and privacy implications"     }   ],   "conv3": [     {       "topic": "health",       "reason": "Discusses the impact of the Mediterranean diet on heart disease"     },     {       "topic": "breaking_news",       "reason": "Mentions a new study published today on the Mediterranean diet"     }   ],   "conv4": [     {       "topic": "breaking_news",       "reason": "Describes an ongoing flooding situation in central Germany"     },     {       "topic": "environment",       "reason": "Relates to flooding and weather conditions in Germany"     },     {       "topic": "europe",       "reason": "Focuses on an event happening in central Germany"     }   ],   "conv5": [     {       "topic": "business_finance",       "reason": "Discusses the impact of EU data privacy law on businesses"     },     {       "topic": "technology",       "reason": "Mentions data collection and storage in relation to the law"     },     {       "topic": "europe",       "reason": "Focuses on the European Union's new data privacy regulation"     }   ],   "conv6": [     {       "topic": "science",       "reason": "Discusses the discovery of a potentially life-supporting exoplanet"     },     {       "topic": "breaking_news",       "reason": "Mentions a recent discovery by NASA scientists"     }   ],   "conv7": [     {       "topic": "middle_east",       "reason": "Reflects on an event that happened in Beirut, Lebanon"     },     {       "topic": "society_politics",       "reason": "Addresses justice, answers, and government response to the explosion"     }   ],   "conv8": [     {       "topic": "technology",       "reason": "Discusses a security update for iPhones and personal data"     },     {       "topic": "breaking_news",       "reason": "Mentions an urgent security update issued by Apple"     }   ],   "conv9": [     {       "topic": "economy_work",       "reason": "Discusses remote work, productivity, and work-life balance"     },     {       "topic": "society_politics",       "reason": "Addresses social connections and the impact of remote work"     }   ],   "conv10": [     {       "topic": "breaking_news",       "reason": "Describes ongoing protests in Hong Kong after a new law"     },     {       "topic": "asia",       "reason": "Focuses on an event happening in Hong Kong"     },     {       "topic": "society_politics",       "reason": "Discusses a new national security law and international response"     }   ] }``` |
| 12 | 8 | Same as above | ```json{   "conv1": [     {       "topic": "breaking_news",       "reason": "Active wildfire and evacuations in Athens, Greece"     },     {       "topic": "environment",       "reason": "Discusses wildfire and its impact on local communities"     },     {       "topic": "europe",       "reason": "Focuses on a natural disaster in Athens, Greece"     }   ],   "conv2": [     {       "topic": "sports",       "reason": "Reflects on moments and athletes from the Tokyo Olympics"     },     {       "topic": "society_politics",       "reason": "Discusses the impact of the pandemic on the games"     },     {       "topic": "asia",       "reason": "Focuses on the Olympic Games held in Tokyo, Japan"     }   ],   "conv3": [     {       "topic": "breaking_news",       "reason": "Emergence of new COVID-25 variant in Southeast Asia"     },     {       "topic": "health",       "reason": "Discusses a new COVID variant and its potential impact"     },     {       "topic": "asia",       "reason": "Mentions the emergence of the new variant in Southeast Asia"     }   ],   "conv4": [     {       "topic": "environment",       "reason": "Discusses UN climate report and global temperature rise"     },     {       "topic": "society_politics",       "reason": "Asks for opinions on government actions to address climate change"     }   ],   "conv5": [     {       "topic": "economy_work",       "reason": "Discusses the impact of inflation and rising food prices"     },     {       "topic": "society_politics",       "reason": "Asks about changes in shopping habits and diet due to inflation"     }   ],   "conv6": [     {       "topic": "technology",       "reason": "Discusses a data breach affecting a global hotel chain"     },     {       "topic": "business_finance",       "reason": "Mentions the impact of the breach on hotel guests and company"     }   ],   "conv7": [     {       "topic": "society_politics",       "reason": "Commemorates the Tōhoku earthquake and tsunami anniversary"     },     {       "topic": "asia",       "reason": "Focuses on the disaster that struck Japan in 2011"     }   ],   "conv8": [     {       "topic": "environment",       "reason": "Discusses electric vehicle tax credits as part of climate policy"     },     {       "topic": "society_politics",       "reason": "Asks for opinions on government incentives for electric vehicles"     }   ],   "conv9": [     {       "topic": "breaking_news",       "reason": "Active flooding disrupting rail service in Mumbai, India"     },     {       "topic": "environment",       "reason": "Discusses the impact of heavy monsoon rains and flooding"     },     {       "topic": "asia",       "reason": "Focuses on a natural disaster in Mumbai, India"     }   ],   "conv10": [     {       "topic": "society_politics",       "reason": "Discusses sources of information and trust in news outlets"     },     {       "topic": "technology",       "reason": "Mentions online news sources and social media platforms"     }   ] }``` |

---

### Prompt 13 [editing the explicit instructions for "breaking_news"]
#### System Instructions:

Your task is to analyze conversations and assign relevant topics from a predefined list.

AVAILABLE TOPICS:
```
[
  {
    "key": "art_culture",
    "label": "Art & Culture",
    "description": "Topics related to visual arts, performing arts, literature, and cultural heritage."
  },
  {
    "key": "business_finance",
    "label": "Business & Finance",
    "description": "Topics covering business operations, financial markets, investments, and corporate strategies."
  },
  {
    "key": "economy_work",
    "label": "Economy & Work",
    "description": "Discussions on macroeconomic trends, employment, labor markets, and workplace dynamics."
  },
  {
    "key": "environment",
    "label": "Environment",
    "description": "Issues related to natural resources, conservation, pollution, biodiversity, and environmental policy."
  },
  {
    "key": "education",
    "label": "Education",
    "description": "Topics covering education systems, learning methods, academic institutions, and educational policies."
  },
  {
    "key": "funny",
    "label": "Funny",
    "description": "Humorous content, jokes, comedy, and entertaining topics meant to amuse."
  },
  {
    "key": "health",
    "label": "Health",
    "description": "Matters related to physical and mental health, healthcare systems, medical research, and wellness."
  },
  {
    "key": "infrastructure",
    "label": "Infrastructure",
    "description": "Topics covering public systems such as transportation, utilities, and communication networks."
  },
  {
    "key": "religion_spirituality",
    "label": "Religion & Spirituality",
    "description": "Discussions on faith, religious practices, spiritual beliefs, and theological concepts."
  },
  {
    "key": "science",
    "label": "Science",
    "description": "Topics related to scientific research, discoveries, theories, and advancements across disciplines."
  },
  {
    "key": "society_politics",
    "label": "Society & Politics",
    "description": "Social issues, political debates, governance, policies, and political events."
  },
  {
    "key": "sports",
    "label": "Sports",
    "description": "Topics about athletic activities, sporting events, teams, athletes, and related competitions."
  },
  {
    "key": "technology",
    "label": "Technology",
    "description": "Discussions about digital innovation, computing, software, hardware, and technological advancements."
  },
  {
    "key": "breaking_news",
    "label": "Breaking News",
    "description": "News about major, unexpected, or extraordinary events of immediate public concern that have just happened or are actively unfolding. Excludes general trends, recent-but-not-urgent developments, and past events."
  },
  {
    "key": "africa",
    "label": "Africa",
    "description": "Topics related to North African and Sub-Saharan African countries, including Egypt when in African context."
  },
  {
    "key": "asia",
    "label": "Asia",
    "description": "Topics related to East, South, Southeast, and Central Asian countries, including Russia, Turkey and Caucasus when in Asian context."
  },
  {
    "key": "europe",
    "label": "Europe",
    "description": "Topics related to Western, Eastern, Northern, and Southern European countries, including Russia, Turkey and Caucasus when in European context."
  },
  {
    "key": "latin_america",
    "label": "Latin America",
    "description": "Topics related to Mexico, Central America, South America, and Spanish/Portuguese/French-speaking Caribbean nations."
  },
  {
    "key": "middle_east",
    "label": "Middle East",
    "description": "Topics related to Western Asian countries, including Israel, Turkey and Egypt when in Middle Eastern context."
  },
  {
    "key": "north_america",
    "label": "North America",
    "description": "Topics related to the United States, Canada, and English-speaking Caribbean nations."
  },
  {
    "key": "oceania",
    "label": "Oceania",
    "description": "Topics related to Australia, New Zealand, and Pacific Island nations."
  }
]
```

INSTRUCTIONS:
1. Analyze each conversation in the input JSON.
2. Assign relevant topics from the available topics list for each conversation. Do not use topics not included in the list.
3. For each assigned topic, provide a brief reason (up to 60 characters) explaining why it was assigned.
4. Assign appropriate regional topics (e.g. middle_east) whenever the conversation substantively focuses on the specific region or countries within that region. For countries that could belong to multiple regions (e.g., Russia, Turkey, Egypt), assign the regional topic that best matches the conversation's context.
5. Assign breaking_news only when the conversation meets BOTH criteria:
   (a) Recent timing: Events actively happening or just announced (look for "just," "now," "currently," "breaking," "urgent")
   (b) Immediate urgency: Requires immediate public attention or action
 Exclude: anniversaries, commemorations, scheduled events, routine reports.
6. Return your assignments in the specified output format using only the topic keys (not labels).

INPUT JSON SCHEMA:
```json
{
  "type": "object",
  "additionalProperties": {
    "type": "object",
    "properties": {
      "conversationTitle": {
        "type": "string"
      },
      "conversationBody": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "required": [
      "conversationTitle"
    ]
  }
}
```

OUTPUT JSON SCHEMA:
```json
{
  "type": "object",
  "additionalProperties": {
    "type": "array",
    "items": {
      "type": "object",
      "properties": {
        "topic": {
          "type": "string"
        },
        "reason": {
          "type": "string"
        }
      },
      "required": [
        "topic",
        "reason"
      ]
    }
  }
}
```

EXAMPLE INPUT:
```json
{
  "conv1": {
    "conversationTitle": "Project Liberty: Has Europe over-regulated tech?",
    "conversationBody": "It's worthwhile to ask what all this regulation is for. If its goal is a safer internet with better consumer protections, it might be considered more successful. If its goal is to ensure Europe's digital sovereignty, it might be considered less so.\n\nLink to the article: \nhttps://www.linkedin.com/pulse/has-europe-over-regulated-tech-projectliberty-pdaie/?trackingId=Cu3xfkVEALIA9OGoP9WUPA%3D%3D"
  },
  "conv2": {
    "conversationTitle": "Is this widespread adoption of AI dumbing down the future generation?",
    "conversationBody": "With multiple easy-to-use tools becoming more and more accessible, how do we ensure that the current and future generations do not become so dependent on them that we lose our ability to reason and produce high-quality outputs? \n\nNot just the people using AI tools to grow and develop but also for addressing this issue for the general masses. For example, with Google enabling access to information at one's fingertips, there is no longer a need to remember and collect a lot of facts. Similarly, multiple people no longer read lengthy case studies and do assignments themselves and are now dependent on LLMs.\n\nWould love to hear your two cents on the topic!"
  }
}
```

EXPECTED OUTPUT:
```json
{
  "conv1": [
    {
      "topic": "europe",
      "reason": "Focuses on European tech regulation and digital sovereignty"
    },
    {
      "topic": "society_politics",
      "reason": "Discusses regulatory policy and societal protections"
    },
    {
      "topic": "technology",
      "reason": "Relates to tech industry regulation and digital landscape"
    }
  ],
  "conv2": [
    {
      "topic": "education",
      "reason": "Centers on learning, critical thinking, and assignments"
    },
    {
      "topic": "society_politics",
      "reason": "Addresses societal impact of technology dependence"
    },
    {
      "topic": "technology",
      "reason": "Discusses AI tools, LLMs, and technological dependence"
    }
  ]
}
```

Respond ONLY with a valid JSON object matching the output schema.

---

#### Results
| Prompt | Input | Parameters | Output |
|---|---|---|---|
| 13 | 7 | Temp = 0.2 Top P = 0.7 Top K = 40 | ```json{   "conv1": [     {       "topic": "breaking_news",       "reason": "Sudden power outage in Buenos Aires, under investigation"     },     {       "topic": "latin_america",       "reason": "Focuses on Buenos Aires, Argentina"     },     {       "topic": "infrastructure",       "reason": "Relates to electricity and power outage"     }   ],   "conv2": [     {       "topic": "business_finance",       "reason": "Discusses Central Bank Digital Currencies and commercial banks"     },     {       "topic": "technology",       "reason": "Centers on digital currencies and financial technology"     },     {       "topic": "society_politics",       "reason": "Addresses societal impact and privacy concerns"     }   ],   "conv3": [     {       "topic": "health",       "reason": "Discusses Mediterranean diet and heart disease risk"     },     {       "topic": "breaking_news",       "reason": "New study published today on Mediterranean diet"     }   ],   "conv4": [     {       "topic": "breaking_news",       "reason": "Flooding in central Germany, evacuations ongoing"     },     {       "topic": "environment",       "reason": "Relates to flooding and weather conditions"     },     {       "topic": "europe",       "reason": "Focuses on central Germany"     }   ],   "conv5": [     {       "topic": "business_finance",       "reason": "Discusses challenges for small businesses"     },     {       "topic": "technology",       "reason": "Centers on data privacy regulation and user information"     },     {       "topic": "europe",       "reason": "Relates to European Union's data privacy law"     }   ],   "conv6": [     {       "topic": "science",       "reason": "Discusses discovery of Earth-sized exoplanet in habitable zone"     },     {       "topic": "breaking_news",       "reason": "NASA's announcement of possible life-supporting exoplanet"     }   ],   "conv7": [     {       "topic": "middle_east",       "reason": "Focuses on Beirut, Lebanon"     },     {       "topic": "society_politics",       "reason": "Addresses justice, answers from government, and memorials"     }   ],   "conv8": [     {       "topic": "breaking_news",       "reason": "Apple's emergency security update for iPhones"     },     {       "topic": "technology",       "reason": "Centers on iPhone security vulnerability and personal data"     }   ],   "conv9": [     {       "topic": "economy_work",       "reason": "Discusses remote work, productivity, and work-life balance"     },     {       "topic": "society_politics",       "reason": "Addresses societal impact and social connections"     }   ],   "conv10": [     {       "topic": "breaking_news",       "reason": "Protests in Hong Kong after new security law"     },     {       "topic": "asia",       "reason": "Focuses on Hong Kong"     },     {       "topic": "society_politics",       "reason": "Discusses national security law, protests, and international response"     }   ] }``` |
| 13 | 8 | Same as above| ```json{   "conv1": [     {       "topic": "breaking_news",       "reason": "Active wildfire emergency near Athens, Greece"     },     {       "topic": "environment",       "reason": "Discusses wildfire and its impact on local areas"     },     {       "topic": "europe",       "reason": "Focuses on a current event in Greece (Athens)"     }   ],   "conv2": [     {       "topic": "sports",       "reason": "Reflects on moments and athletes from Tokyo Olympics"     },     {       "topic": "society_politics",       "reason": "Discusses impact of pandemic on the Olympic games"     },     {       "topic": "asia",       "reason": "Focuses on a sporting event in Japan (Tokyo)"     }   ],   "conv3": [     {       "topic": "breaking_news",       "reason": "Emergence of new COVID-25 variant in Southeast Asia"     },     {       "topic": "health",       "reason": "Discusses new COVID variant and its potential impact"     },     {       "topic": "asia",       "reason": "Mentions emergence of new COVID variant in Southeast Asia"     }   ],   "conv4": [     {       "topic": "environment",       "reason": "Discusses UN climate report and global temperature rise"     },     {       "topic": "society_politics",       "reason": "Addresses government actions needed for climate change"     }   ],   "conv5": [     {       "topic": "economy_work",       "reason": "Discusses impact of inflation and rising food prices"     },     {       "topic": "society_politics",       "reason": "Addresses changes in shopping habits due to economic factors"     }   ],   "conv6": [     {       "topic": "technology",       "reason": "Discusses data breach affecting global hotel chain"     },     {       "topic": "business_finance",       "reason": "Mentions impact on hotel industry and customer data"     }   ],   "conv7": [     {       "topic": "society_politics",       "reason": "Commemorates 2011 Tōhoku earthquake and tsunami"     },     {       "topic": "asia",       "reason": "Focuses on a past disaster event in Japan (Tōhoku)"     }   ],   "conv8": [     {       "topic": "environment",       "reason": "Discusses electric vehicle tax credits as climate policy"     },     {       "topic": "society_politics",       "reason": "Addresses government incentives for electric vehicles"     }   ],   "conv9": [     {       "topic": "breaking_news",       "reason": "Active flooding emergency disrupting rail service in Mumbai"     },     {       "topic": "environment",       "reason": "Discusses severe flooding due to monsoon rains"     },     {       "topic": "asia",       "reason": "Focuses on a current event in India (Mumbai)"     }   ],   "conv10": [     {       "topic": "society_politics",       "reason": "Discusses sources for staying informed about world events"     },     {       "topic": "technology",       "reason": "Mentions online news sources and social media platforms"     }   ] }``` |

---

### Prompt 14 [further editing instructions for "breaking_news"]
#### System Instructions:

Your task is to analyze conversations and assign relevant topics from a predefined list.

AVAILABLE TOPICS:
```
[
  {
    "key": "art_culture",
    "label": "Art & Culture",
    "description": "Topics related to visual arts, performing arts, literature, and cultural heritage."
  },
  {
    "key": "business_finance",
    "label": "Business & Finance",
    "description": "Topics covering business operations, financial markets, investments, and corporate strategies."
  },
  {
    "key": "economy_work",
    "label": "Economy & Work",
    "description": "Discussions on macroeconomic trends, employment, labor markets, and workplace dynamics."
  },
  {
    "key": "environment",
    "label": "Environment",
    "description": "Issues related to natural resources, conservation, pollution, biodiversity, and environmental policy."
  },
  {
    "key": "education",
    "label": "Education",
    "description": "Topics covering education systems, learning methods, academic institutions, and educational policies."
  },
  {
    "key": "funny",
    "label": "Funny",
    "description": "Humorous content, jokes, comedy, and entertaining topics meant to amuse."
  },
  {
    "key": "health",
    "label": "Health",
    "description": "Matters related to physical and mental health, healthcare systems, medical research, and wellness."
  },
  {
    "key": "infrastructure",
    "label": "Infrastructure",
    "description": "Topics covering public systems such as transportation, utilities, and communication networks."
  },
  {
    "key": "religion_spirituality",
    "label": "Religion & Spirituality",
    "description": "Discussions on faith, religious practices, spiritual beliefs, and theological concepts."
  },
  {
    "key": "science",
    "label": "Science",
    "description": "Topics related to scientific research, discoveries, theories, and advancements across disciplines."
  },
  {
    "key": "society_politics",
    "label": "Society & Politics",
    "description": "Social issues, political debates, governance, policies, and political events."
  },
  {
    "key": "sports",
    "label": "Sports",
    "description": "Topics about athletic activities, sporting events, teams, athletes, and related competitions."
  },
  {
    "key": "technology",
    "label": "Technology",
    "description": "Discussions about digital innovation, computing, software, hardware, and technological advancements."
  },
  {
    "key": "breaking_news",
    "label": "Breaking News",
    "description": "News about major, unexpected, or extraordinary events of immediate public concern that have just happened or are actively unfolding. Excludes general trends, recent-but-not-urgent developments, and past events."
  },
  {
    "key": "africa",
    "label": "Africa",
    "description": "Topics related to North African and Sub-Saharan African countries, including Egypt when in African context."
  },
  {
    "key": "asia",
    "label": "Asia",
    "description": "Topics related to East, South, Southeast, and Central Asian countries, including Russia, Turkey and Caucasus when in Asian context."
  },
  {
    "key": "europe",
    "label": "Europe",
    "description": "Topics related to Western, Eastern, Northern, and Southern European countries, including Russia, Turkey and Caucasus when in European context."
  },
  {
    "key": "latin_america",
    "label": "Latin America",
    "description": "Topics related to Mexico, Central America, South America, and Spanish/Portuguese/French-speaking Caribbean nations."
  },
  {
    "key": "middle_east",
    "label": "Middle East",
    "description": "Topics related to Western Asian countries, including Israel, Turkey and Egypt when in Middle Eastern context."
  },
  {
    "key": "north_america",
    "label": "North America",
    "description": "Topics related to the United States, Canada, and English-speaking Caribbean nations."
  },
  {
    "key": "oceania",
    "label": "Oceania",
    "description": "Topics related to Australia, New Zealand, and Pacific Island nations."
  }
]
```

INSTRUCTIONS:
1. Analyze each conversation in the input JSON.
2. Assign relevant topics from the available topics list for each conversation. Do not use topics not included in the list.
3. For each assigned topic, provide a brief reason (up to 60 characters) explaining why it was assigned.
4. Assign appropriate regional topics (e.g. middle_east) whenever the conversation substantively focuses on the specific region or countries within that region. For countries that could belong to multiple regions (e.g., Russia, Turkey, Egypt), assign the regional topic that best matches the conversation's context.
5. Assign breaking_news only when the conversation meets BOTH criteria:
   (a) Recent and active timing: Events actively happening or just announced (look for "just," "now," "currently," "breaking," "urgent", etc.)
   (b) Immediate urgency: Requires immediate public attention or action
   Exclude: past events, recent-but-not-urgent events, general trends, anniversaries, commemorations, scheduled events, routine reports, etc.
6. Return your assignments in the specified output format using only the topic keys (not labels).

INPUT JSON SCHEMA:
```json
{
  "type": "object",
  "additionalProperties": {
    "type": "object",
    "properties": {
      "conversationTitle": {
        "type": "string"
      },
      "conversationBody": {
        "type": [
          "string",
          "null"
        ]
      }
    },
    "required": [
      "conversationTitle"
    ]
  }
}
```

OUTPUT JSON SCHEMA:
```json
{
  "type": "object",
  "additionalProperties": {
    "type": "array",
    "items": {
      "type": "object",
      "properties": {
        "topic": {
          "type": "string"
        },
        "reason": {
          "type": "string"
        }
      },
      "required": [
        "topic",
        "reason"
      ]
    }
  }
}
```

EXAMPLE INPUT:
```json
{
  "conv1": {
    "conversationTitle": "Project Liberty: Has Europe over-regulated tech?",
    "conversationBody": "It's worthwhile to ask what all this regulation is for. If its goal is a safer internet with better consumer protections, it might be considered more successful. If its goal is to ensure Europe's digital sovereignty, it might be considered less so.\n\nLink to the article: \nhttps://www.linkedin.com/pulse/has-europe-over-regulated-tech-projectliberty-pdaie/?trackingId=Cu3xfkVEALIA9OGoP9WUPA%3D%3D"
  },
  "conv2": {
    "conversationTitle": "Is this widespread adoption of AI dumbing down the future generation?",
    "conversationBody": "With multiple easy-to-use tools becoming more and more accessible, how do we ensure that the current and future generations do not become so dependent on them that we lose our ability to reason and produce high-quality outputs? \n\nNot just the people using AI tools to grow and develop but also for addressing this issue for the general masses. For example, with Google enabling access to information at one's fingertips, there is no longer a need to remember and collect a lot of facts. Similarly, multiple people no longer read lengthy case studies and do assignments themselves and are now dependent on LLMs.\n\nWould love to hear your two cents on the topic!"
  }
}
```

EXPECTED OUTPUT:
```json
{
  "conv1": [
    {
      "topic": "europe",
      "reason": "Focuses on European tech regulation and digital sovereignty"
    },
    {
      "topic": "society_politics",
      "reason": "Discusses regulatory policy and societal protections"
    },
    {
      "topic": "technology",
      "reason": "Relates to tech industry regulation and digital landscape"
    }
  ],
  "conv2": [
    {
      "topic": "education",
      "reason": "Centers on learning, critical thinking, and assignments"
    },
    {
      "topic": "society_politics",
      "reason": "Addresses societal impact of technology dependence"
    },
    {
      "topic": "technology",
      "reason": "Discusses AI tools, LLMs, and technological dependence"
    }
  ]
}
```

Respond ONLY with a valid JSON object matching the output schema.

#### Results
| Prompt | Input | Parameters | Output |
|---|---|---|---|
| 14 | 7 | Temp = 0.2 Top P = 0.7 Top K = 40 | ```json{   "conv1": [     {       "topic": "breaking_news",       "reason": "Active power outage affecting Buenos Aires"     },     {       "topic": "latin_america",       "reason": "Focuses on event happening in Buenos Aires, Argentina"     },     {       "topic": "infrastructure",       "reason": "Relates to electricity and power outage"     }   ],   "conv2": [     {       "topic": "business_finance",       "reason": "Discusses Central Bank Digital Currencies and banking"     },     {       "topic": "technology",       "reason": "Mentions digital currencies and technological advancements"     },     {       "topic": "society_politics",       "reason": "Addresses societal impact and potential disruption"     }   ],   "conv3": [     {       "topic": "health",       "reason": "Discusses Mediterranean diet and heart disease risk"     },     {       "topic": "breaking_news",       "reason": "New study findings on Mediterranean diet just published"     }   ],   "conv4": [     {       "topic": "breaking_news",       "reason": "Active flooding situation in central Germany"     },     {       "topic": "environment",       "reason": "Relates to flooding and weather conditions"     },     {       "topic": "europe",       "reason": "Focuses on event happening in central Germany"     }   ],   "conv5": [     {       "topic": "business_finance",       "reason": "Discusses impact of EU data privacy law on businesses"     },     {       "topic": "technology",       "reason": "Mentions data collection, storage, and privacy"     },     {       "topic": "europe",       "reason": "Focuses on European Union's new data privacy regulation"     }   ],   "conv6": [     {       "topic": "science",       "reason": "Discusses discovery of Earth-sized exoplanet in habitable zone"     },     {       "topic": "breaking_news",       "reason": "NASA's recent discovery of a potential life-supporting exoplanet"     }   ],   "conv7": [     {       "topic": "middle_east",       "reason": "Focuses on event happening in Beirut, Lebanon"     },     {       "topic": "society_politics",       "reason": "Addresses justice, answers, and government involvement"     }   ],   "conv8": [     {       "topic": "breaking_news",       "reason": "Urgent security update for iPhone users just released"     },     {       "topic": "technology",       "reason": "Relates to iPhone security, personal data, and hacking"     }   ],   "conv9": [     {       "topic": "economy_work",       "reason": "Discusses remote work, productivity, and work-life balance"     },     {       "topic": "society_politics",       "reason": "Addresses societal impact and social connections"     }   ],   "conv10": [     {       "topic": "breaking_news",       "reason": "Active protests in Hong Kong after new security law"     },     {       "topic": "asia",       "reason": "Focuses on event happening in Hong Kong"     },     {       "topic": "society_politics",       "reason": "Discusses political debates, governance, and policies"     }   ] }``` |
| 14 | 8 | Same as above | ```json{   "conv1": [     {       "topic": "breaking_news",       "reason": "Active wildfire emergency near Athens, Greece"     },     {       "topic": "environment",       "reason": "Discusses wildfire and its impact on local areas"     },     {       "topic": "europe",       "reason": "Focuses on a current event happening in Greece"     }   ],   "conv2": [     {       "topic": "sports",       "reason": "Reflects on moments and athletes from Tokyo Olympics"     },     {       "topic": "society_politics",       "reason": "Discusses impact of pandemic on the Olympic games"     },     {       "topic": "asia",       "reason": "Focuses on an event that took place in Tokyo, Japan"     }   ],   "conv3": [     {       "topic": "breaking_news",       "reason": "Emergence of new COVID-25 variant in Southeast Asia"     },     {       "topic": "health",       "reason": "Discusses new COVID variant and its potential impact"     },     {       "topic": "asia",       "reason": "Mentions the emergence of the variant in Southeast Asia"     }   ],   "conv4": [     {       "topic": "environment",       "reason": "Discusses UN climate report and global temperature rise"     },     {       "topic": "society_politics",       "reason": "Addresses government actions needed for climate change"     }   ],   "conv5": [     {       "topic": "economy_work",       "reason": "Discusses impact of inflation and rising food prices"     },     {       "topic": "society_politics",       "reason": "Addresses changes in shopping habits and diet due to inflation"     }   ],   "conv6": [     {       "topic": "technology",       "reason": "Discusses data breach affecting global hotel chain"     },     {       "topic": "business_finance",       "reason": "Mentions impact on hotel guests and company response"     }   ],   "conv7": [     {       "topic": "society_politics",       "reason": "Commemorates the 2011 Tōhoku earthquake and tsunami"     },     {       "topic": "asia",       "reason": "Focuses on a past event that occurred in Japan"     }   ],   "conv8": [     {       "topic": "environment",       "reason": "Discusses electric vehicle tax credits as climate policy"     },     {       "topic": "society_politics",       "reason": "Addresses government incentives for electric vehicle adoption"     }   ],   "conv9": [     {       "topic": "breaking_news",       "reason": "Active flooding emergency disrupting rail service in Mumbai"     },     {       "topic": "environment",       "reason": "Discusses flooding due to heavy monsoon rains"     },     {       "topic": "asia",       "reason": "Focuses on a current event happening in Mumbai, India"     }   ],   "conv10": [     {       "topic": "society_politics",       "reason": "Discusses sources for staying informed about world events"     },     {       "topic": "technology",       "reason": "Mentions online news sources and social media platforms"     }   ] }``` |

---