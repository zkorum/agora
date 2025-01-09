import { log } from "@/app.js";
import { userTable } from "@/schema.js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import { getUserComments, getUserPosts } from "./user.js";
import { deleteCommentBySlugId } from "./comment.js";
import { deletePostBySlugId } from "./post.js";
import { nowZeroMs } from "@/shared/common/util.js";
import { logout } from "./auth.js";
import { httpErrors } from "@fastify/sensible";
import { MAX_LENGTH_USERNAME } from "@/shared/shared.js";

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
        "mysterious",
        "polite",
        "proud",
        "silly",
        "thoughtful",
        "witty",
        "zealous",
        "adventurous",
        "affectionate",
        "ambitious",
        "amused",
        "annoyed",
        "anxious",
        "arrogant",
        "ashamed",
        "astonished",
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
        "considerate",
        "content",
        "courageous",
        "creative",
        "critical",
        "cruel",
        "curious",
        "daring",
        "decisive",
        "delighted",
        "determined",
        "diligent",
        "disappointed",
        "disgusted",
        "distracted",
        "eager",
        "efficient",
        "elated",
        "embarrassed",
        "energetic",
        "enthusiastic",
        "envious",
        "exhausted",
        "fascinated",
        "fearless",
        "fierce",
        "frustrated",
        "generous",
        "gentle",
        "grateful",
        "greedy",
        "grumpy",
        "guilty",
        "happy",
        "helpful",
        "honest",
        "hopeful",
        "humble",
        "humorous",
        "impatient",
        "independent",
        "indifferent",
        "inquisitive",
        "inspired",
        "intelligent",
        "jealous",
        "jovial",
        "joyful",
        "kindhearted",
        "lazy",
        "lonely",
        "loving",
        "loyal",
        "mischievous",
        "motivated",
        "naughty",
        "neat",
        "nervous",
        "observant",
        "optimistic",
        "organized",
        "outgoing",
        "passionate",
        "patient",
        "peaceful",
        "perceptive",
        "persistent",
        "pessimistic",
        "playful",
        "polite",
        "practical",
        "proud",
        "punctual",
        "quiet",
        "reliable",
        "resourceful",
        "respectful",
        "responsible",
        "sarcastic",
        "satisfied",
        "sensitive",
        "serious",
        "shy",
        "sincere",
        "sociable",
        "spontaneous",
        "stubborn",
        "sympathetic",
        "talented",
        "thoughtful",
        "tolerant",
        "trustworthy",
        "understanding",
        "unpredictable",
        "versatile",
        "vigilant",
        "warmhearted",
        "witty",
        "zealous",
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
        "Turquoise",
        "Lavender",
        "Beige",
        "Mint",
        "Peach",
        "Gold",
        "Silver",
        "Bronze",
        "Ivory",
        "Charcoal",
        "Indigo",
        "Violet",
        "Crimson",
        "Scarlet",
        "Emerald",
        "Sapphire",
        "Amber",
        "Ruby",
        "Topaz",
        "Aquamarine",
        "Periwinkle",
        "Fuchsia",
        "Plum",
        "Mauve",
        "Salmon",
        "Khaki",
        "Mustard",
        "Tangerine",
        "Azure",
        "Cerulean",
        "Chartreuse",
        "Burgundy",
        "Cobalt",
        "Copper",
        "Eggplant",
        "ForestGreen",
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
        "Ivory",
        "Jasmine",
        "Lemon",
        "Mango",
        "Nectarine",
        "Opal",
        "Quartz",
        "Raven",
        "Saffron",
        "Tangerine",
        "Ultramarine",
        "Verdigris",
        "Wisteria",
        "Xanadu",
        "YellowGreen",
        "Aqua",
        "Bisque",
        "BlanchedAlmond",
        "BlueViolet",
        "BurlyWood",
        "CadetBlue",
        "Chartreuse",
        "Chocolate",
        "CornflowerBlue",
        "Cornsilk",
        "DarkBlue",
        "DarkCyan",
        "DarkGoldenRod",
        "DarkGray",
        "DarkGreen",
        "DarkKhaki",
        "DarkMagenta",
        "DarkOliveGreen",
        "DarkOrange",
        "DarkOrchid",
        "DarkRed",
        "DarkSalmon",
        "DarkSeaGreen",
        "DarkSlateBlue",
        "DarkSlateGray",
        "DarkTurquoise",
        "DarkViolet",
        "DeepPink",
        "DeepSkyBlue",
        "DimGray",
        "DodgerBlue",
        "FireBrick",
        "FloralWhite",
        "ForestGreen",
        "Gainsboro",
        "GhostWhite",
        "Gold",
        "GoldenRod",
        "GreenYellow",
        "HoneyDew",
        "HotPink",
        "IndianRed",
        "Ivory",
        "Khaki",
        "LavenderBlush",
        "LawnGreen",
        "LemonChiffon",
        "LightBlue",
        "LightCoral",
        "LightCyan",
        "LightGoldenRodYellow",
        "LightGray",
        "LightGreen",
        "LightPink",
        "LightSalmon",
        "LightSeaGreen",
        "LightSkyBlue",
        "LightSlateGray",
        "LightSteelBlue",
        "LightYellow",
        "LimeGreen",
        "Linen",
        "MediumAquaMarine",
        "MediumBlue",
        "MediumOrchid",
        "MediumPurple",
        "MediumSeaGreen",
        "MediumSlateBlue",
        "MediumSpringGreen",
        "MediumTurquoise",
        "MediumVioletRed",
        "MidnightBlue",
        "MintCream",
        "MistyRose",
        "Moccasin",
        "NavajoWhite",
        "OldLace",
        "OliveDrab",
        "OrangeRed",
        "Orchid",
        "PaleGoldenRod",
        "PaleGreen",
        "PaleTurquoise",
        "PaleVioletRed",
        "PapayaWhip",
        "PeachPuff",
        "Peru",
        "PowderBlue",
        "RebeccaPurple",
        "RosyBrown",
        "RoyalBlue",
        "SaddleBrown",
        "SandyBrown",
        "SeaGreen",
        "SeaShell",
        "Sienna",
        "SkyBlue",
        "SlateBlue",
        "SlateGray",
        "Snow",
        "SpringGreen",
        "SteelBlue",
        "Tan",
        "Tomato",
        "Turquoise",
        "VioletRed",
        "Wheat",
        "WhiteSmoke",
        "YellowGreen",
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
        "Grasshopper",
        "Cricket",
        "Beetle",
        "Ladybug",
        "Firefly",
        "Caterpillar",
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

    let generatedUsername =
        getRandomWord(adjectives) +
        "_" +
        getRandomWord(colors) +
        "_" +
        getRandomWord(animals);

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
    proof: string;
    didWrite: string;
    userId: string;
}

export async function deleteUserAccount({
    db,
    userId,
    proof,
    didWrite,
}: DeleteAccountProps) {
    // TODO: 1. confirmation should be requested upon account deletion request (phone number or ZKP)
    // 2. proof should be recorded once only
    // delay should be given for people to recover their account - so data should not be set to be deleted immediately even though it should immediately not show on the client anymore
    // 3. old proofs should be set to be deleted as well, except the deletion proof and the proofs binding the devices together
    // 4. conversation deletion should not necessarily delete other people's opinion
    // 5. opinion deletion should not necessarily delete other people's replies
    try {
        await db.transaction(async (tx) => {
            const updatedUserTableResponse = await tx
                .update(userTable)
                .set({
                    isDeleted: true,
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

            // Delete user comments
            const userComments = await getUserComments({
                db: tx,
                userId: userId,
                lastCommentSlugId: undefined,
            });
            for (const comment of userComments) {
                await deleteCommentBySlugId({
                    proof: proof,
                    commentSlugId: comment.commentItem.commentSlugId,
                    db: tx,
                    didWrite: didWrite,
                    userId: userId,
                });
            }

            // Delete user posts
            const userPosts = await getUserPosts({
                db: tx,
                userId: userId,
                lastPostSlugId: undefined,
            });
            for (const post of userPosts) {
                await deletePostBySlugId({
                    proof: proof,
                    db: tx,
                    didWrite: didWrite,
                    postSlugId: post.metadata.postSlugId,
                    userId: userId,
                });
            }

            await logout(tx, didWrite);
        });
    } catch (err: unknown) {
        log.error(err);
        throw httpErrors.internalServerError("Failed to delete user account");
    }
}
