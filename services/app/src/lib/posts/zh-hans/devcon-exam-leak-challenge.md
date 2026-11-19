---
title: "以太坊能为印度做什么？试题泄露难题"
description: "在孟买举行的 Devcon 8 上，我们主持了一场工作坊，邀请当地社区共同讨论印度教育面临的一项重大挑战：试题泄露。"
author: "Yuting Jiang"
date: "2026-11-14"
type: "case-study"
thumbnail: "/images/resources/devcon8-banner.png"
image: "/images/resources/devcon-exam-leak-opinion-map.webp"
---

2026 年 5 月，一起试题泄露事件导致印度全国医学入学考试 NEET 被取消，影响了约 220 万名考生（按印度计数法为 22 lakh）。考试取消引发了[印度各地的学生抗议](https://www.hindustantimes.com/education/competitive-exams/neet-ug-2026-cancelled-amid-paper-leak-row-students-parents-and-educators-react-strongly-101778745473158.html)，考试改革也成了[更广泛的青年运动](https://apnews.com/article/59d045fbd485635def01b01f3898307b)的一项共同诉求。

在孟买 Devcon 8 上，我们主持了一场工作坊来讨论这个问题。考试已经取消，我们把讨论集中在如何防止今后再次发生试题泄露。

有人提议将考试改为机考。这就够了吗？还有哪些人需要得到信任？谁又能检查他们的工作？

我们请参与者组成一个小型公民议会，无需事先掌握区块链技术。工作坊让大家可以讨论考试系统应该提供的保障，例如记录一经创建就无法更改，同时避开「不可篡改性」之类的技术术语。讨论没有标准答案，认为无需使用区块链也是合理的结论。

## 两个起点：保险库和图书馆

<figure aria-label="保障考试安全的两种方案" style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: clamp(0.5rem, 2vw, 1rem);">
  <div style="background: #f2efff; border-radius: 1rem; padding: clamp(0.75rem, 3vw, 1.5rem); text-align: center;">
    <img src="/images/resources/devcon-exam-leak-vault.png" alt="" width="72" height="72" style="display: block; margin: 0 auto 0.75rem; background: #44328e; border-radius: 1rem; padding: 0.6rem;" />
    <strong style="display: block; color: #29205a;">保险库：保守秘密</strong>
    <span style="display: block; font-size: 0.9em; line-height: 1.4; color: #423a62;">尽量减少能接触到正式考题的人，并保护每一个环节。</span>
  </div>
  <div style="background: #edf5ff; border-radius: 1rem; padding: clamp(0.75rem, 3vw, 1.5rem); text-align: center;">
    <img src="/images/resources/devcon-exam-leak-library.png" alt="" width="72" height="72" style="display: block; margin: 0 auto 0.75rem; background: #3156a4; border-radius: 1rem; padding: 0.6rem;" />
    <strong style="display: block; color: #202f57;">图书馆：取消保密</strong>
    <span style="display: block; font-size: 0.9em; line-height: 1.4; color: #344665;">公开所有可能的考题，并在考试当天随机抽取试题。</span>
  </div>
</figure>

这两种方案只是讨论的起点。参与者可以随时改变自己的看法。

和我一起主持工作坊的两位同事帮助各组完善提案。常驻孟买的加密行业分析师 [PreeGee](https://x.com/preegee) 协助保险库组，Agora 首席技术官 Nicolas Gimenez 协助图书馆组。

1. **第一轮投票。** 参与者用手机在 Agora 上对预设陈述投票，选择同意、不同意或不确定。初始地图上出现了两个观点群体，与起初的两种方案大致对应：监督派偏向保险库，技术派偏向图书馆。

   [![第一轮投票后的观点地图。监督派（10 人，56%）倾向于提前拟题，并透明地监督工作人员。技术派（7 人，39%）倾向于采用由人工智能生成试题、借助区块链增强透明度等技术措施。](/images/resources/devcon-exam-leak-first-vote.png)](/images/resources/devcon-exam-leak-first-vote.png)

   _第一轮投票后形成的两个观点群体。点击地图可查看原图。_

2. **小组讨论。** 约 60% 的人加入保险库组，40% 加入图书馆组。大家有七分钟按以下模板提交提案：「为防止泄题，[谁]应该[做什么]，前提是[保障条件]。」
3. **第二轮投票。** 参与者对新提案投票。地图上的观点群体从两个变为五个。
4. **压力测试。** 时间结束前，大家着手检验争议最大的提案。现场没有进行最终排序，我们让 Agora 上的讨论又开放了一周。

Agora 根据投票模式划分观点群体。陈述的措辞和参与者加入的队伍不影响分组。人工智能模型随后为群体命名并概括其观点。分组结果与共识都由投票决定。

## 投票揭示了什么

Agora 的报告记录了 **18 名参与者、330 票和 22 条陈述**。其中有 12 条陈述由参与者在现场撰写。

![工作坊结束后的 Agora 观点地图，显示五个群体：去中心化派、传统派、透明度倡导者、怀疑派和混合技术派。](/images/resources/devcon-exam-leak-opinion-map.webp)

_Agora 报告中的五个观点群体。18 名参与者中有一人对少于七条陈述投了票，因此未被分入任何群体。_

地图上的「去中心化派」指主张让专家小组投票决定使用哪些题目、由多位专家共同决策的参与者。

### 共同点：任何人都能核验抽签

> 如果采取随机抽题，任何人都应该能够核验抽签过程没有被操纵。

报告中，这是唯一在五个群体中都获得支持的陈述，**83% 的人同意，没有人反对。** 这项保障以采用随机抽题为前提。投票没有决定是否采用随机抽题、公开题库或以太坊。任何人都能核验抽签，这是一项工程人员可以用来检验不同设计的要求。以太坊是实现它的一种可能途径。工作坊仍留下两个问题：是否需要以太坊，以及仅凭以太坊能否防止泄题。

### 大家还存在哪些分歧

- **只要将 NEET 改为机考，就足以防止泄题。** 17% 同意，39% 不同意，39% 不确定。
- **最安全的考试会公开所有可能的考题。** 33% 同意，39% 不同意。
- **考到与练习题几乎相同的试题，这种小概率风险可以接受。** 总体有 61% 的人同意，但怀疑派的两名成员都投票反对接受这一风险。

50 分钟转眼就过去了。其间，地图上的观点群体从两个变成了五个。Agora 按投票方式划分群体，无论参与者加入的是哪支队伍。撰写提案让各队内部的分歧显现出来，也促成了跨队伍的意外联盟。

工作坊结束时，PreeGee 这样说：

> 刚开始时，很自然就成了一场辩论，是 A 对 B。可是等你真正深入问题，开始设计解决方案，就会发现，你可能不同意起初跟你意见一致的人，也可能和原以为不会达成共识的人找到共同点。

倾听各方在意的事情，我们就能一起寻找大家都愿意支持的方案，即使其他分歧依然存在。

我们希望这次小型工作坊能鼓励公民、社区和机构[试用 Agora](/resources/facilitation-guide)，共同为自己关心的问题寻找解决办法。

[查看 Agora 上的原始讨论](https://www.agoracitizen.app/project/devcon8/conversation/Z-n7k2Q) · [查看 Devcon 官方档案条目](https://archive.devcon.org/devcon8/what-can-ethereum-do-for-india-the-exam-leak-challenge/)

特别感谢 [GCC](https://www.gccofficial.org/) 为 Agora 和其他公共产品提供资助。
