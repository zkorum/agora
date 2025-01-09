package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"

	"github.com/waku-org/go-waku/waku/v2/node"
	"github.com/waku-org/go-waku/waku/v2/protocol"
	"github.com/waku-org/go-waku/waku/v2/protocol/pb"
	"github.com/waku-org/go-waku/waku/v2/utils"
	"google.golang.org/protobuf/proto"
)

func main() {
	// Create a logger with contextual fields
	log := slog.New(slog.NewTextHandler(os.Stdout, nil)).With(
		slog.String("app", "@zkorum/agora-broadcast"),
		slog.String("env", "production"),
	)

	// TODO: load agora's private key
	wakuNode, err := node.New(node.WithLightPush() /*, node.WithPrivateKey(prvKey) */)
	if err != nil {
		log.Error("Exiting: error while loading new Waku node", err)
		os.Exit(1)
	}

	if err := wakuNode.Start(context.Background()); err != nil {
		log.Error("Exiting: error while starting Waku node", err)
		os.Exit(1)
	}
	// TODO: more content topics, better typing descriptions
	cTopic, err := protocol.NewContentTopic("agora", "1", "proof", "proto")
	if err != nil {
		log.Error("Exiting: invalid contentTopic", err)
		os.Exit(1)
	}
	contentTopic := cTopic.String()

	msg := &pb.WakuMessage{
		Payload:      []byte("Hello World"),
		Version:      proto.Uint32(1),
		ContentTopic: contentTopic,
		Timestamp:    utils.GetUnixEpoch(),
	}

	msgId, err := wakuNode.Lightpush().Publish(context.Background(), msg)
	fmt.Printf("%s\n", msgId)
	if err != nil {
		log.Error("Error while pushing message to Waku", err)
	}
}
