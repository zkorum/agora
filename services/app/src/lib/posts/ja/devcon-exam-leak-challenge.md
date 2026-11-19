---
title: "Ethereumはインドに何ができるか？試験問題の流出を防ぐには"
description: "ムンバイで開かれたDevcon 8で、インドの教育が直面する大きな課題の一つである試験問題の流出について、地元の参加者が話し合うワークショップを進行しました。"
author: "Yuting Jiang"
date: "2026-11-14"
type: "case-study"
thumbnail: "/images/resources/devcon8-banner.png"
image: "/images/resources/devcon-exam-leak-opinion-map.webp"
---

2026年5月、試験問題の流出を受け、インドの全国医学部入学試験NEETが取り消され、約220万人（インドの数え方では22 lakh）の受験生に影響が及びました。取り消しをきっかけに[インド各地で学生の抗議活動](https://www.hindustantimes.com/education/competitive-exams/neet-ug-2026-cancelled-amid-paper-leak-row-students-parents-and-educators-react-strongly-101778745473158.html)が起き、試験制度の改革が[より広い若者の運動](https://apnews.com/article/59d045fbd485635def01b01f3898307b)の共通の要求になりました。

ムンバイのDevcon 8では、この課題をテーマにワークショップを開きました。すでに決まった試験の取り消しを論じる代わりに、今後どうすれば問題の流出を防げるかを考えました。

受験をコンピューターで行うという案も出ました。それで十分なのでしょうか。誰を引き続き信頼する必要があり、その人の作業は誰が確認できるのでしょうか。

参加者には、小さな市民会議の一員として考えてもらいました。ブロックチェーンの技術知識は不要でした。「不変性」といった専門用語を使わずに、たとえば一度作られた記録を後から変更できないといった、制度に必要な保証を話し合えるようにしました。決まった正解はなく、ブロックチェーンは不要という結論もあり得ました。

## 二つの出発点、金庫と図書館

<figure aria-label="試験の安全性を高める二つの方法" style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: clamp(0.5rem, 2vw, 1rem);">
  <div style="background: #f2efff; border-radius: 1rem; padding: clamp(0.75rem, 3vw, 1.5rem); text-align: center;">
    <img src="/images/resources/devcon-exam-leak-vault.png" alt="" width="72" height="72" style="display: block; margin: 0 auto 0.75rem; background: #44328e; border-radius: 1rem; padding: 0.6rem;" />
    <strong style="display: block; color: #29205a;">金庫：秘密を守る</strong>
    <span style="display: block; font-size: 0.9em; line-height: 1.4; color: #423a62;">本番の問題を見られる人を減らし、すべての工程を守ります。</span>
  </div>
  <div style="background: #edf5ff; border-radius: 1rem; padding: clamp(0.75rem, 3vw, 1.5rem); text-align: center;">
    <img src="/images/resources/devcon-exam-leak-library.png" alt="" width="72" height="72" style="display: block; margin: 0 auto 0.75rem; background: #3156a4; border-radius: 1rem; padding: 0.6rem;" />
    <strong style="display: block; color: #202f57;">図書館：秘密をなくす</strong>
    <span style="display: block; font-size: 0.9em; line-height: 1.4; color: #344665;">出題候補をすべて公開し、試験当日に問題を無作為に選びます。</span>
  </div>
</figure>

二つの案は議論の出発点です。参加者は途中で考えを変えることができます。

共同進行役の二人が、チームごとの提案づくりを支援しました。ムンバイを拠点とする暗号資産アナリストの [PreeGee](https://x.com/preegee) は金庫チームを、AgoraのCTOであるNicolas Gimenezは図書館チームを担当しました。

1. **最初の投票。** 参加者はスマートフォンでAgoraを開き、最初に用意された各意見に賛成、反対、判断保留で投票しました。最初のマップには、出発点の二つの案におおむね対応する集団が現れました。監督を重視する人は金庫に、技術を重視する人は図書館に近い考えを示しました。

   [![最初の投票後の意見マップ。監督を重視する人（10人、56%）は事前の作問と担当者への透明性のある監督を支持しました。技術を重視する人（7人、39%）は、AIによる作問やブロックチェーンの透明性など、技術を使った対策を支持しました。](/images/resources/devcon-exam-leak-first-vote.png)](/images/resources/devcon-exam-leak-first-vote.png)

   _最初の投票で現れた二つの意見グループ。マップを選ぶと原寸で表示できます。_

2. **チームでの作業。** 約60%が金庫チーム、40%が図書館チームに入りました。参加者は「流出を防ぐために、［誰］が［何をする］べきか。ただし［どのような安全策］を条件とするか」という型で、7分間で提案を投稿しました。
3. **二度目の投票。** 参加者は新しい提案に投票しました。マップに表れた意見グループは二つから五つに増えました。
4. **提案の弱点を検討。** 時間が尽きる前に、最も意見が割れた提案を検討し始めました。その場で最終順位は決めず、Agoraでの議論はさらに1週間続けられるようにしました。

Agoraは投票の傾向をもとに意見グループを作りました。意見の文面や所属チームはグループ分けに影響しません。その後、AIモデルが各グループに名前をつけ、考え方を要約しました。誰がどのグループに属し、何に同意したかは投票から導かれました。

## 投票で明らかになったこと

Agoraのレポートには **参加者18人、330票、22件の意見** が記録されています。そのうち12件は参加者がワークショップ中に書いたものです。

![ワークショップ後のAgoraの意見マップ。分権派、伝統派、透明性重視派、懐疑派、複合的な技術活用派の五つのグループが表示されています。](/images/resources/devcon-exam-leak-opinion-map.webp)

_Agoraのレポートに記録された五つの意見グループ。18人のうち1人は投票した意見が7件未満だったため、どのグループにも入りませんでした。_

マップ上の「分権派」は、出題する問題を一つの機関で決めるのではなく、専門家の委員会が投票で決めることを支持した参加者です。

### 共通点は、誰でも確認できる抽選

> 問題を無作為に選ぶ場合は、誰でも抽選が操作されていないと確認できるようにすべきです。

レポートで五つすべてのグループの支持が確認された意見はこれだけでした。**83%が賛成し、反対はありませんでした。** これは抽選を採用する場合の安全策です。無作為抽選や公開問題集、Ethereumを採用するかは決まりませんでした。誰でも抽選を検証できるという要件は、エンジニアが異なる設計を比較する際に確認できます。Ethereumはその要件を満たす一つの方法です。必要性や、それだけで流出を防げるかは、今回のワークショップでは結論が出ませんでした。

### 意見が割れたままの点

- **NEETをコンピューターで実施すれば、流出は防げる。** 17%が賛成、39%が反対、39%が判断保留でした。
- **最も安全な試験では、出題候補をすべて公開する。** 33%が賛成、39%が反対でした。
- **練習問題とほぼ同じ問題が出る可能性がわずかにあっても、許容できる。** 全体では61%が賛成しました。懐疑派の2人はどちらも、このリスクを受け入れることに反対しました。

50分はあっという間でした。その間にマップの意見グループは二つから五つに増えました。Agoraは参加者を、入ったチームに関係なく、投票をもとにグループ分けしました。提案を書き出すと各チーム内の意見の違いが見え、チームを越えた意外な連携も生まれました。

ワークショップの最後に、PreeGeeはこう振り返りました。

> 最初は自然に討論のようになって、A対Bという構図でした。でも実際に問題に踏み込んで解決策を設計し始めると、最初は同じ意見だった人と意見が食い違ったり、合意できるとは思わなかった人と共通点が見つかったりすることに気づきます。

立場の異なる人たちが何を大切にしているかを聞くことで、ほかの意見の違いが残っていても、一緒に支持できる解決策を探せます。

この小さなワークショップをきっかけに、市民や地域のコミュニティ、組織が [Agoraを使って](/resources/facilitation-guide)、自分たちにとって大切な課題の解決策を共に探してくれることを願っています。

[Agoraの元の議論を見る](https://www.agoracitizen.app/project/devcon8/conversation/Z-n7k2Q) · [Devcon公式アーカイブを見る](https://archive.devcon.org/devcon8/what-can-ethereum-do-for-india-the-exam-leak-challenge/)

Agoraとその他の公共財を支援してくださった [GCC](https://www.gccofficial.org/) に、特に感謝します。
