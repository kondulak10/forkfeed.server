import type { StaticFeed } from '../../src/types.js';

const feed: StaticFeed = {
  "id": "thinking-fast-and-slow-stories-over-statistics",
  "title": "Stories Over Statistics",
  "description": "Why people trust stereotypes over math and ignore the power of averages",
  "imageSrc": "https://d5rfy0lpah1cz.cloudfront.net/content/download11/5_202603272118.jpeg",
  "mode": "sequential",
  "scrollDirection": "vertical",
  "engagement": true,
  "cards": [
    {
      "id": "cee6abfd-71ae-48b0-8b80-23938813d90f",
      "variants": [
        {
          "type": "FULL_IMAGE",
          "imageSrc": "https://d5rfy0lpah1cz.cloudfront.net/content/download11/5_202603272118.jpeg",
          "title": "Stories Over Statistics",
          "subtitle": "Why people trust stereotypes over math and ignore the power of averages"
        }
      ]
    },
    {
      "id": "2048df09-586b-4bde-bb57-a8a64188e06f",
      "variants": [
        {
          "type": "CONTENT",
          "backgroundSrc": "https://d5rfy0lpah1cz.cloudfront.net/content/push/bg9_202603270001.jpeg",
          "blocks": [
            {
              "type": "CONTENT_TITLE",
              "title": "The Linda Problem"
            },
            {
              "type": "CONTENT_TEXT",
              "text": "It may be the most famous experiment in the history of behavioral science. Kahneman and Tversky presented research subjects with a description of a woman named Linda. Linda is 31 years old, single, outspoken, and very bright. She majored in philosophy. As a student, she was deeply concerned with issues of discrimination and social justice, and she participated in anti-nuclear demonstrations.\n\nThen they asked: which is more probable? (A) Linda is a bank teller. (B) Linda is a bank teller and is active in the feminist movement.\n\nThe vast majority of people chose B. And in doing so, they committed what logicians call the conjunction fallacy. The probability of two things being true together (bank teller AND feminist) can never be higher than the probability of either thing being true alone (bank teller). It is a basic rule of probability, as fundamental as the idea that a part cannot be larger than the whole.\n\nYet people found B more probable because it told a better story. The description of Linda matches the stereotype of a feminist far better than the stereotype of a bank teller. System 1 evaluated the question not by computing probabilities but by assessing how well the description matched the category. The more representative option felt more probable, even though it was logically less so.\n\nKahneman argues that this is not a minor glitch. The Linda problem reveals a fundamental feature of how System 1 evaluates probability: it substitutes representativeness for likelihood, and the substitution feels completely natural."
            }
          ]
        }
      ]
    },
    {
      "id": "484d08c1-0a2c-45c5-ab10-a2c3039cdbc6",
      "variants": [
        {
          "type": "CONTENT",
          "backgroundSrc": "https://d5rfy0lpah1cz.cloudfront.net/content/push/bg9_202603270001.jpeg",
          "blocks": [
            {
              "type": "CONTENT_TITLE",
              "title": "Stereotypes vs Base Rates"
            },
            {
              "type": "CONTENT_TEXT",
              "text": "Kahneman describes another experiment that reveals the same mechanism. Subjects are told that a group of 100 people consists of 70 lawyers and 30 engineers, or vice versa. They are then given personality descriptions and asked to estimate the probability that each person is an engineer or a lawyer.\n\nThe descriptions were carefully crafted. Some fit the engineer stereotype: quiet, methodical, interested in technical puzzles. Others fit the lawyer stereotype: ambitious, articulate, politically aware. When a description matched the engineer stereotype, people rated the probability of that person being an engineer as very high, regardless of whether the base rate was 70 percent or 30 percent engineers.\n\nThis is base rate neglect. The statistical information, the actual composition of the group, was available and easy to use. But System 1 found the personality description far more compelling than the dry numbers. The story of who this person seemed to be overwhelmed the math of who they were likely to be.\n\nKahneman argues that this tendency runs deep. Humans are storytelling creatures. We evolved to understand the world through individual cases, specific narratives, and personal experience. Statistical reasoning is a relatively recent cultural invention that does not come naturally to System 1. When stories and statistics conflict, stories almost always win, not because people are innumerate but because System 1 processes narratives effortlessly and treats statistics as an afterthought."
            }
          ]
        }
      ]
    },
    {
      "id": "2e931367-81c7-44c7-bab8-552dd6659a4a",
      "variants": [
        {
          "type": "CONTENT",
          "backgroundSrc": "https://d5rfy0lpah1cz.cloudfront.net/content/push/bg9_202603270001.jpeg",
          "blocks": [
            {
              "type": "CONTENT_TITLE",
              "title": "When Causes Beat Numbers"
            },
            {
              "type": "CONTENT_TEXT",
              "text": "Why do stories beat statistics? Kahneman offers a deeper explanation. System 1 thinks in terms of causes, not correlations. It builds causal models of the world: this person does X because they are the kind of person who does X. Statistical information, by contrast, describes what happens on average across many cases. It is about categories and frequencies, not about individuals and reasons.\n\nThe problem is that System 1 finds causal stories far more satisfying and memorable than statistical summaries. Tell someone that a program reduced recidivism by 30 percent, and they will nod politely. Tell them the story of one specific person who went through the program and turned their life around, and they will be moved to action. The single case generates empathy, understanding, and a sense of how the world works. The statistic generates... nothing much.\n\nKahneman points out that this creates a systematic blind spot. In medicine, doctors rely on individual clinical impressions when actuarial data would provide better predictions. In criminal justice, parole boards focus on the individual sitting before them rather than the statistical risk profiles that would predict outcomes more accurately. In business, hiring managers trust their personal judgment of a candidate over structured interviews and standardized assessments.\n\nThe root cause is always the same: System 1 processes individual cases naturally and statistics reluctantly. We are built to think about one person at a time, not about populations. And no amount of training seems to fully overcome this default."
            }
          ]
        }
      ]
    },
    {
      "id": "00c35625-ff7c-4f1a-a63d-fbe0c8b1b867",
      "variants": [
        {
          "type": "CONTENT",
          "backgroundSrc": "https://d5rfy0lpah1cz.cloudfront.net/content/push/bg9_202603270001.jpeg",
          "blocks": [
            {
              "type": "CONTENT_TITLE",
              "title": "Regression to the Mean"
            },
            {
              "type": "CONTENT_TEXT",
              "text": "Kahneman considers regression to the mean one of the most important and most misunderstood concepts in all of statistical thinking. The principle is simple: extreme outcomes are typically followed by less extreme outcomes. A student who scores brilliantly on one exam will likely score somewhat lower on the next, not because they got worse but because extreme performance always includes a component of luck, and luck does not repeat reliably.\n\nThe concept was first identified by Sir Francis Galton in the 1880s, who noticed that very tall parents tended to have children who were tall but not quite as tall as themselves, while very short parents had children who were short but not quite as short. Heights regressed toward the population average over generations.\n\nWhat makes regression to the mean so treacherous is that it is invisible to System 1. Your fast-thinking mind always wants a causal explanation. If a student scores lower on the second exam, there must be a reason: they studied less, they were overconfident, the material was harder. The possibility that the decline is just statistical noise, just the natural tendency of extreme scores to move toward the average, feels deeply unsatisfying.\n\nKahneman argues that failure to recognize regression to the mean leads to serious errors in judgment across many domains. In medicine, patients may improve after treatment simply because they sought help when symptoms were at their worst. In sports, the \"Sports Illustrated cover jinx\" is regression to the mean. In business, exceptional quarterly results are often followed by disappointing ones."
            }
          ]
        }
      ]
    },
    {
      "id": "10d1c52f-9763-4d0a-a223-beb53a6dfc9a",
      "variants": [
        {
          "type": "CONTENT",
          "backgroundSrc": "https://d5rfy0lpah1cz.cloudfront.net/content/push/bg9_202603270001.jpeg",
          "blocks": [
            {
              "type": "CONTENT_TITLE",
              "title": "The Flight Instructor's Mistake"
            },
            {
              "type": "CONTENT_TEXT",
              "text": "Kahneman describes an experience from early in his career that he calls his most satisfying eureka moment. He was lecturing to Israeli Air Force flight instructors about the psychology of effective training. He presented evidence that reward for improved performance works better than punishment for mistakes. One experienced instructor pushed back immediately.\n\nThe instructor explained that in his experience, the opposite was true. When he praised a cadet for an exceptionally smooth landing, the next landing was almost always worse. And when he screamed at a cadet for a terrible landing, the next one was almost always better. Praise led to decline. Criticism led to improvement. He had observed this pattern thousands of times.\n\nKahneman realized in that moment that the instructor was describing regression to the mean, not an effect of praise or criticism. An exceptionally good landing already represents a performance near the upper extreme. The next attempt, regardless of any feedback, is statistically likely to be less extreme, meaning closer to average, meaning worse. Similarly, a terrible landing is near the lower extreme, and the next attempt is likely to regress upward toward the average, meaning better.\n\nThe instructor's feedback had no causal role whatsoever. But his lived experience told a perfectly coherent story: criticism works, praise backfires. It was a story System 1 found deeply compelling because it was built from thousands of real observations. The observations were real. The causal interpretation was entirely an illusion."
            },
            {
              "type": "CONTENT_SUBTEXT",
              "text": "Kahneman called this his most satisfying eureka moment. It showed how regression to the mean creates false causal stories that feel undeniably true."
            }
          ]
        }
      ]
    },
    {
      "id": "5c8f3cb2-0213-4450-86cf-03440cde8183",
      "variants": [
        {
          "type": "CONTENT",
          "backgroundSrc": "https://d5rfy0lpah1cz.cloudfront.net/content/push/bg9_202603270001.jpeg",
          "blocks": [
            {
              "type": "CONTENT_TITLE",
              "title": "Taming Your Predictions"
            },
            {
              "type": "CONTENT_TEXT",
              "text": "After pages of documenting how badly humans predict outcomes, Kahneman offers a practical corrective. It is a simple procedure that can significantly improve the accuracy of any intuitive prediction, and it directly addresses the biases described in the preceding chapters.\n\nThe method has four steps. First, identify the relevant reference class and find the base rate. If you are predicting how a student will perform in graduate school, start with the average outcome for students in that program. If you are estimating how long a project will take, find out how long similar projects actually took.\n\nSecond, form your intuitive impression based on the specific evidence available. This is the System 1 judgment: your gut feeling about this particular case. Third, estimate how well the specific evidence predicts the outcome. Is the evidence highly diagnostic, like a standardized test with a strong track record? Or is it weakly diagnostic, like a brief interview?\n\nFinally, regress your intuitive prediction toward the base rate. If your evidence is weak, stay close to the base rate. If it is strong, you can move further from it. But never move all the way to your intuitive estimate, because even good evidence contains noise.\n\nKahneman acknowledges that this procedure feels unnatural. System 1 wants to tell a specific story about this particular case. Being pulled back toward the boring average feels like you are ignoring important information. But the research is clear: predictions that are regressed toward the mean are consistently more accurate than unregressed intuitive judgments."
            }
          ]
        }
      ]
    }
  ]
};

export default feed;
