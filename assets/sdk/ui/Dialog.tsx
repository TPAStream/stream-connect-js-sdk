import {
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
  Dialog as HDialog
} from '@headlessui/react';
import type { ReactNode } from 'react';
import { useThemeCSSVars } from '../theme/theme';
import { Button } from './Button';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  /** Optional footer actions. Buttons typically. */
  footer?: ReactNode;
}

export const Dialog = ({
  open,
  onClose,
  title,
  children,
  footer
}: DialogProps) => {
  // Headless UI's Dialog mounts via React Portal (target = document.body
  // by default) so the modal renders OUTSIDE the .tpa-sdk-root subtree
  // the SDK was given. Without re-establishing the root class on the
  // portaled wrapper, the CSS variables (--tpa-color-primary-600, etc.)
  // are undefined in the modal — buttons fall back to transparent
  // backgrounds and white text becomes invisible. The class alone
  // resolves to the default shades in the stylesheet, but a customer's
  // `theme.primaryColor` override lives as an INLINE style on the
  // ThemeProvider's wrapper — that doesn't escape into the portal. Pull
  // the same CSS vars via useThemeCSSVars and apply them as inline
  // style so the portaled modal picks up the customer's theme.
  const themeVars = useThemeCSSVars();
  return (
    <HDialog
      open={open}
      onClose={onClose}
      className="tpa-sdk-root tpa-relative tpa-z-50"
      style={themeVars}
    >
      <DialogBackdrop className="tpa-sdk-root tpa-fixed tpa-inset-0 tpa-bg-black/30" />
      <div
        className="tpa-sdk-root tpa-fixed tpa-inset-0 tpa-flex tpa-items-center tpa-justify-center tpa-p-4"
        style={themeVars}
      >
        <DialogPanel className="tpa-bg-white tpa-rounded-lg tpa-shadow-card-hover tpa-max-w-md tpa-w-full tpa-overflow-hidden">
          {title && (
            <DialogTitle className="tpa-px-5 tpa-pt-5 tpa-pb-3 tpa-border-b tpa-border-slate-100 tpa-text-lg tpa-font-semibold tpa-text-slate-900">
              {title}
            </DialogTitle>
          )}
          <div className="tpa-p-5 tpa-text-sm tpa-text-slate-700">
            {children}
          </div>
          {footer && (
            <div className="tpa-px-5 tpa-py-3 tpa-bg-slate-50 tpa-border-t tpa-border-slate-100 tpa-flex tpa-justify-end tpa-gap-2">
              {footer}
            </div>
          )}
        </DialogPanel>
      </div>
    </HDialog>
  );
};

interface ConfirmDialogProps extends Omit<DialogProps, 'footer'> {
  primaryLabel?: string;
  onPrimary?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

export const ConfirmDialog = ({
  primaryLabel = 'Ok',
  onPrimary,
  secondaryLabel,
  onSecondary,
  ...rest
}: ConfirmDialogProps) => {
  return (
    <Dialog
      {...rest}
      footer={
        <>
          {secondaryLabel && (
            <Button variant="secondary" onClick={onSecondary || rest.onClose}>
              {secondaryLabel}
            </Button>
          )}
          <Button onClick={onPrimary || rest.onClose}>{primaryLabel}</Button>
        </>
      }
    />
  );
};
