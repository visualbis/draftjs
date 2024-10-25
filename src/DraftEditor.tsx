import { default as Editor } from '@draft-js-plugins/editor';
import { onDraftEditorCopy, onDraftEditorCut, handleDraftEditorPastedText } from 'draftjs-conductor';
import createMentionPlugin from '@lumel/mention';
import createLinkifyPlugin from 'draft-js-link-detection-plugin';
import createInlineToolbarPlugin from '@draft-js-plugins/inline-toolbar';
import '@lumel/mention/lib/plugin.css';
import '@draft-js-plugins/inline-toolbar/lib/plugin.css';
import {
    ContentState,
    convertFromHTML,
    convertToRaw,
    DraftDecorator,
    EditorState,
    getDefaultKeyBinding,
    KeyBindingUtil,
    Modifier,
    RichUtils,
    SelectionState,
    DraftEditorCommand,
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
    selectAll,
} from './Service/draftEditor.service';
import { Key } from './Service/Keycodes';
import { CUSTOM_STYLE_MAP, formatKeys, MENTION_SUGGESTION_NAME } from './Service/UIconstants';
import './Styles';
import getFragmentFromSelection from 'draft-js/lib/getFragmentFromSelection';

export interface IDraftEditorProps {
    initialContent?: string;
    textAlignment?: string;
    onContentChange?: (content: string) => void;
    onContentTextChange?: (content: IContentTextChangeProps) => void;
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
    getMentionDataById?: (id: string) => { title: string; text: string; color: string; key: string; value: string };
    inplaceToolbar?: boolean;
    linkDecorator?: DraftDecorator;
    customKeyBinder?: (e: KeyboardEvent) => DraftEditorCommand;
    useBlockConversion?: boolean;
    parsedValueMentionRequired?: boolean;
    mentionWidth?: { people: number; value?: number };
    onTab?: (e: React.KeyboardEvent<{}>) => void;
}

export interface IContentTextChangeProps {
    formattedText: string;
    value: string;
    mentionList: string[];
    rawValue?: string;
    backgroundColor?: string;
    justifyContent?: string;
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
    isMentionIncomplete?: boolean;
}

const linkifyPlugin = createLinkifyPlugin();

const inlineToolbarPlugin = createInlineToolbarPlugin({
    theme: {
        toolbarStyles: {
            toolbar: 'inline-toolbar',
        },
        buttonStyles: null,
    },
});
const { InlineToolbar } = inlineToolbarPlugin;
const PopOverContainerFun = (width, isPeopleMention) => PopOverContainer({ width, isPeopleMention });

class DraftEditor extends Component<IDraftEditorProps, IDraftEditorState> {
    private mentionSuggestionList: any;
    private peoplePopOverContainer: any;
    private valuePopOverContainer: any;

    public editorRef: React.RefObject<Editor>;
    private plugins: any[];
    observer: MutationObserver;
    constructor(props: IDraftEditorProps) {
        super(props);
        const { showMention, disableLinkify = false } = props;
        this.mentionSuggestionList = null;
        this.editorRef = React.createRef();
        this.peoplePopOverContainer = null;
        this.valuePopOverContainer = null;
        this.state = {
            editorState: this.getInitialState(),
            format: null,
            valueSearchOpen: false,
            peopleSearchOpen: false,
            suggestions: props.valueSuggestion,
            searchString: '',
            isMentionIncomplete: false,
        };

        this.plugins = [];
        if (this.props.inplaceToolbar) {
            this.plugins.push(inlineToolbarPlugin);
        }
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

    getInitialState() {
        const { initialContent, useBlockConversion } = this.props;
        if (useBlockConversion) {
            const blocksFromHTML = convertFromHTML(initialContent);
            // Added to support converting anchor tags to to entity from HTML orelse it wont be treated as link entity
            //ref:  https://github.com/facebook/draft-js/blob/main/examples/draft-0-10-0/link/link.html#L44
            const state = ContentState.createFromBlockArray(blocksFromHTML.contentBlocks, blocksFromHTML.entityMap);
            return EditorState.createWithContent(state);
        }
        return EditorState.createWithContent(convertFromHTMLString(initialContent));
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

    static getDerivedStateFromProps(nextProps) {
        if (nextProps.initialContent === '') {
            return {
                editorState: EditorState.createWithContent(convertFromHTMLString('')),
            };
        }
        return null;
    }

    sendFormat = (nextEditorState: EditorState) => {
        const { format: prevFormat } = this.state;
        const { onCurrentFormatChange } = this.props;
        const format = getFormat(nextEditorState);
        onCurrentFormatChange?.(format);
        return {
            // ...prevFormat,
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
        const selected = getFragmentFromSelection(editorState);
        return selected ? selected.map((x) => x.getText()).join('\n') : '';
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
        const { mentionWidth = { people: 220, value: 120 } } = this.props;
        let container = document.body.getElementsByClassName('mention-list-container')[0];
        if (!container) {
            container = document.createElement('div');
            container.className = 'mention-list-container';
            document.body.appendChild(container);
        }

        this.peoplePopOverContainer = PopOverContainerFun(mentionWidth.people, true);
        this.valuePopOverContainer = PopOverContainerFun(mentionWidth.value, true);

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
        this.addCornerPositioningToInlineToolbar();
    }

    componentWillUnmount() {
        if (this.observer) {
            this.observer.disconnect();
        }
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
        } else if (formatType === 'link') {
            const contentState = nextEditorState.getCurrentContent();
            const contentStateWithEntity = contentState.createEntity('LINK', 'MUTABLE', {
                url: value,
                /**
                 * "explicit" property is required to fix https://github.com/fedorovsky/draft-js-link-detection-plugin/issues/3
                 * ref - https://github.com/fedorovsky/draft-js-link-detection-plugin/blob/master/src/plugin/draft-js-link-detection-plugin.tsx#L188
                 *  VBI-4951
                 */
                explicit: true,
            });
            const entityKey = contentStateWithEntity.getLastCreatedEntityKey();

            // Apply entity
            nextEditorState = EditorState.set(nextEditorState, { currentContent: contentStateWithEntity });

            // Apply selection
            nextEditorState = RichUtils.toggleLink(nextEditorState, nextEditorState.getSelection(), entityKey);
        } else if (
            [formatKeys.orderedListItem, formatKeys.unorderedListItem, formatKeys.checkableListItem].includes(
                formatType,
            )
        ) {
            nextEditorState = RichUtils.toggleBlockType(nextEditorState, formatType);
        } else {
            nextEditorState = RichUtils.toggleInlineStyle(nextEditorState, formatType.toUpperCase());
        }
        const format = getFormat(nextEditorState);
        this.updateData(nextEditorState, format);
    };

    removeLink = () => {
        const selection = this.state.editorState.getSelection();
        if (!selection.isCollapsed()) {
            this.updateData(RichUtils.toggleLink(this.state.editorState, selection, null));
        }
    };

    onEditorStateChange = (editorStateUpdated: EditorState) => {
        this.props.onSelection?.(editorStateUpdated);
        this.updateData(editorStateUpdated);
    };

    updateData = (editorStateUpdated: EditorState, customFormat?: any) => {
        const { parsedValueMentionRequired } = this.props;
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
            if (rawData.entityMap[key].type === 'mention') {
                mentionList.push({
                    emailAddress: rawData.entityMap[key]?.data?.mention?.value,
                    fullName: rawData.entityMap[key]?.data?.mention?.name,
                    id: rawData.entityMap[key]?.data?.mention?.id,
                });
            }
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
        const editorState = selectAll(this.state.editorState);
        this.setState({
            editorState,
        });
        return editorState;
    };

    MentionComponents = () => {
        const { showMention, decorators } = this.props;
        const mentionPlugin_PREFIX_ONE = showMention.people
            ? createMentionPlugin({
                  mentionTrigger: MENTION_SUGGESTION_NAME.PREFIX_ONE,
                  supportWhitespace: false,
                  entityMutability: 'IMMUTABLE',
              })
            : { MentionSuggestions: null };
        const mentionPlugin_PREFIX_TWO = showMention.value
            ? createMentionPlugin({
                  mentionTrigger: [MENTION_SUGGESTION_NAME.PREFIX_TWO],
                  supportWhitespace: true,
                  entityMutability: 'IMMUTABLE',
                  mentionRegExp: '.',
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
            (suggestion) => !value || get(suggestion, 'name').toString().toLowerCase().indexOf(value) > -1,
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
                    inComplete = true;
                    setTimeout(() => {
                        this.addColorToSelectedText(value.length + 1, '#ff0000');
                    }, 200);
                }
            } else {
                inComplete = false;
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
        const { valueSearchOpen, searchString } = this.state;
        const { onTab } = this.props;
        if (onTab) onTab(e);
        if (valueSearchOpen) {
            if (e.key === 'Tab') {
                const value = (document.querySelector('.value-mention-item-focused') as HTMLElement)?.dataset.value;
                if (value) {
                    const mention = JSON.parse(value);
                    const isParent = mention.parent && mention.parent.length > 0;
                    const string = `${(isParent ? mention.parent : []).join('.')}${isParent ? '.' : ''}${
                        mention.label
                    }.`;

                    this.setState({ searchString: string });
                    this.onMouseDownMention(mention, searchString);
                    return 'handled';
                }
            }
        }
        return 'not-handled';
    };

    handleReturn = (e: React.KeyboardEvent<{}>) => {
        const { editorState, valueSearchOpen, searchString } = this.state;

        if (e.shiftKey) {
            this.setState({ editorState: RichUtils.insertSoftNewline(editorState) });
            return 'handled';
        }
        if (valueSearchOpen) {
            if (e.key === 'Enter') {
                const value = (document.querySelector('.value-mention-item-focused') as HTMLElement)?.dataset.value;
                if (value) {
                    const mention = JSON.parse(value);
                    const isParent = mention.parent && mention.parent.length > 0;
                    const string = `${(isParent ? mention.parent : []).join('.')}${isParent ? '.' : ''}${
                        mention.label
                    }.`;
                    this.setState({ searchString: string });
                    this.onMouseDownMention(mention, searchString);
                    return 'handled';
                }
            }
        }
        return 'not-handled';
    };

    keyBindingFn = (event): DraftEditorCommand => {
        if ((KeyBindingUtil.hasCommandModifier(event) && event.keyCode === Key.Enter) || event.keyCode === Key.Escape) {
            return 'submit' as DraftEditorCommand;
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
            this.editorRef.current?.focus();
        }, 200);
    };

    insertTextAtCursor = (textToInsert: string, offset: number = 0, textColor?: string, replaceSelection = false) => {
        const { editorState } = this.state;
        const { onFocus } = this.props;
        const textInlineStyle = textColor ? `color__${textColor}` : '';
        const currentContent = editorState.getCurrentContent();
        let currentSelection = editorState.getSelection();
        if (!replaceSelection) {
            currentSelection = this.moveCursorToEndOfSelection(currentSelection, offset);
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
            this.editorRef.current?.focus();
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
            id: Date.now(),
        });
        const entityKey = stateWithEntity.getLastCreatedEntityKey();
        stateWithEntity.mergeEntityData(entityKey, { ['id']: entityKey });
        let currentSelection = editorState.getSelection();
        if (!replaceSelection) {
            currentSelection = this.moveCursorToEndOfSelection(currentSelection, offset);
        }
        const stateWithText = Modifier.replaceText(stateWithEntity, currentSelection, key, null, entityKey);
        this.updateData(EditorState.push(editorState, stateWithText, 'insert-fragment'));
        setTimeout(() => {
            // after adding selected text, reset focus ref
            this.editorRef.current?.focus();
            // onFocus && onFocus();
        }, 200);
    };

    onOutsideClick = () => {
        this.setState({ valueSearchOpen: false });
    };

    getEditorContainerRect = () => {
        if (this.editorRef.current) {
            return this.editorRef.current?.getEditorRef().editor.getBoundingClientRect();
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

    private moveCursorToEndOfSelection(currentSelection: SelectionState, offset: number) {
        const nextOffSet = currentSelection.getFocusOffset();
        const focusKey = currentSelection.getFocusKey();
        currentSelection = currentSelection.merge({
            focusOffset: nextOffSet,
            anchorOffset: nextOffSet - offset,
            anchorKey: focusKey,
            focusKey: focusKey,
        });
        return currentSelection;
    }

    /**
     * draft editor doesent automatically position the inline toolbar to left when there is no space in the right, it just cuts the element.
     * this logic will modify the position left depeinding on whether space is available in the left
     * Note - this only handle right side overflow which is enough for inforiver.
     */
    addCornerPositioningToInlineToolbar() {
        const inlineToolbar = document.querySelector('.inline-toolbar');
        if (inlineToolbar) {
            this.observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation, index) => {
                    const element = mutation.target as HTMLElement;
                    if (mutation.type === 'attributes' && index === mutations.length - 1) {
                        setTimeout(() => {
                            const rect = element.getBoundingClientRect();
                            const right = rect.x + rect.width;
                            if (right > document.body.offsetWidth) {
                                const offset = right - document.body.offsetWidth;
                                const oldLeft = element.style.left;
                                try {
                                    const oldLeftWithoutPx = Number(oldLeft.split('px')[0]);
                                    element.style.left = `${oldLeftWithoutPx - offset}px`;
                                } catch (error) {
                                    console.log(error);
                                }
                            }
                        }, 30);
                    }
                });
            });
            this.observer.observe(inlineToolbar, {
                attributes: true,
            });
        }
    }

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
        const { getMentionDataById, onValueMentionInput, parsedValueMentionRequired } = this.props;
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
            const data = mention.isKpiMention ? mention : getMentionDataById(mention.id);

            this.insertEntityAtCursor(
                data,
                parsedValueMentionRequired ? data.value : data.title,
                mention.isKpiMention ? 'mention' : '#mention',
                length + 1,
            );
            onValueMentionInput('');
            this.setState({ valueSearchOpen: false, searchString: '' });
            return;
        }
        const isParent = mention.parent && mention.parent.length > 0;
        const string = `${(isParent ? mention.parent : []).join('.')}${isParent ? '.' : ''}${mention.label}.`;
        this.insertTextAtCursor(string, length, '#333');
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
            inplaceToolbar,
            onBlur,
            onFocus,
            valueSuggestion,
            ValuePopOverProps,
            onValueMentionInput,
            mentionWidth = { people: 220, value: 120 },
        } = this.props;
        const { editorState, peopleSearchOpen, valueSearchOpen, suggestions, format } = this.state;
        const MentionComp = this.mentionSuggestionList?.MentionSuggestions;
        const ValueMentionComp = this.mentionSuggestionList?.ValueSuggestion;
        const isMentionOpen = peopleSearchOpen || valueSearchOpen;
        let keyBindingFn = (isMentionOpen ? undefined : this.props.customKeyBinder ?? this.keyBindingFn) as unknown as (
            event: React.KeyboardEvent<Element>,
        ) => string;
        const SuggestionListComp = onValueMentionInput
            ? ValueMentionSuggestionList({
                  onmousedown: this.onMouseDownMention,
              })
            : SuggestionList;

        const PopOverContainerMention = ValuePopOverProps ? ValuePopOverProps : this.valuePopOverContainer;
        const valueSuggestionList = onValueMentionInput ? valueSuggestion : suggestions;
        const setFormat = this.setFormat;
        // decorator for link only works when its passed from `decorator` prop.
        const decorators = this.props.linkDecorator ? [this.props.linkDecorator] : [];
        return (
            <Fragment>
                {!inplaceToolbar &&
                    toolbarComponent &&
                    React.cloneElement(toolbarComponent, {
                        currentFormat: format,
                        setFormat: this.setFormat,
                        removeLink: this.removeLink,
                        selectAll: this.selectAll,
                        hasSelection: !!this.getSelection().length && editorState.getSelection().getHasFocus(),
                    })}
                <Editor
                    ref={this.editorRef}
                    keyBindingFn={keyBindingFn}
                    handleReturn={this.handleReturn}
                    onTab={this.onTab}
                    customStyleFn={resolveCustomStyleMap}
                    preserveSelectionOnBlur
                    stripPastedStyles
                    editorState={editorState}
                    placeholder={placeholder}
                    decorators={decorators}
                    onChange={this.onEditorStateChange}
                    textAlignment={textAlignment as any}
                    handleKeyCommand={this.handleKeyCommand}
                    customStyleMap={CUSTOM_STYLE_MAP}
                    plugins={this.plugins}
                    readOnly={readOnly}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    onCopy={onDraftEditorCopy}
                    onCut={onDraftEditorCut}
                    handlePastedText={this.handlePastedText}
                    blockStyleFn={this.blockStyleFn}
                />
                {toolbarComponent && inplaceToolbar && (
                    <InlineToolbar>
                        {(externalProps) => (
                            <>
                                {React.cloneElement(toolbarComponent, {
                                    currentFormat: format,
                                    setFormat,
                                    onOverrideContent: externalProps.onOverrideContent,
                                    externalProps,
                                    removeLink: this.removeLink,
                                    hasSelection:
                                        !!this.getSelection().length && editorState.getSelection().getHasFocus(),
                                })}
                            </>
                        )}
                    </InlineToolbar>
                )}
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
                        popoverContainer={this.peoplePopOverContainer}
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
