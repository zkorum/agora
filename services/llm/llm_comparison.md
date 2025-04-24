# LLM Comparison 

During early testing, we compared model outputs across a series of prompts to identify the LLM best-suited to the Agora use-case. DeepSeek-R1-Distill-Qwen-1.5B was evaluated using LMStudio's local inference server, while DeepSeek-R1-Distill-Llama-8B was deployed using the Hugging Face Transformers library in a Google Colab notebook with GPU acceleration. Mistral-Small-24B-Instruct-2501 was accessed through Mistral AI's La Plateforme API endpoints and the Together AI hosted inference service. All evaluations maintained default inference parameters (temperature, top-p, top-k).


## Table of Contents
- [Prompt 1](#prompt-1)
  - [DeepSeek-R1-Distill-Qwen-1.5B Response to Prompt 1 + Input JSON 1](#deepseek-r1-distill-qwen-1.5b-response-to-prompt-1--input-json-1)
  - [Mistral-Small-24B-Instruct-2501 Response to Prompt 1 + Input JSON 1](#mistral-small-24b-instruct-2501-response-to-prompt-1--input-json-1)
  - [DeepSeek-R1-Distill-Llama-8B Response to Prompt 1 + Input JSON 1](#deepseek-r1-distill-llama-8b-response-to-prompt-1--input-json-1)
- [Prompt 2](#prompt-2)
  - [DeepSeek-R1-Distill-Qwen-1.5B Response to Prompt 2 + Input JSON 1](#deepseek-r1-distill-qwen-1.5b-response-to-prompt-2--input-json-1)
  - [Mistral-Small-24B-Instruct-2501 Response to Prompt 2 + Input JSON 1](#mistral-small-24b-instruct-2501-response-to-prompt-2--input-json-1)
  - [DeepSeek-R1-Distill-Llama-8B Response to Prompt 2 + Input JSON 1](#deepseek-r1-distill-llama-8b-response-to-prompt-2--input-json-1)
- [Prompt 3](#prompt-3)
  - [DeepSeek-R1-Distill-Llama-8B Response to Prompt 3 + Input JSON 1](#deepseek-r1-distill-llama-8b-response-to-prompt-3--input-json-1)
- [Prompt 4](#prompt-4)
  - [DeepSeek-R1-Distill-Llama-8B Response to Prompt 4 + Input JSON 1](#deepseek-r1-distill-llama-8b-response-to-prompt-4--input-json-1)
- [Prompt 5](#prompt-5)
  - [DeepSeek-R1-Distill-Llama-8B Response to Prompt 5 + Input JSON 2](#deepseek-r1-distill-llama-8b-response-to-prompt-5--input-json-2)
  - [Mistral-Small-24B-Instruct-2501 Response to Prompt 5 + Input JSON 1](#mistral-small-24b-instruct-2501-response-to-prompt-5--input-json-1)
- [Prompt 6](#prompt-6-with-json-schema)
  - [DeepSeek-R1-Distill-Llama-8B Response to Prompt 6 + Input JSON 2](#deepseek-r1-distill-llama-8b-response-to-prompt-6--input-json-2)
  - [Mistral-Small-24B-Instruct-2501 Response to Prompt 6 + Input JSON 2](#mistral-small-24b-instruct-2501-response-to-prompt-6--input-json-2)
- [Prompt 7](#prompt-7-with-json-schema)
  - [DeepSeek-R1-Distill-Llama-8B Response to Prompt 7 + Input JSON 2](#deepseek-r1-distill-llama-8b-response-to-prompt-7--input-json-2)
  - [Mistral-Small-24B-Instruct-2501 Response to Prompt 7 + Input JSON 2](#mistral-small-24b-instruct-2501-response-to-prompt-7--input-json-2)
- [Prompt 8](#prompt-8-with-json-schema)
  - [DeepSeek-R1-Distill-Llama-8B Response to Prompt 8 + Input JSON 2](#deepseek-r1-distill-llama-8b-response-to-prompt-8--input-json-2)
  - [DeepSeek-R1-Distill-Llama-8B Response to Prompt 8 + Input JSON 3](#deepseek-r1-distill-llama-8b-response-to-prompt-8--input-json-3)
  - [Mistral-Small-24B-Instruct-2501 Response to Prompt 8 + Input JSON 3](#mistral-small-24b-instruct-2501-response-to-prompt-8--input-json-3)
  - [Mistral Small 25.01 Response to Prompt 8 + Input JSON 3](#mistral-small-25.01-response-to-prompt-8--input-json-3)
- [Prompt 9](#prompt-9-with-json-schema--avoid-value-laden-labels)
  - [DeepSeek-R1-Distill-Llama-8B Response to Prompt 9 + Input JSON 2](#deepseek-r1-distill-llama-8b-response-to-prompt-9--input-json-2)
  - [DeepSeek-R1-Distill-Llama-8B Response to Prompt 9 + Input JSON 3](#deepseek-r1-distill-llama-8b-response-to-prompt-9--input-json-3)
  - [Mistral-Small-24B-Instruct-2501 Response to Prompt 9 + Input JSON 2](#mistral-small-24b-instruct-2501-response-to-prompt-9--input-json-2)


---
## Prompt 1
You are an expert analyst summarizing survey results. Given a JSON input containing structured data about a conversation, including overall information, opinions, and opinion groups, generate a concise output in JSON format. Follow these guidelines strictly:

1.  Create a main label (max 2 words, 60 characters) and summary (max 300 characters) for the entire conversation.  
     
2.  For each participant group (cluster), create a label (max 2 words, 60 characters) and summary (max 300 characters).  
      
3.  Focus on key insights, majority opinions, and controversial points.  
    
4.  Use simple, clear language. Avoid bullet points and verbose explanations.  
      
5.  Capture the essence of each group's perspective succinctly.  
      
Your output should follow this structure:  
```
{
  "label": "<Main conversation label>",
  "summary": "<Overall conversation summary>",
  "clusters": {
    "<cluster_number>": {
      "label": "<Cluster label>",
      "summary": "<Cluster summary>"
    }
    // Repeat for each cluster 
  }
}
```
Analyze the following JSON input carefully and provide insightful, concise labels and summaries that capture the core of the discussion and each group's viewpoint.

[Insert the JSON input here]
  
### DeepSeek-R1-Distill-Qwen-1.5B Response to Prompt 1 + Input JSON 1
LMStudio
```
{
  "label": "Long-Term Impact of Remote Work",
  "summary": "A discussion about the long-term effects of remote work on productivity, work-life balance, and the economy.",
  "clusters": {
    "0": {
      "label": "Opportunities vs. Collaboration",
      "summary": "Remote work increases productivity for many employees but may reduce team collaboration."
    },
    "1": {
      "label": "Hybrid Work Models",
      "summary": "While companies want hybrid work, redundant office work is a potential downside."
    }
  }
}
```
      
### Mistral-Small-24B-Instruct-2501 Response to Prompt 1 + Input JSON 1
TogetherAI Chat UI
```json 
{
  "label": "Remote Work Debate",
  "summary": "Participants discuss the benefits and drawbacks of remote work, focusing on productivity, hybrid models, and team collaboration.",
  "clusters": {
    "0": {
      "label": "Remote Work Advocates",
      "summary": "Strongly believe remote work boosts productivity and consider office work outdated, though divided on its necessity."
    },
    "1": {
      "label": "Hybrid Model Supporters",
      "summary": "Favor a hybrid work model, acknowledging remote work's benefits while expressing concerns about reduced team collaboration."
    }
  }
}
```

### DeepSeek-R1-Distill-Llama-8B Response to Prompt 1 + Input JSON 1
GoogleColab

```json
{
  "label": "Future of Remote Work Discussion",
  "summary": "Participants discuss the impact of remote work on productivity, work-life balance, and company structures. Key points include productivity benefits, hybrid work models, and collaboration concerns.",
  "clusters": {
    "0": {
      "label": "Productivity Advocates",
      "summary": "Believes remote work boosts productivity; some argue traditional offices are outdated."
    },
    "1": {
      "label": "Hybrid Work Supporters",
      "summary": "Prefers hybrid models but questions if remote work harms collaboration."
    }
  }
}
```

 ---
## Prompt 2
You are an expert analyst summarizing survey results. Given a JSON input containing structured data about a conversation, including overall information, opinions, and opinion groups, generate a concise output in JSON format. Follow these guidelines strictly:

1.  Create a summary (max 300 characters) for the entire conversation.
    
2.  For each participant group (cluster):
	- Create a label (max 2 words, total length < 60 characters, choosing the shortest option possible).
	- The label should be in noun form (e.g., "Maximalists" instead of "Maximalism").
	- Create a summary (max 300 characters).
    
3.  Focus on key insights, majority opinions, and controversial points.
    
4.  Use simple, clear, formal language. Avoid bullet points and verbose explanations.
    
5.  Capture the essence of each group's perspective succinctly.  
      
Your output should follow this structure:  
```
{
  "summary": "<Overall conversation summary>",
  "clusters": {
    "<cluster_number>": {
      "label": "<Cluster label>",
      "summary": "<Cluster summary>"
    }
    // Repeat for each cluster  
  }
}
```

Analyze the following JSON input carefully and provide insightful, concise labels and summaries that capture the core of the discussion and adhere to the above guidelines.

[Insert the JSON input here]

### DeepSeek-R1-Distill-Qwen-1.5B Response to Prompt 2 + Input JSON 1
LMStudio

```json
    {
      "summary": "A survey discussed remote work impacts on productivity, economy, and work-life balance.",
      "clusters": {
        "0": {
          "label": "Minority",
          "summary": "The majority supports remote work benefits but concerns outdated office settings."
        },
        "1": {
          "label": "Majority",
          "summary": "Favor hybrid models while disapproving full remote and outdated office practices."
        }
      }
    }
```

### Mistral-Small-24B-Instruct-2501 Response to Prompt 2 + Input JSON 1
TogetherAI Chat UI

```
    {
      "summary": "The conversation about the future of remote work highlights a strong preference for hybrid models, with mixed views on productivity and collaboration.",
      "clusters": {
        "0": {
          "label": "Remote Enthusiasts",
          "summary": "Strong advocates for remote work, believing it boosts productivity and makes office work obsolete, though they acknowledge potential collaboration issues."
        },
        "1": {
          "label": "Hybrid Supporters",
          "summary": "Favor a hybrid work model, recognizing its benefits for productivity and collaboration, while acknowledging some concerns about fully remote work."
        }
      }
    }
```

### DeepSeek-R1-Distill-Llama-8B Response to Prompt 2 + Input JSON 1
GoogleColab

```json
{
  "summary": "Discussion on remote work's impact on productivity, work-life balance, and economic effects, with participants divided on collaboration and office necessity.",
  "clusters": {
    "0": {
      "label": "Remote Work Advocates",
      "summary": "Strongly support remote work's productivity benefits; some argue traditional office work is outdated."
    },
    "1": {
      "label": "Hybrid Work Supporters",
      "summary": "Advocate for hybrid models to balance flexibility and collaboration; some worry fully remote work harms teamwork."
    }
  }
}
```

---
## Prompt 3
You are an expert analyst summarizing survey results. Given a JSON input containing structured data about a group conversation, generate a concise output in JSON format. Follow these guidelines STRICTLY:

1. Create a summary for the entire conversation (MAXIMUM 300 characters, no more, no less).

2. For each participant group (cluster):

	a. Create a label (MAXIMUM 2 words, TOTAL LENGTH < 60 characters, choose the shortest option possible).
	b. The label should be in noun form (e.g., "Maximalists" instead of "Maximalism").
	c. Create a summary (MAXIMUM 300 characters, no more).

3. Focus on key insights, majority opinions, and controversial points.

4. Use simple, clear, formal language. Avoid bullet points and verbose explanations.

5. Capture the essence of each group's perspective succinctly.

Your output MUST follow this structure and character limits:
```
{
  "summary": "<Overall conversation summary (MAXIMUM 300 characters)>",
  "clusters": {
    "<cluster_number>": {
      "label": "<Cluster label (MAX 2 words, TOTAL LENGTH < 60 characters)>",
      "summary": "<Cluster summary (MAXIMUM 300 characters)>"
    } 
    // Repeat for each cluster
  }
}
```

Analyze the following JSON input carefully and provide insightful, concise labels and summaries that capture the core of the discussion and adhere strictly to the above guidelines. IMPORTANT: Failure to adhere to word and character limits will result in an incorrect output.

[Insert JSON input here]

### DeepSeek-R1-Distill-Llama-8B Response to Prompt 3 + Input JSON 1
GoogleColab

```json
{
  "summary": "The conversation debates remote work's impact, with some favoring hybrid models and others critical of its effects on productivity and collaboration. Controversy arises over reduced teamwork and outdated office practices.",
  "clusters": {
    "0": {
      "label": "Remote Work Critics",
      "summary": "This group predominantly disagrees with the productivity benefits of remote work and questions the necessity of traditional office environments."
    },
    "1": {
      "label": "Hybrid Advocates",
      "summary": "These participants mostly support hybrid work models, emphasizing flexibility and collaboration, though they acknowledge some challenges with team cohesion."
    }
  }
}
```

---
## Prompt 4
You are an expert analyst summarizing survey results. Given a JSON input containing structured data about a group conversation, generate a concise output in JSON format. Follow these guidelines STRICTLY:

1.  Create a summary for the entire conversation (MAXIMUM 300 characters, no more, no less).  
     
2.  For each participant group (cluster):  
    a. Create a label (EXACTLY 2 words or fewer, TOTAL LENGTH < 60 characters).  
	    -   The label MUST NOT EXCEED 2 words.  
	    -   Use noun form (e.g., "Maximalists" instead of "Maximalism").  
	    -   Examples of acceptable labels: "Hybrid Advocates", "Remote Critics".  
	    -   Examples of unacceptable labels: "Advocates of Hybrid Work", "Critics of Remote Work".  
    b. Create a summary (MAXIMUM 300 characters, no more).  
      
4.  Focus on key insights, majority opinions, and controversial points.  
     
5.  Use simple, clear, formal language. Avoid bullet points and verbose explanations.  
      
6.  Capture the essence of each group's perspective succinctly.  
      
Your output MUST follow this structure and adhere to all character and word limits:
```
{
  "summary": "<Overall conversation summary>",
  "clusters": {
    "<cluster_number>": {
      "label": "<Cluster label>",
      "summary": "<Cluster summary>"
    }
    // Repeat for each cluster  
  }
}
```

IMPORTANT: Failure to adhere to word and character limits will result in an incorrect output. Labels exceeding 2 words or summaries exceeding 300 characters are unacceptable.

Analyze the following JSON input carefully and provide insightful, concise labels and summaries that capture the core of the discussion while strictly adhering to these guidelines.

[Insert JSON input here]

### DeepSeek-R1-Distill-Llama-8B Response to Prompt 4 + Input JSON 1
GoogleColab

```json
{
 "summary": "Discussion highlights remote work's benefits for productivity and hybrid models, with debates over collaboration and office relevance.",
 "clusters": {
  "0": {
   "label": "Remote Work Supporters",
   "summary": "Cluster 0 members support remote work's productivity benefits but question the necessity of traditional office work."
  },
  "1": {
   "label": "Hybrid Advocates",
   "summary": "Cluster 1 advocates for hybrid work, emphasizing collaboration while supporting remote work's flexibility."
  }
}
```

---
## Prompt 5
You are an expert analyst summarizing survey results. Given a JSON input containing structured data about a group conversation, generate a concise output in JSON format. Follow these guidelines STRICTLY:

1.  Create a summary for the entire conversation (MAXIMUM 300 characters, no more).  
     
2.  For each participant group (cluster):  
	-   Create a label (2 words or fewer, TOTAL LENGTH < 60 characters).  
		-  The label MUST NOT EXCEED 2 words under any circumstances.  
		-  Use noun form (e.g., "Maximalists" instead of "Maximalism").  
		-  Examples of acceptable labels: "Hybrid Advocates", "Remote Critics".  
		-  Examples of unacceptable labels: "Advocates of Hybrid Work" (too long), "Critics of Remote Work" (too long).
		-  If you cannot create a meaningful label in 2 words or fewer, simplify further (e.g., "Advocates" or "Critics"). 
	-  Labels longer than 2 words will result in an invalid output.  
     
4.  Create a summary for each cluster (MAXIMUM 300 characters, no more).  
   
5.  Focus on key insights, majority opinions, and controversial points.  
      
6.  Use simple, clear, formal language. Avoid verbose explanations and bullet points.  
     
7.  Capture the essence of each group's perspective succinctly.  
      
Your output MUST follow this structure and adhere to all character and word limits:
```json
{
  "summary": "<Overall conversation summary (MAXIMUM 300 characters)>",
  "clusters": {
    "<cluster_number>": {
      "label": "<Cluster label (EXACTLY 2 words or fewer)>",
      "summary": "<Cluster summary (MAXIMUM 300 characters)>"
    }
    // Repeat for each cluster
  }
}
```

IMPORTANT:
-   Labels exceeding 2 words or summaries exceeding 300 characters are invalid.
-   If unable to create a meaningful label in exactly 2 words, prioritize brevity over detail.
-   Adherence to these rules is critical; failure to follow them will result in an incorrect output.  
      
Example of Correct Output:
```json
{
  "summary": "Discussion highlights remote work's benefits for productivity and hybrid models, with debates over collaboration and office relevance.",
  "clusters": {
    "0": {
      "label": "Remote Critics",
      "summary": "Cluster 0 members support remote work's productivity benefits but question the necessity of traditional office work."
    },
    "1": {
      "label": "Hybrid Advocates",
      "summary": "Cluster 1 advocates for hybrid work, emphasizing collaboration while supporting remote work's flexibility."
    }
  }
}  
```
Example of Incorrect Output:
```json
{
  "summary": "Discussion highlights remote work's benefits for productivity and hybrid models, with debates over collaboration and office relevance.",
  "clusters": {
    "0": {
      "label": "Remote Work Supporters", // INVALID: Exceeds 2 words
      "summary": "Cluster 0 members support remote work's productivity benefits but question the necessity of traditional office work."
    },
    "1": {
      "label": "Advocates of Hybrid Work", // INVALID: Exceeds 2 words
      "summary": "Cluster 1 advocates for hybrid work, emphasizing collaboration while supporting remote work's flexibility."
    }
  }
}
```
Now analyze the following JSON input carefully and provide insightful, concise labels and summaries that capture the core of the discussion while strictly adhering to above guidelines. 

[Insert JSON input here]
 
### DeepSeek-R1-Distill-Llama-8B Response to Prompt 5 + Input JSON 2
GoogleColab

```json
{
  "summary": "Discussion centers on AI art's impact, with concerns about replacing human creativity and job losses, versus acceptance and ethical issues.",
  "clusters": {
    "0": {
      "label": "AI Replacing Creativity",
      "summary": "Cluster 0 members worry AI art lacks meaning and may replace human creativity, affecting jobs and overwhelming content."
    },
    "1": {
      "label": "Hybrid Artists",
      "summary": "Cluster 1 advocates for human creativity's role while acknowledging AI's execution but questions its impact on craftsmanship."
    },
    "2": {
      "label": "AI Ethic Advocates",
      "summary": "Cluster 2 members discuss AI art's potential and ethical concerns, including training on copyrighted material."
    }
  }
}
```

### Mistral-Small-24B-Instruct-2501 Response to Prompt 5 + Input JSON 1
TogetherAI Chat UI

```
{
  "summary": "The conversation about AI art highlights concerns over AI's lack of consciousness and creativity, while some see it as a new tool for artists.",
  "clusters": {
    "0": {
      "label": "AI Skeptics",
      "summary": "Cluster 0 members believe AI art lacks meaning and human creativity. They fear an overflow of AI-generated content and doubt AI's ability to innovate."
    },
    "1": {
      "label": "Human Artists",
      "summary": "Cluster 1 supports human creativity and responsibility in art. They view AI tools as undermining traditional craft and skill, and criticize tech companies for societal harms."
    },
    "2": {
      "label": "Tech Optimists",
      "summary": "Cluster 2 acknowledges AI art's potential and the need for universal basic income. They see AI as a tool for art and believe new technologies gain acceptance over time."
    }
  }
}
```

---
## Prompt 6 (with JSON schema)
You are an expert analyst summarizing survey results. Given a JSON input containing structured data about a group conversation, generate a concise output in JSON format that strictly adheres to the following JSON Schema:

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
            "description": "Cluster label (1 or 2 words, total length < 60 characters)"
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
	- Capture key insights, majority opinions, and controversial points.

2. Cluster Labels:
	- Maximum 2 words (e.g., "Remote Critics" or "Advocates").
	- Total length < 60 characters.
	- Always choose the shortest option possible while maintaining clarity.
	- Use noun form (no verbs or adjectives).
	- If a single word suffices, use only one word.

3. Cluster Summaries:
	- Maximum 300 characters.
	- Focus on group perspectives and disagreements.

Example Valid Outputs:
```
{
  "summary": "Discussion highlights remote work's benefits for productivity and hybrid models, with debates over collaboration and office relevance.",
  "clusters": {
    "0": {
      "label": "Critics",
      "summary": "Cluster 0 members support remote work's productivity benefits but question traditional office necessity."
    },
    "1": {
      "label": "Hybrid Advocates",
      "summary": "Cluster 1 supports a mix of remote and office work, emphasizing balance and collaboration needs."
    }
  }
}  
```

Example Invalid Output:
```
{
  "clusters": {
    "0": {
      "label": "Remote Work Critics", // INVALID: Exceeds 2 words
      "summary": "Cluster 0 supports..." // Valid
    }
  }
}
```
  
IMPORTANT:
- Labels must be 1 or 2 words maximum, with a total length < 60 characters.
- Always choose the shortest label option that accurately represents the cluster.
- Labels/summaries exceeding limits will cause validation errors.
- Use the schema as a strict blueprint for your output.

Now analyze the following JSON input carefully and provide insightful, concise labels and summaries that capture the core of the discussion while strictly adhering to above guidelines.

[Insert JSON input here]

### DeepSeek-R1-Distill-Llama-8B Response to Prompt 6 + Input JSON 2
GoogleColab

```json
{
  "summary": "Discussion centers on AI art's impact, with debates over creativity, job threats, and ethical issues. Skeptics worry about human replacement, while some accept AI's role.",
  "clusters": {
    "0": {
      "label": "AI Skeptics",
      "summary": "Cluster 0 members question AI's artistic capability and threat to human creativity."
    },
    "1": {
      "label": "Creative Concerns",
      "summary": "Cluster 1 focuses on AI's negative effects on craftsmanship and livelihoods."
    },
    "2": {
      "label": "AI Acceptance",
      "summary": "Cluster 2 views AI art as a tool, acknowledging its potential while addressing ethical issues."
    }
  }
}
```

### Mistral-Small-24B-Instruct-2501 Response to Prompt 6 + Input JSON 2
TogetherAI Chat UI

```
{
  "summary": "The discussion on AI art highlights disagreements over AI's ability to create meaningful art, its impact on human artists, and the ethical concerns surrounding AI-generated content.",
  "clusters": {
    "0": {
      "label": "AI Critics",
      "summary": "Cluster 0 members argue AI lacks consciousness and intentionality, thus its art has no meaning. They believe AI art is false and undermines human creativity."
    },
    "1": {
      "label": "Human Creativity",
      "summary": "Cluster 1 supports human involvement in AI art creation, emphasizing human responsibility for ideas while AI executes them. They disagree with AI's potential to replace human creativity."
    },
    "2": {
      "label": "AI Art",
      "summary": "Cluster 2 acknowledges AI-generated art as valid if indistinguishable from human-made art. They highlight the societal impacts of AI art, including the need for universal basic income."
    }
  }
}
```

## Prompt 7 (with JSON schema)
You are an expert analyst summarizing survey results. Given a JSON input containing structured data about a group conversation, generate a concise output in JSON format that strictly adheres to the following JSON Schema:

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
            "description": "Cluster label (1-2 words, noun form describing people/groups, max 60 characters)"
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
	- Capture key insights, majority opinions, and controversial points.
	
2. Cluster Labels:
	- Maximum 2 words (e.g., "Remote Critics" or "Advocates").
	- Total length < 60 characters
	- Describe people/groups (e.g., "Skeptics", "Advocates", "Purists").
	- Don’t use abstract concepts (e.g., "Concerns", “Collaboration”, is invalid).
	- Prioritize brevity while maintaining clarity (e.g., "Environmentalists" instead of "Environmental Protection Advocates").
	
3. Cluster Summaries:
	- Maximum 300 characters.
	- Focus on group perspectives and disagreements.
	  
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
  
IMPORTANT:
-   Labels must be 1 or 2 words maximum, with a total length < 60 characters.
-   Labels must describe **people/groups**, not abstract ideas.
-   Use agentive nouns ending with -ists, -ers, or -ians (e.g., "Ethicists", "Defenders").
-   Labels/summaries exceeding word and character count limits will cause validation errors.
-   Use the schema as a strict blueprint for your output.
   
Now analyze the following JSON input carefully and provide insightful, concise labels and summaries that capture the core of the discussion while strictly adhering to above guidelines.

[Insert JSON input here]

### DeepSeek-R1-Distill-Llama-8B Response to Prompt 7 + Input JSON 2
GoogleColab

```
{
  "summary": "The conversation debates AI art's impact, with concerns over job displacement and artistic integrity, while some argue AI can enhance creativity.",
  "clusters": {
    "0": {
      "label": "AI Art Critics",
      "summary": "Express concerns about AI replacing human creativity and the negative impact on artists."
    },
    "1": {
      "label": "Human Creativity Advocates",
      "summary": "Emphasize human creativity's role and the challenges AI poses to creative professions."
    },
    "2": {
      "label": "AI Art Supporters",
      "summary": "Discuss AI art's potential and ethical issues, while showing openness to its role."
    }
  }
}
```

### Mistral-Small-24B-Instruct-2501 Response to Prompt 7 + Input JSON 2
TogetherAI Chat UI

```
{
  "summary": "The conversation revolves around the impact of AI art, with debates on its legitimacy, the role of human creativity, and the potential societal implications.",
  "clusters": {
    "0": {
      "label": "AI Skeptics",
      "summary": "Believe AI lacks consciousness and intentionality, questioning the meaning and authenticity of AI-generated art. They also fear the societal harms and job displacement caused by AI tools."
    },
    "1": {
      "label": "Tech Critics",
      "summary": "Highlight the potential negative impacts of AI art on creative professions and the responsibility of tech companies in mitigating these harms."
    },
    "2": {
      "label": "AI Defenders",
      "summary": "View AI as a new tool for artistry, emphasizing the acceptance of new technologies and the need for universal basic income due to AI's impact on employment."
    }
  }
}  
```
---
## Prompt 8 (with JSON schema)
You are an expert analyst summarizing survey results. Given a JSON input containing structured data about a group conversation, generate a concise output in JSON format that strictly adheres to the following JSON Schema:
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
            "description": "Cluster label (exactly 1-2 words, noun form describing people/groups, max 60 characters)"
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
	- Capture key insights, majority opinions, and controversial points.
	
2. Cluster Labels:
	- Exactly 1-2 words (no exceptions).
	- Noun form describing people/groups (e.g., "Skeptics", "Advocates", "Environmental Defenders").
	- Never use abstract concepts (e.g., "Concerns", “Collaborative” is invalid).
	- Total length < 60 characters.
	- Rephrase multi-word concepts into 1 or 2-word labels (e.g., "Hybrid Advocates" instead of "Hybrid Work Supporters").

3. Cluster Summaries:
	- Maximum 300 characters.
	- Focus on group perspectives and disagreements.

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

IMPORTANT GUIDELINES:
- Count words strictly. Labels must be 1 or 2 words maximum, with a maximum length of 60 characters. (e.g. "Hybrid Work Supporters" (3 words) is invalid. Use "Hybrid Advocates" (2 words)).
- Labels/summaries exceeding word and character count limits will cause validation errors.
- Labels must describe people/groups, not concepts (e.g. "Defenders", not "Defense").
- Use agentive nouns, such as those ending with -ists, -ers, -ors, or -ians (e.g. Ethicists, Optimists, etc.)
- If unable to create a meaningful label in 2 words, prioritize brevity over detail (e.g. "Traditionalists" instead of "Culture Defenders").

Now analyze the following JSON input carefully and provide insightful, concise labels and summaries that capture the core of the discussion while strictly adhering to above guidelines.

[Insert JSON input here]

### DeepSeek-R1-Distill-Llama-8B Response to Prompt 8 + Input JSON 2
GoogleColab
```
{
  "summary": "The conversation explores AI art's impact, with concerns about automation replacing human creativity, societal implications, and the role of technology. It also debates whether AI can truly create art or merely replicate it.",
  "clusters": {
    "0": {
      "label": "Concerned Creatives",
      "summary": "Express doubts about AI's artistic value and potential societal harms, emphasizing human creativity's irreplaceability."
    },
    "1": {
      "label": "Human Advocates",
      "summary": "Highlight human creativity's importance, argue AI's role as a tool, and discuss societal impacts on creative professions."
    },
    "2": {
      "label": "Pioneers",
      "summary": "Show openness to AI art, viewing it as a complement to human creativity, while acknowledging challenges like income inequality."
    }
  }
}
```

### DeepSeek-R1-Distill-Llama-8B Response to Prompt 8 + Input JSON 3
GoogleColab
```
{
  "summary": "The conversation centers on the proposal of a Universal Basic Income (UBI) in New Zealand, with participants divided into strong supporters, cautious supporters, mixed perspectives, and opponents. The majority view UBI as beneficial for societal welfare and economic security, while some raise concerns about disincentivizing work and public service impacts.",
  "clusters": {
    "0": {
      "label": "UBI Advocates",
      "summary": "Strongly support UBI to eliminate systemic issues and improve societal welfare."
    },
    "1": {
      "label": "Cautious Supporters",
      "summary": "Support UBI but express concerns about economic impacts and structural challenges."
    },
    "2": {
      "label": "Mixed Perspectives",
      "summary": "Have varied views, supporting UBI's benefits while acknowledging potential downsides."
    },
    "3": {
      "label": "Opponents",
      "summary": "Critically view UBI as potentially harmful, affecting work incentives and public services."
    }
  }
}  
```

### Mistral-Small-24B-Instruct-2501 Response to Prompt 8 + Input JSON 3
TogetherAI Chat UI

```json
{
  "summary": "The conversation revolves around the potential implementation of a Universal Basic Income (UBI) in Aotearoa NZ, with strong support for its benefits in welfare and social solidarity, but significant opposition to the economic and social risks involved.",
  "clusters": {
    "0": {
      "label": "UBI Advocates",
      "summary": "Strongly support UBI for its potential to guarantee welfare, recognize unpaid work, and protect against insecure employment, emphasizing economic rights and social benefits."
    },
    "1": {
      "label": "UBI Skeptics",
      "summary": "Express concerns about the economic feasibility of UBI, potential cuts to essential services, and the risk of individuals being left to pay for essential services at fluctuating market rates."
    },
    "2": {
      "label": "Democracy Defenders",
      "summary": "View UBI as crucial for a functioning democracy, ensuring citizens can focus on political engagement without economic worries, and advocate for careful planning to manage risks."
    },
    "3": {
      "label": "Laziness Critics",
      "summary": "Believe UBI could encourage laziness and reduce productivity, with controversial opinions on its impact on public health and social solidarity."
    }
  }
}
```

### Mistral Small 25.01 Response to Prompt 8 + Input JSON 3
La Plateforme

```
{
  "summary": "The conversation on Universal Basic Income (UBI) in Aotearoa NZ highlights the need for a system that guarantees welfare for the least well off and recognizes unpaid work. Controversial points include the potential for UBI to encourage laziness and the debate over economic austerity and welfare cuts.",
  "clusters": {
    "0": {
      "label": "UBI Advocates",
      "summary": "Emphasize the benefits of UBI in providing economic rights, protecting against insecure employment, and promoting community development."
    },
    "1": {
      "label": "Welfare Guarantee Supporters",
      "summary": "Advocate for a new system that better guarantees the welfare of the least well off and those facing insecure work conditions."
    },
    "2": {
      "label": "Democracy Defenders",
      "summary": "Believe UBI is crucial for a functioning democracy and should be implemented with risk management and long-term planning."
    },
    "3": {
      "label": "Laziness Critics",
      "summary": "Express concern that UBI could encourage laziness and reduce productivity, opposing its implementation."
    }
  }
}  
```

---
## Prompt 9 (with JSON schema + avoid value-laden labels)
You are an expert analyst summarizing survey results. Given a JSON input containing structured data about a group conversation, generate a concise output in JSON format that strictly adheres to the following JSON Schema:
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

Key Constraints:

1. Summary:
	- Maximum 300 characters.
	- Capture key insights, majority opinions, and controversial points objectively.
	
2. Cluster Labels:
	- Exactly 1 or 2 words (no exceptions).
	- Neutral descriptors of people/groups (e.g., "Skeptics" not "Luddites", "Researchers" not "Visionaries").
	- Never use value-laden terms (e.g., "Pioneers" is biased).
	- Never use abstract concepts (e.g., "Concerns", “Collaborative” is invalid).
	- Noun form only (no verbs/adjectives).
	- Total length < 60 characters.
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
  
IMPORTANT GUIDELINES:
-   Count words strictly. Labels must be 1 or 2 words maximum, with a maximum length of 60 characters. (e.g. "Hybrid Work Supporters" (3 words) is invalid. Use "Hybrid Advocates" (2 words)).
-   Labels/summaries exceeding word and character count limits will cause validation errors.
-   Labels must describe people/groups, not concepts (e.g. "Defenders", not "Defense").
-   Use agentive nouns, such as those ending with -ists, -ers, -ors, or -ians (e.g. Ethicists, etc.)
-   Labels must be value-neutral (e.g., "Supporters" not "Champions", "Critics" not "Naysayers").
-   Avoid terms implying superiority/inferiority of any cluster (e.g., "Elites")
-   Use descriptive occupational/positional terms when possible (e.g., "Economists", "Ethicists").
-   Validation errors will occur for biased or non-neutral labels
-   If unable to create a meaningful label in 2 words, prioritize brevity over detail (e.g. "Traditionalists" instead of "Culture Defenders").

Now analyze the following JSON input carefully and provide insightful, concise labels and summaries that capture the core of the discussion while strictly adhering to above guidelines.

[Insert JSON input here]

### DeepSeek-R1-Distill-Llama-8B Response to Prompt 9 + Input JSON 2
Google Colab

```json
{
  "summary": "The conversation addresses the impact of AI art, with debates over its role in artistic creation, potential job displacement, and societal implications.",
  "clusters": {
    "0": {
      "label": "AI Critics",
      "summary": "Express concerns about AI replacing human creativity and the diminishing role of human artists."
    },
    "1": {
      "label": "Balanced Advocates",
      "summary": "Highlight the importance of human creativity while acknowledging AI's role and societal responsibilities."
    },
    "2": {
      "label": "AI Supporters",
      "summary": "Advocate for AI art's acceptance and its potential to expand artistic expression and societal progress."
    }
  }
}
```

### DeepSeek-R1-Distill-Llama-8B Response to Prompt 9 + Input JSON 3
Google Colab

```json
{
  "summary": "The conversation centers on implementing a Universal Basic Income (UBI) in New Zealand, with most participants supporting UBI to address inequality and secure economic rights. Controversy arises over potential disincentives and the need for a balanced approach with existing systems.",
  "clusters": {
    "0": {
      "label": "Economic Rights Advocates",
      "summary": "Support UBI to eliminate systemic issues and ensure access to basic necessities for all New Zealanders."
    },
    "1": {
      "label": "Future-Ready Supporters",
      "summary": "Advocate for UBI as a preparation for future unemployment and economic shifts."
    },
    "2": {
      "label": "Cautionary Planners",
      "summary": "Propose a cautious implementation with existing welfare systems to manage risks."
    },
    "3": {
      "label": "Incentive Concerns",
      "summary": "Question whether UBI might reduce work motivation and productivity."
    }
  }
}
```

### Mistral-Small-24B-Instruct-2501 Response to Prompt 9 + Input JSON 2
TogetherAI Chat UI

```json
{
  "summary": "The conversation about AI art explores the impact of AI on creativity, job security, and the nature of art. Participants debate AI's ability to innovate, the ethical implications of AI-generated content, and the potential societal harms of AI tools.",
  "clusters": {
    "0": {
      "label": "AI Skeptics",
      "summary": "Believe AI lacks consciousness and intentionality, thus its art has no meaning. They argue AI tools undermine human creativity and craft, and tech companies should mitigate societal harms."
    },
    "1": {
      "label": "AI Pragmatists",
      "summary": "View AI as a tool that humans can use to create art, acknowledging the need for tech companies to address potential harms. They emphasize human responsibility in the creative process."
    },
    "2": {
      "label": "AI Advocates",
      "summary": "Accept AI-generated art as valid, comparing it to historical technological shifts. They highlight the need for universal basic income due to AI's impact on job security."
    }
  }
}
```
---




