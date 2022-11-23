import { convertFromHTML, convertToHTML } from 'draft-convert';
import { convertToRaw, DraftInlineStyle, EditorState, Modifier, RichUtils, SelectionState } from 'draft-js';
import draftToHtml from 'draftjs-to-html';
import React from 'react';
import { formatKeys, mentionAnchorStyle, styleValues } from './UIconstants';

export interface IDraftElementFormats {
    font?: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    size?: string;
    color?: string;
    background?: string;
    textAlign?: string;
    superScript?: boolean;
    subScript?: boolean;
    enableBorder?: boolean;
    borderColor?: string;
    backgroundColor?: string;
    justifyContent?: string;
    strikeThrough?: boolean;
    orderedListItem?: string;
    unorderedListItem?: string;
    checkableListItem?: string;
    fontSize?: string;
    link?: {
        url: string;
        text?: string;
    };
}

const randomString = () => {
    const length = 32;
    const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-';
    let result = '';
    for (let i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
};

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

const getFormat = (editorState: EditorState) => {
    const style = editorState.getCurrentInlineStyle();
    const selection = editorState.getSelection();
    const blockType = editorState.getCurrentContent().getBlockForKey(selection.getStartKey()).getType();
    const format: IDraftElementFormats = {
        bold: style.has(formatKeys.bold.toUpperCase()),
        italic: style.has(formatKeys.italic.toUpperCase()),
        underline: style.has(formatKeys.underline.toUpperCase()),
        subScript: style.has(formatKeys.subScript.toUpperCase()),
        superScript: style.has(formatKeys.superScript.toUpperCase()),
        textAlign: blockType,
        strikeThrough: style.has(formatKeys.strikethrough.toUpperCase()),
        link: getLinkState(editorState),
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
    return moveColorToTop(nextEditorState);
};

const moveColorToTop = (editorState: EditorState) => {
    const selection = editorState.getSelection();
    const currentStyleBefore = editorState.getCurrentInlineStyle();
    let contentState = editorState.getCurrentContent();

    const colorStyle = currentStyleBefore.find((item) => item && item.includes(`${formatKeys.color}__`));
    if (currentStyleBefore.first() !== colorStyle) {
        currentStyleBefore.forEach((item) => {
            contentState = Modifier.removeInlineStyle(contentState, selection, item);
        });
        if (colorStyle) contentState = Modifier.applyInlineStyle(contentState, selection, colorStyle);
        currentStyleBefore.forEach((item) => {
            if (item && item !== colorStyle) {
                contentState = Modifier.applyInlineStyle(contentState, selection, item);
            }
        });
        return EditorState.push(editorState, contentState, 'change-inline-style');
    }
    return editorState;
};

const getSelectedText = (editorState: EditorState) => {
    let selection = editorState.getSelection();
    const anchorKey = selection.getAnchorKey();
    const currentContent = editorState.getCurrentContent();
    const currentBlock = currentContent.getBlockForKey(anchorKey);

    const start = selection.getStartOffset();
    const end = selection.getEndOffset();
    return currentBlock.getText().slice(start, end);
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
            if (nodeName !== 'body') {
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
                    currentStyle = currentStyle.add(`${formatKeys.lineHeight}__${node.style.lineHeight}`);
                }
                // if (node.style.justifyContent) {
                //     currentStyle = currentStyle.add(`${formatKeys.justifyContent}__${node.style.justifyContent}`);
                // }
                if (node.tagName === 'SUB') {
                    currentStyle = currentStyle.add(formatKeys.subScript.toUpperCase());
                }
                if (node.tagName === 'SUP') {
                    currentStyle = currentStyle.add(formatKeys.superScript.toUpperCase());
                }
                if (node.tagName === 'STRIKE') {
                    currentStyle = currentStyle.add(formatKeys.strikethrough.toUpperCase());
                }
            }
            return currentStyle;
        },
        htmlToEntity: (nodeName, node, createEntity) => {
            if (nodeName === 'span' && node.classList.contains('mention')) {
                const data = JSON.parse(node.dataset.value);
                const id = node.dataset.id;
                return createEntity('mention', 'IMMUTABLE', { mention: { name: data.name, ...data }, id });
            } else if (nodeName === 'span' && node.classList.contains('hash-mention')) {
                const data = JSON.parse(node.dataset.value);
                const id = node.dataset.id;
                return createEntity('#mention', 'IMMUTABLE', { mention: { name: data.name, ...data }, id });
            } else if (nodeName === 'a') {
                const data = JSON.parse(node.dataset.value);
                return createEntity('LINK', 'MUTABLE', { ...data });
            }
        },
    })(html);
};

const convertToHTMLString = (
    editorState: EditorState,
    isColorRequired: boolean = false,
    dynamicMention: boolean = false,
) => {
    return convertToHTML({
        styleToHTML: (style) => {
            if (style === formatKeys.bold.toUpperCase()) {
                return <b />;
            } else if (style === formatKeys.underline.toUpperCase()) {
                return <u />;
            } else if (style === formatKeys.italic.toUpperCase()) {
                return <em />;
            } else if (style === formatKeys.superScript.toUpperCase()) {
                return <sup />;
            } else if (style === formatKeys.subScript.toUpperCase()) {
                return <sub />;
            } else if (style === formatKeys.strikethrough.toUpperCase()) {
                return {
                    start: `<span style="text-decoration: line-through">`,
                    end: `</span>`,
                };
            } else if (style.includes('__')) {
                const [type, value] = style.split('__');
                // replacing double quotes as font family is not detcted
                return {
                    start: `<span style="${type}: ${value.replace(/"/g, '')}">`,
                    end: `</span>`,
                };
            }
        },
        blockToHTML: (block) => {
            if (block.type === 'center') {
                return <p style={{ display: 'flex', justifyContent: 'center' }} />;
            } else if (block.type === 'left') {
                return <p style={{ display: 'flex', justifyContent: 'flex-start' }} />;
            } else if (block.type === 'right') {
                return <p style={{ display: 'flex', justifyContent: 'flex-end' }} />;
            }
        },
        entityToHTML: (entity, originalText) => {
            if (entity.type === 'mention') {
                const id = entity.data.id ? entity.data.id : randomString();
                return (
                    <span
                        className="mention"
                        style={{ ...mentionAnchorStyle, color: isColorRequired ? '#0078d4' : null }}
                        data-id={id}
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
                const key =
                    entity.data.mention.formula || entity.data.mention?.key?.match(/#\[(.*?)\]/g)
                        ? entity.data.mention?.key
                        : `#[${entity.data.mention?.key}]`; // Migration changes
                return (
                    <span
                        className="hash-mention"
                        title={dynamicMention ? entity.data.mention?.title : null}
                        style={{
                            ...mentionAnchorStyle,
                        }}
                        data-id={entity.data.id}
                        data-value={JSON.stringify({
                            ...entity.data.mention,
                            image: '',
                            avatar: '',
                        })}
                    >
                        {dynamicMention ? key : originalText}
                    </span>
                );
            } else if (entity.type === 'link' || entity.type === 'LINK') {
                return (
                    <a
                        target="_blank"
                        href={entity.data.url}
                        style={{ ...mentionAnchorStyle }}
                        data-value={JSON.stringify({
                            ...entity.data,
                        })}
                        data-id="draft-link"
                    >
                        {originalText}
                    </a>
                );
            }
            return originalText;
        },
    })(editorState.getCurrentContent());
};

const getLinkState = (editorState: EditorState): IDraftElementFormats['link'] => {
    const contentState = editorState.getCurrentContent();
    const startKey = editorState.getSelection().getStartKey();
    const startOffset = editorState.getSelection().getStartOffset();
    const blockWithLinkAtBeginning = contentState.getBlockForKey(startKey);
    const linkKey = blockWithLinkAtBeginning.getEntityAt(startOffset);
    if (linkKey) {
        const linkInstance = contentState.getEntity(linkKey);
        return {
            url: linkInstance.getData().url,
            text: getSelectedText(editorState),
        };
    }
    return null;
};

const selectAll = (editorState: EditorState) => {
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

    return EditorState.acceptSelection(editorState, selection);
};

export {
    selectAll,
    convertFromHTMLString,
    resolveCustomStyleMap,
    formatText,
    getFormat,
    getContentFromEditorState,
    convertToHTMLString,
};
