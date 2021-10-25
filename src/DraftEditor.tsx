import { default as Editor } from '@draft-js-plugins/editor';
import createMentionPlugin, { defaultSuggestionsFilter } from '@draft-js-plugins/mention';
import '@draft-js-plugins/mention/lib/plugin.css';
import {
    convertToRaw,
    EditorState,
    getDefaultKeyBinding,
    KeyBindingUtil,
    Modifier,
    RichUtils,
    SelectionState,
} from 'draft-js';
import 'draft-js/dist/Draft.css';
import React, { Component, Fragment, ReactElement } from 'react';
import PopOverContainer from './Components/PopOverContainer';
import SuggestionList from './Components/SuggestionList';
import {
    convertFromHTMLString,
    convertToHTMLString,
    formatText,
    getContentFromEditorState,
    getFormat,
    IDraftElementFormats,
    resolveCustomStyleMap,
} from './Service/draftEditor.service';
import { CUSTOM_STYLE_MAP, formatKeys, MENTION_SUGGESTION_NAME } from './Service/UIconstants';
import './Styles';

interface IDraftEditorProps {
    initialContent?: string;
    textAlignment?: string;
    onContentChange?: (content: string) => void;
    onContentTextChange?: (content: {
        formattedText: string;
        value: string;
        mentionList: string[];
        rawValue?: string;
        backgroundColor?: string;
        justifyContent?: string;
    }) => void;
    onCurrentFormatChange?: (formats: IDraftElementFormats) => void;
    toolbarComponent?: ReactElement;
    toolbarOptions?: string[];
    innerRef?: any;
    showMention?: { value: boolean; people: boolean };
    onMentionInput?: (value: string) => void;
    peopleSuggestion?: any[];
    valueSuggestion?: any[];
    isMentionLoading?: boolean;
    placeholder?: string;
    submit?: () => void;
    readOnly?: boolean;
    entitySelectionAsWhole?: boolean;
    isColorRequired?:boolean;
}

export interface IDraftEditorRef {
    setFormat: (formatType: string, value: string) => void;
    setContent: (content: string) => string;
    insertTextAtCursor: (text: string) => void;
    insertEntityAtCursor: (value: { [key: string]: string }, key: string) => void;
}

interface IDraftEditorState {
    editorState?: EditorState;
    format?: any;
    valueSearchOpen?: boolean;
    peopleSearchOpen?: boolean;
    suggestions?: any[];
}

class DraftEditor extends Component<IDraftEditorProps, IDraftEditorState> {
    private mentionSuggestionList: any;
    private editorRef: React.RefObject<Editor>;
    constructor(props: IDraftEditorProps) {
        super(props);
        const { initialContent, showMention } = props;
        this.mentionSuggestionList = null;
        this.editorRef = React.createRef();
        this.state = {
            editorState: EditorState.createWithContent(convertFromHTMLString(initialContent)),
            format: null,
            valueSearchOpen: false,
            peopleSearchOpen: false,
            suggestions: props.valueSuggestion,
        };
        if (showMention && (showMention.people || showMention.value)) {
            this.MentionComponents();
        }
    }

    sendFormat = (nextEditorState: EditorState) => {
        const { format: prevFormat } = this.state;
        const { onCurrentFormatChange } = this.props;
        const format = getFormat(nextEditorState);
        this.setState({
            format: {
                ...prevFormat,
                ...format,
            },
        });
        onCurrentFormatChange?.(format);
    };

    setContent = (content: string) => {
        const updatedEditorState = EditorState.createWithContent(convertFromHTMLString(content));
        this.updateData(updatedEditorState);
        return getContentFromEditorState(updatedEditorState);
    };

    getSelection = () => {
        const { editorState } = this.state;
        const selection = editorState.getSelection();
        const anchorKey = selection.getAnchorKey();
        const currentContent = editorState.getCurrentContent();
        const currentBlock = currentContent.getBlockForKey(anchorKey);

        const start = selection.getStartOffset();
        const end = selection.getEndOffset();
        const selectedText = currentBlock.getText().slice(start, end);
        return selectedText;
    };

    setFormat = (formatType: string, value: string) => {
        const { editorState } = this.state;
        let nextEditorState = editorState;
        const selection = this.getSelection();
        if (!selection) {
            nextEditorState = this.selectAll();
        }
        if (
            [
                formatKeys.fontFamily,
                formatKeys.color,
                formatKeys.fontSize,
                formatKeys.background,
                formatKeys.lineHeight,
                formatKeys.justifyContent,
            ].includes(formatType)
        ) {
            nextEditorState = formatText(nextEditorState, formatType, `${formatType}__${value}`);
        } else nextEditorState = RichUtils.toggleInlineStyle(nextEditorState, formatType.toUpperCase());
        const format = getFormat(nextEditorState);
        this.updateData(nextEditorState, format);
        this.editorRef.current?.focus();
    };

    onEditorStateChange = (editorStateUpdated: EditorState) => {
        // const editorState = this.onEditorTextChange(editorStateUpdated);
        this.updateData(editorStateUpdated);
    };

    updateData = (editorStateUpdated: EditorState, customFormat?: any) => {
        const selection = editorStateUpdated.getSelection();
        if (this.props.entitySelectionAsWhole && selection?.getHasFocus()) {
            const content = editorStateUpdated.getCurrentContent();
            const startKey = selection.getStartKey();
            const startOffset = selection.getStartOffset();
            const block = content.getBlockForKey(startKey);
            const currentEntityKey = block.getEntityAt(startOffset);
            block.findEntityRanges(
                (charData) => {
                    const entityKey = charData.getEntity();
                    if (!entityKey) return false;
                    return entityKey === currentEntityKey;
                },
                (start, end) => {
                    const entitySelection = new SelectionState({
                        anchorKey: block.getKey(),
                        focusKey: block.getKey(),
                        anchorOffset: start,
                        focusOffset: end,
                    });
                    let newSelectionState = new SelectionState(entitySelection);
                    editorStateUpdated = EditorState.forceSelection(editorStateUpdated, newSelectionState);
                    return;
                },
            );
        }
        const { onContentTextChange, onContentChange } = this.props;
        const { peopleSearchOpen, format } = this.state;
        this.setState({
            editorState: editorStateUpdated,
        });
        this.sendFormat(editorStateUpdated);
        if (peopleSearchOpen) {
            return;
        }
        const rawData = convertToRaw(editorStateUpdated.getCurrentContent());
        const mentionList = [];
        Object.keys(rawData.entityMap).forEach((key) => {
            if (rawData.entityMap[key].type === '#mention') {
                return;
            }
            mentionList.push({
                emailAddress: rawData.entityMap[key]?.data?.mention?.value,
                fullName: rawData.entityMap[key]?.data?.mention?.name,
            });
        });
        const value = rawData.blocks.map((block) => (!block.text.trim() && '\n') || block.text).join('\n');
        const htmlText = convertToHTMLString(editorStateUpdated, this.props.isColorRequired);
        onContentTextChange?.({
            formattedText: value,
            value: htmlText,
            mentionList,
            rawValue: getContentFromEditorState(editorStateUpdated),
            backgroundColor: customFormat?.backgroundColor ?? format?.backgroundColor,
            justifyContent: customFormat?.justifyContent ?? format?.justifyContent,
        });
        onContentChange?.(htmlText);
    };

    onEditorTextChange = (editorStateUpdated: EditorState) => {
        const html = convertToHTMLString(editorStateUpdated, this.props.isColorRequired);
        const editorState = EditorState.createWithContent(convertFromHTMLString(html));

        this.setState({
            editorState: editorState,
        });
        return editorState;
    };

    handleKeyCommand = (command: string, editorStateUpdated: EditorState) => {
        if (command === 'submit' && this.props.submit) {
            this.props.submit();
        }
        const newState = RichUtils.handleKeyCommand(editorStateUpdated, command);
        if (newState) {
            this.updateData(newState);
            return 'handled';
        }
        return 'not-handled';
    };

    selectAll = () => {
        const { editorState } = this.state;
        const currentContent = editorState.getCurrentContent();
        const firstBlock = currentContent.getBlockMap().first();
        const lastBlock = currentContent.getBlockMap().last();
        const firstBlockKey = firstBlock.getKey();
        const lastBlockKey = lastBlock.getKey();
        const lengthOfLastBlock = lastBlock.getLength();

        const selection = new SelectionState({
            anchorKey: firstBlockKey,
            anchorOffset: 0,
            focusKey: lastBlockKey,
            focusOffset: lengthOfLastBlock,
        });

        const newEditorState = EditorState.acceptSelection(editorState, selection);
        this.setState({
            editorState: newEditorState,
        });
        return newEditorState;
    };

    MentionComponents = () => {
        const { showMention } = this.props;
        const mentionPlugin_PREFIX_ONE = showMention.people
            ? createMentionPlugin({
                  mentionTrigger: MENTION_SUGGESTION_NAME.PREFIX_ONE,
                  supportWhitespace: false,
                  entityMutability: 'IMMUTABLE',
              })
            : { MentionSuggestions: null };
        const mentionPlugin_PREFIX_TWO = showMention.value
            ? createMentionPlugin({
                  mentionTrigger: MENTION_SUGGESTION_NAME.PREFIX_TWO,
                  supportWhitespace: false,
                  entityMutability: 'IMMUTABLE',
              })
            : { MentionSuggestions: null };

        // eslint-disable-next-line no-shadow
        const { MentionSuggestions } = mentionPlugin_PREFIX_ONE;
        const { MentionSuggestions: ValueSuggestion } = mentionPlugin_PREFIX_TWO;

        // eslint-disable-next-line no-shadow
        const plugins = [];
        if (showMention.people) {
            plugins.push(mentionPlugin_PREFIX_ONE);
        }
        if (showMention.value) {
            plugins.push(mentionPlugin_PREFIX_TWO);
        }

        this.mentionSuggestionList = {
            plugins,
            MentionSuggestions,
            ValueSuggestion,
        };
        return this.mentionSuggestionList;
    };

    onOpenChange = (searchKey: string) => (_open: boolean) => {
        this.setState({ [searchKey]: _open } as Partial<IDraftEditorState>);
    };
    onSearchChange = ({ trigger, value }: { trigger: string; value: string }) => {
        const { onMentionInput, valueSuggestion } = this.props;
        if (trigger === MENTION_SUGGESTION_NAME.PREFIX_ONE) {
            onMentionInput?.(value);
        } else {
            this.setState({
                suggestions: defaultSuggestionsFilter(value, valueSuggestion),
            });
        }
    };
    handleReturn = (e: React.KeyboardEvent<{}>) => {
        const { editorState } = this.state;
        if (e.shiftKey) {
            this.setState({ editorState: RichUtils.insertSoftNewline(editorState) });
            return 'handled';
        }
        return 'not-handled';
    };

    keyBindingFn = (event) => {
        if (KeyBindingUtil.hasCommandModifier(event) && event.keyCode === 13) {
            return 'submit';
        }
        return getDefaultKeyBinding(event);
    };
    insertTextAtCursor = (textToInsert: string) => {
        const { editorState } = this.state;

        const currentContent = editorState.getCurrentContent();
        const currentSelection = editorState.getSelection();

        let newContent = Modifier.replaceText(currentContent, currentSelection, textToInsert);

        const textToInsertSelection = currentSelection.set(
            'focusOffset',
            currentSelection.getFocusOffset() + textToInsert.length,
        ) as SelectionState;

        let inlineStyles = editorState.getCurrentInlineStyle();

        inlineStyles.forEach(
            (inLineStyle) => (newContent = Modifier.applyInlineStyle(newContent, textToInsertSelection, inLineStyle)),
        );

        let newState = EditorState.push(editorState, newContent, 'insert-characters');
        newState = EditorState.forceSelection(
            newState,
            textToInsertSelection.set(
                'anchorOffset',
                textToInsertSelection.getAnchorOffset() + textToInsert.length,
            ) as SelectionState,
        );

        this.setState({
            editorState: newState,
        });
        return newState;
    };
    insertEntityAtCursor = (value: { [key: string]: string }, key: string) => {
        const { editorState } = this.state;
        const stateWithEntity = editorState.getCurrentContent().createEntity('mention', 'IMMUTABLE', {
            mention: value,
        });
        const entityKey = stateWithEntity.getLastCreatedEntityKey();
        const stateWithText = Modifier.insertText(stateWithEntity, editorState.getSelection(), key, null, entityKey);
        this.updateData(EditorState.push(editorState, stateWithText, 'insert-fragment'));
    };
    render() {
        const { textAlignment, toolbarComponent, peopleSuggestion, isMentionLoading, placeholder, readOnly } =
            this.props;
        const { editorState, peopleSearchOpen, valueSearchOpen, suggestions, format } = this.state;
        const MentionComp = this.mentionSuggestionList?.MentionSuggestions;
        const ValueMentionComp = this.mentionSuggestionList?.ValueSuggestion;

        return (
            <Fragment>
                {toolbarComponent &&
                    React.cloneElement(toolbarComponent, { currentFormat: format, setFormat: this.setFormat })}
                <Editor
                    ref={this.editorRef}
                    customStyleFn={resolveCustomStyleMap}
                    preserveSelectionOnBlur
                    stripPastedStyles
                    editorState={editorState}
                    placeholder={placeholder}
                    onChange={this.onEditorStateChange}
                    textAlignment={textAlignment as any}
                    handleKeyCommand={this.handleKeyCommand}
                    customStyleMap={CUSTOM_STYLE_MAP}
                    plugins={this.mentionSuggestionList?.plugins}
                    handleReturn={this.handleReturn}
                    keyBindingFn={this.keyBindingFn}
                    readOnly={readOnly}
                />
                <div className="list_container">
                    {peopleSearchOpen && !isMentionLoading && peopleSuggestion?.length === 0 && (
                        <ul style={{ padding: '0 10px' }}>No Data found</ul>
                    )}
                </div>
                {MentionComp && (
                    <MentionComp
                        open={peopleSearchOpen}
                        onOpenChange={this.onOpenChange('peopleSearchOpen')}
                        suggestions={peopleSuggestion || []}
                        onSearchChange={this.onSearchChange}
                        entryComponent={SuggestionList}
                        popoverContainer={PopOverContainer}
                    />
                )}
                {ValueMentionComp && (
                    <ValueMentionComp
                        open={valueSearchOpen}
                        onOpenChange={this.onOpenChange('valueSearchOpen')}
                        suggestions={suggestions}
                        onSearchChange={this.onSearchChange}
                        entryComponent={SuggestionList}
                        popoverContainer={PopOverContainer}
                    />
                )}
            </Fragment>
        );
    }
}

export default DraftEditor;
