import { InlineCreators, stateFromHTML } from "@shelterzoom/draft-js-import-html";
import { convertToHTML } from "draft-convert";
import { convertFromHTML } from "draft-convert";
import { convertToRaw, DraftInlineStyle, EditorState, Modifier, RichUtils } from "draft-js";
import draftToHtml from "draftjs-to-html";
import { IDraftElementFormats } from '../DraftToolbar/DraftToolbar';



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

// const getEditorStateFromContent = (content: string) => {
//     const importOptions = {
//         customInlineFn: (htmlElement: HTMLElement, { Style, Entity }: InlineCreators) => {
//             const styles = [];
//             if (htmlElement.style.color) {
//                 styles.push(`color-${htmlElement.style.color}`);
//             }
//             if (htmlElement.style.backgroundColor) {
//                 styles.push(`backgroundColor-${htmlElement.style.backgroundColor}`);
//             }
//             if (htmlElement.style.fontFamily) {
//                 styles.push(`fontfamily-${htmlElement.style.fontFamily}`);
//             }
//             if (htmlElement.style.fontSize) {
//                 styles.push(`fontsize-${htmlElement.style.fontSize}`);
//             }
//             if (htmlElement.tagName === 'SUB') {
//                 styles.push('SUBSCRIPT');
//             }
//             if (htmlElement.tagName === 'SUP') {
//                 styles.push('SUPERSCRIPT');
//             }
//             return styles.length ? Style(styles) : null;
//         },

//     };

//     const contentState = stateFromHTML(content, importOptions);

//     return EditorState.createWithContent(contentState);
// };

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


const convertFromHTMLString = (html) => {
    if (!html) {
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
            if (nodeName === 'a' && node.classList.contains('mention')) {
                const data = JSON.parse(node.dataset.value);
                return createEntity(
                    'mention',
                    'IMMUTABLE',
                    { mention: { name: data.name, ...data } }
                )
            } else if (nodeName === 'a' && node.classList.contains('hash-mention')) {
                const data = JSON.parse(node.dataset.value);
                return createEntity(
                    'mention',
                    'IMMUTABLE',
                    { mention: { name: data.name, ...data } }
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

export { convertFromHTMLString, resolveCustomStyleMap, formatText, getFormat, getContentFromEditorState }