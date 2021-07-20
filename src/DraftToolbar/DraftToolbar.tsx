import React from 'react';
import DraftBoldFormat from './BoldFormat';
import DraftBackgroundColor from './DraftBackgroundColor';
import DraftFontColor from './DraftFontColor';
import { DraftLineSeparator } from './DraftLineSeparator';
import DraftFontFamilyFormat from './FontFamilyFormat';
import DraftFontSizeFormat from './FontSizeFormat';
import DraftItalicFormat from './ItalicFormat';
import DraftSubScriptFormat from './SubScriptFormat';
import DraftSuperScriptFormat from './SuperScriptFormat';
import DraftUnderLineFormat from './UnderLineFormat';

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

export interface IDraftToolbarProps {
    currentFormat: IDraftElementFormats;
    setFormat: (formatType: string, value?: string) => void;
}

const DraftToolbar = (props: IDraftToolbarProps) => {
    return (
        <div className="draft_toolbar">
            <DraftFontFamilyFormat formatProps={props} />
            <DraftFontSizeFormat formatProps={props} />
            <DraftLineSeparator />
            <DraftBoldFormat formatProps={props} />
            <DraftItalicFormat formatProps={props} />
            <DraftUnderLineFormat formatProps={props} />
            <DraftLineSeparator />
            <DraftBackgroundColor formatProps={props} />
            <DraftFontColor formatProps={props} />
            <DraftLineSeparator />
            <DraftSuperScriptFormat formatProps={props} />
            <DraftSubScriptFormat formatProps={props} />
        </div>
    );
};

export default DraftToolbar;
