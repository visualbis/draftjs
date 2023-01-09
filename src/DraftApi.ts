import { ContentBlock, ContentState, convertToRaw, EditorState, RichUtils } from 'draft-js';
import { selectAll, convertFromHTMLString, convertToHTMLString } from './Service/draftEditor.service';

type TFormatSting = 'bold' | 'italic' | 'underline' | 'background';

/**
 * operates on HTML string
 */
export default class DraftApi {
    static addFormatToText = (htmlString: string, formatType: TFormatSting, formatValue?: any) => {
        let editorState = EditorState.createWithContent(convertFromHTMLString(htmlString));
        editorState = selectAll(editorState);
        editorState = RichUtils.toggleInlineStyle(editorState, formatType.toUpperCase());
        return convertToHTMLString(editorState);
    };

    static getFormattedValue = (text: string) => {
        const contentState = EditorState.createWithContent(convertFromHTMLString(text));
        const rawData = convertToRaw(contentState.getCurrentContent());
        const value = rawData.blocks.map((block) => (!block.text?.trim() && '\n') || block.text).join('\n');
        return value;
    };

    /**
     *
     * @param htmlString
     * @param charCount
     * @returns truncated html string to the char count
     */
    static truncate(htmlString: string, charCount: number) {
        const editorState = EditorState.createWithContent(convertFromHTMLString(htmlString));
        const contentState = editorState.getCurrentContent();
        const blocks = contentState.getBlockMap();

        let count = 0;
        let isTruncated = false;
        const truncatedBlocks: ContentBlock[] = [];
        blocks.forEach((block) => {
            if (!isTruncated) {
                const length = (block as ContentBlock).getLength();
                if (count + length > charCount) {
                    isTruncated = true;
                    const truncatedText = (block as ContentBlock).getText().slice(0, charCount - count);
                    const state = ContentState.createFromText(`${truncatedText}...`);
                    truncatedBlocks.push(state.getFirstBlock());
                } else {
                    truncatedBlocks.push(block as ContentBlock);
                }
                count += length + 1;
            }
        });

        if (isTruncated) {
            const state = ContentState.createFromBlockArray(truncatedBlocks);
            return convertToHTMLString(EditorState.createWithContent(state));
        }

        return htmlString;
    }
}
