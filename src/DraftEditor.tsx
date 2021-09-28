import { default as Editor } from '@draft-js-plugins/editor';
import createMentionPlugin, { defaultSuggestionsFilter } from '@draft-js-plugins/mention';
import '@draft-js-plugins/mention/lib/plugin.css';
// import { mentionsStyles } from './Styles';
// import { Editor, createPlugin, pluginUtils } from "draft-extend";
import { convertToHTML } from 'draft-convert';
import { convertToRaw, DraftStyleMap, EditorState, RichUtils, SelectionState } from 'draft-js';
import 'draft-js/dist/Draft.css';
import React, { Component, Fragment, ReactElement } from 'react';
import { SuggestionList } from './Mention';
import {
    convertFromHTMLString,
    formatText,
    getContentFromEditorState,
    getFormat,
    IDraftElementFormats,
    resolveCustomStyleMap,
} from './Service/draftEditor';
import { formatKeys } from './Service/UIconstants';
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
}

export interface IDraftEditorRef {
    setFormat: (formatType: string, value: string) => void;
    setContent: (content: string) => string;
}

const CUSTOM_STYLE_MAP: DraftStyleMap = {
    SUPERSCRIPT: {
        verticalAlign: 'super',
        fontSize: 'smaller',
    },
    SUBSCRIPT: {
        verticalAlign: 'sub',
        fontSize: 'smaller',
    },
};

const MENTION_SUGGESTION_NAME = {
    PREFIX_ONE: '@',
    PREFIX_TWO: '#',
};

const PopOverContainer =(isMentionLoading:boolean = false) => (props) => {
    const boundingRect = props.store.getReferenceElement()?.getBoundingClientRect();
    if (!boundingRect || isMentionLoading) {
        return null;
    }
    const style: React.CSSProperties = boundingRect
        ? {
              position: boundingRect ? 'fixed' : null,
              left: boundingRect?.left + 20,
              top: boundingRect?.top + 10,
              backgroundColor: '#fff',
              zIndex: 1000,
              boxShadow: '0px 4px 4px rgb(0 0 0 / 25%)',
              maxHeight: '160px',
              overflowY: 'auto',
          }
        : null;
    return <div className="mention-list" style={style}>{props.children}</div>;
};

const mentionAnchorStyle: React.CSSProperties = {
    paddingLeft: '2px',
    paddingRight: '2px',
    borderRadius: '2px',
    textDecoration: 'none',
};
const convertToHTMLString = (editorState: EditorState) => {
    return convertToHTML({
        styleToHTML: (style) => {
            if (style === formatKeys.bold.toUpperCase()) {
                return <b />;
            } else if (style === formatKeys.italic.toUpperCase()) {
                return <em />;
            } else if (style === formatKeys.superScript.toUpperCase()) {
                return <sup />;
            } else if (style === formatKeys.subScript.toUpperCase()) {
                return <sub />;
            } else if (style.includes('__')) {
                const [type, height] = style.split('__');
                return {
                    start: `<span style="${type}: ${height}">`,
                    end: `</span>`,
                    empty: '<br/>',
                };
            }
        },
        blockToHTML: (block) => {
            if (block.text === '') {
                return <br />;
            }
        },
        entityToHTML: (entity, originalText) => {
            if (entity.type === 'mention') {
                return (
                    <span
                        className="mention"
                        style={{ ...mentionAnchorStyle, color: '#ba55d3' }}
                        data-value={JSON.stringify({
                            ...entity.data.mention,
                            image: '',
                            avatar: '',
                        })}
                    >
                        {originalText}
                    </span>
                );
            } else if (entity.type === '#mention') {
                return (
                    <span
                        className="hash-mention"
                        style={{ ...mentionAnchorStyle }}
                        data-value={JSON.stringify({
                            ...entity.data.mention,
                            image: '',
                            avatar: '',
                        })}
                    >
                        {originalText}
                    </span>
                );
            }
            return originalText;
        },
    })(editorState.getCurrentContent());
};
class DraftEditor extends Component<IDraftEditorProps, any> {
    private mentionSuggestionList: any;
    private editorRef:any;
    constructor(props: IDraftEditorProps) {
        super(props);
        const { initialContent, peopleSuggestion, showMention } = props;
        this.mentionSuggestionList = null;
        // this.editorRef =  React.createRef();
        this.state = {
            editorState: EditorState.createWithContent(convertFromHTMLString(initialContent)),
            currentFormat: null,
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

    // componentDidMount() {
    //     this.editorRef.current!.focus();
    // }

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
            ].includes(formatType)
        ) {
            nextEditorState = formatText(nextEditorState, formatType, `${formatType}__${value}`);
        } else nextEditorState = RichUtils.toggleInlineStyle(nextEditorState, formatType.toUpperCase());
        this.updateData(nextEditorState);
    };

    onEditorStateChange = (editorStateUpdated: EditorState) => {
        // const editorState = this.onEditorTextChange(editorStateUpdated);
        this.updateData(editorStateUpdated);
    };

    updateData = (editorStateUpdated: EditorState) => {
        const { onContentTextChange, onContentChange } = this.props;
        const { peopleSearchOpen } = this.state;
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
        const htmlText = convertToHTMLString(editorStateUpdated);
        onContentTextChange?.({
            formattedText: value,
            value: htmlText,
            mentionList,
            rawValue: getContentFromEditorState(editorStateUpdated),
        });
        onContentChange?.(htmlText);
    };

    onEditorTextChange = (editorStateUpdated: EditorState) => {
        const html = convertToHTMLString(editorStateUpdated);
        const editorState = EditorState.createWithContent(convertFromHTMLString(html));

        this.setState({
            editorState: editorState,
        });
        return editorState;
    };

    handleKeyCommand = (command: string, editorStateUpdated: EditorState) => {
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
        this.setState({ [searchKey]: _open });
    };
    onSearchChange = ({ trigger, value }: { trigger: string; value: string }) => {
        const { onMentionInput, valueSuggestion } = this.props;
        if (trigger === MENTION_SUGGESTION_NAME.PREFIX_ONE) {
            onMentionInput(value);
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
    render() {
        const { textAlignment, toolbarComponent, peopleSuggestion, isMentionLoading, placeholder } = this.props;
        const { editorState, peopleSearchOpen, valueSearchOpen, suggestions, format } = this.state;
        const MentionComp = this.mentionSuggestionList?.MentionSuggestions;
        const ValueMentionComp = this.mentionSuggestionList?.ValueSuggestion;

        return (
            <Fragment>
                {toolbarComponent &&
                    React.cloneElement(toolbarComponent, { currentFormat: format, setFormat: this.setFormat })}
                <Editor                    
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
                />
                <div className="list_container">
                    {peopleSearchOpen && isMentionLoading && (
                        <ul>
                            <div className="menu-loading"></div>
                        </ul>
                    )}
                    {peopleSearchOpen && !isMentionLoading && peopleSuggestion.length === 0 && (
                        <ul style={{ padding: '0 10px' }}>No Data found</ul>
                    )}
                </div>
                {MentionComp && (
                    <MentionComp
                        open={peopleSearchOpen}
                        onOpenChange={this.onOpenChange('peopleSearchOpen')}
                        suggestions={peopleSuggestion}
                        onSearchChange={this.onSearchChange}
                        entryComponent={SuggestionList}                 
                        popoverContainer={PopOverContainer(isMentionLoading)}
                    />
                )}
                {ValueMentionComp && (
                    <ValueMentionComp
                        open={valueSearchOpen}
                        onOpenChange={this.onOpenChange('valueSearchOpen')}
                        suggestions={suggestions}
                        onSearchChange={this.onSearchChange}                  
                        entryComponent={SuggestionList}
                        popoverContainer={PopOverContainer()}
                    />
                )}
            </Fragment>
        );
    }
}

export default DraftEditor;
