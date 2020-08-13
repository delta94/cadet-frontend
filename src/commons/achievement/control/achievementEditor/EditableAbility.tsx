import { Button, MenuItem } from '@blueprintjs/core';
import { ItemRenderer, Select } from '@blueprintjs/select';
import React from 'react';
import { AchievementAbility } from 'src/features/achievement/AchievementTypes';

type EditableAbilityProps = {
  ability: AchievementAbility;
  changeAbility: any;
};

function EditableAbility(props: EditableAbilityProps) {
  const { ability, changeAbility } = props;

  const AbilitySelect = Select.ofType<AchievementAbility>();

  const abilityRenderer: ItemRenderer<AchievementAbility> = (ability, { handleClick }) => (
    <MenuItem key={ability} onClick={handleClick} text={ability} />
  );

  return (
    <div className="ability">
      <AbilitySelect
        items={Object.values(AchievementAbility)}
        onItemSelect={changeAbility}
        itemRenderer={abilityRenderer}
        filterable={false}
      >
        <Button text={ability} />
      </AbilitySelect>
    </div>
  );
}

export default EditableAbility;