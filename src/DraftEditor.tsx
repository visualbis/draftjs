import { default as Editor } from '@draft-js-plugins/editor';
import { InlineCreators, stateFromHTML } from '@shelterzoom/draft-js-import-html';
import { convertToRaw, DraftInlineStyle, DraftStyleMap, EditorState, Modifier, RichUtils } from 'draft-js';
import 'draft-js/dist/Draft.css';
import draftToHtml from 'draftjs-to-html';
import React, { Component, Fragment } from 'react';
import DraftToolbar, { IDraftElementFormats } from './DraftToolbar/DraftToolbar';
import './Styles';

interface IDraftEditorProps {
    initialContent?: string;
    textAlignment?: string;
    onContentChange?: (content: string) => void;
    onCurrentFormatChange?: (formats: IDraftElementFormats) => void;
    showToolbar?: boolean;
    innerRef?: any
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
        customInlineFn: (htmlElement: HTMLElement, { Style }: InlineCreators) => {
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

class DraftEditor extends Component<IDraftEditorProps, any> {

    constructor(props: IDraftEditorProps) {
        super(props);
        const { initialContent } = props;
        this.state = {
            editorState: getEditorStateFromContent(initialContent),
            currentFormat: null,
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
        const { onContentChange } = this.props;
        this.setState({
            editorState: editorStateUpdated,
        });
        const markup = getContentFromEditorState(editorStateUpdated);
        onContentChange?.(markup);
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

    render() {
        const { textAlignment, showToolbar } = this.props;
        const { editorState, currentFormat } = this.state;
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
                />
            </Fragment>
        );
    }
};

export default DraftEditor;