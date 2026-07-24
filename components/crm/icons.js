import { cn } from "@/lib/utils";

function svgProps(size) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": true,
  };
}

export function IconChart({ className, size = 15 }) {
  return (
    <svg {...svgProps(size)} className={cn("shrink-0", className)}>
      <path
        d="M4 19V5M8 19V11M12 19V8M16 19V13M20 19V9"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconUsers({ className, size = 15 }) {
  return (
    <svg {...svgProps(size)} className={cn("shrink-0", className)}>
      <path
        d="M16 11a3 3 0 10-2.83-4M9 11a3 3 0 113 3H9m7.5 4.5a5 5 0 00-9 0"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconDoc({ className, size = 15 }) {
  return (
    <svg {...svgProps(size)} className={cn("shrink-0", className)}>
      <path
        d="M7 3h7l4 4v12a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2zM14 3v4h4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconCheck({ className, size = 15 }) {
  return (
    <svg {...svgProps(size)} className={cn("shrink-0", className)}>
      <path
        d="M9 11l2 2 4-4M7 5h10a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconSparkle({ className, size = 15 }) {
  return (
    <svg {...svgProps(size)} className={cn("shrink-0", className)}>
      <path
        d="M12 3l1.2 4.2L17 8l-3.8 0.8L12 13l-1.2-4.2L7 8l4.2-0.8L12 3zM6 16l0.7 2.6L9 19l-2.3 0.5L6 22l-0.7-2.6L3 19l2.3-0.5L6 16zM17 15l0.5 1.7L19 17l-1.5 0.3L17 19l-0.5-1.7L15 17l1.5-0.3L17 15z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconClock({ className, size = 15 }) {
  return (
    <svg {...svgProps(size)} className={cn("shrink-0", className)}>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 8v4l2.5 1.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

export function IconCalendar({ className, size = 15 }) {
  return (
    <svg {...svgProps(size)} className={cn("shrink-0", className)}>
      <path
        d="M7 4v2M17 4v2M5 8h14M6 6h12a2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconLayers({ className, size = 15 }) {
  return (
    <svg {...svgProps(size)} className={cn("shrink-0", className)}>
      <path
        d="M12 3l8 4.5v4L12 16 4 11.5v-4L12 3zM4 16.5L12 21l8-4.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconTimer({ className, size = 15 }) {
  return (
    <svg {...svgProps(size)} className={cn("shrink-0", className)}>
      <path
        d="M12 8v4l2.5 1.5M9 2h6M12 20a8 8 0 100-16 8 8 0 000 16z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconUser({ className, size = 15 }) {
  return (
    <svg {...svgProps(size)} className={cn("shrink-0", className)}>
      <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M6.5 18.5v-1a4 4 0 014-4h3a4 4 0 014 4v1"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconShield({ className, size = 15 }) {
  return (
    <svg {...svgProps(size)} className={cn("shrink-0", className)}>
      <path
        d="M12 3l7 3v6c0 4-3 7-7 8-4-1-7-4-7-8V6l7-3z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconMenu({ className, size = 14 }) {
  return (
    <svg {...svgProps(size)} className={cn("shrink-0", className)}>
      <path
        d="M5 7h14M5 12h14M5 17h14"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconSettings({ className, size = 16 }) {
  return (
    <svg {...svgProps(size)} className={cn("shrink-0", className)}>
      <circle cx="12" cy="12" r="2.75" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M12 2v2.5M12 19.5V22M4.5 12H2M22 12h-2.5M5 5l1.8 1.8M17.2 17.2L19 19M19 5l-1.8 1.8M6.8 17.2L5 19"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconMenuL({ className, size = 14 }) {
  return (
    <svg {...svgProps(size)} className={cn("shrink-0", className)}>
      <path
        d="M8 7h11M8 12h11M8 17h7"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconBell({ className, size = 16 }) {
  return (
    <svg {...svgProps(size)} className={cn("shrink-0", className)}>
      <path
        d="M12 4.5a4 4 0 00-4 4v2.2c0 .6-.2 1.2-.6 1.7L6 14.5h12l-1.4-2.1c-.4-.5-.6-1.1-.6-1.7V8.5a4 4 0 00-4-4zM10 17a2 2 0 004 0"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const ICONS = {
  pulse: IconChart,
  clients: IconUsers,
  contracts: IconDoc,
  tasks: IconCheck,
  calendar: IconCalendar,
  templates: IconSparkle,
  time: IconClock,
  timer: IconClock,
  workload: IconChart,
  nps: IconSparkle,
  kb: IconDoc,
  team: IconUser,
  users: IconShield,
  reports: IconDoc,
};

/**
 * @param {object} props
 * @param {string} props.navId
 */
export function CrmNavIcon({ navId, className, size = 15 }) {
  const Comp = ICONS[navId] ?? IconDoc;
  return <Comp className={className} size={size} />;
}
