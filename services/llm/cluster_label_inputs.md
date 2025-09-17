# JSON Input Samples

Some sample JSON inputs used to test LLM-based cluster labeling.


## Table of Contents
- [JSON Input 1](#json-input-1)
- [JSON Input 2](#json-input-2)


---
## JSON Input 1
```
{
  "conversation_slug_id": "conversation_12345",
  "conversation_title": "The Future of Remote Work",
  "conversation_body": "A discussion about the long-term impact of remote work on productivity, work-life balance, and the economy.",
  "num_participants": 500,
  "majority_opinions": [
    {
      "opinion_slug_id": "opinion_001",
      "opinion_content": "Remote work increases productivity for most employees.",
      "percentage_agree": 5,
      "percentage_disagree": 72
    },
    {
      "opinion_slug_id": "opinion_002",
      "opinion_content": "Companies should offer a hybrid work model.",
      "percentage_agree": 65,
      "percentage_disagree": 10
    }
  ],
  "controversial_opinions": [
    {
      "opinion_slug_id": "opinion_003",
      "opinion_content": "Fully remote work reduces team collaboration.",
      "percentage_agree": 52,
      "percentage_disagree": 46
    }
  ],
  "clusters": {
    "0": {
      "num_members": 50,
      "majority_opinions": [
        {
          "opinion_slug_id": "opinion_001",
          "opinion_content": "Remote work increases productivity for most employees.",
          "percentage_disagree": 2,
          "percentage_agree": 80
        }
      ],
      "controversial_opinions": [
        {
          "opinion_slug_id": "opinion_004",
          "opinion_content": "Office work is outdated and unnecessary.",
          "percentage_agree": 50,
          "percentage_disagree": 48
        }
      ]
    },
    "1": {
      "num_members": 150,
      "majority_opinions": [
        {
          "opinion_slug_id": "opinion_002",
          "opinion_content": "Companies should offer a hybrid work model.",
          "percentage_disagree": 30,
          "percentage_agree": 70
        }
      ],
      "controversial_opinions": [
        {
          "opinion_slug_id": "opinion_003",
          "opinion_content": "Fully remote work reduces team collaboration.",
          "percentage_agree": 54,
          "percentage_disagree": 40
        }
      ]
    }
  }
}
```

## JSON Input 2
```
{
  "conversation_slug_id": "conversation_67890",
  "conversation_title": "What should we do about AI art?",
  "num_participants": 46,
  "majority_opinions": [
    {
      "opinion_slug_id": "opinion_001",
      "opinion_content": "AIs lack consciousness and intentionality, therefore their products have no meaning.",
      "percentage_agree": null,
      "percentage_disagree": 67
    },
    {
      "opinion_slug_id": "opinion_002",
      "opinion_content": "The days of human artistry are numbered.",
      "percentage_agree": null,
      "percentage_disagree": 87
    },
    {
      "opinion_slug_id": "opinion_003",
      "opinion_content": "The camera and photography have raised similar concerns about making human artistry obsolete, but they have become their own genre. It will be the same with AI art.",
      "percentage_agree": 80,
      "percentage_disagree": null
    },
    {
      "opinion_slug_id": "opinion_004",
      "opinion_content": "Artists have always relied on tools, technologies and instruments, AI tools are not different.",
      "percentage_agree": 78,
      "percentage_disagree": null
    },
    {
      "opinion_slug_id": "opinion_005",
      "opinion_content": "AI is a new tool that some will wield better than others. Therein lies the artistry.",
      "percentage_agree": 83,
      "percentage_disagree": null
    },
    {
      "opinion_slug_id": "opinion_006",
      "opinion_content": "This type of technology benefits only its owners, large tech companies.",
      "percentage_agree": null,
      "percentage_disagree": 71
    },
    {
      "opinion_slug_id": "opinion_007",
      "opinion_content": "Art is about more than competent execution.",
      "percentage_agree": 88,
      "percentage_disagree": null
    },
    {
      "opinion_slug_id": "opinion_008",
      "opinion_content": "We will soon be drowning in AI-generated content.",
      "percentage_agree": 78,
      "percentage_disagree": null
    },
    {
      "opinion_slug_id": "opinion_009",
      "opinion_content": "Artistic endeavor by a human being is an effort to ruminate and illustrate insights into the collective human experience. AI art is false.",
      "percentage_agree": null,
      "percentage_disagree": 77
    }
  ],
  "controversial_opinions": [],
  "clusters": {
    "0": {
      "num_members": 26,
      "majority_opinions": [
        {
          "opinion_slug_id": "opinion_010",
          "opinion_content": "Not even jobs requiring human creativity are safe from automation.",
          "percentage_agree": 95,
          "percentage_disagree": null
        },
        {
          "opinion_slug_id": "opinion_011",
          "opinion_content": "We will soon be drowning in AI-generated content.",
          "percentage_agree": 94,
          "percentage_disagree": null
        },
        {
          "opinion_slug_id": "opinion_012",
          "opinion_content": "Human brains may not be the only kind of intelligence capable of creating competent art.",
          "percentage_agree": 81,
          "percentage_disagree": null
        },
        {
          "opinion_slug_id": "opinion_013",
          "opinion_content": "Artistic endeavor by a human being is an effort to ruminate and illustrate insights into the collective human experience. AI art is false.",
          "percentage_agree": null,
          "percentage_disagree": 100
        },
        {
          "opinion_slug_id": "opinion_014",
          "opinion_content": "Machine learning ('AI') cannot innovate, it can only ape what has already existed.",
          "percentage_agree": null,
          "percentage_disagree": 78
        }
      ],
      "controversial_opinions": []
    },
    "1": {
      "num_members": 13,
      "majority_opinions": [
        {
          "opinion_slug_id": "opinion_015",
          "opinion_content": "Humans are still responsible for coming up with the idea for a work of art, the AI just executes it.",
          "percentage_agree": 100,
          "percentage_disagree": null
        },
        {
          "opinion_slug_id": "opinion_016",
          "opinion_content": "Not even jobs requiring human creativity are safe from automation.",
          "percentage_agree": null,
          "percentage_disagree": 66
        },
        {
          "opinion_slug_id": "opinion_017",
          "opinion_content": "People working in creative professions already have a hard time to earn a living, AI tools just make their situation even worse.",
          "percentage_agree": null,
          "percentage_disagree": 83
        },
        {
          "opinion_slug_id": "opinion_018",
          "opinion_content": "AI tools undermine the craft and skill which have so far been essential for making art.",
          "percentage_agree": null,
          "percentage_disagree": 100
        },
        {
          "opinion_slug_id": "opinion_019",
          "opinion_content": "Tech companies making these tools are responsible for mitigating the societal harms of their products.",
          "percentage_agree": null,
          "percentage_disagree": 92
        }
      ],
      "controversial_opinions": []
    },
    "2": {
      "num_members": 7,
      "majority_opinions": [
        {
          "opinion_slug_id": "opinion_020",
          "opinion_content": "If an AI-generated piece is indistinguishable from a human-made one, it is a work of art.",
          "percentage_agree": null,
          "percentage_disagree": 85
        },
        {
          "opinion_slug_id": "opinion_021",
          "opinion_content": "New technologies are always feared at first, but eventually gain acceptance.",
          "percentage_agree": null,
          "percentage_disagree": 71
        },
        {
          "opinion_slug_id": "opinion_022",
          "opinion_content": "AI art accelerates the need for universal basic income.",
          "percentage_agree": 100,
          "percentage_disagree": null
        },
        {
          "opinion_slug_id": "opinion_023",
          "opinion_content": "Machine learning ('AI') cannot innovate, it can only ape what has already existed.",
          "percentage_agree": 100,
          "percentage_disagree": null
        },
        {
          "opinion_slug_id": "opinion_024",
          "opinion_content": "These AIs were trained on millions of pieces of human-made, copyrighted art which these companies had no right to use in the first place.",
          "percentage_agree": 100,
          "percentage_disagree": null
        }
      ],
      "controversial_opinions": []
    }
  }
}
```

---