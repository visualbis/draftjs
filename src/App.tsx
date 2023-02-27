import { useRef, useState } from 'react';
import React from 'react';
import DraftEditor from './DraftEditor';

export const App = () => {
    const draftRef = useRef(null);
    const suggestions = [
        { id: 'def', name: '1', label: 'def', isLeaf: true },
        { id: 'abc', name: '2', label: 'abc', isLeaf: false },
        { id: 'xyz', name: '3', label: 'xyz', isLeaf: true },
    ];
    const [parentList, setParentList] = useState(suggestions);
    const [parent, setParent] = useState(new Map());
    const [searchInput, setInput] = useState('');

    const [content, setContent] = useState(
        `<p><span style="font-size: 12px"><span style="color: rgb(115, 54, 28)">Company Name</span></span></p><p><span style="font-size: 12px"><span style="color: rgb(115, 54, 28)">[title:fields][title:fields2]</span></span></p><p><span style="font-size: 12px"><span style="color: rgb(115, 54, 28)">[title:scaling]</span></span></p>`,
    );
    const [suggestionList, setSuggestion] = useState(suggestions);
    const onCustomSuggestionsFilter = (searchValue: string, listData) => {
        if (searchValue.length < 3) {
            return;
        }
        const size = (list) => (list.constructor.name === 'List' ? list.size : list.length);
        const get = (obj, attr) => (obj.get ? obj.get(attr) : obj[attr]);
        const value = searchValue.toLowerCase();
        const filteredSuggestions = listData.filter(
            (suggestion) =>
                !value ||
                get(suggestion, 'label').toLowerCase().indexOf(value) > -1 ||
                get(suggestion, 'name').toLowerCase().indexOf(value) > -1,
        );
        const length = size(filteredSuggestions) < 15 ? size(filteredSuggestions) : 15;
        const list = filteredSuggestions.slice(0, length);
        list.length !== 0 && setSuggestion(list);
    };

    return (
        <>
            <div style={{ border: '1px solid', marginBottom: 50 }}>
                <DraftEditor
                    ref={draftRef}
                    initialContent={content}
                    onContentChange={(val) => {
                        setContent(val);
                    }}
                    valueSuggestion={suggestionList}
                    // ValuePopOverProps={ValuePopOverContainer({
                    //     onOutsideClick: draftRef.current?.onOutsideClick,
                    //     insertDataAtCursor: (value) => draftRef.current.insertDataAtCursor(value, 1), // offset fro #
                    // })}
                    showMention={{ value: true, people: false }}
                />
            </div>
            {/* DO NOT COMMIT WITH BELOW CODE UNCOMMENTED DUE TO CERTIFICATION ISSUES */}

            {/* <div>HTML Content:</div>
            <div style={{ border: '1px solid' }}>
            <div dangerouslySetInnerHTML={{ __html: content }}></div>
            </div> */}
        </>
        // CustomMentionEditor()
    );
};
