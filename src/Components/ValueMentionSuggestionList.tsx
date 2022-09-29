import { MentionData } from '@lumel/mention';
import React from 'react';
import '../Styles';
import { EntryComponentProps } from './SuggestionList';

interface IListProps {
    onmousedown: (value: MentionData, searchValue: string) => void;
}

const DataPoint = () => {
    return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="https://www.w3.org/2000/svg">
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M11.4631 2.69523C11.6421 2.51388 11.6668 2.39248 11.6668 2.33333C11.6668 2.27418 11.6421 2.15279 11.4631 1.97143C11.2808 1.78674 10.9785 1.58473 10.5435 1.39831C9.67633 1.02665 8.42407 0.777778 7.00011 0.777778C5.57614 0.777778 4.32389 1.02665 3.45669 1.39831C3.0217 1.58473 2.71938 1.78674 2.5371 1.97143C2.35812 2.15279 2.33344 2.27418 2.33344 2.33333C2.33344 2.39248 2.35812 2.51388 2.5371 2.69523C2.71938 2.87993 3.0217 3.08194 3.45669 3.26836C4.32389 3.64002 5.57614 3.88889 7.00011 3.88889C8.42407 3.88889 9.67633 3.64002 10.5435 3.26836C10.9785 3.08194 11.2808 2.87993 11.4631 2.69523ZM7.00011 4.66667C10.007 4.66667 12.4446 3.622 12.4446 2.33333C12.4446 1.04467 10.007 0 7.00011 0C3.99322 0 1.55566 1.04467 1.55566 2.33333C1.55566 3.622 3.99322 4.66667 7.00011 4.66667Z"
                fill="#444444"
            />
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12.4445 2.33325C12.4445 2.77312 12.1605 3.18455 11.6668 3.53572V10.8888H11.6667V11.6666H11.6668H12.4446V10.8888V3.11103V2.33325H12.4445ZM2.33341 11.6666H1.55566V10.8888V3.11103V2.34615C1.56116 2.78121 1.84447 3.18808 2.33344 3.53584V10.111H2.33341V11.6666Z"
                fill="#444444"
            />
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M1.55566 11.6667C1.55568 12.9554 3.99324 14.0001 7.00011 14.0001C10.007 14.0001 12.4445 12.9554 12.4446 11.6667H11.6668C11.6668 11.7259 11.6421 11.8473 11.4631 12.0286C11.2808 12.2133 10.9785 12.4153 10.5435 12.6018C9.67633 12.9734 8.42407 13.2223 7.00011 13.2223C5.57614 13.2223 4.32389 12.9734 3.45669 12.6018C3.0217 12.4153 2.71938 12.2133 2.5371 12.0286C2.35813 11.8473 2.33345 11.7259 2.33344 11.6667H1.55566Z"
                fill="#444444"
            />
        </svg>
    );
};

const SuggestionListComp = (listProps: IListProps) =>
    class SuggestionList extends React.Component<EntryComponentProps> {
        render() {
            const {
                mention,
                theme,
                isFocused,
                searchValue, // eslint-disable-line @typescript-eslint/no-unused-vars
                ...parentProps
            } = this.props;
            const newProps = {
                className: parentProps.className,
                role: parentProps.role,
                id: parentProps.id,
                onMouseEnter: parentProps.onMouseEnter,
                onMouseDown: () => listProps.onmousedown(mention, searchValue),
            }; 
            const labelStyle: React.CSSProperties = !mention.hasLeaf  ?  { width: '92px'} :  null; 
            return (
                <div
                    {...newProps}
                    data-value={JSON.stringify(mention)}
                    className={` value-mention-item-${isFocused ? 'focused' : ''} list_container_item ${isFocused ? 'focused' : ''
                        }`}
                >
                    <div className={`${theme?.mentionSuggestionsEntryContainer} ${'list_item'}`}>
                        <div className="value-mention-title-container">
                            {!mention.hasLeaf && (
                                <div className={'list_icon'}>
                                    <DataPoint />
                                </div>
                            )}
                            <div
                                title={mention.label}
                                className={`${theme?.mentionSuggestionsEntryTitle} ${'list-title'}`}
                                style={labelStyle} 
                            >
                                {mention.label}
                            </div>
                        </div>
                        {/* {!mention.hasLeaf && (
                            <div className={theme?.mentionSuggestionsEntryText} style={{ marginLeft: 0 }}>
                                <i className="mention-chevron ms-Icon ms-Icon--ChevronRightSmall" />
                            </div>
                        )} */}
                    </div>
                </div>
            );
        }
    };

export default SuggestionListComp;
