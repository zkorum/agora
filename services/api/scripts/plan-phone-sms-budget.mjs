#!/usr/bin/env node

import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";

const MAX_DB_INTEGER = 2_147_483_647;
const usage = `Usage: node scripts/plan-phone-sms-budget.mjs \\
  --peak-hour-sends <reviewed sends> --peak-day-sends <reviewed sends> \\
  --estimated-cents-per-send <conservative cents> \\
  --max-hour-cents <acceptable estimated exposure> \\
  --max-day-cents <acceptable estimated exposure> \\
  [--warning-percent 75]

This is a read-only calculator. It does not inspect Twilio, connect to a database,
or set production limits. Choose inputs from reviewed legitimate traffic,
provider prices, and operator-approved spending limits.`;

function integer({ value, name, min = 1, max = MAX_DB_INTEGER }) {
    if (!Number.isSafeInteger(value) || value < min || value > max) {
        throw new Error(`${name} must be an integer between ${min} and ${max}`);
    }
    return value;
}

function ceilingDivision({ numerator, denominator }) {
    return (numerator + denominator - 1n) / denominator;
}

function planWindow({ peakSends, centsPerSend, maxCents, warningPercent }) {
    // The warning must occur strictly after the reviewed peak, not on its
    // final send. Integer math also handles PostgreSQL's largest int values.
    const sendLimit = (BigInt(peakSends) * 100n) / BigInt(warningPercent) + 1n;
    if (sendLimit > BigInt(MAX_DB_INTEGER)) {
        throw new Error(
            "The required send limit exceeds the database integer range",
        );
    }

    const firstWarningSend = [
        ceilingDivision({
            numerator: sendLimit * BigInt(warningPercent),
            denominator: 100n,
        }),
        ceilingDivision({
            numerator: BigInt(maxCents) * BigInt(warningPercent),
            denominator: BigInt(centsPerSend) * 100n,
        }),
    ].reduce((a, b) => (a < b ? a : b));
    if (BigInt(peakSends) >= firstWarningSend) {
        throw new Error(
            `A reviewed peak of ${peakSends} sends reaches the warning at send ${firstWarningSend}. Increase the exposure allowance, reduce the planned demand, or narrow expensive destinations before choosing limits.`,
        );
    }

    const maximumSends = [
        sendLimit,
        BigInt(maxCents) / BigInt(centsPerSend),
    ].reduce((a, b) => (a < b ? a : b));
    return {
        sendLimit: Number(sendLimit),
        firstWarningSend: Number(firstWarningSend),
        maximumSends: Number(maximumSends),
        maximumEstimatedCents: Number(maximumSends * BigInt(centsPerSend)),
    };
}

export function planPhoneSmsBudget({
    peakHourSends,
    peakDaySends,
    estimatedCentsPerSend,
    maxHourCents,
    maxDayCents,
    warningPercent = 75,
}) {
    integer({ value: peakHourSends, name: "peak-hour-sends" });
    integer({ value: peakDaySends, name: "peak-day-sends" });
    integer({
        value: estimatedCentsPerSend,
        name: "estimated-cents-per-send",
    });
    integer({ value: maxHourCents, name: "max-hour-cents" });
    integer({ value: maxDayCents, name: "max-day-cents" });
    integer({ value: warningPercent, name: "warning-percent", max: 99 });
    if (peakDaySends < peakHourSends || maxDayCents < maxHourCents) {
        throw new Error(
            "Daily demand and daily exposure must each be at least their hourly values",
        );
    }

    let hourly;
    let daily;
    try {
        hourly = planWindow({
            peakSends: peakHourSends,
            centsPerSend: estimatedCentsPerSend,
            maxCents: maxHourCents,
            warningPercent,
        });
    } catch (error) {
        throw new Error(`Hourly plan: ${error.message}`, { cause: error });
    }
    try {
        daily = planWindow({
            peakSends: peakDaySends,
            centsPerSend: estimatedCentsPerSend,
            maxCents: maxDayCents,
            warningPercent,
        });
    } catch (error) {
        throw new Error(`Daily plan: ${error.message}`, { cause: error });
    }

    return {
        policy: {
            hourlySendLimit: hourly.sendLimit,
            dailySendLimit: daily.sendLimit,
            estimatedCentsPerSend,
            hourlyBudgetCents: maxHourCents,
            dailyBudgetCents: maxDayCents,
            warningPercent,
        },
        hourly,
        daily,
    };
}

function cliInteger({ value, name }) {
    if (value === undefined || !/^[1-9]\d*$/.test(value)) {
        throw new Error(`--${name} requires a positive whole number`);
    }
    return Number(value);
}

function printPlan({ peakHourSends, peakDaySends, plan }) {
    const { policy, hourly, daily } = plan;
    console.log(
        `Reviewed peak demand: ${peakHourSends} sends/hour, ${peakDaySends} sends/day`,
    );
    console.log(
        `Warning: ${policy.warningPercent}% of any count or estimated-cent limit`,
    );
    console.log(
        `First warning from an empty window: send ${hourly.firstWarningSend}/hour or ${daily.firstWarningSend}/day (whichever threshold is crossed first)`,
    );
    console.log(
        `Maximum estimated sends: ${hourly.maximumSends}/hour, ${daily.maximumSends}/day`,
    );
    console.log(
        `Maximum reserved estimates: ${hourly.maximumEstimatedCents} cents/hour, ${daily.maximumEstimatedCents} cents/day`,
    );
    console.log(
        "Review these values before applying; actual Twilio charges may differ.",
    );
    console.log(
        "\n-- Review on the production writer after applying V0095. This starts disabled.",
    );
    console.log(`INSERT INTO phone_sms_budget_policy (
    id, sending_enabled, hourly_send_limit, daily_send_limit,
    estimated_cents_per_send, hourly_budget_cents, daily_budget_cents,
    warning_percent
) VALUES (
    1, false, ${policy.hourlySendLimit}, ${policy.dailySendLimit},
    ${policy.estimatedCentsPerSend}, ${policy.hourlyBudgetCents},
    ${policy.dailyBudgetCents}, ${policy.warningPercent}
);`);
}

async function main() {
    const { values } = parseArgs({
        options: {
            "peak-hour-sends": { type: "string" },
            "peak-day-sends": { type: "string" },
            "estimated-cents-per-send": { type: "string" },
            "max-hour-cents": { type: "string" },
            "max-day-cents": { type: "string" },
            "warning-percent": { type: "string" },
            help: { type: "boolean" },
        },
    });
    if (values.help) {
        console.log(usage);
        return;
    }
    const peakHourSends = cliInteger({
        value: values["peak-hour-sends"],
        name: "peak-hour-sends",
    });
    const peakDaySends = cliInteger({
        value: values["peak-day-sends"],
        name: "peak-day-sends",
    });
    const plan = planPhoneSmsBudget({
        peakHourSends,
        peakDaySends,
        estimatedCentsPerSend: cliInteger({
            value: values["estimated-cents-per-send"],
            name: "estimated-cents-per-send",
        }),
        maxHourCents: cliInteger({
            value: values["max-hour-cents"],
            name: "max-hour-cents",
        }),
        maxDayCents: cliInteger({
            value: values["max-day-cents"],
            name: "max-day-cents",
        }),
        warningPercent:
            values["warning-percent"] === undefined
                ? 75
                : cliInteger({
                      value: values["warning-percent"],
                      name: "warning-percent",
                  }),
    });
    printPlan({ peakHourSends, peakDaySends, plan });
}

if (
    process.argv[1] !== undefined &&
    import.meta.url === pathToFileURL(process.argv[1]).href
) {
    try {
        await main();
    } catch (error) {
        console.error(error instanceof Error ? error.message : error);
        console.error(usage);
        process.exitCode = 1;
    }
}
