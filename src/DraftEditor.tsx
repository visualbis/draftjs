import { default as Editor } from '@draft-js-plugins/editor';
import { onDraftEditorCopy, onDraftEditorCut, handleDraftEditorPastedText } from 'draftjs-conductor';
import createMentionPlugin, { MentionData } from '@draft-js-plugins/mention';
import createLinkifyPlugin from 'draft-js-link-detection-plugin';
import '@draft-js-plugins/mention/lib/plugin.css';
import {
    convertToRaw,
    DraftDecorator,
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
import ValueMentionSuggestionList from './Components/ValueMentionSuggestionList';
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
    updateFormat?: (format: IElementFormats) => void;
    decorators?: DraftDecorator[];
    onValueMentionInput?: (value: string) => void;
    disableLinkify?: boolean;
    getMentionDataById?: (id: string) => { text: string; color: string; key: string; value: string };
}
export interface IElementFormats {
    fontFamily?: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    fontSize?: string;
    color?: string;
    background?: string;
    textAlign?: string;
    superScript?: boolean;
    subScript?: boolean;
    enableBorder?: boolean;
    borderColor?: string;
    backgroundColor?: string;
    justifyContent?: string;
}

export interface IDraftEditorRef {
    setFormat: (formatType: string, value: string) => void;
    setContent: (content: string) => string;
    insertTextAtCursor: (text: string) => void;
    insertEntityAtCursor: (value: { [key: string]: string }, key: string, type: string) => void;
}

interface IDraftEditorState {
    editorState?: EditorState;
    format?: IElementFormats;
    valueSearchOpen?: boolean;
    peopleSearchOpen?: boolean;
    suggestions?: any[];
    searchString?: string;
    isMentionIncomplete?: boolean
}

const linkifyPlugin = createLinkifyPlugin();

class DraftEditor extends Component<IDraftEditorProps, IDraftEditorState> {
    private mentionSuggestionList: any;
    public editorRef: React.RefObject<Editor>;
    private plugins: any;
    constructor(props: IDraftEditorProps) {
        super(props);
        const { initialContent, showMention, disableLinkify = false } = props;
        this.mentionSuggestionList = null;
        this.editorRef = React.createRef();
        this.state = {
            editorState: EditorState.createWithContent(convertFromHTMLString(initialContent)),
            format: null,
            valueSearchOpen: false,
            peopleSearchOpen: false,
            suggestions: props.valueSuggestion,
            searchString: '',
            isMentionIncomplete: false
        };

        this.plugins = [];
        if (!disableLinkify) {
            this.plugins.push(linkifyPlugin);
        }
        if (props.decorators) {
            this.plugins.push({ decorators: props.decorators });
        }
        if (showMention && (showMention.people || showMention.value)) {
            this.MentionComponents();
        }
    }

    getCurrentFormat() {
        const { editorState } = this.state;
        const format = getFormat(editorState);
        return format;
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
            this.setState({
                editorState: EditorState.createWithContent(convertFromHTMLString('')),
            });
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
        } else if (formatType === formatKeys.textAlign) {
            nextEditorState = RichUtils.toggleBlockType(editorState, value);
        } else nextEditorState = RichUtils.toggleInlineStyle(nextEditorState, formatType.toUpperCase());
        const format = getFormat(nextEditorState);
        this.updateData(nextEditorState, format);
    };

    onEditorStateChange = (editorStateUpdated: EditorState) => {
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
        const { onContentTextChange, onContentChange, updateFormat } = this.props;
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
        const htmlText = convertToHTMLString(
            editorStateUpdated,
            this.props.isColorRequired,
            !!(this.props.onValueMentionInput || this.props.ValuePopOverProps),
        );
        this.setState({
            editorState: editorStateUpdated,
            format: customFormat ?? formatState,
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
        updateFormat?.(customFormat ?? formatState);
        // }
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
                mentionTrigger: [MENTION_SUGGESTION_NAME.PREFIX_TWO, "."],
                supportWhitespace: true,
                entityMutability: 'IMMUTABLE',
                mentionRegExp: "."
            })
            : { MentionSuggestions: null };

        // eslint-disable-next-line no-shadow
        const { MentionSuggestions } = mentionPlugin_PREFIX_ONE;
        const { MentionSuggestions: ValueSuggestion } = mentionPlugin_PREFIX_TWO;

        if (showMention.people) {
            this.plugins.push(mentionPlugin_PREFIX_ONE);
        }
        if (showMention.value) {
            this.plugins.push(mentionPlugin_PREFIX_TWO);
        }

        this.mentionSuggestionList = {
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
        const { onMentionInput, valueSuggestion, onValueMentionInput } = this.props;
        const { isMentionIncomplete } = this.state;
        if (trigger === MENTION_SUGGESTION_NAME.PREFIX_ONE) {
            onMentionInput?.(value);
        } else if (onValueMentionInput) {            
            let inComplete = isMentionIncomplete;
            const matchArray = value.match(/  /);
            if (Array.isArray(matchArray) && matchArray.length > 0) {
                if (!isMentionIncomplete) {
                    inComplete = true
                    setTimeout(() => {
                        this.addColorToSelectedText(value.length + 1, "#ff0000")
                    }, 200)
                }
            } else {
                inComplete = false
            }
            this.setState({ searchString: value, isMentionIncomplete: inComplete });
            onValueMentionInput?.(value);
        } else {
            this.setState({
                suggestions: this.onCustomSuggestionsFilter(value, valueSuggestion),
            });
        }
    };

    onTab = (e: React.KeyboardEvent<{}>) => {
        const { editorState, valueSearchOpen, searchString } = this.state;
        if (valueSearchOpen) {
            if ((e.key === 'Tab')) {
                const mention = JSON.parse(
                    (document.querySelector('.value-mention-item-focused') as HTMLElement).dataset.value,
                );
                const isParent = mention.parent && mention.parent.length > 0;
                const string = `${(isParent ? mention.parent : []).join('.')}${isParent ? '.' : ''}${mention.label}.`;
                this.setState({ searchString: string });
                this.onMouseDownMention(mention, searchString);

                return 'handled';
            }
        }
        return 'not-handled';
    };

    handleReturn = (e: React.KeyboardEvent<{}>) => {
        const { editorState, valueSearchOpen, searchString } = this.state;
        const { valueSuggestion } = this.props;

        if (e.shiftKey) {
            this.setState({ editorState: RichUtils.insertSoftNewline(editorState) });
            return 'handled';
        }
        if (valueSearchOpen) {
            if ((e.key === 'Enter')) {
                const mention = JSON.parse(
                    (document.querySelector('.value-mention-item-focused') as HTMLElement).dataset.value,
                );
                const isParent = mention.parent && mention.parent.length > 0;
                const string = `${(isParent ? mention.parent : []).join('.')}${isParent ? '.' : ''}${mention.label}.`;
                this.setState({ searchString: string });
                this.onMouseDownMention(mention, searchString);

                return 'handled';
            }
        }
        return 'not-handled';
    };

    keyBindingFn = (event) => {
        const { ValuePopOverProps, onValueMentionInput, valueSuggestion } = this.props;

        if (KeyBindingUtil.hasCommandModifier(event) && event.keyCode === 13) {
            return 'submit';
        }
        if (event.keyCode === 27) {
            return 'submit';
        }

        return getDefaultKeyBinding(event);
    };

    addColorToSelectedText = (offset: number, textColor: string) => {
        let { editorState: newState } = this.state;
        let currentSelection = newState.getSelection();
        const nextOffSet = currentSelection.getFocusOffset();
        currentSelection = currentSelection.merge({
            focusOffset: nextOffSet,
            anchorOffset: nextOffSet - offset,
        });
        if (textColor) {
            newState = EditorState.forceSelection(
                //  force seletion entered text
                newState,
                currentSelection,
            );
            newState = formatText(newState, formatKeys.color, `${formatKeys.color}__${textColor}`); //format selection state
        }

        newState = EditorState.forceSelection(
            newState,
            currentSelection.set('anchorOffset', currentSelection.getFocusOffset()) as SelectionState,
        );

        this.setState({
            editorState: newState,
        });

        setTimeout(() => {
            // after adding selected text, reset focus ref
            this.editorRef.current.focus();
        }, 200);

    }

    insertTextAtCursor = (textToInsert: string, offset: number = 0, textColor?: string, replaceSelection = false) => {
        const { editorState } = this.state;
        const { onFocus } = this.props;
        const textInlineStyle = textColor ? `color__${textColor}` : '';
        const currentContent = editorState.getCurrentContent();
        let currentSelection = editorState.getSelection();
        if (!replaceSelection) {
            const nextOffSet = currentSelection.getFocusOffset();
            currentSelection = currentSelection.merge({
                focusOffset: nextOffSet,
                anchorOffset: nextOffSet - offset,
            });
        }
        let newContent = Modifier.replaceText(currentContent, currentSelection, textToInsert);
        const newContentSelection = newContent.getSelectionAfter();
        const textToInsertSelection = newContentSelection.set(
            'focusOffset',
            newContentSelection.getFocusOffset(),
        ) as SelectionState;

        let inlineStyles = editorState.getCurrentInlineStyle();
        if (!textColor) {
            inlineStyles.forEach(
                (inLineStyle) =>
                    (newContent = Modifier.applyInlineStyle(newContent, textToInsertSelection, inLineStyle)),
            );
        }

        let newState = EditorState.push(editorState, newContent, 'insert-characters');
        if (textColor) {
            newState = EditorState.forceSelection(
                //  force seletion entered text
                newState,
                currentSelection,
            );
            newState = formatText(newState, formatKeys.color, `${formatKeys.color}__${textColor}`); //format selection state
        }
        newState = EditorState.forceSelection(
            newState,
            textToInsertSelection.set('focusOffset', textToInsertSelection.getAnchorOffset()) as SelectionState,
        );

        this.setState({
            editorState: newState,
        });

        setTimeout(() => {
            // after adding selected text, reset focus ref
            this.editorRef.current.focus();
            onFocus && onFocus();
        }, 200);
        return newState;
    };

    insertEntityAtCursor = (
        value: { [key: string]: string },
        key: string,
        mentionType = 'mention',
        offset = 0,
        replaceSelection = false,
    ) => {
        const { editorState } = this.state;

        const stateWithEntity = editorState.getCurrentContent().createEntity(mentionType, 'IMMUTABLE', {
            mention: value,
        });
        const entityKey = stateWithEntity.getLastCreatedEntityKey();
        let currentSelection = editorState.getSelection();
        if (!replaceSelection) {
            const nextOffSet = currentSelection.getFocusOffset();
            currentSelection = currentSelection.merge({
                focusOffset: nextOffSet,
                anchorOffset: nextOffSet - offset,
            });
        }
        const stateWithText = Modifier.replaceText(stateWithEntity, currentSelection, key, null, entityKey);
        this.updateData(EditorState.push(editorState, stateWithText, 'insert-fragment'));
        setTimeout(() => {
            // after adding selected text, reset focus ref
            this.editorRef.current.focus();
            // onFocus && onFocus();
        }, 200);
    };

    onOutsideClick = () => {
        this.setState({ valueSearchOpen: false });
    };

    getEditorContainerRect = () => {
        if (this.editorRef.current) {
            return this.editorRef.current.getEditorRef().editor.getBoundingClientRect();
        }
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

    applyAlignment = (newStyle) => {
        const { editorState } = this.state;
        const nextEditorState = RichUtils.toggleBlockType(editorState, newStyle);
        return nextEditorState;
    };

    blockStyleFn(block) {
        switch (block.getType()) {
            case 'blockquote':
                return 'RichEditor-blockquote';
            case 'left':
                return 'align-left';
            case 'center':
                return 'align-center';
            case 'right':
                return 'align-right';
            default:
                return null;
        }
    }

    onMouseDownMention = (mention, searchValue) => {
        const { getMentionDataById, onValueMentionInput } = this.props;
        let length = searchValue.length;
        if (mention.parent.length > 0) {
            const searchArray = searchValue.split('.');
            if (searchArray.length <= mention.parent.length) {
                length = mention.parent.join('.').length + 1;
            }
        }
        if (length === 0) {
            const isParent = mention.parent && mention.parent.length > 0;
            const string = `${(isParent ? mention.parent : []).join('.')}${isParent ? '.' : ''}`;
            length = string.length;
        }
        if (!mention.hasLeaf) {
            const data = getMentionDataById(mention.id);
            this.insertEntityAtCursor(data, data.value, '#mention', length + 1);
            onValueMentionInput('');
            this.setState({ valueSearchOpen: false, searchString: '' });
            return;
        }
        const isParent = mention.parent && mention.parent.length > 0;
        const string = `${(isParent ? mention.parent : []).join('.')}${isParent ? '.' : ''}${mention.label}.`;
        this.insertTextAtCursor(string, length, "#333");
        setTimeout(() => {
            this.setState({ valueSearchOpen: true, searchString: searchValue });
        }, 200);
        onValueMentionInput === null || onValueMentionInput === void 0 ? void 0 : onValueMentionInput(string);
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
            onValueMentionInput,
        } = this.props;
        const { editorState, peopleSearchOpen, valueSearchOpen, suggestions, format } = this.state;
        const MentionComp = this.mentionSuggestionList?.MentionSuggestions;
        const ValueMentionComp = this.mentionSuggestionList?.ValueSuggestion;
        const keyBindingFn =
            peopleSearchOpen || (valueSearchOpen && onValueMentionInput) ? undefined : this.keyBindingFn;
        const SuggestionListComp = onValueMentionInput
            ? ValueMentionSuggestionList({
                onmousedown: this.onMouseDownMention,
            })
            : SuggestionList;

        const PopOverContainerMention = ValuePopOverProps ? ValuePopOverProps : PopOverContainer({ width: 120 });
        const valueSuggestionList = onValueMentionInput ? valueSuggestion : suggestions;
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
                    onTab={this.onTab}
                    plugins={this.plugins}
                    handleReturn={this.handleReturn}
                    keyBindingFn={keyBindingFn}
                    readOnly={readOnly}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    onCopy={onDraftEditorCopy}
                    onCut={onDraftEditorCut}
                    handlePastedText={this.handlePastedText}
                    blockStyleFn={this.blockStyleFn}
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
                        popoverContainer={PopOverContainer({ width: 220 })}
                    />
                )}
                {ValueMentionComp && (
                    <ValueMentionComp
                        open={valueSearchOpen}
                        onOpenChange={this.onOpenValueChange}
                        suggestions={valueSuggestionList}
                        onSearchChange={this.onSearchChange}
                        entryComponent={SuggestionListComp}
                        popoverContainer={PopOverContainerMention}
                    />
                )}
            </Fragment>
        );
    }
}

export default DraftEditor;
