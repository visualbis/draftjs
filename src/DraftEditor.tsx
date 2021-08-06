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
    MentionData,
    MentionPluginTheme,
} from '@draft-js-plugins/mention';
import CustomMentionEditor, { SuggestionList } from "./Mention";
import mentionData from './MentionData';


interface IDraftEditorProps {
    initialContent?: string;
    textAlignment?: string;
    onContentChange?: (content: string) => void;
    onContentTextChange?: (content: { formattedText: string, value: string, mentionList :string[]}) => void;
    onCurrentFormatChange?: (formats: IDraftElementFormats) => void;
    showToolbar?: boolean;
    innerRef?: any;
    showMention?: boolean;
    onMentionInput?:(value:string) => string[];
    searchSuggestion?: string[];
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
    const customEntityTransform = (entity, text) => {
        debugger;
        if (entity.type !== 'mention') return;
        // eslint-disable-next-line consistent-return
        return `<span "data-mention-value"= "${entity.data.mention.value}" >${entity.data.mention.name}</span>`;
      };
    return draftToHtml(rawContentState, {}, false, customEntityTransform);
};

class DraftEditor extends Component<IDraftEditorProps, any> {
    private mentionSuggestionList: any
    constructor(props: IDraftEditorProps) {
        super(props);
        const { initialContent } = props;
        this.mentionSuggestionList = null;
        this.state = {
            editorState: getEditorStateFromContent(initialContent),
            currentFormat: null,
            searchOpen: false,
            suggestions: mentionData,
        }
        this.MentionComponents();
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
        const updatedEditorState = getEditorStateFromContent(content);
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
        this.updateData(editorStateUpdated);
    };

    updateData = (editorStateUpdated: EditorState) => {
        const { onContentChange, onContentTextChange } = this.props;
        this.setState({
            editorState: editorStateUpdated,
        });
        const markup = getContentFromEditorState(editorStateUpdated);
        onContentChange?.(markup);
        const rawData = convertToRaw(editorStateUpdated.getCurrentContent());
        const mentionList = Object.keys(rawData.entityMap).map(key=> {
            return rawData.entityMap[key].data.mention.value;
        })
        const value = rawData.blocks.map(block => (!block.text.trim() && '\n') || block.text).join('\n');
        onContentTextChange?.({formattedText: value,
        value: markup, mentionList })
        this.sendFormat(editorStateUpdated);
    };

    handleKeyCommand = (command: string, editorStateUpdated: EditorState) => {
        const newState = RichUtils.handleKeyCommand(editorStateUpdated, command);
        if (newState) {
            this.updateData(newState);
            return 'handled';
        }
        return 'not-handled';
    };

    MentionComponents = () => {
        const mentionPlugin = createMentionPlugin({
            entityMutability: 'IMMUTABLE',
            // theme: mentionsStyles,
            mentionPrefix: '@',
            supportWhitespace: true,
        });
        // eslint-disable-next-line no-shadow
        const { MentionSuggestions } = mentionPlugin;
        // eslint-disable-next-line no-shadow
        const plugins = [mentionPlugin];

        this.mentionSuggestionList = { plugins, MentionSuggestions }
        return this.mentionSuggestionList;
    }

    onOpenChange = (_open: boolean) => {
        debugger;
        this.setState({ searchOpen: _open })
    };
    onSearchChange = ({ value }: { value: string }) => {
        const { onMentionInput } = this.props;
        const mentiondata = onMentionInput(value);
        this.setState({ suggestions: defaultSuggestionsFilter(value, mentionData) })
    };
    render() {
        const { textAlignment, showToolbar, showMention, searchSuggestion } = this.props;
        const { editorState, currentFormat, searchOpen,  } = this.state;
        const MentionComp = this.mentionSuggestionList?.MentionSuggestions

        return (
            <Fragment>
                {showToolbar && <DraftToolbar currentFormat={currentFormat} setFormat={this.setFormat} />}
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
                { <div className="list_container">
                        <MentionComp
                            open={searchOpen}
                            onOpenChange={this.onOpenChange}
                            suggestions={searchSuggestion}
                            onSearchChange={this.onSearchChange}
                            onAddMention={(a) => {
                                console.log(a);
                            }}
                            entryComponent={SuggestionList}
                            popoverContainer={({ children }) => <div>{children}</div>}
                        />
                    </div>
                }

            </Fragment>
        );
    }
};

export default DraftEditor;