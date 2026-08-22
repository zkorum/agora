import {
    formatDevExerciseGuardError,
    parseDevExerciseEnvironment,
} from "./guard.js";

try {
    const environment = parseDevExerciseEnvironment(process.env);
    const { runDevExercise } = await import("./runtime.js");
    await runDevExercise({
        environment,
        arguments: process.argv.slice(2),
    });
} catch (error: unknown) {
    console.error(
        `[Conversation Email Updates dev exercise] ${formatDevExerciseGuardError(error)}`,
    );
    process.exitCode = 1;
}
