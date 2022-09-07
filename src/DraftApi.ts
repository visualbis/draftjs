import { convertToRaw, EditorState, RichUtils } from 'draft-js';
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

    static  getFormattedValue = (text: string) => {
        const contentState = EditorState.createWithContent(convertFromHTMLString(text));
        const rawData = convertToRaw(contentState.getCurrentContent());
        const value = rawData.blocks.map((block) => (!block.text.trim() && '\n') || block.text).join('\n');
        return value;
    }
}
