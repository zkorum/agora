# Secret data synchronization

Users generate lots of secret data in their frontend:

- verifiable credentials
- verifiable credential blindings (for the overall app and for each poll)
- verifiable presentations (responses to posts, post creation)
- the symmetric key used to encrypt user's data

These data are critical in terms of privacy.

## Privacy concerns and frontend requirements

### Verifiable Credentials

For the MVP, ZKorum is the issuer of the email verifiable credentials. Therefore, frontend does not need to keep track of them and sync, they can simply fetch them when the application starts. For security reasons, it is probably advisable to delete them on log-out.

Later though, ZKorum will have to act as a wallet and sync external credentials via the backend using encryption. Frontend might or might not keep the VCs locally when logged-out. For the first iteration of ZKorum, it might not be advisable, as the non-exportable private key to decrypt the symmetric key that was used to encrypt the verifiable credentials is hold in the same browser where the encrypted VC would be, so whoever having access to this browser would be able to decrypt them. This will be mitigated when WebAuthn will be introduced to encrypt data using the new `prf` and `blob` feature. In the meantime, it is probably better to remove them from the device after every log-out, and re-fetch them encrypted from the backend at every login.

Performance note: these data are not heavy and will not change often.

### Verifiable Credential Blinding

Anyone having access to the blindings can unblind the corresponding "secret" credentials and if they also have access to the email credential, they can post as if they were the user.

If they also have access to the email credential, they can also recalculate the anonymous pseudonym used when they responded to a post or created a post. As verifiable presentations are public, if they also have access to the corresponding content, they can know what the user responded.

That's why blindings are of uttermost importance in terms of privacy.

These data should be encrypted at rest locally. These data have to be synced across devices: sending the encrypted chunk to the backend and subscribe to changes from the backend whenever other devices associated with the user modified them. Until we use WebAuthn, these data should be deleted on logout, for the same reason as Verifiable Credentials.

Performance note: these data are not heavy and will not change often.

### Verifiable Presentations

Reminder: verifiable presentations associates a CID of the post UUID being created/responded to, the CID of the content, and a unique anonymous pseudonym and the proof of the eligibility. The Verifiable Presentation itself does not contain any data that could link it to the logged-in user. However, _syncing_ these data would mean associating it (in an encrypted form) with the user on the backend side, and then update each user's devices from the backend (though we could go for peer-to-peer but I want to avoid adding unecessary complexity). Syncing via backend is mostly private as data itself is encrypted but metadata is not (timestamp for endpoint interactions for example), which can be detrimental for privacy.

Anyone that can associate the verifiable presentations with an account can instantly know what the user said, assuming the content itself was public. This can be useful on the frontend side. User who created content should know what they created. But we don't want the backend or other users to get access to this association.

There is another way to know on the frontend what content the logged-in user created.
The frontend could locally regenerate their anonymous pseudonym and see if it matches with existing posts, though that is assuming the now revoked verifiable credentials used for creating content was not deleted in the meantime.

Keeping track of verifiable presentations could make this process easier. But there could potentially be a lot of verifiable presentations that need to be synced across devices.
If we sync them as a whole everytime, it will probably be a problem in terms of performance.
We could divide the encrypted verifiable presentations into small chunks (one chunk of comments/poll response for each post, and one chunk for every post that was ever created for example). But then every time the frontend update these chunks, the backend would know that the user responded to said post, or created a new post. Not what they said but ZKorum would know they did it. This is not ideal. If ZKorum backend would compare the timestamp when this endpoint was called with the timestamp when the endpoint for posting/responding was called, ZKorum could guess what users said. To bypass this problem, ZKorum would need to create a complex schedule-send functionality for every interactions with the posts. There ought to be a better way.

This schedule-send WILL be needed for the response to a POLL, as there is a registration process prior to it (see protocol - we don't want to lock out of the entire apps people who lost their devices - but only lock them out of polls they already responded to).
Even limited to poll responses, implementing schedule-send is already a complex matter.

That is why, we will proceed as follows:

- verifiable presentations are sent and forgotten. Backend shows a proof that the VP was broadcasted on the peer-to-peer network, and this counts as confirmation for the user that the post/response was processed correctly. Then users delete the VP locally: they don't keep track of it at all.
- on startup, frontend will use their blindings and VCs to recalculate locally the anonymous pseudonym for the whole app (responding as comment or creating post) and to recalculate each anonymous pseudonym that is used for responding to each poll. It will be recalculated for old VCs that were revoked too, because it was used by the user as well.
-

### Symmetric key

#### Syncing

- device 1 is logged in and syncing
- device 1 generate symmetric key and encrypt secrets using this
- device 1 sends encrypted (using didexchange) symmetric key to backend
- device 1 sends encrypted secrets (using symmetric key) to backend
- backend stores encrypted symmetric key in deviceTable
- backend stores encrypted secrets in secretTable, with foreign key being userId
- device 2 logs in and request syncing from device 1
- backend sends push notification to device 1
- device 1 accept syncing via push notification
- device 1 encrypt symmetric key with device 2's didexchange
- backend stores encrypted symmetric key in deviceTable associated with device 2
- backend sends push notification to device 2 signifying that it is synced, and send the symmetric key encrypted with device 2's didexchange pkey
- device 2 updates its cache and start pulling data from backend
- from now on, on any change of secrets in device 1, device 2 will be automatically notified by backend and device 2 frontend will update its state.

We require users to manually validate each device for two reasons:

- if it was automatic, that would mean an attacker that successfully login using email address would be able to breach into user's privacy by fetching all of the secrets. That's a pretty weak security measure. It would be less weak if 2FA was implemented, but even so, it wouldn't be secure enough as we deal with sensitive private data.
- it is technically impossible anyway, as the symmetric key on the backend before the push notification is encrypted using device 1's private key that only lives on device 1. device 2 would not be able to decrypt the symmetric key stored on the backend.

**Note that we should add measures to prevent man-in-the-middle attacks, where an attacker tries to phish a user into accepting sharing the symmetric key and syncing data with the attacker's device.** How to do so? Some ideas (though it could probably done in a more user-friendly way):

- sending DID keys (didExchange and didWrite) to user in confirmation email and ask them to verify it is the same as the one on their screen. This is to ensure thast the user is registering their own device's generated keys and not someone else's.
- sending DID keys together with the push notification to device 1, and ask users to verify that it corresponds to the DIDs shown on device 2.

Symmetric key should be encrypted at rest. It should be deleted from frontend on log-out until WebAuthn is supported.

#### Update on the login flow:

solution 1: - add "hasBeenFound" boolean in authAttempt table and update it to true on success on login new device instead of actually logging in, then send "you should request sync" - when trying to authenticate again, if such boolean exist and is true, just respond with "you should request sync". verifyCode should also send that when the boolean is true. - state of "you should request sync" is "verified" or "awaiting syncing" - on successful sync, actually logging in the user and create the record in the tables.

solution 2: - add "isSyncing" boolean in deviceTable - false by default - true on register + logging in with sessionExpiry - login new device => false, sessionExpiry = now and return "you should request sync" - authenticate endpoint should send "you should request sync" if record exists and isSyncing is false. It should respond by "already logged-in" when record exists, sessionExpiry is after now, and isSyncing is true.

==> solution 2 seems to require less change, and is more flexible if ever we need to allow unsynced but logged-in device to perform certain actions.

Note that users should be given the possibility to "recover" their account if they lost all of their devices, meaning that whenever they log in with a new device using their email address and are prompted to sync their device, they can click on "recover account - I lost all my devices". This will result in the backend suspending all the other devices, and the new device to generate a new symmetric key, new secrets, etc.

On recovery, other devices and corresponding secrets/symmetric key will be frozen for 2 weeks and then deleted entirely.

The 2 weeks suspension is put in place in case the "recover" function was used by an attacker that would have taken control over the email address. We provide face-to-face support with existing users to un-recover accounts. This is obviously not scalable and subject to social attacks, so this behaviour will be changed in the future. But we currently have a close enough relationships with our users that we can afford it.

Once 2FA is implemented, the probability that an attacker would succeed at recovering an account would be significantly lower. We would still keep this 2 weeks soft delete period, in case users made a mistake and want to un-recover their account. That's what mainstream apps currently do. But unlike before, for security reasons we will not accept any un-recovering support outside of the built-in un-recovering process.

## Synchronization protocol

### Transport layer

We need a long-running bidirectional protocol, because there are:

- updates from backend to frontend whenever there is a change from another device associated with the same user
- updates from frontend to backend whenever the current frontend changes something

We need reliable packets. Interactions are not particularly data intensive, as verifiable presentations are not part of the exchanged data (see above), so performance should not be a concern.

#### WebTransport (stream packets)

That would have been ideal but it is not supported by Safari browser, while Safari browser is necessary to install PWA on iOS.
This is a deal breaker, so we cannot use WebTransport for now. It will be the long-term solution for sure though.

#### WebSocket

Clearly too low level and cumbersome to manage/scale/etc.

#### Long polling + fetch

Why use long polling when SSE would work?

#### Server-Sent Event (SSE) + fetch

SSE is mature and well supported by browsers.
Modern and performant enough.
Sounds perfect for us until WebTransport has more browser support.

SSE will be used for updates from backend to frontend.
The standard HTTP API will be used for updates from frontend to backend.
