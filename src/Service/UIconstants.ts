import { DraftStyleMap } from 'draft-js';

export const TB = {
    FONT_BOLD: 'fontBold-b',
    FONT_FAMILY: 'fontSizeIncrement-b',
};

export const formatKeys = {
    color: 'color',
    background: 'background',
    fontFamily: 'font-family',
    fontSize: 'font-size',
    lineHeight: 'line-height',
    bold: 'bold',
    italic: 'italic',
    underline: 'underline',
    subScript: 'subscript',
    superScript: 'superScript',
    justifyContent: 'justify-content',
    strikethrough: 'strikethrough',
    textAlign: 'text-align',
    orderedListItem: 'ordered-list-item',
    unorderedListItem: 'unordered-list-item',
    checkableListItem:"checkable-list-item"
};

export const styleValues = [
    {
        key: `${formatKeys.color}__`,
        value: 'color',
    },
    {
        key: `${formatKeys.background}__`,
        value: 'backgroundColor',
    },
    {
        key: `${formatKeys.fontFamily}__`,
        value: 'fontFamily',
        parse: true,
    },
    {
        key: `${formatKeys.fontSize}__`,
        value: 'fontSize',
    },
    {
        key: `${formatKeys.lineHeight}__`,
        value: 'lineHeight',
    },
    {
        key: `${formatKeys.justifyContent}__`,
        value: 'justifyContent',
    },
    {
        key: `${formatKeys.textAlign}__`,
        value: 'textAlign',
    },
];

export const CUSTOM_STYLE_MAP: DraftStyleMap = {
    SUPERSCRIPT: {
        verticalAlign: 'super',
        fontSize: 'smaller',
    },
    SUBSCRIPT: {
        verticalAlign: 'sub',
        fontSize: 'smaller',
    },
    STRIKETHROUGH: {
        textDecoration: 'line-through',
    },
};

export const MENTION_SUGGESTION_NAME = {
    PREFIX_ONE: '@',
    PREFIX_TWO: '#',
};

export const mentionAnchorStyle: React.CSSProperties = {
    paddingLeft: '2px',
    paddingRight: '2px',
    borderRadius: '2px',
    textDecoration: 'none',
};
