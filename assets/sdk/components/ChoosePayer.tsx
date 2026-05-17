import { useEffect, useMemo, useState } from 'react';
import { useActiveValidations } from '../contexts/ActiveValidationsContext';
import type { StreamEmployer, StreamPayer } from '../types';
import { BackButton } from '../ui/BackButton';
import { Combobox, type ComboboxItem } from '../ui/Combobox';
import { Stack } from '../ui/Stack';
import { Text, Title } from '../ui/Title';
import { PayerImages } from './PayerImages';

// Demo-mode payer subset matches the legacy [18, 16, 171] hardcode.
const DEMO_PAYER_IDS = [18, 16, 171];

// Above this carrier count, auto-show the search Combobox even when
// the server-side `show_all_payers_in_easy_enroll` flag is off. Big
// employer rosters (50+ carriers is real) become an unscrollable tile
// wall without a search; this gives them one regardless of the
// employer's configuration.
const AUTO_SEARCH_THRESHOLD = 10;

interface ChoosePayerProps {
  streamPayers: StreamPayer[];
  streamEmployer: StreamEmployer;
  usedPayers: number[];
  choosePayer: (args: { payer: StreamPayer; dependent?: boolean }) => void;
  returnSelectEnrollProcess?: false | (() => void);
  isDemo?: boolean;
  /** When true, render a search picker alongside the carrier grid. */
  dropDown?: boolean;
  doneStep3?: (data?: unknown) => void;
}

export const ChoosePayer = (props: ChoosePayerProps) => {
  const {
    streamPayers,
    streamEmployer,
    usedPayers,
    choosePayer,
    isDemo,
    dropDown,
    returnSelectEnrollProcess
  } = props;

  const [selectedSearch, setSelectedSearch] = useState<ComboboxItem | null>(
    null
  );

  // doneStep3 fired on every render in the legacy SDK. Mirror that
  // behavior — customers' implementations may rely on the cadence.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    props.doneStep3?.();
  });

  const comboItems = useMemo<ComboboxItem[]>(
    () => streamPayers.map((p) => ({ label: p.name, value: p.id })),
    [streamPayers]
  );

  const onSearchChange = (item: ComboboxItem | null) => {
    setSelectedSearch(item);
    if (!item) return;
    const payer = streamPayers.find((p) => p.id === item.value);
    if (payer) choosePayer({ payer });
  };

  const gridPayers = isDemo
    ? streamPayers.filter((p) => DEMO_PAYER_IDS.includes(p.id))
    : dropDown
      ? streamPayers.filter(
          (p) =>
            streamEmployer.payers.map((ep) => ep.id).includes(p.id) ||
            usedPayers.includes(p.id)
        )
      : streamPayers;

  // Show the search Combobox when the server-side flag opts us into
  // dropdown mode, when we're in demo, OR (new in 0.8) when the
  // payer list is larger than AUTO_SEARCH_THRESHOLD even without the
  // server-side flag. The grid logic above is unchanged; this just
  // surfaces the search input over whichever subset we're rendering.
  const showSearch =
    isDemo || !!dropDown || streamPayers.length > AUTO_SEARCH_THRESHOLD;

  const { validations } = useActiveValidations();
  const hasValidations = validations.length > 0;
  const heading = hasValidations
    ? 'Add another carrier'
    : 'Connect your carrier';
  const subhead = hasValidations
    ? 'You can keep adding carriers while we finish connecting the others.'
    : 'Pick your insurance carrier to import claims and benefits.';

  return (
    <Stack gap="lg" id="choose-payer">
      {returnSelectEnrollProcess && (
        <BackButton onClick={returnSelectEnrollProcess as () => void} />
      )}
      {/* ActiveValidationsHero moved to the SDK root mount so it's
          actionable on every step, not just here + FixCredentials.
          See SDK.tsx's render block. */}
      <Stack gap="xs">
        <Title order={2}>{heading}</Title>
        <Text size="sm" color="muted">
          {subhead}
        </Text>
      </Stack>

      {showSearch && (
        <Combobox
          items={comboItems}
          value={selectedSearch}
          onChange={onSearchChange}
          placeholder="Search for your carrier"
          label="Search all carriers"
        />
      )}

      {showSearch && gridPayers.length > 0 && (
        <Text size="sm" color="muted">
          Or pick one below:
        </Text>
      )}

      {gridPayers.length > 0 ? (
        <PayerImages
          streamPayers={gridPayers}
          usedPayers={usedPayers}
          choosePayer={(args) =>
            choosePayer({ payer: args.payer, dependent: args.dependent })
          }
        />
      ) : (
        !showSearch && (
          <Text color="muted">
            No carriers available. Please contact your administrator.
          </Text>
        )
      )}
    </Stack>
  );
};
