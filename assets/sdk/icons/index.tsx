/**
 * Hand-picked inline SVG icons for the SDK.
 *
 * We use 5-6 icons total. Inlining as React components costs ~1KB
 * gzipped vs ~80KB for FontAwesome. Outlines from Heroicons (MIT) for
 * visual consistency with the Tailwind + Plaid-Link aesthetic.
 */

import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

const baseProps = {
  xmlns: 'http://www.w3.org/2000/svg',
  fill: 'none',
  viewBox: '0 0 24 24',
  strokeWidth: 1.5,
  stroke: 'currentColor',
  'aria-hidden': true
} as const;

export const SpinnerIcon = ({ className, ...props }: IconProps) => (
  // `tpa-animate-spin` is load-bearing for this icon (without it the
  // spinner is a static circle). Destructure className BEFORE the
  // spread + recompose, otherwise `{...props}` reapplies the caller's
  // className over the composed one (including the case where the
  // caller passes an explicit undefined) and the animation utility is
  // lost.
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    {...props}
    className={`tpa-animate-spin ${className || ''}`}
  >
    <circle
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeOpacity="0.25"
      strokeWidth="4"
    />
    <path
      d="M22 12a10 10 0 0 1-10 10"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
    />
  </svg>
);

export const ArrowLeftIcon = (props: IconProps) => (
  <svg {...baseProps} {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 19.5 8.25 12l7.5-7.5"
    />
  </svg>
);

export const QuestionCircleIcon = (props: IconProps) => (
  <svg {...baseProps} {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z"
    />
  </svg>
);

export const UserPlusIcon = (props: IconProps) => (
  <svg {...baseProps} {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM4 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.32 12.32 0 0 1 10.374 21c-2.331 0-4.512-.645-6.374-1.766Z"
    />
  </svg>
);

export const UserEditIcon = (props: IconProps) => (
  <svg {...baseProps} {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.862 4.487 18.549 2.8a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
    />
  </svg>
);

export const CheckCircleIcon = (props: IconProps) => (
  <svg {...baseProps} {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
    />
  </svg>
);
