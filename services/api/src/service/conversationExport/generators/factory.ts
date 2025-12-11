import type { CsvGenerator } from "./base.js";
import { CommentsGenerator } from "./comments.js";

/**
 * Factory for managing CSV generators.
 * Provides centralized access to all available generators.
 */
export class ExportGeneratorFactory {
    private generators: Map<string, CsvGenerator>;

    constructor() {
        this.generators = new Map([
            ["comments", new CommentsGenerator()],
            // Future generators will be added here:
            // ["votes", new VotesGenerator()],
            // ["participants", new ParticipantsGenerator()],
            // ["summary", new SummaryGenerator()],
            // ["stats", new StatsGenerator()],
        ]);
    }

    /**
     * Get a specific generator by file type
     */
    getGenerator(fileType: string): CsvGenerator | undefined {
        return this.generators.get(fileType);
    }

    /**
     * Get all available generators
     */
    getAllGenerators(): CsvGenerator[] {
        return Array.from(this.generators.values());
    }

    /**
     * Get all available file types
     */
    getAvailableFileTypes(): string[] {
        return Array.from(this.generators.keys());
    }
}
