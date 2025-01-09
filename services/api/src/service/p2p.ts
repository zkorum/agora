// import { log } from "@/app.js";
// import { createDecoder, createEncoder, type LightNode } from "@waku/sdk";
// import protobuf from "protobufjs";
//
// const Proof = new protobuf.Type("Proof").add(
//     new protobuf.Field("proof", 1, "string"),
// );
//
// // const ProofWithPayload = new protobuf.Type("ProofWithPayload")
// //     .add(new protobuf.Field("proof", 1, "string"))
// //     .add(new protobuf.Field("payload", 2, "string")); // TODO: expand for each post types
//
// // cannot use a function like this otherwise "as const" and subsequent type inference does not work!
// // function createWakuTopic(name: string): string {
// //     const wakuAppName = "agora";
// //     const wakuAppVersion = "1";
// //     const wakuAppEncoding = "proto";
// //     return `/${wakuAppName}/${wakuAppVersion}/${name}/${wakuAppEncoding}`;
// // }
//
// // see https://docs.waku.org/learn/concepts/content-topics/#naming-format
// const wakuAppName = "agora";
// const wakuAppVersion = "1";
// const wakuAppEncoding = "proto";
// export const WAKU_TOPIC_CREATE_POST =
//     `/${wakuAppName}/${wakuAppVersion}/create-conversation/${wakuAppEncoding}` as const;
// // TODO:
// // export const WAKU_TOPIC_CREATE_POST_WITH_PAYLOAD =
// //     `/${wakuAppName}/${wakuAppVersion}/create-conversation-with-payload/${wakuAppEncoding}` as const;
// export const WAKU_TOPIC_CREATE_COMMENT =
//     `/${wakuAppName}/${wakuAppVersion}/create-comment/${wakuAppEncoding}` as const;
//
// const WAKU_TOPICS = [
//     WAKU_TOPIC_CREATE_POST,
//     WAKU_TOPIC_CREATE_COMMENT,
// ] as const;
// type WakuTopic = (typeof WAKU_TOPICS)[number];
//
// interface BroadcastProps {
//     proof: string;
//     topic: WakuTopic;
//     node: LightNode;
// }
//
// // TODO: stop using this in index.ts and create one function per action - that takes the payload as optional param
// export async function broadcastProof({ proof, node, topic }: BroadcastProps) {
//     const encoder = createEncoder({
//         contentTopic: topic,
//     });
//     const protoMessage = Proof.create({
//         proof: proof,
//     });
//     const serialisedMessage = Proof.encode(protoMessage).finish();
//     if (node.isConnected()) {
//         try {
//             await node.lightPush.send(encoder, {
//                 payload: serialisedMessage,
//             });
//             return {
//                 success: true,
//             };
//         } catch (e) {
//             log.error("Error while trying to lightPush a proof to Waku", e);
//             return {
//                 success: false,
//                 reason: "exception_raised",
//             };
//         }
//     } else {
//         return {
//             success: false,
//             reason: "node_not_connected",
//         };
//     }
// }
