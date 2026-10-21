// Small line icons drawn as inline SVG, so the app needs no icon package and
// shows no emojis. They take their colour from the surrounding text
// (currentColor), so they follow the sidebar and navbar colours automatically.

function Svg({ size = 20, children, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  )
}

export const DashboardIcon = (props) => (
  <Svg {...props}>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </Svg>
)

export const UsersIcon = (props) => (
  <Svg {...props}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
    <circle cx="17.5" cy="9" r="2.5" />
    <path d="M17 14.2c2.7.2 4.5 2.2 4.5 5" />
  </Svg>
)

export const EditIcon = (props) => (
  <Svg {...props}>
    <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3z" />
    <path d="M13.5 6.5l3 3" />
  </Svg>
)

export const UploadIcon = (props) => (
  <Svg {...props}>
    <path d="M12 16V4" />
    <path d="M7 9l5-5 5 5" />
    <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
  </Svg>
)

export const BarChartIcon = (props) => (
  <Svg {...props}>
    <path d="M5 20v-6" />
    <path d="M12 20V5" />
    <path d="M19 20V10" />
    <path d="M3 20h18" />
  </Svg>
)

export const CalendarIcon = (props) => (
  <Svg {...props}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18" />
    <path d="M8 3v4" />
    <path d="M16 3v4" />
  </Svg>
)

export const ChevronLeftIcon = (props) => (
  <Svg {...props}>
    <path d="M15 6l-6 6 6 6" />
  </Svg>
)

export const ChevronRightIcon = (props) => (
  <Svg {...props}>
    <path d="M9 6l6 6-6 6" />
  </Svg>
)

export const ChevronDownIcon = (props) => (
  <Svg {...props}>
    <path d="M6 9l6 6 6-6" />
  </Svg>
)

export const LogoutIcon = (props) => (
  <Svg {...props}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </Svg>
)