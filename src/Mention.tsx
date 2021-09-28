

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

class CustomMentionEditor extends React.Component<any, any>  {

  public mentionRef : any;
  constructor(props) {
    super(props);
    // this.refs = React.createRef();
    this.state = {
      searchOpen: false,
      suggestions: MentionDataValue.mentionDataImg,
      editorState: EditorState.createEmpty()
    };

    this.mentionRef = React.createRef();


  }

  render (){
    const { searchOpen, suggestions,editorState } = this.state;


     const onChange = (_editorState: EditorState) => {
    this.setState({editorState: _editorState})
  };
  const onOpenChange = (_open: boolean) => {
    this.setState({searchOpen: _open})
  };
  const onSearchChange =({ value }: { value: string }) => {
    this.setState({suggestions :defaultSuggestionsFilter(value, MentionDataValue.mentionDataImg) })
  };

   

  const MentionComponents = () => {
    const mentionPlugin = createMentionPlugin({
      entityMutability: 'IMMUTABLE',
      // theme: mentionsStyles,
      mentionPrefix: '@',
      supportWhitespace: false,
    });
    // eslint-disable-next-line no-shadow
    const { MentionSuggestions } = mentionPlugin;
    // eslint-disable-next-line no-shadow
    const plugins = [mentionPlugin];
    return { plugins, MentionSuggestions };
  }

const {MentionSuggestions, plugins }= MentionComponents() ;

    return (
      <div
        // className={editorStyles.editor}
        className="mention_container"
        onClick={() => {
          this.mentionRef.current!.focus();
        }}
      >
        <Editor
          editorKey={"editor"}
          editorState={editorState}
          onChange={onChange}
          plugins={plugins}
          ref={this.mentionRef}
        />
        <div className="list_container">
          <MentionSuggestions
            open={searchOpen}
            onOpenChange={onOpenChange}
            suggestions={suggestions}
            onSearchChange={onSearchChange}
            onAddMention={() => {
              // get the mention object selected
            }}
            entryComponent={SuggestionList}
            popoverContainer={({ children }) => <div>{children}</div>}
          />
        </div>
      </div>
    );
  }
}

export default  CustomMentionEditor

