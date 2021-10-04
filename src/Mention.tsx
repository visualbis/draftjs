

// import React from "react"
// import { render } from "react-dom"


import React, {
  MouseEvent,
  ReactElement,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import { EditorState } from 'draft-js';
import Editor from '@draft-js-plugins/editor';
import createMentionPlugin, {
  defaultSuggestionsFilter,
  MentionData,
  MentionPluginTheme,
} from '@draft-js-plugins/mention';
import './Styles';
import { MentionDataValue } from './MentionData';


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

export const  SuggestionList =(props: EntryComponentProps): ReactElement =>{
  const {
    mention,
    theme,
    searchValue, // eslint-disable-line @typescript-eslint/no-unused-vars
    isFocused, // eslint-disable-line @typescript-eslint/no-unused-vars
    ...parentProps
  } = props;
  
  return (
    <div {...parentProps} className={`list_container_item ${isFocused ? 'focused' : ''}`} >
      <div className={`${theme?.mentionSuggestionsEntryContainer} ${"list_item"}`}>
        {mention.avatar &&
        <div className={`${theme?.mentionSuggestionsEntryContainerLeft} ${"list_icon"}`}>
          <img
            src={mention.avatar}
            className={theme?.mentionSuggestionsEntryAvatar}
            role="presentation"
          />
        </div>}

        <div className={theme?.mentionSuggestionsEntryContainerRight}>
          <div className={`${theme?.mentionSuggestionsEntryTitle} ${"list-title"}` }>
            {mention.label}
          </div>

          { mention.email && <div className={theme?.mentionSuggestionsEntryText}  style={{marginLeft: 0}}>
            {mention.email}
          </div>
          }
        </div>
      </div>
    </div>
  );
}

export default {}
