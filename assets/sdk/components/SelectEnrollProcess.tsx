import { useEffect } from 'react';
import { UserEditIcon, UserPlusIcon } from '../icons';
import { Card } from '../ui/Card';
import { Stack } from '../ui/Stack';
import { Text, Title } from '../ui/Title';

interface SelectEnrollProcessProps {
  setChoosePayer: () => void;
  setFixCredentials: () => void;
  doneStep1?: (props?: unknown) => void;
}

interface OptionTileProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
}

const OptionTile = ({ icon, label, description, onClick }: OptionTileProps) => (
  <button
    type="button"
    onClick={onClick}
    className="tpa-w-full tpa-text-left tpa-bg-white tpa-rounded-lg tpa-shadow-card hover:tpa-shadow-card-hover tpa-border tpa-border-slate-200 tpa-p-5 tpa-transition-shadow focus:tpa-outline-none focus-visible:tpa-ring-2 focus-visible:tpa-ring-primary-500"
  >
    <div className="tpa-flex tpa-items-center tpa-gap-4">
      <div className="tpa-flex-shrink-0 tpa-w-12 tpa-h-12 tpa-rounded-full tpa-bg-primary-50 tpa-text-primary-600 tpa-flex tpa-items-center tpa-justify-center">
        <span className="tpa-w-6 tpa-h-6 tpa-block">{icon}</span>
      </div>
      <div>
        <p className="tpa-font-semibold tpa-text-slate-900">{label}</p>
        <p className="tpa-text-sm tpa-text-slate-500">{description}</p>
      </div>
    </div>
  </button>
);

export const SelectEnrollProcess = (props: SelectEnrollProcessProps) => {
  useEffect(() => {
    props.doneStep1?.(props);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Stack gap="lg">
      <Stack gap="xs">
        <Title order={2}>What would you like to do?</Title>
        <Text color="muted" size="sm">
          Add a new carrier or fix login info that has stopped working.
        </Text>
      </Stack>
      <Stack gap="sm">
        <OptionTile
          icon={<UserPlusIcon />}
          label="Add a new carrier"
          description="Connect a new insurance plan to import claims and benefits."
          onClick={props.setChoosePayer}
        />
        <OptionTile
          icon={<UserEditIcon />}
          label="Manage your carriers"
          description="See what's connected, update logins, or check on a sync."
          onClick={props.setFixCredentials}
        />
      </Stack>
    </Stack>
  );
};
