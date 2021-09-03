import { useState } from 'react';
import React from 'react';
import DraftEditor from './DraftEditor';
import CustomMentionEditor from './Mention';

export const App = () => {
    const [content, setContent] = useState(
        `<p><span style="font-size: 12px"><span style="color: rgb(115, 54, 28)">Company Name</span></span></p><p><span style="font-size: 12px"><span style="color: rgb(115, 54, 28)">[title:fields][title:fields2]</span></span></p><p><span style="font-size: 12px"><span style="color: rgb(115, 54, 28)">[title:scaling]</span></span></p>`,
    );
    return (
        <>
            <div style={{ border: '1px solid', marginBottom: 50 }}>
                <DraftEditor
                    initialContent={content}
                    onContentChange={(val) => {
                        setContent(val);
                    }}
                    showMention={{ value: false, people: false }}
                />
            </div>
            <div>HTML Content:</div>
            <div style={{ border: '1px solid' }}>
                <div dangerouslySetInnerHTML={{ __html: content }}></div>
            </div>
        </>
        // CustomMentionEditor()
    );
};
