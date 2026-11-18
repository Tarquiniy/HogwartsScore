// One family of thin gold line icons instead of a mix of colour emoji, so the
// controls match the engraved look of the rest of the page. They inherit the
// text colour and size (1em) of whatever they sit in.

function Icon({ children, size = '1.15em', ...rest }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={{ flexShrink: 0, verticalAlign: '-0.18em' }}
      {...rest}
    >
      {children}
    </svg>
  );
}

/** A rolled parchment: the history of points. */
export function ScrollIcon(props) {
  return (
    <Icon {...props}>
      <path d="M7 4h10a2 2 0 0 1 2 2v1H9V6a2 2 0 0 0-2-2Z" />
      <path d="M7 4a2 2 0 0 0-2 2v11" />
      <path d="M19 7v10a3 3 0 0 1-3 3H7a2 2 0 0 1-2-2v-1h9v1a2 2 0 0 0 2 2" />
      <path d="M9.5 11h6M9.5 14h4" />
    </Icon>
  );
}

export function UsersIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="9" cy="8.5" r="3" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <path d="M15.5 5.8a3 3 0 0 1 0 5.6M17 14.2a5.5 5.5 0 0 1 3.5 4.8" />
    </Icon>
  );
}

/** A turning hourglass: set every house back to zero. */
export function ResetIcon(props) {
  return (
    <Icon {...props}>
      <path d="M7 3.5h10M7 20.5h10" />
      <path d="M8 3.5v3.2c0 1.2.5 2.2 1.5 3L12 12l2.5-2.3c1-.8 1.5-1.8 1.5-3V3.5" />
      <path d="M8 20.5v-3.2c0-1.2.5-2.2 1.5-3L12 12l2.5 2.3c1 .8 1.5 1.8 1.5 3v3.2" />
    </Icon>
  );
}

export function TrashIcon(props) {
  return (
    <Icon {...props}>
      <path d="M4.5 6.5h15M9.5 6.5V4.5h5v2" />
      <path d="M6.5 6.5l.8 12a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4l.8-12" />
      <path d="M10 10.5v6M14 10.5v6" />
    </Icon>
  );
}

export function ExitIcon(props) {
  return (
    <Icon {...props}>
      <path d="M10 4.5H6.5a1.5 1.5 0 0 0-1.5 1.5v12a1.5 1.5 0 0 0 1.5 1.5H10" />
      <path d="M14.5 8l4 4-4 4M18.5 12H9.5" />
    </Icon>
  );
}

export function CrownIcon(props) {
  return (
    <Icon {...props}>
      <path d="M4 17.5 5.2 8l4.3 4L12 6.5l2.5 5.5 4.3-4 1.2 9.5Z" />
      <path d="M4.5 20h15" />
    </Icon>
  );
}

export function CloseIcon(props) {
  return (
    <Icon {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Icon>
  );
}

/** A short hairline with a diamond in the middle, under a title. */
export function Ornament({ className = '' }) {
  return (
    <svg
      className={`ornament ${className}`}
      viewBox="0 0 160 8"
      width="160"
      height="8"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="ornament-left" gradientUnits="userSpaceOnUse" x1="0" x2="70">
          <stop offset="0" stopColor="#c9a961" stopOpacity="0" />
          <stop offset="1" stopColor="#c9a961" stopOpacity="0.75" />
        </linearGradient>
        <linearGradient id="ornament-right" gradientUnits="userSpaceOnUse" x1="90" x2="160">
          <stop offset="0" stopColor="#c9a961" stopOpacity="0.75" />
          <stop offset="1" stopColor="#c9a961" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M0 4h70" stroke="url(#ornament-left)" strokeWidth="1" />
      <path d="M90 4h70" stroke="url(#ornament-right)" strokeWidth="1" />
      <path d="M80 1l3 3-3 3-3-3Z" fill="#c9a961" opacity="0.9" />
    </svg>
  );
}
