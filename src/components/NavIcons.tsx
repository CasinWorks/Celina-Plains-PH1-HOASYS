type IconProps = { title?: string };

export function IconHome({ title }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconLot({ title }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <rect
        x="4"
        y="4"
        width="7"
        height="7"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <rect
        x="13"
        y="4"
        width="7"
        height="7"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <rect
        x="4"
        y="13"
        width="7"
        height="7"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <rect
        x="13"
        y="13"
        width="7"
        height="7"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function IconDues({ title }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 7v10M9.5 9.5c.6-1 1.5-1.5 2.5-1.5 1.4 0 2.5.8 2.5 2s-1.1 2-2.5 2h-1c-1.4 0-2.5.8-2.5 2s1.1 2 2.5 2c1 0 1.9-.5 2.5-1.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconPay({ title }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <rect
        x="3"
        y="6"
        width="18"
        height="12"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path d="M3 10h18" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M7 14h4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconExpense({ title }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <path
        d="M6 7h12M6 12h12M6 17h8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconReport({ title }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <path
        d="M6 18V10M12 18V6M18 18v-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconAudit({ title }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <path
        d="M8 4h8a2 2 0 0 1 2 2v14l-3-2-3 2-3-2-3 2V6a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M9 9h6M9 13h6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconSettings({ title }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 3.5v2.2M12 18.3v2.2M4.9 6.5l1.6 1.6M17.5 16l1.6 1.6M3.5 12h2.2M18.3 12h2.2M4.9 17.5l1.6-1.6M17.5 8l1.6-1.6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
