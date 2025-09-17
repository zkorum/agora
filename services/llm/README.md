# LLM Testing

This directory contains the details about:

- the prompts that we're using to labels the clusters and generate the AI summary.
- the prompts for conversation topics labeling
- the prompts for the conversation feed recommendation algorithms

It will contain the Python scripts to run the prompt using the Agora database and LLM model.

Currently, the prompt we use is available as a set of default config in the `api` service: https://github.com/zkorum/agora/blob/main/services/api/src/app.ts#L95-L237

## Table of Contents
- [1. Cluster Labeling](#1-cluster-labeling)
  - [Summary](#summary)
  - [Known Limitations](#known-limitations)
  - [Ongoing Work](#ongoing-work)
  - [Testing Details](#testing-history--details)
- [2. Topic Assignment](#2-topic-assignment)
  - [Summary](#summary-1)
  - [Known Limitations](#known-limitations-1)
- [License](#license)
----

# 1. Cluster Labeling 
## Summary 
We decided to use an LLM to generate summaries and cluster labels for group conversations. The goal was to implement a system to take in a JSON input containing group conversation data and output a JSON output containing (1) an overall conversation summary and (2) labels and brief descriptions for each opinion cluster. 

We initially focused on testing DeepSeek Distil models (4-bit quantized) because of their low costs, but these were too slow for our use-case and struggled specifically to adhere to word/character limits -- which is an important constraint for the app for optimal readability/UI. We turned to testing Mistral models, which are positioned as direct competitors to the Deepseek models. We chose Mistral Small 3 (24B) which generated much better results and is "reasonably" small. However, the Mistral Small 3 is too large/expensive to self-host on EC2, so we decided to use AWS credits (available via Station F) and deployed the model using AWS Bedrock. 

We tested different combinations of prompts ("System Instructions") and inference parameters (temperature, top P, top K). The version currently in use is:
* Prompt: [Prompt Version 4](./AWS_mistral_testing.md#prompt-version-4-current-version)
* Model: mistral-small-2402-v1:0  
* Temperature: 0.4
* Max tokens: 8192
* Top P: 0.8 
* Top K: 70

## Known Limitations
* AWS Bedrock does not support prompt management for Mistral models; the prompt must be sent directly in the API request body each time.
* Occasionally the cluster labels are still longer than the word count.
* Most testing was done on AI-generated conversation data, except for 1-2 real conversations. 
* In the case of non-English conversations (eg. French), it is not clear whether it is better to translate to English before sending to the model (and translating the generated labels back to French after), or to interact with the LLM in the original language.
* The model sometimes generates incorrect or outdated cluster labels, especially after clusters are updated with new statements or participants -- could this have to do with model context?

## Ongoing Work
* Understanding why the model generates incorrect cluster labels:
  * Testing the prompt with old and updated clusters from the same conversation to see how the labels change and check whether model context retention is affecting label accuracy
  * Investigating whether the problem is with the use of AWS InvokeModelCommand

## Testing History + Details
* [LLM Comparison](./llm_comparison.md)
* [Mistral Testing on AWS Bedrock (current prompt here)](./AWS_mistral_testing.md)
* [JSON Input Samples](./cluster_label_inputs.md)
  
---

# 2. Topic Assignment 
## Summary
We use an LLM to assign one or more relevant topics from a predefined list to conversations on Agora.

We initially tested Mistral-Small, and faced three major issues:
- Frequently generated topics outside the predefined list
- Performed poorly on assigning regional topics (eg. it assigned "Middle East" to a conversation about Brazil)
- Performed poorly on assigning "funny" (it flagged serious/grave conversations as "funny") 
  
We then switched to Mistral-Large, which produces more accurate assignments for regional topics and "funny". 

The latest version is:
* Prompt: [Prompt Version 14](./assign_topics.md#system-instructions-13)
* Model: mistral-large-2402-v1:0
* Temperature: 0.2
* Max tokens: 8192
* Top P: 0.7
* Top K: 40

## Known Limitations
The model does not correctly identify breaking news with 100% accuracy. For example, Mistral-Large tags the below AI-generated conversation as "breaking_news", even though the prompt includes explicit details on urgency and time-relevancy to qualify breaking news:
  ```
  {
    "conversationTitle": "New study finds Mediterranean diet reduces heart disease risk",
    "conversationBody": "A major new study published today in The Lancet shows that following a Mediterranean diet can significantly lower the risk of heart disease. Doctors are urging patients to incorporate more olive oil, fish, and vegetables into their diets. Has anyone here tried this diet?"
  }
  ```
So we decided to change the display label from "Breaking News" to "News" in the UI. 

## License
See [COPYING](./COPYING).

----
