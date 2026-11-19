---
title: "以太坊能為印度做什麼？試題外洩難題"
description: "在孟買舉行的 Devcon 8 上，我們主持了一場工作坊，邀請當地社群共同討論印度教育面臨的一項重大挑戰：試題外洩。"
author: "Yuting Jiang"
date: "2026-11-14"
type: "case-study"
thumbnail: "/images/resources/devcon8-banner.webp"
image: "/images/resources/devcon-exam-leak-opinion-map.webp"
---

2026 年 5 月，一起試題外洩事件導致印度全國醫學入學考試 NEET 取消，影響約 220 萬名考生（按印度計數法為 22 lakh）。考試取消引發了[印度各地的學生抗議](https://www.hindustantimes.com/education/competitive-exams/neet-ug-2026-cancelled-amid-paper-leak-row-students-parents-and-educators-react-strongly-101778745473158.html)，考試改革也成了[更廣泛的青年運動](https://apnews.com/article/59d045fbd485635def01b01f3898307b)的一項共同訴求。

在孟買 Devcon 8 上，我們主持了一場工作坊來討論這個問題。我們不爭論取消考試是否正確，而是把討論焦點放在如何避免日後再度發生試題外洩。

有人提議改用電腦應試。這樣就夠了嗎？還有哪些人需要受到信任？誰又能查核他們的工作？

我們請參與者組成一個小型公民議會，無需事先具備區塊鏈技術知識。工作坊讓大家討論考試系統應該提供哪些保障，例如一筆紀錄建立後就無法更改，同時避開「不可竄改性」之類的技術術語。討論沒有標準答案，認為無須使用區塊鏈也是合理的結論。

## 兩個起點：保險庫與圖書館

<figure class="resource-comparison" aria-label="保障考試安全的兩種方案">
  <div class="resource-comparison-card">
    <img src="/images/resources/devcon-exam-leak-vault.webp" alt="" width="72" height="72" loading="lazy" decoding="async" />
    <strong>保險庫：保守秘密</strong>
    <span>盡量減少能接觸正式試題的人，並保護每一個環節。</span>
  </div>
  <div class="resource-comparison-card resource-comparison-card--sky">
    <img src="/images/resources/devcon-exam-leak-library.webp" alt="" width="72" height="72" loading="lazy" decoding="async" />
    <strong>圖書館：取消保密</strong>
    <span>公開所有可能的考題，並在考試當天隨機抽選試題。</span>
  </div>
</figure>

這兩種方案只是討論的起點。參與者可以隨時改變自己的看法。

與我共同主持工作坊的兩位夥伴協助各組完善提案。常駐孟買的加密產業分析師 [PreeGee](https://x.com/preegee) 協助保險庫組，Agora 技術長 Nicolas Gimenez 協助圖書館組。

1. **第一輪投票。** 參與者用手機在 Agora 上對預設陳述投票，表達同意、不同意或不確定。初始地圖上出現兩個意見群組，與起初的兩種方案大致對應：監督派偏向保險庫，技術派偏向圖書館。

   [![第一輪投票後的意見地圖。監督派（10 人，56%）傾向事先擬題，並透明監督工作人員。技術派（7 人，39%）傾向採用人工智慧生成考題、透過區塊鏈提升透明度等技術措施。](/images/resources/devcon-exam-leak-first-vote.png)](/images/resources/devcon-exam-leak-first-vote.png)

   _第一輪投票後形成的兩個意見群組。選取地圖可查看原圖。_

2. **小組討論。** 約 60% 的人加入保險庫組，40% 加入圖書館組。大家有七分鐘依照下列模板提出提案：「為防止洩題，[誰]應該[做什麼]，前提是[保障條件]。」
3. **第二輪投票。** 參與者對新提案投票。地圖上的意見群組從兩個變成五個。
4. **壓力測試。** 時間結束前，大家開始檢驗爭議最大的提案。現場沒有進行最終排序，我們讓 Agora 上的討論再開放了一週。

Agora 根據投票模式劃分意見群組。陳述的措辭和參與者加入的隊伍不影響分組。人工智慧模型隨後替群組命名並摘要其觀點。分組結果與共識都由投票決定。

## 投票揭示了什麼

Agora 的報告記錄了 **18 名參與者、330 票與 22 則陳述**。其中 12 則陳述由參與者在現場撰寫。

![工作坊結束後的 Agora 意見地圖，呈現五個群組：去中心化派、傳統派、透明度倡議者、懷疑派與混合技術派。](/images/resources/devcon-exam-leak-opinion-map.webp)

_Agora 報告中的五個意見群組。18 名參與者中有一人對少於七則陳述投票，因此未分入任何群組。_

地圖上的「去中心化派」指主張由專家小組投票決定使用哪些題目，而非交由單一權威決定的參與者。

### 共同點：任何人都能查核抽籤

> 如果採用隨機抽題，任何人都應該能查核抽籤過程沒有受到操縱。

在報告中，這是唯一在五個群體中都獲得支持的陳述，**83% 的人同意，沒有人反對。** 這項保障以採用隨機抽題為前提。投票沒有決定是否採用隨機抽題、公開題庫或以太坊。任何人都能查核抽籤，這是一項工程人員可用來檢驗不同設計的要求。以太坊是實現它的一條可能途徑。工作坊仍留下兩個問題：是否需要以太坊，以及光靠以太坊是否能防止洩題。

### 大家還有哪些分歧

- **把 NEET 改成電腦應試，就足以防止洩題。** 17% 同意，39% 不同意，39% 不確定。
- **最安全的考試會公開所有可能的考題。** 33% 同意，39% 不同意。
- **考到與練習題幾乎相同的考題，這種小機率風險可以接受。** 整體有 61% 的人同意，但懷疑派的兩名成員都投票反對接受這項風險。

50 分鐘轉眼就過去了。這段時間裡，地圖上的意見群組從兩個變成五個。Agora 依照投票方式分組，無論參與者加入的是哪支隊伍。撰寫提案讓各組內部的分歧浮現，也促成了跨組的意外聯盟。

工作坊結束時，PreeGee 這樣說：

> 一開始很自然就變成了一場辯論，是 A 對 B。可是等你真的深入問題，開始設計解決方案，就會發現，你可能不同意一開始跟你意見一致的人，也可能和原本以為不會達成共識的人找到共同點。

與其問哪一方該獲勝，不如傾聽各方在意的事情，一起尋找大家都願意支持的方案，即使其他分歧仍然存在。

我們希望這次小型工作坊能鼓勵公民、社群和機構[試用 Agora](/resources/facilitation-guide)，一起為自己關心的問題尋找解決方法。

[查看 Agora 上的原始討論](https://www.agoracitizen.app/project/devcon8/conversation/Z-n7k2Q) · [查看 Devcon 官方檔案條目](https://archive.devcon.org/devcon8/what-can-ethereum-do-for-india-the-exam-leak-challenge/)

特別感謝 [GCC](https://www.gccofficial.org/) 資助 Agora 與其他公共財。
