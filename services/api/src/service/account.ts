import { log } from "@/app.js";
import {
    userTable,
    zkPassportTable,
    eventTicketTable,
    phoneTable,
    voteTable,
    opinionTable,
    conversationTable,
} from "@/shared-backend/schema.js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import { nowZeroMs } from "@/shared/util.js";
import { logoutAllDevicesForUser } from "./auth.js";
import { httpErrors } from "@fastify/sensible";
import { MAX_LENGTH_USERNAME } from "@/shared/shared.js";
import { reconcileConversationCounters } from "@/shared-backend/conversationCounters.js";

interface CheckUserNameExistProps {
    db: PostgresJsDatabase;
    username: string;
}

export async function checkUserNameInUse({
    db,
    username,
}: CheckUserNameExistProps): Promise<boolean> {
    const userTableResponse = await db
        .select({})
        .from(userTable)
        .where(eq(userTable.username, username));
    if (userTableResponse.length === 0) {
        return false;
    } else {
        return true;
    }
}

function generateRandomUsername(numPaddingDigits: number) {
    const adjectives = [
        "happy",
        "sad",
        "angry",
        "excited",
        "nervous",
        "brave",
        "calm",
        "curious",
        "eager",
        "fearful",
        "gentle",
        "graceful",
        "joyful",
        "kind",
        "lively",
        "polite",
        "proud",
        "silly",
        "witty",
        "zealous",
        "brisk",
        "jovial",
        "kindly",
        "amused",
        "annoyed",
        "anxious",
        "arrogant",
        "ashamed",
        "attentive",
        "bored",
        "bossy",
        "careful",
        "careless",
        "charming",
        "cheerful",
        "clumsy",
        "confident",
        "confused",
        "content",
        "creative",
        "critical",
        "cruel",
        "daring",
        "decisive",
        "delighted",
        "diligent",
        "efficient",
        "elated",
        "energetic",
        "envious",
        "exhausted",
        "fearless",
        "fierce",
        "generous",
        "grateful",
        "greedy",
        "grumpy",
        "guilty",
        "helpful",
        "honest",
        "hopeful",
        "humble",
        "humorous",
        "impatient",
        "inspired",
        "jealous",
        "lazy",
        "loving",
        "loyal",
        "motivated",
        "naughty",
        "neat",
        "observant",
        "organized",
        "outgoing",
        "patient",
        "peaceful",
        "playful",
        "practical",
        "punctual",
        "quiet",
        "reliable",
        "sarcastic",
        "satisfied",
        "sensitive",
        "serious",
        "shy",
        "sociable",
        "stubborn",
        "talented",
        "tolerant",
        "versatile",
        "vigilant",
    ];

    const colors = [
        "Red",
        "Blue",
        "Green",
        "Yellow",
        "Orange",
        "Purple",
        "Pink",
        "Brown",
        "Black",
        "White",
        "Gray",
        "Cyan",
        "Magenta",
        "Maroon",
        "Olive",
        "Lime",
        "Teal",
        "Navy",
        "Coral",
        "Lavender",
        "Beige",
        "Mint",
        "Peach",
        "Gold",
        "Silver",
        "Bronze",
        "Ivory",
        "Indigo",
        "Violet",
        "Crimson",
        "Scarlet",
        "Emerald",
        "Sapphire",
        "Amber",
        "Ruby",
        "Topaz",
        "Fuchsia",
        "Plum",
        "Mauve",
        "Salmon",
        "Khaki",
        "Mustard",
        "Tangerine",
        "Azure",
        "Cerulean",
        "Burgundy",
        "Cobalt",
        "Copper",
        "Eggplant",
        "Honeydew",
        "Jade",
        "Lilac",
        "Mahogany",
        "Moss",
        "Ochre",
        "Papaya",
        "Pear",
        "Pine",
        "Raspberry",
        "Rose",
        "Sand",
        "Seafoam",
        "Slate",
        "Sunflower",
        "Tawny",
        "Thistle",
        "Umber",
        "Vanilla",
        "Wheat",
        "Wine",
        "Zaffre",
        "Amethyst",
        "Blush",
        "Carmine",
        "Denim",
        "Ecru",
        "Fern",
        "Ginger",
        "Hazel",
        "Jasmine",
        "Lemon",
        "Mango",
        "Nectarine",
        "Opal",
        "Quartz",
        "Raven",
        "Saffron",
        "BurlyWood",
        "CadetBlue",
        "Chocolate",
        "Cornsilk",
        "DarkBlue",
        "DarkCyan",
        "Bisque",
        "FireBrick",
        "HotPink",
        "Rust",
        "Sunset",
        "Turquoise",
        "Linen",
        "Daffodil",
        "Tan",
        "Cinnamon",
        "Peru",
        "Cherry",
        "Poppy",
        "Tomato",
        "Marigold",
        "Pinecone",
        "Snow",
        "SkyBlue",
        "Zinc",
    ];

    const animals = [
        "Lion",
        "Tiger",
        "Elephant",
        "Giraffe",
        "Zebra",
        "Kangaroo",
        "Panda",
        "Koala",
        "Penguin",
        "Dolphin",
        "Whale",
        "Shark",
        "Octopus",
        "Jellyfish",
        "Starfish",
        "Seahorse",
        "Turtle",
        "Crocodile",
        "Alligator",
        "Snake",
        "Lizard",
        "Frog",
        "Toad",
        "Rabbit",
        "Hare",
        "Squirrel",
        "Chipmunk",
        "Beaver",
        "Otter",
        "Raccoon",
        "Fox",
        "Wolf",
        "Bear",
        "Deer",
        "Moose",
        "Elk",
        "Bison",
        "Buffalo",
        "Horse",
        "Donkey",
        "Camel",
        "Llama",
        "Alpaca",
        "Goat",
        "Sheep",
        "Cow",
        "Pig",
        "Chicken",
        "Duck",
        "Goose",
        "Turkey",
        "Peacock",
        "Parrot",
        "Sparrow",
        "Robin",
        "Eagle",
        "Hawk",
        "Falcon",
        "Owl",
        "Bat",
        "Butterfly",
        "Bee",
        "Ant",
        "Spider",
        "Scorpion",
        "Crab",
        "Lobster",
        "Shrimp",
        "Clam",
        "Oyster",
        "Snail",
        "Slug",
        "Worm",
        "Moth",
        "Dragonfly",
        "Cricket",
        "Beetle",
        "Ladybug",
        "Firefly",
        "Centipede",
        "Millipede",
        "Mole",
        "Hedgehog",
        "Porcupine",
        "Armadillo",
        "Skunk",
        "Badger",
        "Weasel",
        "Ferret",
        "Mongoose",
        "Meerkat",
        "Hyena",
        "Jackal",
        "Cheetah",
        "Leopard",
        "Jaguar",
        "Cougar",
        "Lynx",
    ];

    const plants = [
        "AloeVera",
        "Cactus",
        "Tulip",
        "Lily",
        "Rose",
        "Fern",
        "Daisy",
        "Iris",
        "Pine",
        "Mint",
        "Basil",
        "Clover",
        "Thyme",
        "Orchid",
        "Peony",
        "Violet",
        "Sage",
        "Sunset",
        "Fuchsia",
        "Zinnia",
        "Begonia",
        "Cypress",
        "Mimosa",
        "Azalea",
        "Geranium",
        "Lotus",
        "Bamboo",
        "Cress",
        "Freesia",
        "Poppy",
        "Anemone",
        "Jasmine",
        "Tuberose",
        "Cabbage",
        "Kale",
        "Oregano",
        "Bayleaf",
        "Aster",
        "Ivy",
        "Primrose",
        "Maranta",
        "Pansy",
        "Cotton",
        "Jade",
        "Lobelia",
        "Pinecone",
        "Sedum",
        "Cineraria",
        "Heliconia",
        "Lantana",
        "Fennel",
        "Calendula",
        "Bromeliad",
        "Vinca",
        "Pothos",
        "Chives",
        "Coleus",
        "Dracaena",
        "Gerbera",
        "Wisteria",
        "Yucca",
        "Zebra",
        "Coriander",
        "Lavender",
        "Chili",
        "Tomato",
        "Radish",
        "Cucumber",
        "Pepper",
        "Papaya",
        "Oats",
        "Ginger",
        "Taro",
        "Mango",
        "Lemon",
        "Saffron",
        "Lavandula",
        "Dahlia",
        "Rhubarb",
        "Aubergine",
        "Calla",
        "Wormwood",
        "Aloe",
        "Succulent",
        "Sunflower",
        "Amaryllis",
        "Hops",
        "Mandarin",
        "Kiwifruit",
        "Petunia",
        "Rosemary",
        "Dandelion",
        "Zucchini",
        "Lettuce",
        "Cilantro",
        "Cyclamen",
        "Squash",
        "Pineapple",
        "Daffodil",
    ];

    const getRandomWord = (wordList: string[]) => {
        return wordList[
            Math.floor(Math.random() * wordList.length)
        ].toLowerCase();
    };

    const generateNumberString = (length: number) => {
        let result = "";
        const characters = "0123456789";
        const charactersLength = characters.length;
        for (let i = 0; i < length; i++) {
            result += characters.charAt(
                Math.floor(Math.random() * charactersLength),
            );
        }
        return result;
    };

    let generatedUsername;
    const randomChoice = Math.floor(Math.random() * 4);
    if (randomChoice === 0) {
        generatedUsername =
            getRandomWord(adjectives) + "_" + getRandomWord(animals);
    } else if (randomChoice === 1) {
        generatedUsername =
            getRandomWord(adjectives) + "_" + getRandomWord(plants);
    } else if (randomChoice === 2) {
        generatedUsername =
            getRandomWord(colors) + "_" + getRandomWord(animals);
    } else {
        generatedUsername = getRandomWord(colors) + "_" + getRandomWord(plants);
    }

    if (numPaddingDigits > 0) {
        generatedUsername += "_" + generateNumberString(numPaddingDigits);
    }

    if (generatedUsername.length <= MAX_LENGTH_USERNAME) {
        return generatedUsername;
    } else {
        throw new Error(
            "Failed to generate random username. The generated username is too long: " +
                generatedUsername,
        );
    }
}

interface GenerateUnusedRandomUsernameProps {
    db: PostgresJsDatabase;
}

export async function generateUnusedRandomUsername({
    db,
}: GenerateUnusedRandomUsernameProps) {
    let unusedUsername = "";
    let foundUnusedUsername = false;
    for (let i = 0; i < 10; i++) {
        try {
            const newUsername = generateRandomUsername(i);
            const isInUse = await checkUserNameInUse({
                db: db,
                username: newUsername,
            });
            if (!isInUse) {
                unusedUsername = newUsername;
                foundUnusedUsername = true;
                break;
            }
        } catch (error) {
            log.warn(
                "Random username generation failed with numeric padding: " +
                    i.toString(),
            );
            log.warn(error);
            // try again twice without increasing padding
            try {
                const newUsername = generateRandomUsername(i);
                const isInUse = await checkUserNameInUse({
                    db: db,
                    username: newUsername,
                });
                if (!isInUse) {
                    unusedUsername = newUsername;
                    foundUnusedUsername = true;
                    break;
                }
            } catch (e) {
                try {
                    log.warn(
                        "Random username generation failed with numeric padding: " +
                            i.toString(),
                    );
                    log.warn(e);
                    const newUsername = generateRandomUsername(i);
                    const isInUse = await checkUserNameInUse({
                        db: db,
                        username: newUsername,
                    });
                    if (!isInUse) {
                        unusedUsername = newUsername;
                        foundUnusedUsername = true;
                        break;
                    }
                } catch (err) {
                    log.warn(
                        "Random username generation failed with numeric padding: " +
                            i.toString(),
                    );
                    log.warn(err);
                }
            }
        }
    }

    if (!foundUnusedUsername) {
        throw httpErrors.internalServerError(
            "Failed to generate a unique username",
        );
    }

    return unusedUsername;
}

interface SubmitUsernameChangeProps {
    db: PostgresJsDatabase;
    username: string;
    userId: string;
}

export async function submitUsernameChange({
    db,
    username,
    userId,
}: SubmitUsernameChangeProps) {
    // Check if the username is available
    const isInUse = await checkUserNameInUse({
        db: db,
        username: username,
    });
    if (isInUse) {
        throw httpErrors.badRequest("The requested username is already in use");
    }

    const userTableResponse = await db
        .update(userTable)
        .set({
            username: username,
            updatedAt: nowZeroMs(),
        })
        .where(eq(userTable.id, userId))
        .returning({ userId: userTable.id });
    if (userTableResponse.length != 1) {
        throw httpErrors.internalServerError(
            "Failed to update the user table with the new username",
        );
    }
}

interface DeleteAccountProps {
    db: PostgresJsDatabase;
    userId: string;
}

export async function deleteUserAccount({ db, userId }: DeleteAccountProps) {
    // TODO: 1. confirmation should be requested upon account deletion request (phone number or ZKP)
    // 2. proof should be recorded once only
    // delay should be given for people to recover their account - so data should not be set to be deleted immediately even though it should immediately not show on the client anymore
    // 3. old proofs should be set to be deleted as well, except the deletion proof and the proofs binding the devices together
    // 4. conversation deletion should not necessarily delete other people's opinion
    // 5. opinion deletion should not necessarily delete other people's replies
    await db.transaction(async (tx) => {
        const updatedUserTableResponse = await tx
            .update(userTable)
            .set({
                isDeleted: true,
                deletedAt: nowZeroMs(),
                updatedAt: nowZeroMs(),
            })
            .where(eq(userTable.id, userId))
            .returning({ id: userTable.id });

        if (updatedUserTableResponse.length != 1) {
            log.error(
                "User table update has an invalid number of affected rows: " +
                    userId,
            );
            tx.rollback();
        }

        // Update denormalized isDeleted flag in credential tables
        await tx
            .update(zkPassportTable)
            .set({ isDeleted: true, updatedAt: nowZeroMs() })
            .where(eq(zkPassportTable.userId, userId));

        await tx
            .update(eventTicketTable)
            .set({ isDeleted: true, updatedAt: nowZeroMs() })
            .where(eq(eventTicketTable.userId, userId));

        await tx
            .update(phoneTable)
            .set({ isDeleted: true, updatedAt: nowZeroMs() })
            .where(eq(phoneTable.userId, userId));

        // Don't delete votes/opinions/conversations - use soft-delete pattern
        // Queries already filter by user.isDeleted, so content will be hidden automatically

        // Get all conversations where user participated (voted, commented, or posted)
        const conversationIdsSet = new Set<number>();

        log.info(
            `[Account] Finding affected conversations for deleted user: ${userId}`,
        );

        // From votes - get opinions they voted on, then extract conversationId
        log.info(`[Account] Querying votes for user: ${userId}`);
        const votedOpinions = await tx
            .select()
            .from(voteTable)
            .innerJoin(opinionTable, eq(voteTable.opinionId, opinionTable.id))
            .where(eq(voteTable.authorId, userId));
        log.info(`[Account] Found ${String(votedOpinions.length)} votes`);
        votedOpinions.forEach((row) =>
            conversationIdsSet.add(row.opinion.conversationId),
        );

        // From opinions
        log.info(`[Account] Querying opinions for user: ${userId}`);
        const userOpinions = await tx
            .select()
            .from(opinionTable)
            .where(eq(opinionTable.authorId, userId));
        log.info(`[Account] Found ${String(userOpinions.length)} opinions`);
        userOpinions.forEach((opinion) =>
            conversationIdsSet.add(opinion.conversationId),
        );

        // From conversations (as author)
        log.info(`[Account] Querying conversations for user: ${userId}`);
        const userConversations = await tx
            .select()
            .from(conversationTable)
            .where(eq(conversationTable.authorId, userId));
        log.info(`[Account] Found ${String(userConversations.length)} conversations`);
        userConversations.forEach((conversation) =>
            conversationIdsSet.add(conversation.id),
        );

        log.info(
            `[Account] Total affected conversations: ${String(conversationIdsSet.size)}`,
        );

        // Reconcile counters for each affected conversation
        // This recalculates counts (excluding deleted user) and enqueues math updates
        for (const conversationId of conversationIdsSet) {
            log.info(
                `[Account] Reconciling counters for conversation: ${String(conversationId)}`,
            );
            await reconcileConversationCounters({ db: tx, conversationId });
        }

        log.info(
            `[Account] Completed counter reconciliation for user: ${userId}`,
        );

        await logoutAllDevicesForUser(tx, userId);
    });
}
