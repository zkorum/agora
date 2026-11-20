---
title: "以太坊能为印度做什么？试题泄露难题"
description: "在孟买举行的 Devcon 8 上，我们主持了一场工作坊，邀请当地社区共同讨论印度教育面临的一项重大挑战：试题泄露。"
author: "Yuting Jiang"
date: "2026-11-14"
type: "case-study"
thumbnail: "/images/resources/devcon8-banner.webp"
image: "/images/resources/devcon-exam-leak-opinion-map.webp"
---

2026 年 5 月，一起试题泄露事件导致印度全国医学入学考试 NEET 被取消，影响了约 220 万名考生。考试取消引发了印度各地的学生抗议，考试改革也成了更广泛的青年运动的一项共同诉求。

在孟买举行的 Devcon 8 上，我们请工作坊参与者思考如何防止今后再发生泄题。印度政府此前已提议将 NEET 改为机考。这样就够了吗？我们仍需要信任谁？又有谁能核查他们的工作？

我们邀请参与者组成一个小型公民议会。不必了解区块链的运作方式，他们就能讨论考试系统应该提供哪些保障，例如一条记录生成之后能否修改。至于区块链究竟有没有帮助，则由他们自己决定。

## 保障考试安全的两个起点

<figure class="resource-comparison" aria-label="保障考试安全的两种方案">
  <div class="resource-comparison-card">
    <img src="/images/resources/devcon-exam-leak-vault.webp" alt="" width="72" height="72" loading="lazy" decoding="async" />
    <strong>保险库：保守秘密</strong>
    <span>「最安全的考试，是尽可能少的人能看到正式考题的考试。」</span>
  </div>
  <div class="resource-comparison-card resource-comparison-card--sky">
    <img src="/images/resources/devcon-exam-leak-library.webp" alt="" width="72" height="72" loading="lazy" decoding="async" />
    <strong>图书馆：取消保密</strong>
    <span>「最安全的考试，是所有人都能看到所有可能的考题，却没人知道会考哪些题的考试。」</span>
  </div>
</figure>

这两条陈述揭示了一种在目标一致时容易被忽略的矛盾：在这里，保密和透明指向两个相反的方向。保护考题，就要问谁应该有权接触考题，以及如何核查他们的工作。公开题库，就要问该如何选出正式考题，以及大家怎样才能核验这一选择。

我们把这两条陈述作为出发点。和我一起主持工作坊的两位同事帮助各组把它们变成具体的提案。常驻孟买的加密行业分析师 PreeGee 协助保险库组。Agora 首席技术官 Nicolas Gimenez 协助图书馆组。

1. **第一轮投票。** 参与者用手机在 Agora 上对预设陈述投票，选择同意、不同意或不确定。初始地图上出现了两个观点群体，与起初的两种方案大致对应：监督派偏向保险库，技术派偏向图书馆。

   <figure>
     <a href="/images/resources/devcon-exam-leak-first-vote.png"><img src="/images/resources/devcon-exam-leak-first-vote.png" alt="第一轮投票后的观点地图。监督派（10 人，56%）倾向于提前拟题，并透明地监督工作人员。技术派（7 人，39%）倾向于采用由人工智能生成试题、借助区块链增强透明度等技术措施。" width="736" height="681" loading="lazy" decoding="async" /></a>
     <figcaption>第一轮投票后形成的两个观点群体。</figcaption>
   </figure>

2. **小组讨论。** 约 60% 的人加入保险库组，40% 加入图书馆组。大家有七分钟按以下模板提交提案：「为防止泄题，[谁]应该[做什么]，前提是[保障条件]。」

3. **第二轮投票。** 参与者对新提案投票。Agora 报告显示了五个观点群体。

   <figure>
     <img src="/images/resources/devcon-exam-leak-opinion-map.webp" alt="工作坊结束后的 Agora 观点地图，显示五个群体：去中心化派、传统派、透明度倡导者、怀疑派和混合技术派。" width="1191" height="669" loading="lazy" decoding="async" />
     <figcaption>Agora 报告中的五个观点群体。</figcaption>
   </figure>

4. **压力测试。** 时间结束前，大家着手检验争议最大的提案。现场没有进行最终排序，我们让 Agora 上的讨论又开放了一周。

Agora 根据投票模式划分观点群体。分组完成后，一个人工智能模型为各组命名并概括其观点。

## 投票揭示了什么

Agora 的报告记录了 18 名参与者、330 票和 22 条陈述。其中有 12 条陈述由参与者在现场撰写。

争议最大的问题是：把 NEET 改为机考能不能防止泄题、要不要公开完整题库，以及练习题与正式考题有多少重合才算公平。

- **只要将 NEET 改为机考，就足以防止泄题。** 17% 同意，39% 不同意，39% 不确定。
- **最安全的考试会公开所有可能的考题。** 33% 同意，39% 不同意。
- **考到与练习题几乎相同的试题，这种小概率风险可以接受。** 总体有 61% 的人同意，但怀疑派的两名成员都投票反对接受这一风险。

在推敲具体提案时，一些起初意见一致的人在某项保障措施上产生了分歧。也有人和最初支持另一种方案的参与者达成了一致。观点群体从两个变为五个，这表明当参与者必须决定方案如何实际运作时，讨论变得细致了许多。

工作坊结束时，PreeGee 这样说：

> 刚开始时，很自然就成了一场辩论，是 A 对 B。可是等你真正深入问题，开始设计解决方案，就会发现，你可能不同意起初跟你意见一致的人，也可能和原以为不会达成共识的人找到共同点。

## 共同点

有一项保障措施在五个群体中都得到了支持：

> 如果采取随机抽题，任何人都应该能够核验抽签过程没有被操纵。

**83% 的人同意，没有人反对。** 这是 Agora 报告中唯一一条被标记为获五个群体共同认可的陈述。

这为工程师提供了一项具体要求，让他们可以检验不同设计能否满足它。以太坊是实现公开核验的一种可能方式。是否使用以太坊、是否公开题库，以及是否随机抽题，都没有定论。

五十分钟让我们找出了更细致的分歧，也开始检验其中一项提案。如果有更多时间，我们会请参与者通过撰写新陈述并投票，继续探讨这些分歧。支持保险库和支持图书馆的人，有什么是双方都能赞成的？可以公开核验的抽签表明，就一项保障措施达成一致，可以成为进一步凝聚共识的起点。

我们希望这次小型工作坊能鼓励公民、社区和机构试用 Agora，共同为自己关心的问题寻找解决办法。[阅读 Agora 主持指南](/resources/facilitation-guide)

[查看 Agora 上的原始讨论](https://www.agoracitizen.app/project/devcon8/conversation/Z-n7k2Q) · [查看 Devcon 官方档案条目](https://archive.devcon.org/devcon8/what-can-ethereum-do-for-india-the-exam-leak-challenge/)

特别感谢 [GCC](https://www.gccofficial.org/) 为 Agora 和其他公共产品提供资助。
