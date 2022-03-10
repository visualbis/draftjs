import { default as Editor } from '@draft-js-plugins/editor';
import { onDraftEditorCopy, onDraftEditorCut, handleDraftEditorPastedText } from 'draftjs-conductor';
import createMentionPlugin from '@draft-js-plugins/mention';
import createLinkifyPlugin from 'draft-js-link-detection-plugin';
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
    isColorRequired?: boolean;
    valueMentionTrigger?: () => void;
    formatAllWhenNoneSelected?: boolean;
    shouldFocusOnMount?: boolean;
    onFocus?: () => void;
    onBlur?: () => void;
    onSelection?: (editorStateUpdated: EditorState) => void;
    ValuePopOverProps?: (props) => JSX.Element;
}

export interface IDraftEditorRef {
    setFormat: (formatType: string, value: string) => void;
    setContent: (content: string) => string;
    insertTextAtCursor: (text: string) => void;
    insertEntityAtCursor: (value: { [key: string]: string }, key: string, type: string) => void;
}

interface IDraftEditorState {
    editorState?: EditorState;
    format?: any;
    valueSearchOpen?: boolean;
    peopleSearchOpen?: boolean;
    suggestions?: any[];
}

const linkifyPlugin = createLinkifyPlugin();

class DraftEditor extends Component<IDraftEditorProps, IDraftEditorState> {
    private mentionSuggestionList: any;
    public editorRef: React.RefObject<Editor>;
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

    handlePastedText = (text: string, html: string, editorState: EditorState) => {
        let newState = handleDraftEditorPastedText(html, editorState);

        if (newState) {
            this.updateData(newState);
            return 'handled';
        }
        return 'not-handled';
    };

    UNSAFE_componentWillReceiveProps(newProps) {
        if (newProps.initialContent === '') {
            this.setState({ editorState: EditorState.createWithContent(convertFromHTMLString('')) });
        }
    }

    sendFormat = (nextEditorState: EditorState) => {
        const { format: prevFormat } = this.state;
        const { onCurrentFormatChange } = this.props;
        const format = getFormat(nextEditorState);
        onCurrentFormatChange?.(format);
        return {
            ...prevFormat,
            ...format,
        };
    };

    setContent = (content: string) => {
        const updatedEditorState = EditorState.createWithContent(convertFromHTMLString(content));
        this.updateData(updatedEditorState);
        return getContentFromEditorState(updatedEditorState);
    };

    getSelection = (editor?: EditorState) => {
        let editorState = editor ?? this.state.editorState;
        const selection = editorState.getSelection();
        const anchorKey = selection.getAnchorKey();
        const currentContent = editorState.getCurrentContent();
        const currentBlock = currentContent.getBlockForKey(anchorKey);

        const start = selection.getStartOffset();
        const end = selection.getEndOffset();
        const selectedText = currentBlock.getText().slice(start, end);
        return selectedText;
    };
    moveSelectionToEnd = (editorState) => {
        const content = editorState.getCurrentContent();
        const blockMap = content.getBlockMap();

        const key = blockMap.last().getKey();
        const length = blockMap.last().getLength();

        // On Chrome and Safari, calling focus on contenteditable focuses the
        // cursor at the first character. This is something you don't expect when
        // you're clicking on an input element but not directly on a character.
        // Put the cursor back where it was before the blur.
        const selection = new SelectionState({
            anchorKey: key,
            anchorOffset: length,
            focusKey: key,
            focusOffset: length,
        });
        return EditorState.forceSelection(editorState, selection);
    };

    componentDidMount() {
        let container = document.body.getElementsByClassName('mention-list-container')[0];
        if (!container) {
            container = document.createElement('div');
            container.className = 'mention-list-container';
            document.body.appendChild(container);
        }
        setTimeout(() => {
            const { shouldFocusOnMount, onFocus } = this.props;
            const { editorState } = this.state;
            if (shouldFocusOnMount) {
                const updatedEditorState = this.moveSelectionToEnd(editorState);
                this.setState({ editorState: updatedEditorState }, () => {
                    onFocus && onFocus();
                });
            }
        }, 0);
    }

    setFormat = (formatType: string, value: string) => {
        /* ** DO NOT MOVE THE FOCUS BELOW AS ITS RESETTING 
        THE STATE BY CALLING EDITOR STATE CHANGE
        AND RERENDERING THE ENTIRE COMPONENNT ** */

        this.editorRef.current?.focus();

        const { editorState } = this.state;
        let nextEditorState = editorState;
        const selection = this.getSelection();
        if (!selection && this.props.formatAllWhenNoneSelected) {
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
    };

    onEditorStateChange = (editorStateUpdated: EditorState) => {
        // const editorState = this.onEditorTextChange(editorStateUpdated);
        this.props.onSelection?.(editorStateUpdated);
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
        const formatState = this.sendFormat(editorStateUpdated);
        // Commenting this condition since it is not allowing the mentions data to be passed to the parent comp.
        // Commenting this will not cause any problem, if it did please write another workaround
        // if (!peopleSearchOpen) {
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
        this.setState({
            editorState: editorStateUpdated,
            format: formatState,
        });
        onContentTextChange?.({
            formattedText: value,
            value: htmlText,
            mentionList,
            rawValue: getContentFromEditorState(editorStateUpdated),
            backgroundColor: customFormat?.backgroundColor ?? format?.backgroundColor,
            justifyContent: customFormat?.justifyContent ?? format?.justifyContent,
        });
        onContentChange?.(htmlText);
        // }
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
        const plugins: any = [linkifyPlugin];
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

    onOpenChange = (_open: boolean) => {
        this.setState({ peopleSearchOpen: _open } as Partial<IDraftEditorState>);
    };

    onCustomSuggestionsFilter = (searchValue: string, suggestions: any[]) => {
        const size = (list) => (list.constructor.name === 'List' ? list.size : list.length);
        const get = (obj, attr) => (obj.get ? obj.get(attr) : obj[attr]);
        const value = searchValue.toLowerCase();
        const filteredSuggestions = suggestions.filter(
            (suggestion) => !value || get(suggestion, 'name').toLowerCase().indexOf(value) > -1,
        );
        const length = size(filteredSuggestions) < 15 ? size(filteredSuggestions) : 15;
        return filteredSuggestions.slice(0, length);
    };

    onSearchChange = ({ trigger, value }: { trigger: string; value: string }) => {
        const { onMentionInput, valueSuggestion } = this.props;
        if (trigger === MENTION_SUGGESTION_NAME.PREFIX_ONE) {
            onMentionInput?.(value);
        } else {
            this.setState({
                suggestions: this.onCustomSuggestionsFilter(value, valueSuggestion),
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

    insertTextAtCursor = (textToInsert: string, offset: number = 0) => {
        const { editorState } = this.state;
        const { onFocus } = this.props;
        const currentContent = editorState.getCurrentContent();
        const nextOffSet = editorState.getSelection().getFocusOffset();
        const currentSelection = editorState.getSelection().merge({
            focusOffset: nextOffSet,
            anchorOffset: nextOffSet - offset,
        });
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
        setTimeout(() => {
            // after adding selected text, reset focus ref
            onFocus && onFocus();
        }, 200);
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

    onOutsideClick = () => {
        this.setState({ valueSearchOpen: false });
    };

    onOpenValueChange = (value) => {
        const { ValuePopOverProps } = this.props;
        if (ValuePopOverProps) {
            if (value) {
                this.setState({
                    valueSearchOpen: value,
                });
            }
            return;
        }
        this.setState({
            valueSearchOpen: value,
        });
    };

    render() {
        const {
            textAlignment,
            toolbarComponent,
            peopleSuggestion,
            isMentionLoading,
            placeholder,
            readOnly,
            onBlur,
            onFocus,
            valueSuggestion,
            ValuePopOverProps,
        } = this.props;
        const { editorState, peopleSearchOpen, valueSearchOpen, suggestions, format } = this.state;
        const MentionComp = this.mentionSuggestionList?.MentionSuggestions;
        const ValueMentionComp = this.mentionSuggestionList?.ValueSuggestion;
        const keyBindingFn = !peopleSearchOpen ? this.keyBindingFn : undefined;
        const PopoverComponent = ValuePopOverProps ? ValuePopOverProps : PopOverContainer;
        return (
            <Fragment>
                {toolbarComponent &&
                    React.cloneElement(toolbarComponent, {
                        currentFormat: format,
                        setFormat: this.setFormat,
                    })}
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
                    keyBindingFn={keyBindingFn}
                    readOnly={readOnly}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    onCopy={onDraftEditorCopy}
                    onCut={onDraftEditorCut}
                    handlePastedText={this.handlePastedText}
                />
                <div className="list_container">
                    {peopleSearchOpen && !isMentionLoading && peopleSuggestion?.length === 0 && (
                        <ul style={{ padding: '0 10px' }}>No Data found</ul>
                    )}
                </div>
                {MentionComp && (
                    <MentionComp
                        open={peopleSearchOpen}
                        onOpenChange={this.onOpenChange}
                        suggestions={peopleSuggestion || []}
                        onSearchChange={this.onSearchChange}
                        entryComponent={SuggestionList}
                        popoverContainer={PopOverContainer}
                    />
                )}
                {ValueMentionComp && (
                    <ValueMentionComp
                        open={valueSearchOpen}
                        onOpenChange={this.onOpenValueChange}
                        suggestions={suggestions}
                        onSearchChange={this.onSearchChange}
                        entryComponent={SuggestionList}
                        popoverContainer={PopoverComponent}
                    />
                )}
            </Fragment>
        );
    }
}

export default DraftEditor;
