import { log } from "@/app.js";
import {
    userTable,
    zkPassportTable,
    phoneTable,
    emailTable,
} from "@/shared-backend/schema.js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { and, eq, sql } from "drizzle-orm";
import { getPrimaryDatabase } from "@/shared-backend/db.js";
import { nowZeroMs } from "@/shared/util.js";
import { revokeAllSessionsWithinTransaction } from "./authSession.js";
import { httpErrors } from "@fastify/sensible";
import { MAX_LENGTH_USERNAME } from "@/shared/shared.js";
import { lockAccountConversations } from "@/shared-backend/accountContributions.js";
import { cancelPendingOpinionTranslationWorkForUser } from "@/shared-backend/contentTranslationWork.js";
import { applyAccountLiveInputChange } from "./accountLiveInputs.js";
import { retireAccountDefaultResources } from "./accountOrganizationLifecycle.js";
import type { Dto } from "@/shared/types/dto.js";
import type { z } from "zod";

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

export async function deleteUserAccount({
    db,
    userId,
}: DeleteAccountProps): Promise<z.infer<typeof Dto.deleteUserAccountResponse>> {
    return await getPrimaryDatabase(db).transaction(async (tx) => {
        const activeUsers = await tx
            .select({ id: userTable.id })
            .from(userTable)
            .where(
                and(eq(userTable.id, userId), eq(userTable.isDeleted, false)),
            )
            .for("no key update");
        // Repeated requests preserve the original deletion time and input generation.
        if (activeUsers.length === 0) return { success: true };
        // Account/source triggers acquire AI/scoring fences. Conversation locks
        // must precede that mutation, matching statement edits and vote persistence.
        await lockAccountConversations({ db: tx, userId });
        const resources = await retireAccountDefaultResources({
            db: tx,
            userId,
        });
        if (!resources.success) return resources;
        const now = resources.now;
        const recoverableUntil = new Date(
            now.getTime() + 15 * 24 * 60 * 60 * 1000,
        );
        await tx
            .update(userTable)
            .set({
                isDeleted: true,
                contributionRevision: sql`${userTable.contributionRevision} + 1`,
                deletedAt: now,
                deletionReason: "account_deletion",
                deletionRequestedAt: now,
                recoverableUntil,
                updatedAt: now,
            })
            .where(eq(userTable.id, userId));

        // Update denormalized isDeleted flag in credential tables
        await tx
            .update(zkPassportTable)
            .set({ isDeleted: true, reservedForRecovery: true, updatedAt: now })
            .where(
                and(
                    eq(zkPassportTable.userId, userId),
                    eq(zkPassportTable.isDeleted, false),
                ),
            );

        await tx
            .update(phoneTable)
            .set({ isDeleted: true, reservedForRecovery: true, updatedAt: now })
            .where(
                and(
                    eq(phoneTable.userId, userId),
                    eq(phoneTable.isDeleted, false),
                ),
            );

        await tx
            .update(emailTable)
            .set({ isDeleted: true, reservedForRecovery: true, updatedAt: now })
            .where(
                and(
                    eq(emailTable.userId, userId),
                    eq(emailTable.isDeleted, false),
                ),
            );

        await cancelPendingOpinionTranslationWorkForUser({
            db: tx,
            userId,
            now,
        });

        await applyAccountLiveInputChange({
            db: tx,
            userId,
            change: { type: "hide", hiddenAt: now },
        });
        await revokeAllSessionsWithinTransaction({
            db: tx,
            userId,
            now,
            reason: "account_deleted",
        });
        return { success: true };
    });
}
