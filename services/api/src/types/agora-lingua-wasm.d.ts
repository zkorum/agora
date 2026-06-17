declare module "@zkorum/agora-lingua-wasm" {
    export interface LanguageDetector {
        detectLanguageOf: (text: string) => string | undefined;
        computeLanguageConfidence: (text: string, language: string) => number;
    }

    export interface LanguageDetectorBuilder {
        withMinimumRelativeDistance: (
            distance: number,
        ) => LanguageDetectorBuilder;
        build: () => LanguageDetector;
    }

    export const LanguageDetectorBuilder: {
        fromAllSpokenLanguages: () => LanguageDetectorBuilder;
    };
}
