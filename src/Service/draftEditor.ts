import { convertFromHTML } from 'draft-convert';
import { convertToRaw, DraftInlineStyle, EditorState, Modifier, RichUtils } from 'draft-js';
import draftToHtml from 'draftjs-to-html';
import { formatKeys, styleValues } from './UIconstants';

export interface IDraftElementFormats {
    font?: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    size?: string;
    color?: string;
    background?: string;
    align?: string;
    superScript?: boolean;
    subScript?: boolean;
    enableBorder?: boolean;
    borderColor?: string;
    backgroundColor?: string;
}

const resolveCustomStyleMap = (style: DraftInlineStyle) => {
    const colObj = {} as React.CSSProperties;
    style.forEach((styleKey) => {
        if (styleKey) {
            styleValues.some((styleValue) => {
                if (styleKey.includes(styleValue.key)) {
                    const [, val] = styleKey.split(styleValue.key);
                    colObj[styleValue.value] = val;
                    return true;
                }
            });
        }
    });
    return colObj;
};

const getFormat = (editorStateData: EditorState) => {
    const style = editorStateData.getCurrentInlineStyle();
    const format: IDraftElementFormats = {
        bold: style.has(formatKeys.bold.toUpperCase()),
        italic: style.has(formatKeys.italic.toUpperCase()),
        underline: style.has(formatKeys.underline.toUpperCase()),
        subScript: style.has(formatKeys.subScript.toUpperCase()),
        superScript: style.has(formatKeys.superScript.toUpperCase()),
    };
    style.forEach((styleKey) => {
        if (styleKey) {
            styleValues.some((styleValue) => {
                if (styleKey.includes(styleValue.key)) {
                    let [, val] = styleKey.split(styleValue.key);
                    format[styleValue.value] = val;
                    if (styleValue.parse) {
                        try {
                            format[styleValue.value] = JSON.parse(val);
                        } catch (error) {
                            format[styleValue.value] = val;
                        }
                    }
                    return true;
                }
            });
        }
    });

    return format;
};

const formatText = (editorState: EditorState, formatType: string, value: string) => {
    const selection = editorState.getSelection();
    let contentState = editorState.getCurrentContent();

    const currentStyleBefore = editorState.getCurrentInlineStyle();

    currentStyleBefore.forEach((color) => {
        if (color && color.includes(`${formatType}__`)) {
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

const convertFromHTMLString = (html: string): Draft.ContentState => {
    if (!html) {
        html = '';
    }
    return convertFromHTML({
        htmlToStyle: (nodeName, node, currentStyle) => {
            if (node.style.color) {
                currentStyle = currentStyle.add(`${formatKeys.color}__${node.style.color}`);
            }
            if (node.style.backgroundColor) {
                currentStyle = currentStyle.add(`${formatKeys.background}__${node.style.backgroundColor}`);
            }
            if (node.style.fontFamily) {
                currentStyle = currentStyle.add(`${formatKeys.fontFamily}__${node.style.fontFamily}`);
            }
            if (node.style.fontSize) {
                currentStyle = currentStyle.add(`${formatKeys.fontSize}__${node.style.fontSize}`);
            }
            if (node.style.lineHeight) {
                currentStyle = currentStyle.add(`${formatKeys.lineHeight}__${node.style.fontSize}`);
            }
            if (node.tagName === 'SUB') {
                currentStyle = currentStyle.add(formatKeys.subScript.toUpperCase());
            }
            if (node.tagName === 'SUP') {
                currentStyle = currentStyle.add(formatKeys.superScript.toUpperCase());
            }
            return currentStyle;
        },
        htmlToEntity: (nodeName, node, createEntity) => {
            if (nodeName === 'span' && node.classList.contains('mention')) {
                const data = JSON.parse(node.dataset.value);
                return createEntity('mention', 'IMMUTABLE', { mention: { name: data.name, ...data } });
            } else if (nodeName === 'span' && node.classList.contains('hash-mention')) {
                const data = JSON.parse(node.dataset.value);
                return createEntity('mention', 'IMMUTABLE', { mention: { name: data.name, ...data } });
            }
        },
    })(html);
};

export { convertFromHTMLString, resolveCustomStyleMap, formatText, getFormat, getContentFromEditorState };
