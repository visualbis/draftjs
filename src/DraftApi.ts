import { EditorState, RichUtils } from 'draft-js';
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
}
