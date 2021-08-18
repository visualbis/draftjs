import React from 'react';
import { ToolbarIconButton } from '../Buttons/ToolbarIconButton';
import { IDraftToolbarProps } from './DraftToolbar';

interface IDraftItalicFormatProps {
    formatProps: IDraftToolbarProps;
}

const DraftItalicFormat = (props: IDraftItalicFormatProps) => {
    const {
        formatProps: { setFormat, currentFormat },
    } = props;

    const onClick = () => {
        setFormat('italic', currentFormat?.italic ? 'active' : '');
    };

    return (
        <ToolbarIconButton
            title="Italic"
            // id={TB.FONT_BOLD}
            active={currentFormat?.italic}
            disabled={false}
            icon={'ms-Icon ms-Icon--Italic'}
            onClick={onClick}
        />
    );
};

export default DraftItalicFormat;
