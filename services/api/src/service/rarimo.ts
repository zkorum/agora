// This file, along with the integration of the Rarimo protocol into Agora, was originally developed with funding from the European Union’s Horizon Europe 2020 research and innovation program, as part of the NGI SARGASSO project under grant agreement No. 101092887.

import { deviceTable, zkPassportTable } from "@/shared-backend/schema.js";
import type {
    GenerateVerificationLink200,
    VerifyUserStatusAndAuthenticate200,
} from "@/shared/types/dto.js";
import {
    type LinkType,
    type RarimoStatusAttributes,
    zodZKProof,
    zodStatusResponse,
} from "@/shared/types/zod.js";
import { type AxiosInstance } from "axios";
import { type PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import { nowZeroMs } from "@/shared/util.js";
import {
    getZKPAuthenticationType,
    loginKnownDeviceWithZKP,
    loginNewDeviceWithZKP,
    registerWithZKP,
} from "@/service/auth.js";
import * as authUtilService from "@/service/authUtil.js";
import { decimalToHex, hexToUtf8 } from "@/utils/dataStructure.js";
import { log } from "@/app.js";
import { mergeGuestIntoVerifiedUser } from "./merge.js";
import { httpErrors } from "@fastify/sensible";

interface IsLoggedInOrExistsAndAssociatedWithNoNullifierProps {
    db: PostgresDatabase;
    didWrite: string;
    now: Date;
}

interface GenerateVerificationLinkProps {
    db: PostgresDatabase;
    didWrite: string;
    axiosVerificatorSvc: AxiosInstance;
    baseEventId: string;
    linkType: LinkType;
}

// Representing the LinksAttributes structure
interface LinksAttributes {
    // Returns proof-parameters and callback_url
    get_proof_params: string;
}

// Representing the Links structure
interface Links {
    key: string; // Assuming "Key" maps to a string or could be replaced with a more specific type.
    attributes: LinksAttributes;
}

// Representing the VerificationLinksResponse structure
export interface VerificationLinksResponse {
    data: Links;
}

// ProofData represents the SnarkJS library result of proof generation
interface ProofData {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
    protocol: string;
}

// ZKProof is proof data with public signals
interface ZKProof {
    proof: ProofData;
    pub_signals: string[];
}

interface UserParamsAttributes {
    // Lower user age limit
    proof: ZKProof;
}

interface UserParams {
    attributes: UserParamsAttributes;
}

interface UserParamsRequest {
    data: UserParams;
}

interface GetUserProofProps {
    didWrite: string;
    axiosVerificatorSvc: AxiosInstance;
}

interface GetUserProofReturn {
    nationality: string;
    nullifier: string;
    sex: string;
}

interface StatusAttributes {
    status: RarimoStatusAttributes;
}

interface Status {
    attributes: StatusAttributes;
}

interface StatusResponse {
    data: Status;
}

interface VerifyUserStatusProps {
    db: PostgresDatabase;
    didWrite: string;
    axiosVerificatorSvc: AxiosInstance;
    userAgent: string;
}

export async function isLoggedInOrExistsAndAssociatedWithNoNullifier({
    db,
    didWrite,
    now,
}: IsLoggedInOrExistsAndAssociatedWithNoNullifierProps): Promise<
    "already_logged_in" | "associated_with_another_user" | undefined
> {
    const result = await db
        .select({
            userId: deviceTable.userId,
            sessionExpiry: deviceTable.sessionExpiry,
            nullifier: zkPassportTable.nullifier,
        })
        .from(deviceTable)
        .leftJoin(
            zkPassportTable,
            eq(deviceTable.userId, zkPassportTable.userId),
        )
        .where(eq(deviceTable.didWrite, didWrite));

    log.info(`[Rarimo] isLoggedInOrExistsAndAssociatedWithNoNullifier - found ${String(result.length)} device entries`);

    if (result.length !== 0) {
        // device was registered
        const resultLoggedIn = result.find((r) => r.sessionExpiry > now);
        if (resultLoggedIn !== undefined) {
            log.info(`[Rarimo] Device is already logged in - returning already_logged_in`);
            return "already_logged_in";
        }
        // NOTE: Removed the "associated_with_another_user" check here to allow guest users
        // (with no nullifier) to proceed with ZKP verification. The proper authentication
        // type determination (including merge logic) will happen in getZKPAuthenticationType.
        // The "associated_with_another_user" case is properly handled later in the flow when
        // we detect a genuine conflict between two verified users.
    }
    log.info(`[Rarimo] Returning undefined - proceeding with authentication flow`);
}

export async function generateVerificationLink({
    db,
    didWrite,
    axiosVerificatorSvc,
    baseEventId,
    linkType,
}: GenerateVerificationLinkProps): Promise<GenerateVerificationLink200> {
    const now = nowZeroMs();
    //TODO: move this to controller's verifyUCAN
    const deviceStatus = await isLoggedInOrExistsAndAssociatedWithNoNullifier({
        db,
        didWrite,
        now,
    });
    if (deviceStatus !== undefined) {
        return {
            success: false,
            reason: deviceStatus,
        };
    }
    const getVerificationLinkUrl =
        "/integrations/verificator-svc/private/verification-link";
    const userId = didWrite;
    const body = {
        data: {
            id: userId,
            type: "user",
            attributes: {
                age_lower_bound: 16,
                uniqueness: true,
                nationality_check: true,
                event_id: baseEventId,
                sex: true,
            },
        },
    };
    const response = await axiosVerificatorSvc.post<VerificationLinksResponse>(
        getVerificationLinkUrl,
        body,
        {
            headers: {
                "Content-Type": "application/json",
            },
        },
    );
    const protocolType =
        linkType === "deep" ? "rarime://" : "https://app.rarime.com/";
    const proofParams = response.data.data.attributes.get_proof_params;
    return {
        success: true,
        verificationLink: `${protocolType}external?type=proof-request&proof_params_url=${proofParams}`,
    };
}

// see https://github.com/rarimo/passport-zk-circuits?tab=readme-ov-file#query-circuit-public-signals
function extractDataFromPubSignals(pubSignals: string[]): GetUserProofReturn {
    // Validate array bounds before accessing elements
    // Based on Rarimo circuit spec: requires at least 8 elements
    const REQUIRED_PUB_SIGNALS_LENGTH = 8;

    if (pubSignals.length < REQUIRED_PUB_SIGNALS_LENGTH) {
        log.error(
            {
                actualLength: pubSignals.length,
                requiredLength: REQUIRED_PUB_SIGNALS_LENGTH,
            },
            "[Rarimo] Invalid pub_signals array - insufficient elements",
        );
        throw httpErrors.badRequest(
            `Invalid proof: pub_signals array has ${String(pubSignals.length)} elements, expected at least ${String(REQUIRED_PUB_SIGNALS_LENGTH)}`,
        );
    }

    return {
        nationality: hexToUtf8(decimalToHex(pubSignals[6])),
        nullifier: decimalToHex(pubSignals[0]),
        sex: hexToUtf8(decimalToHex(pubSignals[7])),
    };
}

async function getUserProof({
    didWrite,
    axiosVerificatorSvc,
}: GetUserProofProps): Promise<GetUserProofReturn> {
    const getUserProofUrl = `/integrations/verificator-svc/private/proof/${didWrite}`;
    const response =
        await axiosVerificatorSvc.get<UserParamsRequest>(getUserProofUrl);
    const userParamsRequest: UserParamsRequest = response.data;

    // Validate proof structure with Zod before processing
    const validationResult = zodZKProof.safeParse(
        userParamsRequest.data.attributes.proof,
    );
    if (!validationResult.success) {
        log.error(
            { error: validationResult.error, didWrite },
            "[Rarimo] Invalid proof structure from verification service",
        );
        throw httpErrors.badRequest(
            "Invalid proof data received from verification service",
        );
    }

    const extractedData = extractDataFromPubSignals(
        validationResult.data.pub_signals,
    );
    return extractedData;
}

export async function verifyUserStatusAndAuthenticate({
    db,
    didWrite,
    axiosVerificatorSvc,
    userAgent,
}: VerifyUserStatusProps): Promise<VerifyUserStatusAndAuthenticate200> {
    const now = nowZeroMs();
    // TODO: move this check to verifyUCAN directly in the controller:
    const badStatusReason =
        await isLoggedInOrExistsAndAssociatedWithNoNullifier({
            db,
            didWrite,
            now,
        });
    if (badStatusReason !== undefined) {
        return {
            success: false,
            reason: badStatusReason,
        };
    }
    const verifyUserStatusUrl = `/integrations/verificator-svc/private/verification-status/${didWrite}`;
    const response =
        await axiosVerificatorSvc.get<StatusResponse>(verifyUserStatusUrl);

    // Validate status response structure with Zod before processing
    const validationResult = zodStatusResponse.safeParse(response.data);
    if (!validationResult.success) {
        log.error(
            { error: validationResult.error, didWrite },
            "[Rarimo] Invalid status response from verification service",
        );
        throw httpErrors.badRequest(
            "Invalid status data received from verification service",
        );
    }

    const rarimoStatus = validationResult.data.data.attributes.status;
    if (rarimoStatus !== "verified") {
        return {
            success: true,
            rarimoStatus,
            accountMerged: false,
        };
    }
    // retrieve the user attributes
    const { nationality, sex, nullifier } = await getUserProof({
        didWrite,
        axiosVerificatorSvc,
    });
    const deviceStatus = await authUtilService.getDeviceStatus({
        db,
        didWrite,
        now,
    });
    const authResult = await getZKPAuthenticationType({
        db,
        nullifier,
        didWrite,
        deviceStatus,
    });
    // log-in or register depending on the state
    const loginSessionExpiry = new Date(now);
    loginSessionExpiry.setFullYear(loginSessionExpiry.getFullYear() + 1000);
    let accountMerged = false;

    // Wrap all operations in transaction to ensure atomicity
    // This prevents session corruption if device update fails after merge
    await db.transaction(async (tx) => {
        switch (authResult.type) {
            case "associated_with_another_user":
                // No database operations needed, handled outside transaction
                break;
            case "register":
                // const parsedCitizenship = zodCountryCodeEnum.safeParse(nationality);
                // if (!parsedCitizenship.success) {
                //     throw httpErrors.internalServerError(
                //         `Received nationality ${nationality} is not part of expected enum`,
                //     );
                // }
                await registerWithZKP({
                    db: tx,
                    didWrite,
                    citizenship: nationality,
                    nullifier,
                    sex: sex,
                    userAgent,
                    userId: authResult.userId,
                    sessionExpiry: loginSessionExpiry,
                });
                break;
            case "login_known_device":
                await loginKnownDeviceWithZKP({
                    db: tx,
                    didWrite,
                    now,
                    sessionExpiry: loginSessionExpiry,
                });
                break;
            case "login_new_device":
                await loginNewDeviceWithZKP({
                    db: tx,
                    didWrite,
                    userId: authResult.userId,
                    userAgent,
                    sessionExpiry: loginSessionExpiry,
                });
                break;
            case "merge":
                await mergeGuestIntoVerifiedUser({
                    db: tx,
                    verifiedUserId: authResult.toUserId,
                    guestUserId: authResult.fromUserId,
                });
                await tx
                    .update(deviceTable)
                    .set({
                        userId: authResult.toUserId,
                        sessionExpiry: loginSessionExpiry,
                        updatedAt: now,
                    })
                    .where(eq(deviceTable.didWrite, didWrite));
                log.info(
                    {
                        toUserId: authResult.toUserId,
                        fromUserId: authResult.fromUserId,
                    },
                    "[Rarimo] Merged guest into target user and updated device",
                );
                accountMerged = true;
                break;
        }
    });

    if (authResult.type === "associated_with_another_user") {
        return { success: false, reason: "associated_with_another_user" };
    }

    // Extract userId based on auth result type
    const userId =
        authResult.type === "merge" ? authResult.toUserId : authResult.userId;

    return { success: true, rarimoStatus, accountMerged, userId };
}
