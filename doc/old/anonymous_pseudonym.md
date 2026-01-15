# Anonymous pseudonyms

An anonymous pseudonym is an identifier that's used when either:

- responding to a poll
- creating a post
- commenting a post

Anonymous pseudonyms cannot be correlated with the user account (email address). How so? By making use of a secret value, only known by the user on the client side.

Each users may or may not have multiple anonymous pseudonyms. This thread aims to discuss the conditions for creating new pseudonyms, and how so.

## Why do we need an anonymous pseudonym on the first place?

Why not simply sharing the eligibility proof?
For example, if a post addresses students of Acme University, I could prove cryptographically that I am a student of Acme University - without providing any unique identifier.

That seems neat, until we need do those two things:

1. count responses to a poll from unique respondents
1. manage spam, DDoS attacks, and moderation (breaking the code of conduct - hate speech etc)

It is not possible to count poll results accurately without making sure that "one person in the eligible group = one response". That's why we need a unique identifier: an anonymous pseudonym.

It is not possible to mitigate 2/ without being able to ban/suspend some identifier. Remember that IP addresses are:

- very sensitive identifiers that your Internet Provider can use to easily reveal your real identity
- not enough to protect against DDoS attacks, as clever attackers manage to have a fleet of disposable ones

So we definitely want to avoid using IP Addresses whenever possible. The only way to mitigate 2/ is to use an identifier: an anonymous pseudonym.

Note that while needed under the hood, the anonymous pseudonyms don't need to be displayed on the frontend, unless users want to verify data authenticity.

## Anonymous pseudonym unicity (or lack of)

### When unicity is necessary

The main hard requirement for pseudonym unicity across time is with poll. Eligible poll respondents shall use one and only one anonymous pseudonym to respond, even after a recovery, otherwise we would count their responses multiple times which would impede the integrity of the poll.

The second requirement for pseudonym unicity is banning/suspension. Imagine a user breaking the code of conduct using an anonymous pseudonym - ZKorum decides conjointly with the community to ban this pseudonym. (As a side comment, there will be another thread for discussing banning/suspension, censorship-resistance and how to deal with moderation.) The user behind this banned anonymous pseudonym should not be able to get a new anonymous pseudonym, otherwise it would mean that banned users could effectively unban themselves.

How to ensure that banned users cannot request a new secret, by abusing the "recovery" process? It is tricky, because ZKorum banned the anonymous pseudonym - not the user: by design ZKorum has no way to associate this anonymous pseudonym with the user account. We don't want to change that of course, because it is at the core of what makes ZKorum special: nobody, not even ZKorum can know which users (email address) said what.
Thankfully this problem can be solved the same way as revocation is solved in the verifiable credentials space. We can make use of either accumulators or ban lists, and ask the user to provide a proof of non-ban before allowing the user to proceed with the recovery process (see last section for more details).

### When unicity is unwanted

The main requirement for lack of pseudonym unicity across time is recovery. Say a user lost all their devices, and with them the secret values that would generate the users' pseudonyms. ZKorum need to allow the user to revoke his/her/their previous (blinded) credential which contain the secrets, and issue him/her/them a new one.

With the exception of responding to polls the user already responded to, we want to allow the user to enjoy ZKorum with his new set of anonymous pseudonyms.

The main requirement for allowing users to have multiple anonymous pseudonyms at the same time is privacy.
Say there is a university which delivers credentials to their members. This university counts 150 Americans, mainly professors, with only 1 American Student. The university counts 2000 Students.

Tom is that American Student and is registered on ZKorum with the rest of his community. In Tom's university credential, the mention "Student" is listed for the attribute "Status", and the mention "American" is listed on the attribute "Nationality".
Tom sees a post addressing Students and comments.
He then sees a post addressing Americans and comments.
Now imagine the very same anonymous pseudonym (identifier) was shared together with the proof of being a Student for the first poll, and the proof of being American for the second poll. Even though taken individually, none of these polls could reveal Tom's real identity, one could correlate the two polls, and realize the it's the same person behind it. An American Student. Well, there is only one in that University, it's Tom! Identity doxxed.

That is why at a certain time, it is generally advisable to enforce a unique anonymous pseudonym for each set of attributes revealed.
For example for Tom:

- one unique anonymous pseudonym when revealing himself as "Student"
- another unique anonymous pseudonym when revealing himself as "American"
- yet another unique anonymous pseudonym when revealing himself as "Student in Geography"
- ...etc

If there are `n` attributes, that means Tom have at the same time `sum(k=1..n) of n!/(k!*k!*(n-k)!)` anonymous pseudonyms for each given combination of these attributes. Only one of this anonymous pseudonym is expected for commenting a post or creating a post in the whole app.

(For responding to a poll, remember that things are a little different, as we want to isolate the secrets used for responding to a poll with the secrets used for the whole application. That is because of the necessity of total unicity across time: on revocation we don't want to lock out the entire app, but only the polls that the user already responded to.
Responding to a poll => one secret for each poll.)

Note that the above is _not enough_ to ensure respondents privacy. ZKorum by itself has no way to know whether or not there is only 1 American Student in the university. The above method only ensures that _if_ the user accidentally reveals his identity by revealing _too many_ attributes (here Status + Nationality for an American), the only information that will be revealed in Tom's comment is that this unique identifier used to reveal Status + Nationality associated with this comment is indeed Tom. But Tom's answers on the posts where he shared only that he was a Student, and on the posts where he shared only that he was American will not be impacted. Nobody can know it was indeed Tom as well.

There are three possible ways to consistently solve this problem:

1. leave it to the user to not share "too may information": that's far from ideal as users rightfully expect privacy by design.
1. add a "registration" step where logged-in users would share all of their attributes with ZKorum (except unique ID and other sensitive data). ZKorum would be able to associate all of these attributes to the email address. It would essentially mean that the account is like a public social network account. The obvious downsides is this need for sharing data. Like before, nobody including ZKorum would know who responded what, but ZKorum would have more information about the people who registered. The upside is that ZKorum can now count the number of people having certain combinations of attributes, and then prevent creating posts or responding to posts addressing as eligibility a combination of attributes with too few members - essentially providing a privacy-by-design system where users don't need to worry! Note that if we go for this solution, it probably can't be optional. If it was made optional, most users would choose to opt out in order to share as few information as possible, so ZKorum would underestimate the number of members in each combination groups, and would then wrongfully refuse certain eligibility by thinking that it would reveal the identity of the participants!
1. rely on external infrastructure provided by the authority who issued the verifiable credentials in the first place, such as the university in the above example of Tom. The university could provide a list of combination of attributes that contain too few members. This way, anyone, starting from ZKorum, would know that sharing these attributes together would be revealing one's identity. ZKorum would simply fetch this data and disallow users to reveal their identity via anonymous posts. That is ideal, because we get the upsides of the previous solution without the downsides: ZKorum does not need to collect more information from users on registration. This solution works for simple use-case of posts addressing eligibility which concerns credentials issued by a unique authority. It doesn't work for posts addressing eligibility from credentials coming from different authorities.

For the MVP, we don't have time for this, so we'll keep it simple and go with 1/. We will just carefully choose the possible combinations that can be requested as eligibility, depending on the organizations with which we work.
It is too early to make a decision on this topic but I think it is not easy to convince issuers to provide the necessary infrastructure for 3/, especially considering that it won't be enough for cross-issuers eligibility anyway. My guess is that we will end up going for 2/.

### How does it impact moderation?

As we've seen, every users will have a fairly high amount of anonymous pseudonyms at a time.
And anonymous pseudonyms are not correlatable with users accounts.
So banning an anonymous pseudonym is not quite the same as banning a user. User can continue to use the other anonymous pseudonyms he/she/they have.
However, by design, it is the only thing ZKorum can - and should - do.
Let's imagine a really naughty user who get banned from all of his/her/their available anonymous pseudonyms, one ban after the other.
The user would still have another escape hatch: recovery.
The user would be able to fake having lost his devices, and ask for new credentials.
Except ZKorum would send the user an accumulator/ban list and ask for a proof that _none_ of his/her/their anonymous pseudonyms is in this accumulator/list. If the user can't, then the user will not be able to pass the requirement to request a new set of credentials! By doing this technique, we achieve checking user account for banning status without needing to know the exact anonymous pseudonyms that the account use, effectively preserving the anonymous pseudonyms privacy.

But that's still not ideal as we'd have preferred that banning one unique identifier prevent the user from using the platform entirely. It would indeed be possible by requesting this non-ban proof to be generated and sent in the Verifiable Presentation every time the user create or respond to a post. Unfortunately this solution won't be possible because of performance issues: if the number of banned pseudonyms is high enough, then posting will become too slow because [non-membership accumulator proof is expensive](https://github.com/docknetwork/crypto-wasm#accumulator).

Another way would be to expect this proof of non-membership in the ban list on every login.
And eventually, enforce a proof every now and then, as most users will probably "stay logged-in" for a long period of time.
This verification is slow - but if it is done once in a while, it will probably not impede user experience too much, especially as we can process it in the background. If a user is incapable of providing a non-ban proof, ZKorum would simply revoke all their secret credentials that generated their pseudonyms, log them out and forbid them from logging in again until they are unbanned.

Instead of expecting a non-banning proof at every Verifiable Presentation, the best approach seems to be _the combination of checking banning status on recovery request and on login/once in a while_.

In general, we'll just start by a much simpler approach to moderation anyway and move towards more complexity as we scale.
