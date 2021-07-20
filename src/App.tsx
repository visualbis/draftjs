import { useState } from "react";
import React from "react";
import DraftEditor from "./DraftEditor";


export const App = () => {
  const [content, setContent] = useState("<p>Sample Title</p><p>Sample Content</p>");
  return (
    <DraftEditor
      initialContent={content}
      onContentChange={setContent}
      showToolbar
    />
  );
};
