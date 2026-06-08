import type { StaticFeed } from '../../src/types.js';

const feed: StaticFeed = {
  "id": "thinking-fast-and-slow-the-numbers-game",
  "title": "The Numbers Game",
  "description": "How anchors, availability, and small samples lead your mind astray",
  "imageSrc": "https://d5rfy0lpah1cz.cloudfront.net/content/download11/4_202603272118.jpeg",
  "mode": "sequential",
  "scrollDirection": "vertical",
  "engagement": true,
  "cards": [
    {
      "id": "37a74d01-37b3-4ce8-892f-1353bd0358dc",
      "variants": [
        {
          "type": "FULL_IMAGE",
          "imageSrc": "https://d5rfy0lpah1cz.cloudfront.net/content/download11/4_202603272118.jpeg",
          "title": "The Numbers Game",
          "subtitle": "How anchors, availability, and small samples lead your mind astray"
        }
      ]
    },
    {
      "id": "f698da41-ff9e-4ab7-8feb-0996bf653b51",
      "variants": [
        {
          "type": "CONTENT",
          "backgroundSrc": "https://d5rfy0lpah1cz.cloudfront.net/content/push/bg16_202603270001.jpeg",
          "blocks": [
            {
              "type": "CONTENT_TITLE",
              "title": "The Law of Small Numbers"
            },
            {
              "type": "CONTENT_TEXT",
              "text": "Kahneman opens the second part of his book with a trap that catches even professional statisticians. People, including trained researchers, have far too much confidence in the results of small samples. We see patterns in random data, draw sweeping conclusions from tiny datasets, and trust that small samples will mirror the properties of the population they came from. Kahneman and Tversky called this the belief in the law of small numbers, a playful twist on the legitimate statistical law of large numbers.\n\nConsider this example: a researcher finds that kidney cancer rates are lowest in rural, sparsely populated, largely Republican counties in the Midwest and South. Your mind immediately starts generating explanations. Maybe it is the clean air, the healthy outdoor lifestyle, the low stress of rural living. The story writes itself.\n\nNow consider the flip side: kidney cancer rates are also highest in rural, sparsely populated, largely Republican counties in the Midwest and South. Suddenly the story flips. Maybe it is the poverty, the lack of access to healthcare, the high-fat diet, the tobacco use.\n\nBoth findings are true, and neither has anything to do with rural living. The explanation is purely statistical. Small populations produce more extreme results by chance. A county with 100 people will have either zero cancer cases or a handful, producing rates that are either far above or far below the national average. Large populations regress toward the mean. Small samples are noisy, and our minds are wired to treat that noise as signal."
            }
          ]
        }
      ]
    },
    {
      "id": "41167b27-d9b3-4287-b20b-926d5c532582",
      "variants": [
        {
          "type": "CONTENT",
          "backgroundSrc": "https://d5rfy0lpah1cz.cloudfront.net/content/push/bg16_202603270001.jpeg",
          "blocks": [
            {
              "type": "CONTENT_TITLE",
              "title": "The Power of the Anchor"
            },
            {
              "type": "CONTENT_TEXT",
              "text": "Imagine you spin a wheel of fortune that lands on the number 65. Then someone asks you: is the percentage of African nations in the United Nations higher or lower than 65? And then: what is your best estimate of the actual percentage? Now imagine the wheel had landed on 10 instead. The question and the task are identical, but your answer will be dramatically different. People who saw 65 gave much higher estimates than people who saw 10, even though the wheel was obviously random.\n\nThis is the anchoring effect, and it is one of the most extensively studied phenomena in Kahneman and Tversky's body of work. An initial number, even when it is completely arbitrary and clearly irrelevant, shifts your subsequent estimates in its direction. The anchor does not need to be plausible. It does not need to come from an expert. It does not even need to be in the right ballpark. Its mere presence warps your judgment.\n\nKahneman describes two mechanisms that produce anchoring. First, System 2 starts from the anchor and adjusts, but the adjustment is almost always insufficient, so the final estimate stays too close to the anchor. Second, System 1 generates an associative process: the anchor primes compatible information, making facts consistent with the anchor more accessible in memory.\n\nRemarkably, follow-up research has found that the anchoring effect is even stronger than Kahneman and Tversky originally reported. It is described in the literature as one of the most reliable results in all of experimental psychology."
            }
          ]
        }
      ]
    },
    {
      "id": "73f5e5ce-7c19-4601-9dd3-ef23faf40fd0",
      "variants": [
        {
          "type": "CONTENT",
          "backgroundSrc": "https://d5rfy0lpah1cz.cloudfront.net/content/push/bg16_202603270001.jpeg",
          "blocks": [
            {
              "type": "CONTENT_TITLE",
              "title": "Anchors in Courtrooms and Kitchens"
            },
            {
              "type": "CONTENT_TEXT",
              "text": "The anchoring effect is not just a laboratory curiosity. It shapes real decisions with real consequences. Studies have shown that judges' sentencing decisions are influenced by the prosecution's requested sentence, even when the judges know that the request is strategically inflated. Experienced real estate agents' estimates of a home's value are influenced by the listing price, even when they are told it may be inaccurate. Salary negotiations are powerfully shaped by whoever names the first number.\n\nKahneman discusses a particularly striking finding about kitchen remodeling. When American homeowners were surveyed about their renovation plans, the average expected cost was around $18,658. The average actual cost turned out to be $38,769, more than double the estimate. The initial budget, set early in the planning process, served as an anchor that homeowners adjusted from, but as with all anchoring, the adjustment was woefully insufficient.\n\nThe practical implications are clear. In any negotiation, the first number on the table becomes the anchor around which the final agreement orbits. In any estimate, the initial figure you encounter will pull your judgment toward it. Knowing about anchoring does not make you immune to it, which is one of the more frustrating aspects of this particular bias. Studies show that even people who are explicitly warned about anchoring effects still succumb to them.\n\nKahneman suggests that the best defense is not awareness but procedure: using independent estimates, consulting base rates, and making your assessment before encountering potentially anchoring information."
            }
          ]
        }
      ]
    },
    {
      "id": "cdb705e4-5381-436b-9626-c5f6b1e08c29",
      "variants": [
        {
          "type": "CONTENT",
          "backgroundSrc": "https://d5rfy0lpah1cz.cloudfront.net/content/push/bg16_202603270001.jpeg",
          "blocks": [
            {
              "type": "CONTENT_TITLE",
              "title": "The Availability Trap"
            },
            {
              "type": "CONTENT_TEXT",
              "text": "How dangerous is flying? How common are shark attacks? How likely is it that a nuclear power plant will melt down? When you answer these questions, you probably do not pull up a statistical database in your mind. Instead, you search your memory for relevant examples. If examples come easily, you judge the event as common. If examples are hard to find, you judge it as rare. This mental shortcut is the availability heuristic.\n\nThe problem is that the ease of recall depends on factors that have nothing to do with actual frequency. Events that are vivid, dramatic, recent, or emotionally charged are easier to recall than events that are mundane, statistical, distant, or emotionally neutral. A plane crash that kills 200 people generates days of media coverage. The 100 people who die in car accidents on the same day generate none.\n\nAs a result, people systematically overestimate the frequency of dramatic risks and underestimate the frequency of common ones. Terrorism, shark attacks, and plane crashes all loom larger in our minds than heart disease, diabetes, and car accidents, even though the latter kill vastly more people.\n\nKahneman and Tversky demonstrated this effect in a simple experiment: when asked whether there are more English words that start with the letter K or more words that have K as the third letter, most people say words starting with K are more common. In reality, there are roughly three times more words with K in the third position. Starting letters are just easier to search for in memory."
            }
          ]
        }
      ]
    },
    {
      "id": "248cfa7e-8713-49f9-97e1-f88cbbaa8860",
      "variants": [
        {
          "type": "CONTENT",
          "backgroundSrc": "https://d5rfy0lpah1cz.cloudfront.net/content/push/bg16_202603270001.jpeg",
          "blocks": [
            {
              "type": "CONTENT_TITLE",
              "title": "Fear and the Media Machine"
            },
            {
              "type": "CONTENT_TEXT",
              "text": "The availability heuristic becomes especially dangerous when it combines with emotion and media coverage to form what Kahneman calls an availability cascade. The mechanism works like this: a minor risk receives media attention. The coverage makes the risk easier to recall. Increased recall makes the risk feel more common. The perceived increase in risk generates public concern. Public concern generates more media coverage. And the cycle feeds itself, sometimes producing policy responses that are wildly out of proportion to the actual danger.\n\nKahneman and his colleague Cass Sunstein studied this phenomenon in the context of risk regulation. They found that public fear, driven by availability cascades, can redirect enormous government resources toward relatively minor risks while genuinely dangerous threats go unaddressed because they lack dramatic narrative potential.\n\nThe emotional component is critical. System 1 does not just count examples. It weighs them by emotional intensity. A single vivid story of a child harmed by a rare toxic chemical will generate more public outrage and regulatory action than a statistical report showing that thousands of children are harmed by common household accidents every year.\n\nThis is not because people are stupid. It is because System 1 evaluates risk through emotional resonance rather than statistical calculation. And in a world where media coverage determines which risks are emotionally salient, the availability heuristic ensures that our collective sense of danger is shaped more by what makes compelling news than by what actually threatens our lives."
            }
          ]
        }
      ]
    },
    {
      "id": "f88a468c-dd59-42ac-addc-306ecf9da0fe",
      "variants": [
        {
          "type": "CONTENT",
          "backgroundSrc": "https://d5rfy0lpah1cz.cloudfront.net/content/push/bg16_202603270001.jpeg",
          "blocks": [
            {
              "type": "CONTENT_TITLE",
              "title": "Seeing Patterns in Noise"
            },
            {
              "type": "CONTENT_TEXT",
              "text": "The law of small numbers and the availability heuristic share a common root: System 1's compulsive pattern detection. Your fast-thinking mind is a machine for finding order in chaos, for constructing coherent stories from random data. This ability is enormously useful in a world that does contain real patterns. But it also means that System 1 sees patterns where none exist.\n\nConsider the basketball fan who is certain that a player has a \"hot hand\" after hitting three shots in a row. The feeling is overwhelming. Surely this player is in the zone. But extensive statistical analysis of shooting data has shown that the sequences people perceive as streaks are consistent with what random chance alone would produce. The player's probability of making the next shot is not meaningfully higher after three hits than after three misses.\n\nThe hot hand illusion persists because System 1 cannot tolerate randomness. A sequence of hits feels meaningful. A sequence of misses feels like a slump. The idea that both could be random noise is deeply unsatisfying to a mind that was built to find causes and detect patterns.\n\nKahneman argues that this pattern-seeking tendency is the source of many cognitive errors. We see trends in stock markets that are random fluctuations. We attribute success to skill when luck played the dominant role. We build elaborate theories to explain events that needed no explanation beyond statistical variation. System 1 finds the signal. The trouble is that sometimes there is no signal to find."
            }
          ]
        }
      ]
    }
  ]
};

export default feed;
