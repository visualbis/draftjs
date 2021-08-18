import { default as Editor } from '@draft-js-plugins/editor';
import { InlineCreators, stateFromHTML } from '@shelterzoom/draft-js-import-html';
import { convertToRaw, DraftInlineStyle, DraftStyleMap, EditorState, Modifier, RichUtils } from 'draft-js';
import 'draft-js/dist/Draft.css';
import draftToHtml from 'draftjs-to-html';
import React, { Component, Fragment } from 'react';
import DraftToolbar, { IDraftElementFormats } from './DraftToolbar/DraftToolbar';
import './Styles';
import createMentionPlugin, {
    defaultSuggestionsFilter,
} from '@draft-js-plugins/mention';
import { SuggestionList } from "./Mention";
import { MentionDataValue } from './MentionData';


// import { Editor, createPlugin, pluginUtils } from "draft-extend";
import { convertToHTML, convertFromHTML } from "draft-convert";


interface IDraftEditorProps {
    initialContent?: string;
    textAlignment?: string;
    onContentChange?: (content: string) => void;
    onContentTextChange?: (content: { formattedText: string, value: string, mentionList :string[]}) => void;
    onCurrentFormatChange?: (formats: IDraftElementFormats) => void;
    showToolbar?: boolean;
    toolbarOptions?:string[];
    innerRef?: any;
    showMention?: { value: boolean, people: boolean};
    onMentionInput?:(value:string) => void;
    peopleSuggestion?: any[];
    valueSuggestion?: any[];
    isMentionLoading?:boolean;
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
    PREFIX_ONE:"@",
    PREFIX_TWO:"#"
}

const resolveCustomStyleMap = (style: DraftInlineStyle) => {
    const colObj = {} as React.CSSProperties;
    style.forEach((styleKey) => {
        if (styleKey) {
            if (styleKey.includes('color-')) {
                const [, color] = styleKey.split('color-');
                colObj.color = color;
            } else if (styleKey.includes('backgroundColor-')) {
                const [, backgroundColor] = styleKey.split('backgroundColor-');
                colObj.backgroundColor = backgroundColor;
            } else if (styleKey.includes('fontfamily-')) {
                const [, font] = styleKey.split('fontfamily-');
                colObj.fontFamily = font;
            } else if (styleKey.includes('fontsize-')) {
                const [, size] = styleKey.split('fontsize-');
                colObj.fontSize = size;
            }
        }
    });
    return colObj;
};

const getEditorStateFromContent = (content: string) => {
    const importOptions = {
        customInlineFn: (htmlElement: HTMLElement, { Style, Entity }: InlineCreators) => {
            const styles = [];
            if (htmlElement.style.color) {
                styles.push(`color-${htmlElement.style.color}`);
            }
            if (htmlElement.style.backgroundColor) {
                styles.push(`backgroundColor-${htmlElement.style.backgroundColor}`);
            }
            if (htmlElement.style.fontFamily) {
                styles.push(`fontfamily-${htmlElement.style.fontFamily}`);
            }
            if (htmlElement.style.fontSize) {
                styles.push(`fontsize-${htmlElement.style.fontSize}`);
            }
            if (htmlElement.tagName === 'SUB') {
                styles.push('SUBSCRIPT');
            }
            if (htmlElement.tagName === 'SUP') {
                styles.push('SUPERSCRIPT');
            }
            return styles.length ? Style(styles) : null;
        },
        
    };

    const contentState = stateFromHTML(content, importOptions);
    
    return EditorState.createWithContent(contentState);
};

const getFormat = (editorStateData: EditorState) => {
    const style = editorStateData.getCurrentInlineStyle();
    const format: IDraftElementFormats = {
        bold: style.has('BOLD'),
        italic: style.has('ITALIC'),
        underline: style.has('UNDERLINE'),
        subScript: style.has('SUBSCRIPT'),
        superScript: style.has('SUPERSCRIPT'),
    };
    style.forEach((styleKey) => {
        if (styleKey) {
            if (styleKey.includes('color-')) {
                const [, color] = styleKey.split('color-');
                format.color = color;
            } else if (styleKey.includes('backgroundColor-')) {
                const [, backgroundColor] = styleKey.split('backgroundColor-');
                format.backgroundColor = backgroundColor;
            } else if (styleKey.includes('fontfamily-')) {
                const [, font] = styleKey.split('fontfamily-');
                try {
                    format.font = JSON.parse(font);
                } catch (error) {
                    format.font = font;
                }
            } else if (styleKey.includes('fontsize-')) {
                const [, size] = styleKey.split('fontsize-');
                format.size = size;
            }
        }
    });

    return format;
};

const formatText = (editorState: EditorState, formatType: string, value: string) => {
    const selection = editorState.getSelection();
    let contentState = editorState.getCurrentContent();

    const currentStyleBefore = editorState.getCurrentInlineStyle();

    currentStyleBefore.forEach((color) => {
        if (color && color.includes(`${formatType}-`)) {
            contentState = Modifier.removeInlineStyle(contentState, selection, color);
        }
    });

    let nextEditorState = EditorState.push(editorState, contentState, 'change-inline-style');

    const currentStyle = editorState.getCurrentInlineStyle();
    if (selection.isCollapsed()) {
        nextEditorState = currentStyle.reduce(
            (state, color) => RichUtils.toggleInlineStyle(state, color),
            nextEditorState,
        );
    }
    if (!currentStyle.has(value)) {
        nextEditorState = RichUtils.toggleInlineStyle(nextEditorState, value);
    }
    return nextEditorState;
};

const getContentFromEditorState = (editorStateUpdated: EditorState) => {
    const rawContentState = convertToRaw(editorStateUpdated.getCurrentContent());
    return draftToHtml(rawContentState);
};

const convertToHTMLString = (editorState) =>{
    return convertToHTML({
        styleToHTML: (style) => {
          if (style === 'BOLD') {
            return <span style={{color: 'blue'}} />;
          }
        },
        blockToHTML: (block) => {
          if (block.type === 'PARAGRAPH') {
            return <p />;
          }
        },
        entityToHTML: (entity, originalText) => {
          if (entity.type === 'mention') {
            return <span className="mention" style={{backgroundColor: 'blue'}}data-value={JSON.stringify({...entity.data.mention, image:"", avatar:""})} >{originalText}</span>;
          } else if(entity.type === '#mention'){
            return <span className="hash-mention" style={{backgroundColor: 'orange'}} data-value={JSON.stringify({...entity.data.mention, image:"", avatar:""})} >{originalText}</span>
          }
          return originalText;
        }
    })(editorState.getCurrentContent());
}

const convertFromHTMLString = (html) => {
    if(!html) {
        html = ""
    }
    return convertFromHTML({
        htmlToStyle: (nodeName, node, currentStyle) => {
            if (nodeName === 'span' && node.style.color === 'blue') {
                return currentStyle.add('BLUE');
            } else {
                return currentStyle;
            }
        },
        htmlToEntity: (nodeName, node, createEntity) => {
            if (nodeName === 'span' && node.classList.contains('mention')) {
                const data = JSON.parse(node.dataset.value);
                return createEntity(
                    'MENTION',
                    'IMMUTABLE',
                    {mention: {name:data.name, ...data}}
                )
            } else if(nodeName === 'span' && node.classList.contains('hash-mention')) {
                const data = JSON.parse(node.dataset.value);
                return createEntity(
                    'MENTION',
                    'IMMUTABLE',
                    {mention: {name:data.name, ...data}}
                )
            }
        },
        htmlToBlock: (nodeName, node) => {
            if (nodeName === 'blockquote') {
                return {
                    type: 'blockquote',
                    data: {}
                };
            }
        }
    })(html);
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
        if(showMention && (showMention.people || showMention.value)) {
            this.MentionComponents();
        }
    }    


    sendFormat = (nextEditorState: EditorState) => {
        const { format:prevFormat } = this.state;
        const { onCurrentFormatChange } = this.props;
        const format = getFormat(nextEditorState);
        this.setState({
            format: {
                ...prevFormat,
                ...format
            }
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
        Object.keys(rawData.entityMap).forEach(key=> {
            if(rawData.entityMap[key].type === '#mention') {
                return;
            }
            mentionList.push({"emailAddress" : rawData.entityMap[key].data.mention.value});

        })        
        const value = rawData.blocks.map(block => (!block.text.trim() && '\n') || block.text).join('\n');
        onContentTextChange?.({formattedText: value,
        value: convertToHTMLString(editorStateUpdated), mentionList })
        this.sendFormat(editorStateUpdated);
    };

    onEditorTextChange= (editorStateUpdated:EditorState) => {
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
        const mentionPlugin_PREFIX_ONE = showMention.people ? createMentionPlugin({ mentionTrigger: MENTION_SUGGESTION_NAME.PREFIX_ONE }): {MentionSuggestions: null};
        const mentionPlugin_PREFIX_TWO = showMention.value ? createMentionPlugin({ mentionTrigger: MENTION_SUGGESTION_NAME.PREFIX_TWO }): {MentionSuggestions: null};


        // eslint-disable-next-line no-shadow
        const { MentionSuggestions } = mentionPlugin_PREFIX_ONE;
        const { MentionSuggestions : ValueSuggestion } = mentionPlugin_PREFIX_TWO;

        
        // eslint-disable-next-line no-shadow
        const plugins = [];
        if(showMention.people) {
            plugins.push(mentionPlugin_PREFIX_ONE)
        }
        if(showMention.value) {
            plugins.push(mentionPlugin_PREFIX_TWO)
        }

        this.mentionSuggestionList = { plugins, MentionSuggestions, ValueSuggestion }
        return this.mentionSuggestionList;
    }

    onOpenChange =(searchKey: string) =>  (_open: boolean) => {
        const { onMentionInput } = this.props;
        this.setState({ [searchKey]: _open })
    };
    onSearchChange = ({trigger, value }: {trigger:string, value: string }) => {
        const { onMentionInput, valueSuggestion } = this.props;
        if(trigger === MENTION_SUGGESTION_NAME.PREFIX_ONE){
            onMentionInput(value);
        }else{
            this.setState({ suggestions: defaultSuggestionsFilter(value,  valueSuggestion)})
        }
    };
    render() {
        const { textAlignment, showToolbar,  peopleSuggestion, isMentionLoading  } = this.props;
        const { editorState, currentFormat, peopleSearchOpen, valueSearchOpen, suggestions ,format} = this.state;        
        const MentionComp = this.mentionSuggestionList?.MentionSuggestions
        const ValueMentionComp = this.mentionSuggestionList?.ValueSuggestion


        return (
            <Fragment>
                {showToolbar && <DraftToolbar currentFormat={format} setFormat={this.setFormat} />}
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
                        {peopleSearchOpen && !isMentionLoading && peopleSuggestion.length === 0 &&  (
                            <ul style={{padding:"0 10px"}}>
                                No Data found
                            </ul>
                        )}
                       { MentionComp && !isMentionLoading && (<MentionComp
                            open={peopleSearchOpen}
                            onOpenChange={this.onOpenChange('peopleSearchOpen')}
                            suggestions={peopleSuggestion}
                            onSearchChange={this.onSearchChange}                            
                            entryComponent={SuggestionList}
                            popoverContainer={({ children }) => <div>{children}</div>}
                        />
                       )}
                        { ValueMentionComp && 
                            (<ValueMentionComp
                                open={valueSearchOpen}
                                onOpenChange={this.onOpenChange('valueSearchOpen')}
                                suggestions={suggestions}
                                onSearchChange={this.onSearchChange}
                                onAddMention={() => {
                                    // get the mention object selected
                                }}
                                entryComponent={SuggestionList}
                                popoverContainer={({ children }) => <div>{children}</div>}
                            />)
                        }
                    </div>            
            </Fragment>
        );
    }
};

export default DraftEditor;