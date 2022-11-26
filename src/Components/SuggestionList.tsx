import { MentionData, MentionPluginTheme } from '@lumel/mention';
import React, { MouseEvent } from 'react';
import '../Styles';

export interface EntryComponentProps {
    className?: string;
    onMouseDown(event: MouseEvent): void;
    onMouseUp(event: MouseEvent): void;
    onMouseEnter(event: MouseEvent): void;
    role: string;
    id: string;
    'aria-selected'?: boolean | 'false' | 'true';
    theme?: MentionPluginTheme;
    mention: MentionData;
    isFocused: boolean;
    searchValue?: string;
}

export default class SuggestionList extends React.Component<EntryComponentProps> {
    render() {
        const {
            mention,
            theme,
            searchValue, // eslint-disable-line @typescript-eslint/no-unused-vars
            isFocused, // eslint-disable-line @typescript-eslint/no-unused-vars
            ...parentProps
        } = this.props;

        return (
            <div {...parentProps} className={`list_container_item ${isFocused ? 'focused' : ''}`}>
                <div className={`${theme?.mentionSuggestionsEntryContainer} ${'list_item'}`}>
                    {mention.avatar && (
                        <div className={`${theme?.mentionSuggestionsEntryContainerLeft} ${'list_icon'}`}>
                            <img
                                src={mention.avatar}
                                className={theme?.mentionSuggestionsEntryAvatar}
                                role="presentation"
                            />
                        </div>
                    )}

                    <div className={theme?.mentionSuggestionsEntryContainerRight} title={mention.label}>
                        <div className={`${theme?.mentionSuggestionsEntryTitle} ${'list-title'}`}>{mention.label}</div>

                        {mention.email && (
                            <div
                                className={`list-email ${theme?.mentionSuggestionsEntryText}`}
                                style={{ marginLeft: 0 }}
                            >
                                {mention.email}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }
}
