import type { HTMLAttributes } from 'react';

type Gap = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface StackProps extends HTMLAttributes<HTMLDivElement> {
  /** Vertical gap between children. */
  gap?: Gap;
  /** Horizontal alignment of children. */
  align?: 'start' | 'center' | 'end' | 'stretch';
}

const gapClasses: Record<Gap, string> = {
  xs: 'tpa-gap-1',
  sm: 'tpa-gap-2',
  md: 'tpa-gap-4',
  lg: 'tpa-gap-6',
  xl: 'tpa-gap-8'
};

const alignClasses: Record<NonNullable<StackProps['align']>, string> = {
  start: 'tpa-items-start',
  center: 'tpa-items-center',
  end: 'tpa-items-end',
  stretch: 'tpa-items-stretch'
};

export const Stack = ({
  gap = 'md',
  align = 'stretch',
  className = '',
  children,
  ...rest
}: StackProps) => {
  return (
    <div
      className={`tpa-flex tpa-flex-col ${gapClasses[gap]} ${alignClasses[align]} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
};

interface GroupProps extends HTMLAttributes<HTMLDivElement> {
  gap?: Gap;
  justify?: 'start' | 'center' | 'end' | 'between';
  align?: 'start' | 'center' | 'end';
  wrap?: boolean;
}

const justifyClasses: Record<NonNullable<GroupProps['justify']>, string> = {
  start: 'tpa-justify-start',
  center: 'tpa-justify-center',
  end: 'tpa-justify-end',
  between: 'tpa-justify-between'
};

const groupAlignClasses: Record<NonNullable<GroupProps['align']>, string> = {
  start: 'tpa-items-start',
  center: 'tpa-items-center',
  end: 'tpa-items-end'
};

export const Group = ({
  gap = 'md',
  justify = 'start',
  align = 'center',
  wrap,
  className = '',
  children,
  ...rest
}: GroupProps) => {
  return (
    <div
      className={`tpa-flex ${gapClasses[gap]} ${justifyClasses[justify]} ${groupAlignClasses[align]} ${wrap ? 'tpa-flex-wrap' : ''} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
};
