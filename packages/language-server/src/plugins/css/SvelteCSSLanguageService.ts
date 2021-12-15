import {
    // getCSSLanguageService,
    // getSCSSLanguageService,
    // getLESSLanguageService,
    LanguageService
    // ICSSDataProvider
} from 'vscode-css-languageservice';

// import { Parser } from 'vscode-css-languageservice/lib/umd/parser/cssParser';
import { Parser } from 'vscode-css-languageservice/lib/umd/parser/cssParser';
import { CSSCompletion } from 'vscode-css-languageservice/lib/umd/services/cssCompletion';
import { CSSHover } from 'vscode-css-languageservice/lib/umd/services/cssHover';
import { CSSNavigation } from 'vscode-css-languageservice/lib/umd/services/cssNavigation';
import { CSSCodeActions } from 'vscode-css-languageservice/lib/umd/services/cssCodeActions';
import { CSSValidation } from 'vscode-css-languageservice/lib/umd/services/cssValidation';

import { SCSSParser } from 'vscode-css-languageservice/lib/umd/parser/scssParser';
import { SCSSCompletion } from 'vscode-css-languageservice/lib/umd/services/scssCompletion';
import { LESSParser } from 'vscode-css-languageservice/lib/umd/parser/lessParser';
import { LESSCompletion } from 'vscode-css-languageservice/lib/umd/services/lessCompletion';
import { getFoldingRanges } from 'vscode-css-languageservice/lib/umd/services/cssFolding';

import { TokenType, Scanner, IToken } from 'vscode-css-languageservice/lib/umd/parser/cssScanner';
import * as nodes from 'vscode-css-languageservice/lib/umd/parser/cssNodes';

import {
    LanguageSettings,
    ICompletionParticipant,
    DocumentContext,
    LanguageServiceOptions,
    Diagnostic,
    Position,
    CompletionList,
    Hover,
    Location,
    DocumentHighlight,
    DocumentLink,
    SymbolInformation,
    Range,
    CodeActionContext,
    Command,
    CodeAction,
    ColorInformation,
    Color,
    ColorPresentation,
    WorkspaceEdit,
    FoldingRange,
    SelectionRange,
    TextDocument,
    ICSSDataProvider,
    CSSDataV1,
    HoverSettings,
    CompletionSettings
} from 'vscode-css-languageservice/lib/umd/cssLanguageTypes';

import { CSSDataManager } from 'vscode-css-languageservice/lib/umd/languageFacts/dataManager';
import { CSSDataProvider } from 'vscode-css-languageservice/lib/umd/languageFacts/dataProvider';
import { getSelectionRanges } from 'vscode-css-languageservice/lib/umd/services/cssSelectionRange';
import { SCSSNavigation } from 'vscode-css-languageservice/lib/umd/services/scssNavigation';
import { cssData } from 'vscode-css-languageservice/lib/umd/data/webCustomData';

function createFacade(
    parser: Parser,
    completion: CSSCompletion,
    hover: CSSHover,
    navigation: CSSNavigation,
    codeActions: CSSCodeActions,
    validation: CSSValidation,
    cssDataManager: CSSDataManager
): LanguageService {
    return {
        configure: (settings) => {
            validation.configure(settings);
            completion.configure(settings?.completion);
            hover.configure(settings?.hover);
        },
        setDataProviders: cssDataManager.setDataProviders.bind(cssDataManager),
        doValidation: validation.doValidation.bind(validation),
        parseStylesheet: parser.parseStylesheet.bind(parser),
        doComplete: completion.doComplete.bind(completion),
        doComplete2: completion.doComplete2.bind(completion),
        setCompletionParticipants: completion.setCompletionParticipants.bind(completion),
        doHover: hover.doHover.bind(hover),
        findDefinition: navigation.findDefinition.bind(navigation),
        findReferences: navigation.findReferences.bind(navigation),
        findDocumentHighlights: navigation.findDocumentHighlights.bind(navigation),
        findDocumentLinks: navigation.findDocumentLinks.bind(navigation),
        findDocumentLinks2: navigation.findDocumentLinks2.bind(navigation),
        findDocumentSymbols: navigation.findDocumentSymbols.bind(navigation),
        doCodeActions: codeActions.doCodeActions.bind(codeActions),
        doCodeActions2: codeActions.doCodeActions2.bind(codeActions),
        findDocumentColors: navigation.findDocumentColors.bind(navigation),
        getColorPresentations: navigation.getColorPresentations.bind(navigation),
        doRename: navigation.doRename.bind(navigation),
        getFoldingRanges,
        getSelectionRanges
    };
}

class SvelteCSSParser extends Parser {
    _parsePseudo(...args) {
        // pseudo: ':' [ IDENT | FUNCTION S* [IDENT S*]? ')' ]
        const node = this._tryParsePseudoIdentifier();
        if (node) {
            const isGlobalPseudo = this?.prevToken.text === 'global';
            if (!this.hasWhitespace() && this.accept(TokenType.ParenthesisL)) {
                const tryAsSelector = () => {
                    const selectors = this.create(nodes.Node);
                    if (!selectors.addChild(this._parseSelector(isGlobalPseudo))) {
                        return null;
                    }
                    while (
                        this.accept(TokenType.Comma) &&
                        selectors.addChild(this._parseSelector(false))
                    ) {
                        // loop
                    }
                    if (this.peek(TokenType.ParenthesisR)) {
                        return this.finish(selectors);
                    }
                    return null;
                };
                node.addChild(this.try(tryAsSelector) || this._parseBinaryExpr());
                if (!this.accept(TokenType.ParenthesisR)) {
                    return this.finish(node, ParseError.RightParenthesisExpected);
                }
            }
            return this.finish(node);
        }
        return null;
    }
}

const defaultLanguageServiceOptions = {};

export function getSvelteCSSLanguageService(
    options: LanguageServiceOptions = defaultLanguageServiceOptions
): LanguageService {
    const cssDataManager = new CSSDataManager(options);
    return createFacade(
        new SvelteCSSParser(),
        new CSSCompletion(null, options, cssDataManager),
        new CSSHover(options && options.clientCapabilities, cssDataManager),
        new CSSNavigation(options && options.fileSystemProvider, false),
        new CSSCodeActions(cssDataManager),
        new CSSValidation(cssDataManager),
        cssDataManager
    );
}
