import React from "react";
import DraftBoldFormat from "./BoldFormat";
import DraftBackgroundColor from "./DraftBackgroundColor";
import DraftFontColor from "./DraftFontColor";
import { DraftLineSeparator } from "./DraftLineSeparator";
import DraftFontFamilyFormat from "./FontFamilyFormat";
import DraftFontSizeFormat from "./FontSizeFormat";
import DraftItalicFormat from "./ItalicFormat";
import DraftSubScriptFormat from "./SubScriptFormat";
import DraftSuperScriptFormat from "./SuperScriptFormat";
import DraftUnderLineFormat from "./UnderLineFormat";

export interface IDraftElementFormats {
  font?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  size?: string;
  color?: string;
  background?: string;
  align?: string;
  superScript?: boolean;
  subScript?: boolean;
  enableBorder?: boolean;
  borderColor?: string;
  backgroundColor?: string;
}

export enum EFormatOptions {
  FONT_FAMILY = "FONT_FAMILY",
  FONT_SIZE = "FONT_SIZE",
  BOLD = "BOLD",
  ITALIC = "ITALIC",
  UNDERLINE = "UNDERLINE",
  FONT_COLOR = "FONT_COLOR",
  BACKGROUND_COLOR = "BACKGROUND_COLOR",
  SUPER_SCRIPT = "SUPER_SCRIPT",
  SUB_SCRIPT = "SUB_SCRIPT",
}
const formatOptions = {
  [EFormatOptions.FONT_FAMILY]: DraftFontFamilyFormat,
  [EFormatOptions.FONT_SIZE]: DraftFontSizeFormat,
  [EFormatOptions.BOLD]: DraftBoldFormat,
  [EFormatOptions.ITALIC]: DraftItalicFormat,
  [EFormatOptions.UNDERLINE]: DraftUnderLineFormat,
  [EFormatOptions.BACKGROUND_COLOR]: DraftBackgroundColor,
  [EFormatOptions.FONT_COLOR]: DraftFontColor,
  [EFormatOptions.SUPER_SCRIPT]: DraftSuperScriptFormat,
  [EFormatOptions.SUB_SCRIPT]: DraftSubScriptFormat,
};
export interface IDraftToolbarProps {
  currentFormat: IDraftElementFormats;
  setFormat: (formatType: string, value?: string) => void;
  toolbarOptions?: EFormatOptions[];
}

const DraftToolbar = (props: IDraftToolbarProps) => {
    return (
        <div className="draft_toolbar">
            <DraftFontFamilyFormat formatProps={props} />
            <DraftFontSizeFormat formatProps={props} />
            <DraftBoldFormat formatProps={props} />
            <DraftItalicFormat formatProps={props} />
            <DraftBackgroundColor formatProps={props} />
            <DraftFontColor formatProps={props} />
        </div>
    );
};

export default DraftToolbar;
