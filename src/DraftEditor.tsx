import { default as Editor } from '@draft-js-plugins/editor';
import { InlineCreators, stateFromHTML } from '@shelterzoom/draft-js-import-html';
import { convertToRaw, DraftInlineStyle, DraftStyleMap, EditorState, Modifier, RichUtils } from 'draft-js';
import 'draft-js/dist/Draft.css';
import draftToHtml from 'draftjs-to-html';
import React, { Component, Fragment } from 'react';
import { SuggestionList } from './Mention'
import DraftToolbar, { IDraftElementFormats } from './DraftToolbar/DraftToolbar';
import './Styles';
import createMentionPlugin, {
    defaultSuggestionsFilter,
} from '@draft-js-plugins/mention';
import "@draft-js-plugins/mention/lib/plugin.css";
import  { convertFromHTMLString, resolveCustomStyleMap, formatText, getFormat, getContentFromEditorState } from './Service/draftEditor'
import { mentionsStyles } from './Styles';
// import { Editor, createPlugin, pluginUtils } from "draft-extend";
import { convertToHTML, convertFromHTML } from "draft-convert";


interface IDraftEditorProps {
    initialContent?: string;
    textAlignment?: string;
    onContentChange?: (content: string) => void;
    onContentTextChange?: (content: { formattedText: string, value: string, mentionList: string[] }) => void;
    onCurrentFormatChange?: (formats: IDraftElementFormats) => void;
    showToolbar?: boolean;
    innerRef?: any;
    showMention?: { value: boolean, people: boolean };
    onMentionInput?: (value: string) => void;
    peopleSuggestion?: any[];
    valueSuggestion?: any[];
    isMentionLoading?: boolean;
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
    PREFIX_ONE: "@",
    PREFIX_TWO: "#"
}

const PopOverConatiner = (props) => {
    debugger;
    const boudingRect = props.store.getReferenceElement()?.getBoundingClientRect();
    if (!boudingRect) {
        return null
    }
    const style: React.CSSProperties = boudingRect ? { position: boudingRect ? "fixed" : null, left: boudingRect?.left + 20, top: boudingRect?.top + 10, backgroundColor: "#fff", zIndex: 1000, boxShadow: '0px 4px 4px rgb(0 0 0 / 25%)', maxHeight: '160px', overflowY: "auto" } : null;
    return (<div style={style}>{props.children}</div>)
}

const convertToHTMLString = (editorState) => {
    return convertToHTML({
        styleToHTML: (style) => {
            if (style === 'BOLD') {
                return <span style={{ color: 'blue' }} />;
            }
        },
        blockToHTML: (block) => {
            if (block.type === 'PARAGRAPH') {
                return <p />;
            }
        },
        entityToHTML: (entity, originalText) => {
            if (entity.type === 'mention') {
                return <a href={entity.data.mention.link} className="mention" style={{ backgroundColor: 'blue' }} data-value={JSON.stringify({ ...entity.data.mention, image: "", avatar: "" })} >{originalText}</a>;
            } else if (entity.type === '#mention') {
                return <a href={entity.data.mention.link} className="hash-mention" style={{ backgroundColor: 'orange' }} data-value={JSON.stringify({ ...entity.data.mention, image: "", avatar: "" })} >{originalText}</a>
            }
            return originalText;
        }
    })(editorState.getCurrentContent());
}
class DraftEditor extends Component<IDraftEditorProps, any> {
    private mentionSuggestionList: any
    constructor(props: IDraftEditorProps) {
        super(props);
        const { initialContent, peopleSuggestion, showMention } = props;
        this.mentionSuggestionList = null;
        this.state = {
            editorState: EditorState.createWithContent(convertFromHTMLString(initialContent)),
            currentFormat: null,
            valueSearchOpen: false,
            peopleSearchOpen: false,
            suggestions: props.valueSuggestion,
        }
        if (showMention && (showMention.people || showMention.value)) {
            this.MentionComponents();
        }
    }


    sendFormat = (nextEditorState: EditorState) => {
        const { onCurrentFormatChange } = this.props;
        const format = getFormat(nextEditorState);
        this.setState({
            format
        });
        onCurrentFormatChange?.(format);
    };

    setContent = (content: string) => {
        const updatedEditorState = EditorState.createWithContent(convertFromHTMLString(content));
        this.updateData(updatedEditorState);
        return getContentFromEditorState(updatedEditorState);
    };

    setFormat = (formatType: string, value: string) => {
        let nextEditorState = null;
        const { editorState } = this.state;
        if (['fontfamily', 'color', 'fontsize', 'backgroundColor'].includes(formatType)) {
            nextEditorState = formatText(editorState, formatType, `${formatType}-${value}`);
        } else nextEditorState = RichUtils.toggleInlineStyle(editorState, formatType.toUpperCase());
        this.updateData(nextEditorState);
    };

    onEditorStateChange = (editorStateUpdated: EditorState) => {
        // const editorState = this.onEditorTextChange(editorStateUpdated);
        this.updateData(editorStateUpdated);
    };


    updateData = (editorStateUpdated: EditorState) => {
        const { onContentTextChange } = this.props;
        this.setState({
            editorState: editorStateUpdated,
        });
        const rawData = convertToRaw(editorStateUpdated.getCurrentContent());
        const mentionList = []
        Object.keys(rawData.entityMap).forEach(key => {
            if (rawData.entityMap[key].type === '#mention') {
                return;
            }
            mentionList.push({ "emailAddress": rawData.entityMap[key].data.mention.value });

        })
        const value = rawData.blocks.map(block => (!block.text.trim() && '\n') || block.text).join('\n');
        onContentTextChange?.({
            formattedText: value,
            value: convertToHTMLString(editorStateUpdated), mentionList
        })
        this.sendFormat(editorStateUpdated);
    };

    onEditorTextChange = (editorStateUpdated: EditorState) => {
        const html = convertToHTMLString(editorStateUpdated)
        const editorState = EditorState.createWithContent(convertFromHTMLString(html))

        this.setState({
            editorState: editorState,
        });
        return editorState;
    }

    handleKeyCommand = (command: string, editorStateUpdated: EditorState) => {
        const newState = RichUtils.handleKeyCommand(editorStateUpdated, command);
        if (newState) {
            this.updateData(newState);
            return 'handled';
        }
        return 'not-handled';
    };

    MentionComponents = () => {
        const { showMention } = this.props;
        const mentionPlugin_PREFIX_ONE = showMention.people ? createMentionPlugin({ mentionTrigger: MENTION_SUGGESTION_NAME.PREFIX_ONE, supportWhitespace: false, entityMutability: 'IMMUTABLE' }) : { MentionSuggestions: null };
        const mentionPlugin_PREFIX_TWO = showMention.value ? createMentionPlugin({ mentionTrigger: MENTION_SUGGESTION_NAME.PREFIX_TWO, supportWhitespace: false, entityMutability: 'IMMUTABLE' }) : { MentionSuggestions: null };


        // eslint-disable-next-line no-shadow
        const { MentionSuggestions } = mentionPlugin_PREFIX_ONE;
        const { MentionSuggestions: ValueSuggestion } = mentionPlugin_PREFIX_TWO;


        // eslint-disable-next-line no-shadow
        const plugins = [];
        if (showMention.people) {
            plugins.push(mentionPlugin_PREFIX_ONE)
        }
        if (showMention.value) {
            plugins.push(mentionPlugin_PREFIX_TWO)
        }

        this.mentionSuggestionList = { plugins, MentionSuggestions, ValueSuggestion }
        return this.mentionSuggestionList;
    }

    onOpenChange = (searchKey: string) => (_open: boolean) => {
        this.setState({ [searchKey]: _open })
    };
    onSearchChange = ({ trigger, value }: { trigger: string, value: string }) => {
        const { onMentionInput, valueSuggestion } = this.props;
        if (trigger === MENTION_SUGGESTION_NAME.PREFIX_ONE) {
            onMentionInput(value);
        } else {
            this.setState({ suggestions: defaultSuggestionsFilter(value, valueSuggestion) })
        }
    };
    render() {
        const { textAlignment, showToolbar, peopleSuggestion, isMentionLoading } = this.props;
        const { editorState, currentFormat, peopleSearchOpen, valueSearchOpen, suggestions } = this.state;
        const MentionComp = this.mentionSuggestionList?.MentionSuggestions
        const ValueMentionComp = this.mentionSuggestionList?.ValueSuggestion


        return (
            <Fragment>
                {showToolbar && <DraftToolbar currentFormat={currentFormat} setFormat={this.setFormat} />}
                {/* <div
                    className={editorStyles.editor}
                    onClick={() => {
                        ref.current!.focus();
                    }}
                    > */}
                <Editor
                    customStyleFn={resolveCustomStyleMap}
                    preserveSelectionOnBlur
                    stripPastedStyles
                    editorState={editorState}
                    onChange={this.onEditorStateChange}
                    textAlignment={textAlignment as any}
                    handleKeyCommand={this.handleKeyCommand}
                    customStyleMap={CUSTOM_STYLE_MAP}
                    plugins={this.mentionSuggestionList?.plugins}
                />
                <div className="list_container">
                    {peopleSearchOpen && isMentionLoading && (
                        <ul >
                            <div className="menu-loading"></div>
                        </ul>
                    )}
                    {peopleSearchOpen && !isMentionLoading && peopleSuggestion.length === 0 && (
                        <ul style={{ padding: "0 10px" }}>
                            No Data found
                        </ul>
                    )}
                </div>
                {MentionComp && !isMentionLoading && (<MentionComp
                    open={peopleSearchOpen}
                    onOpenChange={this.onOpenChange('peopleSearchOpen')}
                    suggestions={peopleSuggestion}
                    onSearchChange={this.onSearchChange}
                    entryComponent={SuggestionList}
                    // onAddMention={() => {
                    //     this.onOpenChange('peopleSearchOpen')(false)
                    // }}
                    popoverContainer={PopOverConatiner}
                />
                )}
                {ValueMentionComp &&
                    (<ValueMentionComp
                        open={valueSearchOpen}
                        onOpenChange={this.onOpenChange('valueSearchOpen')}
                        suggestions={suggestions}
                        onSearchChange={this.onSearchChange}
                        // onAddMention={() => {
                        //     this.onOpenChange('valueSearchOpen')(false)
                        // }}
                        entryComponent={SuggestionList}
                        popoverContainer={PopOverConatiner}
                    />)
                }
                {/* </div> */}
                {/* </>             */}
            </Fragment>
        );
    }
};

export default DraftEditor;