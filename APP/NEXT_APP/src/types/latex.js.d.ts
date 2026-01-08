/**
 * Type declarations for latex.js
 * @see https://github.com/niciholas/latex.js
 */

declare module "latex.js" {
    export interface GeneratorOptions {
        hyphenate?: boolean;
    }

    export interface ParseOptions {
        generator: HtmlGenerator;
    }

    export interface LatexDocument {
        htmlDocument(): Document;
    }

    export class HtmlGenerator {
        constructor(options?: GeneratorOptions);
    }

    export function parse(latex: string, options: ParseOptions): LatexDocument;
}
