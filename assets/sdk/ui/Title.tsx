import type { HTMLAttributes, ReactNode } from 'react';

interface TitleProps extends HTMLAttributes<HTMLHeadingElement> {
  order?: 1 | 2 | 3 | 4;
  children: ReactNode;
}

const sizes: Record<NonNullable<TitleProps['order']>, string> = {
  1: 'tpa-text-2xl tpa-font-semibold tpa-tracking-tight',
  2: 'tpa-text-xl tpa-font-semibold tpa-tracking-tight',
  3: 'tpa-text-lg tpa-font-semibold',
  4: 'tpa-text-base tpa-font-semibold'
};

export const Title = ({
  order = 2,
  className = '',
  children,
  ...rest
}: TitleProps) => {
  const Tag = `h${order}` as 'h1' | 'h2' | 'h3' | 'h4';
  return (
    <Tag
      className={`tpa-text-slate-900 ${sizes[order]} ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
};

interface TextProps extends HTMLAttributes<HTMLParagraphElement> {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  color?: 'default' | 'muted' | 'danger';
  fw?: 400 | 500 | 600;
  children: ReactNode;
}

const textSizes: Record<NonNullable<TextProps['size']>, string> = {
  xs: 'tpa-text-xs',
  sm: 'tpa-text-sm',
  md: 'tpa-text-base',
  lg: 'tpa-text-lg'
};

const textColors: Record<NonNullable<TextProps['color']>, string> = {
  default: 'tpa-text-slate-700',
  muted: 'tpa-text-slate-500',
  danger: 'tpa-text-red-600'
};

const textWeights: Record<NonNullable<TextProps['fw']>, string> = {
  400: 'tpa-font-normal',
  500: 'tpa-font-medium',
  600: 'tpa-font-semibold'
};

export const Text = ({
  size = 'md',
  color = 'default',
  fw = 400,
  className = '',
  children,
  ...rest
}: TextProps) => {
  return (
    <p
      className={`${textSizes[size]} ${textColors[color]} ${textWeights[fw]} ${className}`}
      {...rest}
    >
      {children}
    </p>
  );
};
