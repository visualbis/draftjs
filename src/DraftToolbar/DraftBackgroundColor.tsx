import { AdvancedColorPicker } from "@visualbi/bifrost-ui/dist/react/forms/AdvancedColorPicker";
import React from "react";
import { IDraftToolbarProps } from "./DraftToolbar";

interface IDraftBackgroundColorProps {
  formatProps: IDraftToolbarProps;
}

const DraftBackgroundColor = (props: IDraftBackgroundColorProps) => {
  const {
    formatProps: { setFormat, currentFormat },
  } = props;

  const onChange = (values: string) => {
    setFormat("backgroundColor", values);
  };

  return (
    <div title='Background Color' className="draft-editor-format-font-style">
      <AdvancedColorPicker
        className={`mr-6`}
        isCompositeButton
        isSVGIcon
        icon={"ms-Icon ms-Icon--BucketColor"}
        showIconDropDown
        defaultColor={"#FFFF00"}
        value={currentFormat?.backgroundColor}
        // recentColors={recentColors}
        onChange={onChange}
        hasNoFill={false}
        isInLine
      />
    </div>
  );
};

export default DraftBackgroundColor;
